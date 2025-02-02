# serverless-duckdb
An example of how to run DuckDB on AWS Lambda & API Gateway. This will eventually deploy three Lambda functions:

* An **API Gateway endpoint** to which DuckDB queries can be issued via a POST request, which is authenticated by an API Key
* An **API Gateway endpoint** to which DuckDB queries can be issued via a POST request, providing access to S3 Express One Zone, and authenticated by an API Key
* A **Function URL Lambda** that supports streaming the query results as an Apache Arrow IPC stream, which uses **NO** authentication by default (you can add `AWS_IAM` auth manually if you wish)

Only the first function is deployed by default, to deploy the others, you need to uncomment the specific sections in the [serverless.yml](serverless.yml) file.

## Requirements
You'll need a current v3 version installation of the [Serverless Framework](https://serverless.com) on the machine you're planning to deploy the application from.

Also, you'll have to setup your AWS credentials according to the [Serverless docs](https://www.serverless.com/framework/docs/providers/aws/guide/credentials/).

## Configuration
DuckDB is automatically configured to use the [HTTPFS extension](https://duckdb.org/docs/extensions/httpfs), and uses the AWS credentials that are given to your Lambda function by its execution role. This means you can potentially query data that is available via HTTP(S) or in AWS S3 buckets.

If you want to also query data (e.g. Parquet files) that resides in one or more S3 buckets, you'll have to adjust the `iamRoleStatements` part of the function configuration in the [serverless.yml](serverless.yml#L45) file. Just replace the `YOUR-S3-BUCKET-NAME` with your actual S3 bucket name.

## Deployment
After you cloned this repository to your local machine and cd'ed in its directory, the application can be deployed like this (don't forget a `npm i` to install the dependencies!):

```bash
$ sls deploy
```

This will deploy the stack to the default AWS region `us-east-1`. In case you want to deploy the stack to a different region, you can specify a `--region` argument:

```bash
$ sls deploy --region eu-central-1
```

The deployment should take 2-3 minutes. Once the deployment is finished, you should find some output in your console that indicates the API Gateway endpoint URL and the API Key:

```yaml
api keys:
  DuckDBKey: REDACTED
endpoints:
  POST - https://REDACTED.execute-api.us-east-1.amazonaws.com/prd/v1/query
  streamingQuery: https://REDACTED.lambda-url.us-east-1.on.aws/
```

## Usage

### API Gateway endpoint
You can now query your DuckDB endpoint via HTTP requests (don't forget to exchange `REDACTED` with your real URL and API Key), e.g.

```bash
curl -L -XPOST 'https://REDACTED.execute-api.us-east-1.amazonaws.com/prd/v1/query' \
  --header 'x-api-key: REDACTED' \
  --header 'Content-Type: application/json' \
  --data-raw '{
      "query": "SELECT avg(c_acctbal) FROM '\''https://shell.duckdb.org/data/tpch/0_01/parquet/customer.parquet'\'';"
  }'
```

### API Gateway endpoint with S3 Express One Zone
You can now query your DuckDB endpoint via HTTP requests (don't forget to exchange `REDACTED` with your real URL and API Key), e.g.

```bash
curl -L -XPOST 'https://REDACTED.execute-api.us-east-1.amazonaws.com/prd/v1/queryS3Express' \
  --header 'x-api-key: REDACTED' \
  --header 'Content-Type: application/json' \
  --data-raw '{
      "query": "SELECT avg(c_acctbal) FROM '\''https://shell.duckdb.org/data/tpch/0_01/parquet/customer.parquet'\'';"
  }'
```

### Function URL Lambda
You can query the streaming Lambda by issueing the following command (don't forget to specify an `--output` path, this is where the Apache Arrow file will be stored):

```bash
curl -L -XPOST 'https://REDACTED.lambda-url.us-east-1.on.aws/' \
  --header 'Content-Type: application/json' \
  --data-raw 'SELECT 1' \
  --output /tmp/result.arrow
```