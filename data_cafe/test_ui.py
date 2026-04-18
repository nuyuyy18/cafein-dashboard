from playwright.sync_api import sync_playwright
import time
def test():
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(locale='en-US')
        page.goto('https://www.google.com/maps/search/TOMORO+COFFEE+-+Seturan+Sleman', timeout=60000)
        page.wait_for_selector('h1.DUwDvf')
        time.sleep(2)
        try:
            page.locator('button[aria-label*="photo" i], button[aria-label*="foto" i]').first.click(timeout=5000)
            time.sleep(3)
            chips = page.locator('button[type="radio"], button.hh2c6').all()
            print('Found', len(chips), 'tabs')
            for c in chips:
                try: print('Chip:', c.inner_text().strip())
                except: pass
        except Exception as e:
            print('Could not open gallery:', e)
        b.close()
if __name__ == '__main__':
    test()
