import requests
import re
import csv
import json
import os
import time

# List of potential GIDs to try or known GIDs
# User provided: 2110316902
# Default: 0
# List of GIDs from /preview source
# 0, 816723733, 1655714311, 491153819, 1003366302, 1179654046, 1345534347, 1760746570, 934661547, 488153191, 2110316902
POTENTIAL_GIDS = [
    0, 
    816723733, 
    1655714311, 
    491153819, 
    1003366302, 
    1179654046, 
    1345534347, 
    1760746570, 
    934661547, 
    488153191, 
    2110316902
]

# Also try to fetch the HTML and parse for "gid"
SPREADSHEET_ID = "10HXyrrbjUyQOxkZI3aHCI38imxdRKaZ8bUGB6TTQwZw"

def download_csv(gid):
    url = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={gid}"
    print(f"Downloading GID {gid}...")
    try:
        response = requests.get(url)
        if response.status_code == 200:
            filename = f"sheet_{gid}.csv"
            with open(filename, "wb") as f:
                f.write(response.content)
            print(f"  Saved to {filename}")
            return filename
        else:
            print(f"  Failed (Status {response.status_code})")
            return None
    except Exception as e:
        print(f"  Error: {e}")
        return None

def main():
    # 1. Download all potential sheets
    downloaded_files = []
    for gid in POTENTIAL_GIDS:
        f = download_csv(gid)
        if f: downloaded_files.append(f)

    # 2. Consolidate Data
    all_data = []
    
    for csv_file in downloaded_files:
        print(f"\nProcessing {csv_file}...")
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            print(f"  Headers: {headers}")
            
            for row in reader:
                # Normalize keys slightly if headers differ between sheets
                # We expect: Name Cafe, Address
                
                # Check different possible column names
                name = row.get('Name Cafe') or row.get('Nama Cafe') or row.get('Name')
                address = row.get('Address') or row.get('Alamat')
                
                if name and address:
                    all_data.append({
                        "name": name.strip(),
                        "address": address.strip(),
                        "phone": row.get('Phone', ''),
                        "category": row.get('Type', ''),
                    })
    
    print(f"\nTotal entries found: {len(all_data)}")
    
    # 3. Deduplicate (by Name + first 10 chars of address)
    unique_data = {}
    duplicates = 0
    
    for entry in all_data:
        key = f"{entry['name'].lower()}_{entry['address'][:15].lower()}"
        if key in unique_data:
            duplicates += 1
        else:
            unique_data[key] = entry
            
    print(f"Unique entries: {len(unique_data)} (Removed {duplicates} formatting duplicates)")
    
    # 4. Save consolidated
    with open('consolidated_list.json', 'w', encoding='utf-8') as f:
        json.dump(list(unique_data.values()), f, indent=4)
    print("Saved to consolidated_list.json")

if __name__ == "__main__":
    main()
