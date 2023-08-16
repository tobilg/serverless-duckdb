#!/bin/bash
<<'###BLOCK-COMMENT'
Claude prompt:

--data-raw '{
    "query": "SELECT avg(c_acctbal) FROM '\''https://shell.duckdb.org/data/tpch/0_01/parquet/customer.parquet'\'';"
}'

please rewrite this exact command line flag with the properly escaped SQL query (using '\'' to escape the single quotes) with the duckdb dialect to select all rows where the column `description` contains the string `stelara`, from the parquet file containing the duckdb database at https://beta.payless.health/data/131624096_mount-sinai-hospital_standardcharges-subset.parquet
###BLOCK-COMMENT

curl --location --request POST 'https://REDACTED.execute-api.us-east-1.amazonaws.com/prd/v1/query' \
--header 'x-api-key: REDACTED' \
--header 'Content-Type: application/json' \
--data-raw '{
    "query": "SELECT avg(Min_Charge), avg(Max_Charge) FROM '\''https://beta.payless.health/data/131624096_mount-sinai-hospital_standardcharges-subset.parquet'\'' WHERE description LIKE '\''%STELARA%'\'';"
}'