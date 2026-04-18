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
        
        # Wait explicitly for hh2c6 chips to appear
        print("Waiting for chips to appear...")
        try:
            page.wait_for_selector("button.hh2c6", timeout=8000)
            print("Chips appeared!")
        except:
            print("Chips timeout - checking DOM anyway...")
        
        time.sleep(2)
        page.screenshot(path="gallery_chips.png")
        
        chips = page.locator("button.hh2c6").all()
        print(f"Found {len(chips)} hh2c6 buttons:")
        for c in chips:
            try: print(f"  chip: '{c.inner_text().strip()}'")
            except: pass
        
        # Count images before any scroll
        bg_count = page.locator("div[style*='background-image']").count()
        img_count = page.locator("img[src*='googleusercontent']").count()
        print(f"\nBefore scroll: {bg_count} bg-images, {img_count} img srcs")
        
        # Try JS scroll on the gallery's scrollable left panel
        # The left panel in gallery is the element right under the chips
        # Let's find it by scrollable detection
        print("\nFinding scrollable containers...")
        scrollables = page.evaluate("""
            () => {
                const els = document.querySelectorAll('*');
                const found = [];
                for (let el of els) {
                    if (el.scrollHeight > el.clientHeight + 50 && el.clientHeight > 200) {
                        found.push({
                            tag: el.tagName,
                            class: el.className.substring(0, 80),
                            scrollHeight: el.scrollHeight,
                            clientHeight: el.clientHeight,
                            scrollTop: el.scrollTop
                        });
                    }
                }
                return found.slice(0, 15);
            }
        """)
        for s in scrollables:
            print(f"  {s['tag']} class='{s['class']}' scrollH={s['scrollHeight']} clientH={s['clientHeight']}")
        
        # Try scrolling each container
        page.evaluate("""
            () => {
                const els = document.querySelectorAll('*');
                for (let el of els) {
                    if (el.scrollHeight > el.clientHeight + 200 && el.clientHeight > 300) {
                        el.scrollTop = 15000;
                    }
                }
            }
        """)
        time.sleep(2)
        
        bg_count2 = page.locator("div[style*='background-image']").count()
        img_count2 = page.locator("img[src*='googleusercontent']").count()
        print(f"\nAfter JS scroll: {bg_count2} bg-images, {img_count2} img srcs")
        
        # Extract them
        imgs = set()
        els = page.locator("div[style*='background-image']").all()
        for el in els:
            bg = el.get_attribute("style") or ""
            if 'url("' in bg:
                url = bg.split('url("')[1].split('")')[0]
                if "googleusercontent.com" in url:
                    imgs.add(url)
        print(f"Unique images: {len(imgs)}")
        for img in list(imgs)[:8]:
            print(f"  {img[:90]}...")
            
        b.close()

if __name__ == "__main__":
    test()
