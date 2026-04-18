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
            # Dump all button texts inside the modal
            modal = page.locator('.m6QErb.D5yXZc').first
            if modal:
                btns = modal.locator('button').all()
                for btn in btns:
                    try: print('Gallery Button:', btn.inner_text().strip())
                    except: pass
            
                # Find by text
                menu_btn = modal.locator('button:has-text("Menu")').first
                if menu_btn.count() > 0:
                    print('Menu button FOUND via has-text!')
                    menu_btn.click()
                    time.sleep(2)
                    
                    for _ in range(5):
                        page.keyboard.press("PageDown")
                        page.mouse.wheel(0, 1000)
                        time.sleep(1)
                    
                    imgs = page.locator("div[style*='background-image']").all()
                    print('Total Menu Images:', len(imgs))
        except Exception as e:
            print('Error:', e)
        b.close()
if __name__ == "__main__":
    test()
