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
            time.sleep(4)
            print('Opened photo viewer')
            
            # Print all button texts
            btns = page.locator('button, div[role="tab"], div[role="button"]').all()
            for btn in btns:
                try: 
                    t = btn.inner_text().strip()
                    if t: print('BTN:', t.replace('\n', ' '))
                except: pass
                
        except Exception as e:
            print('Error:', e)
        b.close()
if __name__ == "__main__":
    test()
