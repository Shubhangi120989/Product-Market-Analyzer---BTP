from product_handler import ask_question
import csv

def read_csv(file_path):
    with open(file_path, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        data = [row for row in reader]
    return data

file_path = "Rag Pipeline Analysis Data - Sheet1.csv"

data = read_csv(file_path)
print(f"Total rows read from CSV: {len(data)}")

for index, row in enumerate(data):
    product = row.get('product')
    question = row.get('question')
    ground_truth = row.get('ground_truth')

    print(f"Product ID: {product}")
    print(f"Question: {question}")
    print(f"Ground Truth: {ground_truth}")

    # use 2 apis
    # 1. create product api
    # 2. ask the question from api.
    # 3. save all 4 responses 
    # 4. 4 types of ragas matrix
    # 5. 
    break