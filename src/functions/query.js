import DuckDB from 'duckdb';
import { metricScope, Unit } from 'aws-embedded-metrics';
import Logger from '../lib/logger';

// Instantiate logger
const logger = new Logger();

// Instantiate DuckDB
const duckDB = new DuckDB.Database(':memory:');

// Create connection
const connection = duckDB.connect();

// Store initialization
let isInitialized = false;

// Promisify query method
const query = (query) => {
  return new Promise((resolve, reject) => {
    connection.all(query, (err, res) => {
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
export const handler = metricScope(metrics => async (event, context) => {
  // Setup logger
  const requestLogger = logger.child({ requestId: context.awsRequestId });
  requestLogger.debug({ event, context });

  // Setup metrics
  metrics.putDimensions({ Service: 'QueryService' });
  metrics.setProperty('RequestId', context.awsRequestId);

  try {
    // Parse event body with query
    const body = JSON.parse(event.body);

    if (!body.hasOwnProperty('query')) {
      throw 'Missing query property in request body!';
    }

    // Check if DuckDB has been initalized
    if (!isInitialized) {
      const initialSetupStartTimestamp = new Date().getTime();
      
      // Load httpsfs
      await query(`SET home_directory='/tmp';`);
      // Hint: INSTALL httpfs; is no longer needed, as it's now in the static build starting from layer version 6
      await query(`LOAD httpfs;`);
      
      // New speedup option, see https://github.com/duckdb/duckdb/pull/5405
      await query(`SET enable_http_metadata_cache=true;`);

      requestLogger.debug({ message: 'Initial setup done!' });
      metrics.putMetric('InitialSetupDuration', (new Date().getTime() - initialSetupStartTimestamp), Unit.Milliseconds);

      const awsSetupStartTimestamp = new Date().getTime();
      
      // Set AWS credentials
      // See https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime
      await query(`SET s3_region='${process.env.AWS_REGION}';`);
      await query(`SET s3_access_key_id='${process.env.AWS_ACCESS_KEY_ID}';`);
      await query(`SET s3_secret_access_key='${process.env.AWS_SECRET_ACCESS_KEY}';`);
      await query(`SET s3_session_token='${process.env.AWS_SESSION_TOKEN}';`);

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
  } catch (err) {
    requestLogger.error(err);
    return {
      statusCode: 400,
      body: JSON.stringify(err),
    }
  }
})
