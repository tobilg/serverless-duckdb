#!/bin/bash
# Need to replace REDACTED with the API key and URL 
# Usage: 

curl --location --request POST 'https://REDACTED.execute-api.us-east-1.amazonaws.com/prd/v1/query' \
--header 'x-api-key: REDACTED' \
--header 'Content-Type: application/json' \
-d @$1