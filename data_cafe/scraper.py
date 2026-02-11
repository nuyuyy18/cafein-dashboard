import json
import time
import os
import re
import sys
import requests
from playwright.sync_api import sync_playwright

# Fix Windows console encoding if needed
if sys.platform == "win32":
    import codecs
    try:
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    except:
        pass

class CafeScraper:
    """
    Robust Cafe Scraper for Google Maps.
    - runs in foreground (headful)
    - extracts HD images, hours, reviews
    - checks for duplicates
    """
    
    def __init__(self, input_file="consolidated_list.json"):
        self.input_file = input_file
        self.browser = None
        self.page = None
        self.playwright = None
        
        # Mapping for output based on address keywords
        self.region_mapping = {
            "sleman": "cafe_data_Sleman.json",
            "kota yogyakarta": "cafe_data_Kota_Yogyakarta.json",
            "yogyakarta city": "cafe_data_Kota_Yogyakarta.json",
            "bantul": "cafe_data_Bantul.json",
            "kulon progo": "cafe_data_Kulon_Progo.json",
            "gunung kidul": "cafe_data_Gunung_Kidul.json",
            "gunungkidul": "cafe_data_Gunung_Kidul.json",
        }
        
    def start_browser(self):
        print("🌐 Starting browser...")
        self.playwright = sync_playwright().start()
        # Headless=False for visibility as requested
        self.browser = self.playwright.chromium.launch(channel="msedge", headless=False)
        self.page = self.browser.new_page()
        print("✓ Browser ready!\n")
        
    def close_browser(self):
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()

    def determine_region_file(self, address):
        addr = address.lower()
        if not addr: return "cafe_data_Sleman.json"
        
        for key, vide_file in self.region_mapping.items():
            if key in addr:
                return vide_file
        return "cafe_data_Sleman.json"

    def already_exists(self, name, region_file):
        if not os.path.exists(region_file): return False
        try:
            with open(region_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                names = {entry.get('name', '').lower().strip() for entry in data}
                return name.lower().strip() in names
        except:
            return False

    # --- Extraction Methods (from FreshScraper) ---

    def extract_basic_info(self):
        info = {}
        try:
            # Name
            if self.page.locator("h1.DUwDvf").count() > 0:
                info['name'] = self.page.locator("h1.DUwDvf").first.inner_text()
            else:
                info['name'] = ""
            
            # Address
            address = "N/A"
            if self.page.locator("button[data-item-id='address']").count() > 0:
                raw = self.page.locator("button[data-item-id='address']").get_attribute("aria-label") or ""
                address = raw.replace("Address: ", "").replace("Alamat: ", "").strip()
            info['address'] = address
            
            # Rating and Reviews Count
            rating = "N/A"
            reviews_count = "N/A"
            if self.page.locator(".F7nice").count() > 0:
                rating_text = self.page.locator(".F7nice").first.inner_text()
                parts = rating_text.split("(")
                if len(parts) > 0:
                    rating = parts[0].strip()
                if len(parts) > 1:
                    reviews_count = parts[1].replace(")", "").strip()
            info['rating'] = rating
            info['reviews_count'] = reviews_count
            
            # Category
            category = "Cafe"
            if self.page.locator("button.DkEaL").count() > 0:
                category = self.page.locator("button.DkEaL").first.inner_text()
            info['category'] = category
            
            # Phone
            phone = "N/A"
            if self.page.locator("button[data-item-id^='phone:']").count() > 0:
                phone_aria = self.page.locator("button[data-item-id^='phone:']").get_attribute("aria-label") or ""
                phone = phone_aria.replace("Phone: ", "").replace("Telepon: ", "").strip()
            info['phone'] = phone
            
        except Exception as e:
            print(f"      ERROR extracting basic info: {e}")
        return info

    def extract_opening_hours(self):
        opening_hours = []
        try:
            # Try click to expand
            selectors = ["button[data-item-id='oh']", "button[aria-label*='Open']", "div.VkpGBb"]
            if self.page.locator("table.eK4R0e").count() == 0:
                for sel in selectors:
                    if self.page.locator(sel).count() > 0:
                        try:
                            self.page.locator(sel).first.click()
                            time.sleep(1)
                            break
                        except: continue

            if self.page.locator("table.eK4R0e").count() > 0:
                rows = self.page.locator("table.eK4R0e tr").all()
                for row in rows:
                    text = row.inner_text().strip().replace("\n", " ")
                    if len(text) > 3:
                        opening_hours.append(text)
        except Exception as e:
            print(f"      ERROR extracting hours: {e}")
        return opening_hours

    def get_hd_image_url(self, url):
        if not url or "googleusercontent.com" not in url: return url
        if "=" in url:
            return f"{url.split('=')[0]}=s0"
        return url

    def extract_menu_images(self):
        menu = {"link": None, "images": []}
        try:
            if self.page.locator("a[data-item-id='menu']").count() > 0:
                menu["link"] = self.page.locator("a[data-item-id='menu']").get_attribute("href")
                if menu["link"] and "drive.google.com" in menu["link"]:
                     return menu
            
            image_urls = set()
            self.page.keyboard.press("PageDown")
            time.sleep(1)
            
            elements = self.page.locator("img, div[style*='background-image']").all()
            for el in elements:
                if len(image_urls) > 30: break
                src = ""
                try:
                    tagName = el.evaluate("el => el.tagName")
                    if tagName == "IMG":
                        src = el.get_attribute("src")
                    elif tagName == "DIV":
                        style = el.get_attribute("style")
                        if "url(" in style:
                            src = style.split('url("')[1].split('")')[0]
                except: continue
                
                if src and "googleusercontent.com" in src:
                    hd = self.get_hd_image_url(src)
                    image_urls.add(hd)
            
            menu["images"] = list(image_urls)
        except Exception as e:
            print(f"      ERROR extraction menu: {e}")
        return menu

    def extract_customer_reviews(self):
        reviews = []
        try:
            # Click reviews tab
            tabs = self.page.locator("button.hh2c6").all()
            for tab in tabs:
                if "Review" in tab.inner_text() or "Ulasan" in tab.inner_text():
                    tab.click()
                    time.sleep(2)
                    break
            
            review_blocks = self.page.locator("div.jftiEf").all()
            for i, block in enumerate(review_blocks):
                if i >= 5: break
                try:
                    reviews.append({
                        "author": block.locator(".d4r55").inner_text(),
                        "rating": block.locator(".kvMYJc").get_attribute("aria-label"),
                        "text": block.locator(".wiI7pd").inner_text()
                    })
                except: continue
        except Exception as e:
            print(f"      ERROR reviews: {e}")
        return reviews

    def scrape_cafe_page(self, url):
        try:
            print("  → Loading data...")
            self.page.goto(url, timeout=30000)
            self.page.wait_for_selector("h1.DUwDvf", timeout=10000)
            time.sleep(1)
            
            data = self.extract_basic_info()
            data['link'] = url
            data['opening_hours'] = self.extract_opening_hours()
            data['menu'] = self.extract_menu_images()
            data['customer_reviews'] = self.extract_customer_reviews()
            return data
        except Exception as e:
            print(f"  ✗ Error scraping page: {e}")
            return None

    def scrape_direct(self, name, address):
        """Use direct search URL"""
        print(f"    🔍 Searching: {name}...")
        query = f"{name} {address}"
        encoded = requests.utils.quote(query) if 'requests' in sys.modules else query.replace(" ", "+")
        url = f"https://www.google.com/maps/search/{encoded}"
        
        try:
            self.page.goto(url, timeout=30000)
            time.sleep(2)
            
            # Click first result if list view
            if "search" in self.page.url:
                 try:
                    self.page.wait_for_selector("a[href*='/maps/place/']", timeout=5000)
                    self.page.locator("a[href*='/maps/place/']").first.click()
                    time.sleep(2)
                 except: pass

            try:
                self.page.wait_for_selector("h1.DUwDvf", timeout=5000)
                return self.scrape_cafe_page(self.page.url)
            except:
                return None
                
        except Exception as e:
            print(f"      ✗ Search error: {e}")
            return None

    def run(self):
        if not os.path.exists(self.input_file):
            print(f"Input file {self.input_file} not found.")
            return
            
        with open(self.input_file, 'r', encoding='utf-8') as f:
            tasks = json.load(f)
            
        print(f"loaded {len(tasks)} cafes from list.")
        self.start_browser()
        
        added = 0
        for i, task in enumerate(tasks):
            name = task.get('name')
            address = task.get('address', '')
            region_file = self.determine_region_file(address)
            
            if self.already_exists(name, region_file):
                print(f"[{i+1}] SKIP: {name}")
                continue
                
            print(f"\n[{i+1}] Processing: {name}")
            data = self.scrape_direct(name, address)
            
            if data:
                # Load, Append, Save
                if os.path.exists(region_file):
                    with open(region_file, 'r', encoding='utf-8') as f:
                        current = json.load(f)
                else: current = []
                
                if not any(d.get('name') == data.get('name') for d in current):
                    current.append(data)
                    with open(region_file, 'w', encoding='utf-8') as f:
                        json.dump(current, f, indent=4, ensure_ascii=False)
                    print(f"  💾 Saved to {region_file}")
                    added += 1
            else:
                print("  ✗ Not found")
            time.sleep(1)
            
        self.close_browser()
        print(f"\nDone. Added {added} new cafes.")

if __name__ == "__main__":
    scraper = CafeScraper()
    scraper.run()
