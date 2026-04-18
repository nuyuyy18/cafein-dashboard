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
            # Scroll down the overview pane to ensure Menu is loaded
            pane = page.locator('div[role="main"]').first
            for _ in range(5):
                page.keyboard.press("PageDown")
                time.sleep(0.5)

            # Find something that says "Menu"
            menu_headers = page.locator('h2:has-text("Menu"), div.fontHeadlineSmall:has-text("Menu")').all()
            for h in menu_headers:
                print('Found menu header:', h.inner_text())
                
            # Find the button that contains "menu" in aria-label, e.g. "See all 12 photos of menu"
            btn_see_all = page.locator('button[aria-label*="menu" i]').all()
            for b_el in btn_see_all:
                label = b_el.get_attribute("aria-label", timeout=1000)
                if label and ('see all' in label.lower() or 'lihat semua' in label.lower()):
                    print('Found see all menu button:', label)
                    b_el.click()
                    time.sleep(3)
                    
                    # Inside the menu gallery
                    for _ in range(5):
                        page.keyboard.press("PageDown")
                        time.sleep(0.5)
                        
                    imgs = page.locator("div[style*='background-image']").all()
                    print('Menu images extracted:', len(imgs))
                    break
        except Exception as e:
            print('Error:', e)
        b.close()
if __name__ == "__main__":
    test()
