import csv
import json
import boto3
import time
import os
from typing import Dict, Any, Optional, Tuple

lambda_client = boto3.client('lambda')

lambda_arn = "arn:aws:lambda:ap-south-1:703671918077:function:productanalyzer"

file_name = "Rag Pipeline Analysis Data - Sheet1.csv"
progress_file = "product_processing_progress.json"

def save_progress(unique_product_ids: Dict, processed_count: int):
    """Save current progress to a JSON file."""
    progress_data = {
        'processed_count': processed_count,
        'unique_product_ids': {str(k): v for k, v in unique_product_ids.items()},
        'timestamp': time.time()
    }
    with open(progress_file, 'w') as f:
        json.dump(progress_data, f, indent=2)
    print(f"Progress saved: {processed_count} products processed")

def load_progress():
    """Load progress from JSON file if it exists."""
    if os.path.exists(progress_file):
        try:
            with open(progress_file, 'r') as f:
                progress_data = json.load(f)
            
            # Convert string keys back to tuples
            unique_product_ids = {}
            for key_str, value in progress_data['unique_product_ids'].items():
                key = eval(key_str)  # Convert string back to tuple
                unique_product_ids[key] = value
            
            print(f"Resuming from previous progress: {progress_data['processed_count']} products already processed")
            return unique_product_ids, progress_data['processed_count']
        except Exception as e:
            print(f"Error loading progress file: {e}")
            return {}, 0
    return {}, 0

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

def process_unique_product_with_retry(key: Tuple, product_data: Dict[str, Any], max_retries: int = 10, delay: float = 60.0) -> Tuple[Tuple, Optional[str]]:
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
                    print(f"Max retries reached for {key}. Pausing for 1 minute...")
                    time.sleep(60)  # 1 minute pause on final failure
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
                    print(f"Max retries reached for {key}. Pausing for 1 minute...")
                    time.sleep(60)  # 1 minute pause on final failure
                    return key, None
                    
        except Exception as e:
            print(f"Error processing unique product {key} (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print(f"Max retries reached for {key}. Pausing for 1 minute...")
                time.sleep(60)  # 1 minute pause on final failure
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

# Main execution
data = read_csv(file_name)

# Get unique products and mapping to row indices
unique_products, product_to_indices = get_unique_products(data)
print(f"Found {len(unique_products)} unique products out of {len(data)} total rows")

# Load previous progress
unique_product_ids, start_index = load_progress()

# Process unique products serially with retries, starting from where we left off
unique_products_list = list(unique_products.items())
for i in range(start_index, len(unique_products_list)):
    key, product_data = unique_products_list[i]
    
    # Skip if already processed
    if key in unique_product_ids:
        print(f"Skipping already processed product {i+1}/{len(unique_products_list)}: {key}")
        continue
    
    print(f"Processing {i+1}/{len(unique_products_list)}: {key}")
    key, product_id = process_unique_product_with_retry(key, product_data)
    unique_product_ids[key] = product_id
    
    # Save progress after each successful processing
    save_progress(unique_product_ids, i + 1)
    
    # Add a small delay between requests to avoid overwhelming the service
    if i < len(unique_products_list) - 1:
        time.sleep(1)

# Map product IDs back to all rows
product_ids = {}
for key, product_id in unique_product_ids.items():
    for index in product_to_indices[key]:
        product_ids[index] = product_id

# Write updated CSV with product IDs
write_csv_with_product_ids(file_name, data, product_ids)
print("Processing complete. Updated CSV saved.")

# Clean up progress file on successful completion
if os.path.exists(progress_file):
    os.remove(progress_file)
    print("Progress file cleaned up.")

# Print summary of failed products
failed_products = [key for key, product_id in unique_product_ids.items() if product_id is None]
if failed_products:
    print(f"\nFailed to process {len(failed_products)} products:")
    for key in failed_products:
        print(f"  - {key}")