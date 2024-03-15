import { APIGatewayEvent, Context } from 'aws-lambda';
import DuckDB from 'duckdb';
import { metricScope, Unit } from 'aws-embedded-metrics';
import Logger from '../lib/logger';
import { filterQuery } from '../lib/queryFilter';
import { getAWSSecretQuery } from '../lib/awsSecret';

// Patch BigInt
(BigInt.prototype as any).toJSON = function() {
  return this.toString()
}

// Instantiate logger
const logger = new Logger({
  name: 'duckdb-sync-logger',
}).getInstance();

// Instantiate DuckDB
const duckDB = new DuckDB.Database(':memory:', { allow_unsigned_extensions: 'true' });

// Create connection
const connection = duckDB.connect();

// Store initialization
let isInitialized = false;

// Promisify query method
const query = (query: string, isRemoteQuery: boolean = true) => {
  return new Promise((resolve, reject) => {
    connection.all(filterQuery(query, isRemoteQuery), (err, res) => {
      if (err) reject(err);
      resolve(res);
    })
  })
}

// SIGTERM Handler 
process.on('SIGTERM', async () => {
  logger.debug('[runtime] SIGTERM received');
  logger.debug('[runtime] cleaning up');

  // Add your cleanup code here!
  
  logger.debug('[runtime] exiting');
  process.exit(0)
});

// eslint-disable-next-line import/prefer-default-export
export const handler = metricScope(metrics => async (event: APIGatewayEvent, context: Context) => {
  // Setup logger
  const requestLogger = logger.child({ requestId: context.awsRequestId });
  requestLogger.debug({ event, context });

  // Setup metrics
  metrics.putDimensions({ Service: 'QueryService' });
  metrics.setProperty('RequestId', context.awsRequestId);

  try {
    if (!event.body) {
      throw 'No body present!';
    } else {
      // Parse event body with query
      const body = JSON.parse(event.body);

      if (!body.hasOwnProperty('query')) {
        throw 'Missing query property in request body!';
      }

      // Check if DuckDB has been initalized
      if (!isInitialized) {
        const initialSetupStartTimestamp = new Date().getTime();

        // Load home directory
        await query(`SET home_directory='/tmp';`, false);

        // Install and load local extensions
        await query(`INSTALL '/opt/nodejs/node_modules/duckdb/extensions/aws.duckdb_extension';`, false);
        await query(`LOAD '/opt/nodejs/node_modules/duckdb/extensions/aws.duckdb_extension';`, false);
        await query(`INSTALL '/opt/nodejs/node_modules/duckdb/extensions/httpfs.duckdb_extension';`, false);
        await query(`LOAD '/opt/nodejs/node_modules/duckdb/extensions/httpfs.duckdb_extension';`, false);
        await query(`INSTALL '/opt/nodejs/node_modules/duckdb/extensions/arrow.duckdb_extension';`, false);
        await query(`LOAD '/opt/nodejs/node_modules/duckdb/extensions/arrow.duckdb_extension';`, false);
        
        // Whether or not the global http metadata is used to cache HTTP metadata, see https://github.com/duckdb/duckdb/pull/5405
        await query(`SET enable_http_metadata_cache=true;`, false);
        // Whether or not object cache is used to cache e.g. Parquet metadata
        await query(`SET enable_object_cache=true;`, false);

        requestLogger.debug({ message: 'Initial setup done!' });
        metrics.putMetric('InitialSetupDuration', (new Date().getTime() - initialSetupStartTimestamp), Unit.Milliseconds);

        const awsSetupStartTimestamp = new Date().getTime();
        
        // Set AWS credentials, endpoint and region
        await query(getAWSSecretQuery(), false);

        requestLogger.debug({ message: 'AWS setup done!' });
        metrics.putMetric('AWSSetupDuration', (new Date().getTime() - awsSetupStartTimestamp), Unit.Milliseconds);

        // Store initialization
        isInitialized = true;
      }

      // Track query start timestamp
      const queryStartTimestamp = new Date().getTime();

      // Run query
      const queryResult = await query(body.query);
      requestLogger.debug({ queryResult });

      metrics.putMetric('QueryDuration', (new Date().getTime() - queryStartTimestamp), Unit.Milliseconds);

      return {
        statusCode: 200,
        body: JSON.stringify(queryResult),
      }
    }
  } catch (err: any) {
    requestLogger.error(err);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: (err.message ? err.message : 'Unknown error encountered'),
      }),
    }
  }
})
