const {
  AWS_S3_ONE_ZONE_EXPRESS_ENDPOINT,
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_SESSION_TOKEN,
} = process.env;

// Get the credentials via AWS SDK credential chain, in the case of AWS Lambda from the environment variables
// See https://duckdb.org/docs/extensions/httpfs/s3api#configuration-and-authentication
export const getAWSSecretQuery = (): string => {
  //return `CREATE SECRET aws (TYPE S3, PROVIDER CREDENTIAL_CHAIN, CHAIN 'env', REGION '${AWS_REGION}', ENDPOINT '${AWS_S3_ONE_ZONE_EXPRESS_ENDPOINT}')`;
  return `CREATE SECRET aws (TYPE S3, KEY_ID '${AWS_ACCESS_KEY_ID}', SECRET '${AWS_SECRET_ACCESS_KEY}', SESSION_TOKEN '${AWS_SESSION_TOKEN}', REGION '${AWS_REGION}', ENDPOINT '${AWS_S3_ONE_ZONE_EXPRESS_ENDPOINT}')`;
}
