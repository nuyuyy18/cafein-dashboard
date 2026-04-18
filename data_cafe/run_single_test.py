from scraper import CafeScraper
import json

# Run scraper for just 1 cafe
s = CafeScraper(input_file="test_tomoro.json")
s.region_mapping = {"sleman": "test_output.json"}
# Delete old test output
import os
if os.path.exists("test_output.json"): os.remove("test_output.json")
s.run()

# Print result
if os.path.exists("test_output.json"):
    with open("test_output.json", encoding="utf-8") as f:
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
