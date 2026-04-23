import requests
import json
import re

with open("cafe_data_Bantul.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for item in data[:5]:
    url = item.get("link")
    if not url: continue
    print(f"Testing {item['name']}")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        r = requests.get(url, headers=headers, timeout=10)
        html = r.text
        
        # Sometimes cover image is in meta property "og:image"
        og_search = re.search(r'<meta content="([^"]+)" itemprop="image">|<meta property="og:image" content="([^"]+)">', html)
        og_img = None
        if og_search:
             og_img = og_search.group(1) or og_search.group(2)
        print(f"Image: {og_img}")
    except Exception as e:
        print("Error", e)
