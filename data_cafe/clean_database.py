import json
import glob
import os

# Whitelist of categories that are likely to be actual cafes/coffee spots
WHITELIST = [
    "Cafe", 
    "Coffee shop", 
    "Art cafe", 
    "Espresso bar", 
    "Kedai Kopi", 
    "Coffee roastery", 
    "Coffee roasters", 
    "Cosplay cafe", 
    "Coffee stand", 
    "Cafeteria"
]

def clean_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
            return
    
    before_count = len(data)
    # Filter based on whitelist
    cleaned_data = [
        item for item in data 
        if item.get('category') in WHITELIST
    ]
    after_count = len(cleaned_data)
    
    # Standardize data: ensure keys exist
    for item in cleaned_data:
        if 'photos' not in item or not isinstance(item['photos'], list):
            item['photos'] = []
        if 'menu' not in item:
            item['menu'] = {'link': None, 'images': []}
        if 'customer_reviews' not in item:
            item['customer_reviews'] = []
            
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, indent=4, ensure_ascii=False)
    
    print(f"CLEANED {filepath}: {before_count} -> {after_count} (Removed {before_count - after_count})")

if __name__ == "__main__":
    files = glob.glob("cafe_data_*.json")
    # Exclusion list for test files
    files = [f for f in files if "test_" not in f]
    
    print(f"Starting data cleaning across {len(files)} files...")
    for f in files:
        clean_file(f)
    print("\nCleaning complete!")
