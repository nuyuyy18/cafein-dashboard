import json
import glob
import os

def main():
    all_cafes = []
    seen = set()
    
    # Read from existing cafe data files
    for f_path in glob.glob('cafe_data_*.json'):
        if not os.path.exists(f_path): continue
        with open(f_path, 'r', encoding='utf-8', errors='ignore') as f:
            try:
                data = json.load(f)
                for item in data:
                    name = item.get('name')
                    if name and name not in seen:
                        seen.add(name)
                        all_cafes.append({
                            'name': name,
                            'address': item.get('address', '')
                        })
            except Exception as e:
                print(f"Error reading {f_path}: {e}")

    # Write to consolidated_list.json to feed into the scraper
    with open('consolidated_list.json', 'w', encoding='utf-8') as f:
        json.dump(all_cafes, f, indent=4, ensure_ascii=False)
        
    print(f"Brought together {len(all_cafes)} unique locations into consolidated_list.json")

if __name__ == "__main__":
    main()
