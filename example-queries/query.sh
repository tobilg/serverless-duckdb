#!/bin/bash
# Need to replace REDACTED with the API key and URL 
# Usage:  me@laptop   ~/projects/serverless-duckdb/example-queries     main    ./query.sh ./json-queries/stelara-codes-query.json 
# Returns: [{"description":"STELARA INJ 130MG VL BU1MG","Min_Charge":1,"Max_Charge":36.189998626708984,"Product_Name_Minimum":"Small Group","Product_Name_Maximum":"Small Group"},{"description":"STELARA SYR 45 BU1MG","Min_Charge":111.83000183105469,"Max_Charge":454.3999938964844,"Product_Name_Minimum":"Affinity Medicaid, HARP, Essential Plans 3-4, CHIP","Product_Name_Maximum":"Affinity Medicaid, HARP, Essential Plans 3-4, CHIP"},{"description":"STELARA SYR 90 BU1MG","Min_Charge":111.83000183105469,"Max_Charge":497.55999755859375,"Product_Name_Minimum":"Indemnity","Product_Name_Maximum":"Indemnity"}]%  

curl --location --request POST 'https://REDACTED.execute-api.us-east-1.amazonaws.com/prd/v1/query' \
--header 'x-api-key: REDACTED' \
--header 'Content-Type: application/json' \
-d @$1