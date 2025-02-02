import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { Writable, pipeline } from 'stream';
import { promisify } from 'util';
import DuckDB from 'duckdb';
import Logger from '../lib/logger';
import { Metadata } from '../@types/awslambda';
import { filterQuery } from '../lib/queryFilter';

// Create pipeline stream
const Pipeline = promisify(pipeline);

// Instantiate logger
const logger = new Logger({
  name: 'duckdb-streaming-logger',
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
exports.handler = awslambda.streamifyResponse(async (
  event: APIGatewayProxyEventV2,
  responseStream: Writable, 
  context: Context
): Promise<void> => {
  // Setup logger
  const requestLogger = logger.child({ requestId: context!.awsRequestId });
  requestLogger.debug({ event, context });

  // Create default metadata for HTTP status code and headers
  const metadata: Metadata = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*',
      'Access-Control-Max-Age': 0,
      'Access-Control-Allow-Methods': '*',
    }
  };

  try {
    if (event.requestContext.http.method === 'OPTIONS') {
      // Set content type header
      metadata.headers['Content-Type'] = 'text/plain';
      // Use global helper to pass metadata and status code
      responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);
      // Need to write something, otherwiese metadata is not shown -> CORS error!
      responseStream.write('OK');
      responseStream.end();
    } else if (event.requestContext.http.method === 'POST') {
      // Parse event body with query
      const body = event.body?.replace(/;/g, '');
      requestLogger.debug({ body });
      
      // Check if DuckDB has been initalized
      if (!isInitialized) {
        // Load home directory
        await query(`SET home_directory='/tmp';`, false);

        // Enable loading of Lambda extensions from https://extensions.quacking.cloud (see website for list of extensions)
        await query(`SET custom_extension_repository = 'http://extensions.quacking.cloud';`, false);
        
        // Hint: INSTALL httpfs; is needed again, because it's no longer included
        // This will install it from http://extensions.quacking.cloud
        await query(`INSTALL httpfs;`, false);
        await query(`LOAD httpfs;`, false);

        // Install the Apache Arrow extension
        await query(`INSTALL arrow;`, false);
        await query(`LOAD arrow;`, false);
        
        // Whether or not the global http metadata is used to cache HTTP metadata, see https://github.com/duckdb/duckdb/pull/5405
        await query(`SET enable_http_metadata_cache=true;`, false);
        // Whether or not object cache is used to cache e.g. Parquet metadata
        await query(`SET enable_object_cache=true;`, false);
        // Disable local filesystem
        await query(`SET disabled_filesystems = 'LocalFileSystem';`, false);
        // Enable lock configuration
        await query(`SET lock_configuration = true;`, false);

        requestLogger.debug({ message: 'Initial setup done!' });
        
        // Set AWS credentials
        // See https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime
        // await query(`SET s3_region='${process.env.AWS_REGION}';`, false);
        // await query(`SET s3_access_key_id='${process.env.AWS_ACCESS_KEY_ID}';`, false);
        // await query(`SET s3_secret_access_key='${process.env.AWS_SECRET_ACCESS_KEY}';`, false);
        // await query(`SET s3_session_token='${process.env.AWS_SESSION_TOKEN}';`, false);

        requestLogger.debug({ message: 'AWS setup done!' });

        // Store initialization
        isInitialized = true;
      }

      // Set Content-Type header
      metadata.headers['Content-Type'] = 'application/octet-stream';

      // Use global helper to pass metadata and status code
      responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

      // Pipeline the Arrow IPC stream to the response stream
      await Pipeline(await connection.arrowIPCStream(filterQuery(body)), responseStream);

      // Close response stream
      responseStream.end();
    } else { // Invalid request method
      metadata.statusCode = 400;
      metadata.headers['Content-Type'] = 'text/plain';
      responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);
      responseStream.write('ERROR');
      responseStream.end();
    }
  } catch (e: any) {
    logger.error(e.message);
    metadata.statusCode = 500;
    metadata.headers['Content-Type'] = 'text/plain';
    responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);
    responseStream.write(e.message);
    responseStream.end();
  }
});
