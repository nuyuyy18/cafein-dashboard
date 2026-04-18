from playwright.sync_api import sync_playwright
import time

def test():
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=False)
        page = b.new_page(locale="en-US", extra_http_headers={"Accept-Language": "en-US,en;q=0.9"})
        page.goto('https://www.google.com/maps/search/TOMORO+COFFEE+-+Seturan+Sleman', timeout=60000)
        page.wait_for_selector('h1.DUwDvf')
        time.sleep(3)
        
        # Click gallery button
        print("Clicking gallery button...")
        page.locator("button.aoRNLd").first.click(timeout=10000)
        time.sleep(3)
        
        # Take screenshot to see what gallery looks like
        page.screenshot(path="gallery_open.png")
        
        # Print all buttons in gallery
        btns = page.locator("button").all()
        print(f"\nTotal buttons: {len(btns)}")
        for btn in btns[:30]:
            try:
                txt = btn.inner_text().strip()
                cls = btn.get_attribute("class") or ""
                lbl = btn.get_attribute("aria-label") or ""
                if txt or lbl:
                    print(f"  btn class='{cls[:30]}' txt='{txt[:40]}' lbl='{lbl[:60]}'")
            except: pass
            
        # Check how many background images exist right now  
        initial_imgs = page.locator("div[style*='background-image']").count()
        print(f"\nInitial background images: {initial_imgs}")
        
        # Scroll down slowly and track image count
        for i in range(10):
            page.keyboard.press("PageDown")
            time.sleep(0.5)
            page.mouse.wheel(0, 1500)
            time.sleep(0.5)
            count = page.locator("div[style*='background-image']").count()
            print(f"  After scroll {i+1}: {count} images")
            
        # Final extraction
        imgs = set()
        els = page.locator("div[style*='background-image']").all()
        for el in els:
            bg = el.get_attribute("style") or ""
            if 'url("' in bg:
                url = bg.split('url("')[1].split('")')[0]
                if "googleusercontent.com" in url:
                    imgs.add(url)
                    
        print(f"\nTotal unique googleusercontent images: {len(imgs)}")
        for img in list(imgs)[:5]:
            print(f"  {img[:80]}...")
            
        b.close()
        
if __name__ == "__main__":
    test()
