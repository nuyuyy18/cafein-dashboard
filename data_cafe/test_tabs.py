from playwright.sync_api import sync_playwright
import time
def test():
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(locale='en-US')
        page.goto('https://www.google.com/maps/search/TOMORO+COFFEE+-+Seturan+Sleman', timeout=60000)
        page.wait_for_selector('h1.DUwDvf')
        time.sleep(2)
        
        roles = page.locator('div[role="tab"], button[role="tab"]').all()
        print('Found tabs:', len(roles))
        for r in roles:
            try: print('Tab:', r.inner_text().strip())
            except: pass
        b.close()
if __name__ == "__main__":
    test()
