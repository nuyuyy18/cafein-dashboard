from scraper import CafeScraper
import json
import os

# Run scraper for just 1 cafe (Ekstens)
s = CafeScraper(input_file="test_ekstens.json")
s.region_mapping = {"bantul": "test_output_ekstens.json"}

if os.path.exists("test_output_ekstens.json"): 
    os.remove("test_output_ekstens.json")

s.run()

# Print result
if os.path.exists("test_output_ekstens.json"):
    with open("test_output_ekstens.json", encoding="utf-8") as f:
        data = json.load(f)
    for cafe in data:
        print(f"\n=== {cafe['name']} ===")
        print(f"Category: {cafe.get('category')}")
        photos = cafe.get('photos', [])
        menu = cafe.get('menu', {})
        menu_imgs = menu.get('images', [])
        menu_link = menu.get('link')
        print(f"Cafe Photos: {len(photos)}")
        for p in photos[:3]:
            print(f"  - {p[:80]}...")
        print(f"Menu Images: {len(menu_imgs)}")
        for m in menu_imgs[:3]:
            print(f"  - {m[:80]}...")
        print(f"Menu Link: {menu_link}")
