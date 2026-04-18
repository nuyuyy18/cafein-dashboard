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
        # locale en-US so Maps shows English labels ('Overview','Menu','Reviews','About')
        self.page = self.browser.new_page(locale="en-US", extra_http_headers={"Accept-Language": "en-US,en;q=0.9"})
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

    def _scroll_gallery_panel(self, max_scrolls=60):
        """Scroll the thumbnail panel until no more content is added or max reached."""
        try:
            selector = '.m6QErb.DxyBCb'
            last_count = 0
            no_change_count = 0
            
            for i in range(max_scrolls):
                # Scroll
                self.page.evaluate(f"document.querySelector('{selector}').scrollTop += 5000")
                time.sleep(1.2) # Increased sleep for slow network
                
                # Check for new items
                current_count = self.page.locator(f"{selector} div[style*='background-image']").count()
                if current_count == last_count:
                    no_change_count += 1
                    if no_change_count >= 5: break # Be more patient (5 scrolls)
                else:
                    no_change_count = 0
                last_count = current_count
                
                if (i+1) % 5 == 0:
                    print(f"      Scrolled {i+1} times, found {current_count} tiles...")
        except Exception as e:
            print(f"      scroll warning: {e}")

    def _extract_images_from_dom(self):
        """Extract all googleusercontent images (bg-image divs + img tags) from current DOM."""
        imgs = set()
        # Background-image divs (thumbnail tiles)
        els = self.page.locator("div[style*='background-image']").all()
        for el in els:
            try:
                bg = el.get_attribute("style") or ""
                if 'url("' in bg:
                    url = bg.split('url("')[1].split('")')[0]
                    if "googleusercontent.com" in url:
                        imgs.add(self.get_hd_image_url(url))
            except: pass
        # img tags (full-size viewer and thumbnails)
        img_els = self.page.locator("img[src*='googleusercontent']").all()
        for img in img_els:
            try:
                src = img.get_attribute("src") or ""
                if "googleusercontent.com" in src:
                    imgs.add(self.get_hd_image_url(src))
            except: pass
        return imgs

    def _open_gallery_and_get_all(self):
        """
        Opens the photo gallery and returns:
        { 'all': set_of_cafe_photo_urls, 'menu': set_of_menu_photo_urls }
        """
        result = {'all': set(), 'menu': set()}
        try:
            photo_btn = self.page.locator("button.aoRNLd").first
            if photo_btn.count() == 0:
                print("      No gallery button — using fallback")
                result['all'].update(self._extract_images_from_dom())
                return result

            photo_btn.click(timeout=10000)

            # Wait for gallery chips to appear (confirms gallery is open)
            try:
                self.page.wait_for_selector("button.hh2c6", timeout=8000)
            except:
                print("      Gallery chips not found — may still have images")
            time.sleep(1)

            # Close any login modal
            try:
                for close_sel in ["button.Cwoqlf", "button[aria-label='Close']", "button[aria-label='Tutup']"]:
                    c = self.page.locator(close_sel)
                    if c.count() > 0:
                        c.first.click(timeout=2000)
                        time.sleep(1)
                        break
            except: pass

            # Read chips
            chips = self.page.locator("button.hh2c6").all()
            chip_texts = []
            menu_chip = None
            for c in chips:
                try:
                    t = c.inner_text().strip()
                    chip_texts.append(t)
                    if t.lower() in ('menu',) or t.lower().startswith('menu'):
                        menu_chip = c
                except: pass
            print(f"      Gallery chips: {chip_texts}")

            # --- Step 1: Collect ALL cafe photos ---
            self._scroll_gallery_panel(max_scrolls=40)
            result['all'].update(self._extract_images_from_dom())
            print(f"      [Gallery All] Final: {len(result['all'])} images")

            # --- Step 2: Collect Menu & Food photos ---
            menu_related_chips = []
            for c in chips:
                try:
                    t = c.inner_text().strip().lower()
                    if any(x in t for x in ('menu', 'food', 'makanan', 'minuman', 'drink')):
                        menu_related_chips.append(c)
                except: pass
            
            print(f"      Found {len(menu_related_chips)} menu-related chips.")
            for chip in menu_related_chips:
                try:
                    chip.click(timeout=3000)
                    time.sleep(2)
                    self._scroll_gallery_panel(max_scrolls=20)
                    chunk = self._extract_images_from_dom()
                    result['menu'].update(chunk)
                    print(f"      [Gallery Menu-Related] Current menu total: {len(result['menu'])} images")
                except: pass

            # Close gallery
            self.page.keyboard.press("Escape")
            time.sleep(1)

        except Exception as e:
            print(f"      ERROR opening gallery: {e}")
            try:
                self.page.keyboard.press("Escape")
                time.sleep(1)
            except: pass
        return result


    def extract_cafe_images(self):
        """Extracts ALL cafe photos (including env, interior, food) from the gallery."""
        # Gallery is shared with menu, so we open once in scrape_cafe_page
        # Results stored in self._gallery_cache
        return list(self._gallery_cache.get('all', set()))

    def extract_menu_images(self):
        """Extracts menu images from gallery Menu chip AND sidebar Menu tab."""
        menu = {"link": None, "images": []}
        image_urls = set()
        try:
            # 1. Check for external menu link
            menu_link_el = self.page.locator("a[data-item-id='menu'], button[data-item-id='menu']")
            if menu_link_el.count() > 0:
                href = menu_link_el.get_attribute("href") or ""
                menu["link"] = href
                if "drive.google.com" in href or href.endswith(".pdf"):
                    return menu

            # 2. Gallery Menu chip (from cache)
            image_urls.update(self._gallery_cache.get('menu', set()))
            print(f"      [Menu from gallery cache] {len(image_urls)} images")

            # 3. Sidebar Menu tab
            # In Indonesian: 'Menu' tab (same word)
            # In English: 'Menu' tab
            sidebar_tabs = self.page.locator("button.hh2c6").all()
            menu_tab = None
            overview_tab = None
            for t in sidebar_tabs:
                try:
                    text = t.inner_text().strip()
                    if text.lower() in ('menu', 'menu & harga', 'menu & prices'):
                        menu_tab = t
                    if text.lower() in ('overview', 'ringkasan'):
                        overview_tab = t
                except: pass

            if menu_tab:
                menu_tab.click(timeout=5000)
                time.sleep(3)

                for _ in range(10):
                    self.page.keyboard.press("PageDown")
                    time.sleep(0.5)
                    self.page.mouse.wheel(0, 1000)
                    time.sleep(0.5)

                elements = self.page.locator("div[style*='background-image']").all()
                for el in elements:
                    try:
                        bg = el.get_attribute("style") or ""
                        if 'url("' in bg:
                            src = bg.split('url("')[1].split('")')[0]
                            if "googleusercontent.com" in src:
                                image_urls.add(self.get_hd_image_url(src))
                    except: pass

                img_els = self.page.locator("img").all()
                for img in img_els:
                    try:
                        src = img.get_attribute("src") or ""
                        if "googleusercontent.com" in src and "p/AF1Qip" in src:
                            image_urls.add(self.get_hd_image_url(src))
                    except: pass

                print(f"      [Menu sidebar tab] {len(image_urls)} total images")

                if overview_tab:
                    overview_tab.click(timeout=3000)
                    time.sleep(1)

        except Exception as e:
            print(f"      ERROR extraction menu: {e}")

        menu["images"] = list(image_urls)
        return menu

    def extract_customer_reviews(self):
        reviews = []
        try:
            # Click reviews tab
            tabs = self.page.locator("button.hh2c6").all()
            found_tab = False
            for tab in tabs:
                text = tab.inner_text().lower()
                if "review" in text or "ulasan" in text:
                    tab.click()
                    time.sleep(2)
                    found_tab = True
                    break
            
            if not found_tab:
                # Fallback role-based selector
                rev_tab = self.page.locator('button[role="tab"][aria-label*="Review"], button[role="tab"][aria-label*="Ulasan"]').first
                if rev_tab.count() > 0:
                    rev_tab.click()
                    time.sleep(2)

            # Scroll to load more reviews
            print("      Scrolling reviews...")
            for i in range(8):
                self.page.evaluate("document.querySelector('.m6QErb.DxyBCb').scrollTop += 3000")
                time.sleep(1.5)
                if (i+1) % 4 == 0:
                    print(f"      Review scroll {i+1}...")

            # Expand "More" buttons safely using JS
            print("      Expanding long reviews...")
            self.page.evaluate("""
                document.querySelectorAll('button.w8oYf, span.w8oYf, button.w8nwRe.kyuRq').forEach(btn => {
                    if (btn.innerText.includes('More') || btn.innerText.includes('Lainnya') || btn.getAttribute('aria-label')?.includes('More')) {
                        btn.click();
                    }
                });
            """)
            time.sleep(1.5)

            review_blocks = self.page.locator("div.jftiEf").all()
            for i, block in enumerate(review_blocks):
                if i >= 10: break # Get top 10 reviews
                try:
                    # Author
                    author = "N/A"
                    if block.locator(".d4r55").count() > 0:
                        author = block.locator(".d4r55").first.inner_text()
                    
                    # Rating - Trying multiple confirmed Maps classes
                    rating = "N/A"
                    for cls in ["span.kvqyne", "span.kvMYIc", "span.kvMY6c"]:
                        stars_el = block.locator(cls).first
                        if stars_el.count() > 0:
                            rating_aria = stars_el.get_attribute("aria-label")
                            if rating_aria:
                                rating = rating_aria.split()[0]
                                break
                    
                    # Text
                    text = ""
                    if block.locator(".wiI7pd").count() > 0:
                        text = block.locator(".wiI7pd").first.inner_text()
                    
                    reviews.append({
                        "author": author,
                        "rating": rating,
                        "text": text
                    })
                except: continue
            print(f"      Scraped {len(reviews)} reviews.")
        except Exception as e:
            print(f"      ERROR reviews: {e}")
        return reviews

    def scrape_cafe_page(self, url):
        try:
            print("  → Loading data...")
            self.page.goto(url, timeout=30000)
            self.page.wait_for_selector("h1.DUwDvf", timeout=10000)
            time.sleep(2)
            
            data = self.extract_basic_info()
            
            # Filter non-cafe entries (allowed: cafe, coffee, kopi, kedai, resto, etc.)
            allowed_cats = ['cafe', 'coffee', 'kopi', 'kedai', 'roaster', 'bakery', 'tea', 'boba',
                            'dessert', 'beverage', 'minuman', 'restaurant', 'restoran', 'warung kopi',
                            'espresso']
            cat_lower = data.get('category', '').lower()
            if not any(keyword in cat_lower for keyword in allowed_cats):
                print(f"      Skipping non-cafe category: '{data.get('category')}'")
                return None
            
            data['link'] = url
            data['opening_hours'] = self.extract_opening_hours()
            
            # Open gallery ONCE — collect all cafe photos + menu photos in one pass
            self._gallery_cache = self._open_gallery_and_get_all()
            
            data['photos'] = self.extract_cafe_images()
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
            
            # Force update, bypass SKIP logic:
            # if self.already_exists(name, region_file):
            #     print(f"[{i+1}] SKIP: {name}")
            #     continue
                
            print(f"\n[{i+1}] Processing: {name}")
            data = self.scrape_direct(name, address)
            
            if data:
                # Load, Append, Save
                if os.path.exists(region_file):
                    with open(region_file, 'r', encoding='utf-8') as f:
                        current = json.load(f)
                else: current = []
                
                existing_idx = next((index for index, d in enumerate(current) if d.get('name') == data.get('name')), None)
                if existing_idx is not None:
                    current[existing_idx] = data
                    print(f"  💾 Updated {name} in {region_file}")
                else:
                    current.append(data)
                    print(f"  💾 Saved new {name} to {region_file}")
                
                with open(region_file, 'w', encoding='utf-8') as f:
                    json.dump(current, f, indent=4, ensure_ascii=False)
                added += 1
            else:
                print("  ✗ Not found")
            time.sleep(1)
            
        self.close_browser()
        print(f"\nDone. Added {added} new cafes.")

if __name__ == "__main__":
    scraper = CafeScraper()
    scraper.run()
