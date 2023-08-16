# Claude prompts

## For generating SQL queries in json format

  ```` 
  ```
  {
    "query": "SELECT avg(Min_Charge), avg(Max_Charge) FROM 'https://beta.payless.health/data/131624096_mount-sinai-hospital_standardcharges-subset.parquet' WHERE description LIKE '%STELARA%';"
  }
  ```

  please rewrite this exact SQL query inside of a json file to select the column Code_type rows with a value of of `Charge_Code` and the `Primary_Code` values of `18480415, 18480213, 18480214`, and retrieve the `description` column, the `Min_Charge`, `Max_Charge`, `Product_Name_Minimum`, `Product_Name_Maximum` column values
  ````

## Creating a JSX template
```` 
```
Code_type	Primary_Code	description	Min_Charge	Max_Charge	Product_Name_Maximum	Product_Name_Minimum
Charge_Code	18480415	STELARA INJ 130MG VL BU1MG	1	36.19	Small Group	Small Group
Charge_Code	18480213	STELARA SYR 45 BU1MG	111.83	454.4	Affinity Medicaid, HARP, Essential Plans 3-4, CHIP	Affinity Medicaid, HARP, Essential Plans 3-4, CHIP
Charge_Code	18480214	STELARA SYR 90 BU1MG	111.83	497.56	Indemnity	Indemnity
```

please create a JSX template for incremental static regeneration that queries an API endpoint on AWS lambda to retrieve data corresponding to the `Code_type` of `Charge_Code` and the `Primary_Code` values of `18480415, 18480213, 18480214`, and has a few sentences like the below. please also include one sentence about the product description and the primary codes, alongside the minimum and maximum charges and the insurance product names corresponding to it:

```
{insurance product name} has the highest price of {amount} for the {row description} compared to the {number of} insurance products at this hospital. This price is {XXX} higher from the median of {xx} across insurance products. 

{insurance product name} has the lowest price of {amount} for the {row description} compared to the {number of} insurance products at this hospital. This price is {XXX} lower from the median of {xx} of {description} across insurance products.
```

please query the following API endpoint using the following example:

```
curl --location --request POST 'https://REDACTED.execute-api.us-east-1.amazonaws.com/prd/v1/query' \
--header 'x-api-key: REDACTED' \
--header 'Content-Type: application/json' \
--data-raw '{
    "query": "SELECT Min_Charge, Product_Name_Minimum FROM '\''https://beta.payless.health/data/131624096_mount-sinai-hospital_standardcharges-subset.parquet'\'' WHERE Code_type = '\''Charge_Code'\'' AND Primary_Code IN (18480415, 18480213, 18480214);"
}'
```
````

Response:

```
import { useState, useEffect } from 'react';

export default function Pricing() {

  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('https://REDACTED.execute-api.us-east-1.amazonaws.com/prd/v1/query', {
        method: 'POST',
        headers: {
          'x-api-key': 'REDACTED',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: "SELECT Min_Charge, Max_Charge, Product_Name_Minimum, Product_Name_Maximum, description FROM 'https://beta.payless.health/data/131624096_mount-sinai-hospital_standardcharges-subset.parquet' WHERE Code_type = 'Charge_Code' AND Primary_Code IN (18480415, 18480213, 18480214);" 
        })
      });
      const json = await response.json();
      setData(json);
    };

    fetchData();
  }, []);

  return (
    <div>
      {data && 
        <>
          <p>
            {data[0].Product_Name_Minimum} has the lowest price of {data[0].Min_Charge} for the {data[0].description} compared to the {data.length} insurance products at this hospital. This price is {data[0].Max_Charge - data[0].Min_Charge} lower from the median of {calculateMedian(data)} for {data[0].description} across insurance products.
          </p>
          
          <p>
            {data[1].Product_Name_Maximum} has the highest price of {data[1].Max_Charge} for the {data[1].description} compared to the {data.length} insurance products at this hospital. This price is {data[1].Max_Charge - data[1].Min_Charge} higher from the median of {calculateMedian(data)} for {data[1].description} across insurance products.  
          </p>
        </>
      }
    </div>
  );
  
  function calculateMedian(data) {
    const charges = data.map(item => item.Min_Charge);
    const mid = Math.floor(charges.length / 2);
    charges.sort((a, b) => a - b);
    return charges.length % 2 !== 0 ? charges[mid] : (charges[mid - 1] + charges[mid]) / 2; 
  }
}
```