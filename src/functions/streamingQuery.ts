import AWSLambda, { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { streamifyResponse, ResponseStream } from 'lambda-stream';
import DuckDB from 'duckdb';
import Logger from '../lib/logger';
import { promisify } from 'util';
import { pipeline, Readable } from 'stream';
//import zlib from 'zlib'
//import { Writable } from 'stream';


// declare namespace awslambda {
//   export namespace HttpResponseStream {
//     function from(writable: Writable, metadata: any): Writable;
//   }
// }

const Pipeline = promisify(pipeline);

// Instantiate logger
const logger = new Logger(undefined).getInstance();

// Instantiate DuckDB
const duckDB = new DuckDB.Database(':memory:', { allow_unsigned_extensions: 'true' });

// Create connection
const connection = duckDB.connect();

// Store initialization
let isInitialized = false;

// Promisify query method
const query = (query: string) => {
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
export const handler = streamifyResponse(myHandler);
  
async function myHandler (
  event: APIGatewayProxyEventV2,
  responseStream: ResponseStream,
  context: Context | undefined,
): Promise<void> {
  // Setup logger
  const requestLogger = logger.child({ requestId: context!.awsRequestId });
  requestLogger.debug({ event, context });

  const metadata = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "*",
      "Access-Control-Max-Age": 0,
      "Access-Control-Allow-Methods": "*",
    }
  };

  // Use global helper to pass metadata and status code
  const response = awslambda.HttpResponseStream.from(responseStream, metadata);

  try {

    if (event.requestContext.http.method === "OPTIONS") {
      requestLogger.debug("OPTIONS request");
      response.setContentType('text/plain');
      response.end();
    } else {
      // Parse event body with query
      const body = event.body;
      
      // Check if DuckDB has been initalized
      if (!isInitialized) {
        const initialSetupStartTimestamp = new Date().getTime();

        // Load home directory
        await query(`SET home_directory='/tmp';`);

        // Enable loading of Lambda extensions from https://extensions.quacking.cloud (see website for list of extensions)
        await query(`SET custom_extension_repository = 'http://extensions.quacking.cloud';`);
        
        // Hint: INSTALL httpfs; is needed again, because it's no longer included in the new repo:
        // https://github.com/duckdb/duckdb-node/tree/v0.9.1/src/duckdb/extension
        // This will install it from http://extensions.quacking.cloud
        await query(`INSTALL httpfs;`);
        await query(`LOAD httpfs;`);

        // Install the Apache Arrow extension
        await query(`INSTALL arrow;`);
        await query(`LOAD arrow;`);

        // Load spatial extension by default (only if you use the spatial layer)
        // await query(`LOAD '/opt/nodejs/node_modules/duckdb/extensions/spatial.duckdb_extension';`);
        
        // Whether or not the global http metadata is used to cache HTTP metadata, see https://github.com/duckdb/duckdb/pull/5405
        await query(`SET enable_http_metadata_cache=true;`);
        // Whether or not object cache is used to cache e.g. Parquet metadata
        await query(`SET enable_object_cache=true;`);

        requestLogger.debug({ message: 'Initial setup done!' });

        const awsSetupStartTimestamp = new Date().getTime();
        
        // Set AWS credentials
        // See https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime
        await query(`SET s3_region='${process.env.AWS_REGION}';`);
        await query(`SET s3_access_key_id='${process.env.AWS_ACCESS_KEY_ID}';`);
        await query(`SET s3_secret_access_key='${process.env.AWS_SECRET_ACCESS_KEY}';`);
        await query(`SET s3_session_token='${process.env.AWS_SESSION_TOKEN}';`);

        requestLogger.debug({ message: 'AWS setup done!' });

        // Store initialization
        isInitialized = true;
      }

    // Track query start timestamp
    const queryStartTimestamp = new Date().getTime();

    response.setContentType('application/octet-stream');
    await Pipeline(await connection.arrowIPCStream(`SELECT * FROM 'https://shell.duckdb.org/data/tpch/0_01/parquet/orders.parquet' LIMIT 1000`), response);
    response.end();
    }
  } catch (e: any) {
    logger.error(e.message);
    response.setContentType('text/plain');
    response.write(e.message);
    response.end();
  }
}
