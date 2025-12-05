import csv
import json
import boto3
import time
from typing import Dict, Any, Optional, Tuple

lambda_client = boto3.client('lambda')

lambda_arn = "arn:aws:lambda:ap-south-1:703671918077:function:productanalyzer"

file_name = "Rag Pipeline Analysis Data - Sheet1.csv"

def read_csv(file_path):
    with open(file_path, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        data = [row for row in reader]
    return data

def get_unique_products(data):
    unique_products = {}
    product_to_indices = {}
    
    for index, row in enumerate(data):
        product = row.get('product')
        product_category = row.get('product category')
        key = (product, product_category)
        
        if key not in unique_products:
            unique_products[key] = {
                'product': product,
                'product_category': product_category
            }
            product_to_indices[key] = []
        
        product_to_indices[key].append(index)
    
    return unique_products, product_to_indices

def process_unique_product_with_retry(key: Tuple, product_data: Dict[str, Any], max_retries: int = 3, delay: float = 2.0) -> Tuple[Tuple, Optional[str]]:
    """Process a unique product with retry logic for failures."""
    
    for attempt in range(max_retries):
        try:
            lambda_payload = { 
                "product_name": product_data['product'], 
                "product_description": "N/A", 
                "product_category": product_data['product_category'] 
            }
            print(f"Processing unique product (attempt {attempt + 1}/{max_retries}): {lambda_payload}")

            response = lambda_client.invoke(
                FunctionName=lambda_arn,
                InvocationType='RequestResponse',
                Payload=json.dumps(lambda_payload)
            )

            response_payload = json.loads(response['Payload'].read().decode('utf-8'))
            print(f"Response for {key}: {response_payload}")
            
            # Check if response indicates an error
            if response_payload.get('statusCode') == 500:
                error_message = json.loads(response_payload.get('body', '{}')).get('error', 'Unknown error')
                print(f"Lambda returned error (attempt {attempt + 1}): {error_message}")
                if attempt < max_retries - 1:
                    print(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
                    continue
                else:
                    print(f"Max retries reached for {key}")
                    return key, None
            
            product_id = json.loads(response_payload.get('body', '{}')).get('product', {}).get('_id')
            
            if product_id:
                print(f"Unique product {key}: Product ID: {product_id}")
                return key, product_id
            else:
                print(f"No product ID found in response for {key}")
                if attempt < max_retries - 1:
                    print(f"Retrying in {delay} seconds...")
                    time.sleep(delay)
                    continue
                else:
                    return key, None
                    
        except Exception as e:
            print(f"Error processing unique product {key} (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print(f"Max retries reached for {key}")
                return key, None
    
    return key, None

def write_csv_with_product_ids(file_path, data, product_ids):
    with open(file_path.replace('.csv', '_with_product_ids.csv'), mode='w', newline='', encoding='utf-8') as file:
        fieldnames = list(data[0].keys()) + ['product_id']
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        
        for i, row in enumerate(data):
            row['product_id'] = product_ids.get(i)
            writer.writerow(row)

data = read_csv(file_name)

# Get unique products and mapping to row indices
unique_products, product_to_indices = get_unique_products(data)
print(f"Found {len(unique_products)} unique products out of {len(data)} total rows")

# Process unique products serially with retries
unique_product_ids = {}
for i, (key, product_data) in enumerate(unique_products.items()):
    print(f"Processing {i+1}/{len(unique_products)}: {key}")
    key, product_id = process_unique_product_with_retry(key, product_data)
    unique_product_ids[key] = product_id
    
    # Add a small delay between requests to avoid overwhelming the service
    if i < len(unique_products) - 1:
        time.sleep(1)

# Map product IDs back to all rows
product_ids = {}
for key, product_id in unique_product_ids.items():
    for index in product_to_indices[key]:
        product_ids[index] = product_id

# Write updated CSV with product IDs
write_csv_with_product_ids(file_name, data, product_ids)
print("Processing complete. Updated CSV saved.")

# Print summary of failed products
failed_products = [key for key, product_id in unique_product_ids.items() if product_id is None]
if failed_products:
    print(f"\nFailed to process {len(failed_products)} products:")
    for key in failed_products:
        print(f"  - {key}")