from playwright.sync_api import sync_playwright
import time

def test():
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(locale='en-US')
        page.goto('https://www.google.com/maps/search/TOMORO+COFFEE+-+Seturan+Sleman', timeout=60000)
        page.wait_for_selector('h1.DUwDvf')
        time.sleep(2)
        
        # Look for Menu section explicitly
        print('Looking for Menu keyword in body...')
        menu_els = page.locator('text="Menu"').all()
        menu_buttons = []
        for el in menu_els:
            try:
                tag = el.evaluate("el => el.tagName")
                classes = el.get_attribute("class")
                text = el.inner_text().strip()
                print(f'Menu text element tag: {tag}, class: {classes}, text: {text}')
                if 'button' in tag.lower() or 'a' in tag.lower():
                    menu_buttons.append(el)
            except Exception as e: pass
            
        if menu_buttons:
            # try clicking the first button that indicates "Menu"
            for btn in menu_buttons:
                try:
                    if 'See all' in btn.inner_text() or 'Menu' in btn.inner_text():
                        print('Clicking:', btn.inner_text())
                        btn.click()
                        time.sleep(3)
                        break
                except: pass
                
        # Now see if we are in a gallery
        imgs = page.locator("div[style*='background-image']").all()
        urls = []
        for img in imgs:
            bg = img.get_attribute("style")
            if "url(\"" in bg:
                urls.append(bg.split('url("')[1].split('")')[0])
                
        print(f"Extracted {len(urls)} menu background-images")
        
        b.close()
        
if __name__ == "__main__":
    test()
