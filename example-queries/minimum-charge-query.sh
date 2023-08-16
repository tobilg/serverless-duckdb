#!/bin/bash
<<'###BLOCK-COMMENT'
###BLOCK-COMMENT

curl --location --request POST 'https://REDACTED.execute-api.us-east-1.amazonaws.com/prd/v1/query' \
--header 'x-api-key: REDACTED' \
--header 'Content-Type: application/json' \
--data-raw '{
    "query": "SELECT avg(Min_Charge) FROM '\''https://beta.payless.health/data/131624096_mount-sinai-hospital_standardcharges-subset.parquet'\'';"
}'