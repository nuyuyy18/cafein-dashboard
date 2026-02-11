import json
import os

REGIONS = {
    "sleman": "cafe_data_Sleman.json",
    "kota_yogyakarta": "cafe_data_Kota_Yogyakarta.json",
    "bantul": "cafe_data_Bantul.json",
    "kulon_progo": "cafe_data_Kulon_Progo.json",
    "gunung_kidul": "cafe_data_Gunung_Kidul.json"
}

def count_unique():
    unique_names = set()
    total_records = 0
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for filename in REGIONS.values():
        filepath = os.path.join(base_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                total_records += len(data)
                for c in data:
                    if c.get("name"):
                        unique_names.add(c["name"])
    
    print(f"Total Records in JSON: {total_records}")
    print(f"Unique Cafe Names: {len(unique_names)}")

if __name__ == "__main__":
    count_unique()
