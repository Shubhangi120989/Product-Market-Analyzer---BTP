import csv
import json
import boto3
from concurrent.futures import ThreadPoolExecutor, as_completed

lambda_client = boto3.client('lambda')

lambda_arn = "arn:aws:lambda:ap-south-1:703671918077:function:productanalyzer"

file_name = "Rag Pipeline Analysis Data - Sheet1.csv"

def read_csv(file_path):
    with open(file_path, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        data = [row for row in reader]
    return data

def process_row(index, row):
    try:
        product = row.get('product')
        product_category = row.get('product category')
        
        lambda_payload = { 
            "product_name": product, 
            "product_description": "N/A", 
            "product_category": product_category 
        }
        print(f"Processing row {index}: {lambda_payload}")

        response = lambda_client.invoke(
            FunctionName=lambda_arn,
            InvocationType='RequestResponse',
            Payload=json.dumps(lambda_payload)
        )

        response_payload = json.loads(response['Payload'].read().decode('utf-8'))
        print(f"Response for row {index}: {response_payload}")
        product_id = json.loads(response_payload.get('body', {})).get('product', {}).get('_id')
        
        print(f"Row {index}: Product ID: {product_id}")
        return index, product_id
    except Exception as e:
        print(f"Error processing row {index}: {e}")
        return index, None

def write_csv_with_product_ids(file_path, data, product_ids):
    with open(file_path.replace('.csv', '_with_product_ids.csv'), mode='w', newline='', encoding='utf-8') as file:
        fieldnames = list(data[0].keys()) + ['product_id']
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        
        for i, row in enumerate(data):
            row['product_id'] = product_ids.get(i)
            writer.writerow(row)

data = read_csv(file_name)

product_ids = {}

# Process rows in parallel
with ThreadPoolExecutor(max_workers=100) as executor:
    futures = {executor.submit(process_row, index, row): index for index, row in enumerate(data)}
    
    for future in as_completed(futures):
        index, product_id = future.result()
        product_ids[index] = product_id

# Write updated CSV with product IDs
write_csv_with_product_ids(file_name, data, product_ids)
print("Processing complete. Updated CSV saved.")