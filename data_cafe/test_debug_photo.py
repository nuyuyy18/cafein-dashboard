from playwright.sync_api import sync_playwright
import time

def test():
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=False)
        page = b.new_page(locale='en-US')
        page.goto('https://www.google.com/maps/search/TOMORO+COFFEE+-+Seturan+Sleman', timeout=60000)
        page.wait_for_selector('h1.DUwDvf')
        time.sleep(3)
        
        print("--- Looking for photo buttons ---")
        # Try multiple selectors to find the photos section
        selectors = [
            "button[aria-label*='photo' i]",
            "button[aria-label*='foto' i]",
            "button.aoRNLd",
            ".ZKCDEc button",
            ".RZ66Rb button",
            "div.RZ66Rb",
            "button.Tia5sc",
        ]
        for sel in selectors:
            count = page.locator(sel).count()
            if count > 0:
                try:
                    label = page.locator(sel).first.get_attribute("aria-label") or ""
                    text = page.locator(sel).first.inner_text().strip()
                    print(f"FOUND: {sel} | count={count} | label={label[:60]} | text={text[:40]}")
                except Exception as e:
                    print(f"FOUND (error getting text): {sel} count={count} | {e}")
            else:
                print(f"  Not found: {sel}")
        
        # Try to find any element with "photo" in aria-label
        print("\n--- All elements with 'photo' in aria-label ---")
        els = page.locator("[aria-label*='photo' i], [aria-label*='foto' i]").all()
        for el in els[:10]:
            try:
                tag = el.evaluate("el => el.tagName")
                label = el.get_attribute("aria-label") or ""
                print(f"  {tag}: {label[:80]}")
            except: pass
        
        # Try clicking via screenshot to see the page first
        page.screenshot(path="debug_page.png")
        print("\nScreenshot saved to debug_page.png")
        b.close()

if __name__ == "__main__":
    test()
