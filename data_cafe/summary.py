import json
import os

files = {
    "Sleman": "cafe_data_Sleman.json",
    "Kota Yogyakarta": "cafe_data_Kota_Yogyakarta.json",
    "Bantul": "cafe_data_Bantul.json",
    "Kulon Progo": "cafe_data_Kulon_Progo.json",
    "Gunung Kidul": "cafe_data_Gunung_Kidul.json"
}

print("="*50)
print("📊 STATISTIK DATA CAFE")
print("="*50)

total_all = 0

for region, filename in files.items():
    if os.path.exists(filename):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
                count = len(data)
                total_all += count
                print(f"📍 {region:<20}: {count} cafe")
        except Exception as e:
            print(f"❌ {region:<20}: Error reading file")
    else:
        print(f"❌ {region:<20}: File not found")

print("-" * 50)
print(f"📈 TOTAL KESELURUHAN  : {total_all} cafe")
print("="*50)
