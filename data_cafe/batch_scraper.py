import json
import os
import glob
import time
from scraper import CafeScraper

def parse_count(count_str):
    if not count_str or count_str == "N/A":
        return 0
    try:
        # Handle cases like "2.942" or "1,2k" if they appear
        clean_str = count_str.replace(".", "").replace(",", "").replace(" reviews", "").strip()
        return int(clean_str)
    except:
        return 0

def get_needs_update(item):
    """
    Logic to decide if a cafe needs a rich data scrape:
    - No customer reviews yet OR
    - Very few photos (less than 20)
    """
    reviews = item.get('customer_reviews', [])
    photos = item.get('photos', [])
    # If it's already "Rich", skip it
    if len(reviews) >= 5 and len(photos) > 50:
        return False
    return True

def run_batch():
    files = glob.glob("cafe_data_*.json")
    # Exclusion list for test files
    files = [f for f in files if "test_" not in f]
    
    print(f"Found {len(files)} regional files to process.")
    
    scraper = CafeScraper()
    # Using headless=True for background batch run as planned
    scraper.start_browser(headless=True)
    
    for filepath in files:
        print(f"\n--- Processing File: {filepath} ---")
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
            continue

        # Filter for those needing updates and sort by popularity (reviews_count)
        queue = [item for item in data if get_needs_update(item)]
        queue.sort(key=lambda x: parse_count(x.get('reviews_count', '0')), reverse=True)
        
        print(f"Found {len(queue)} cafes needing rich data updates out of {len(data)} total.")
        
        # We'll process them one by one
        for i, item in enumerate(queue):
            name = item.get('name')
            address = item.get('address', '')
            print(f"\n[{i+1}/{len(queue)}] Updating Rich Data for: {name}")
            
            try:
                # Use scraper logic to get fresh HD data
                fresh_data = scraper.scrape_direct(name, address)
                
                if fresh_data:
                    # Update in the original list
                    # Find the index in the original 'data' list
                    idx = next((index for index, d in enumerate(data) if d.get('name') == name), None)
                    if idx is not None:
                        # Ensure we don't lose existing fields if for some reason scrape_direct misses something
                        # but usually fresh_data is more complete
                        data[idx] = fresh_data
                        
                        # Save incrementally after EVERY success to prevent data loss
                        with open(filepath, 'w', encoding='utf-8') as f:
                            json.dump(data, f, indent=4, ensure_ascii=False)
                        print(f"  ✓ Successfully updated and saved {name}")
                    else:
                        print(f"  ? Could not find {name} in original list to update")
                else:
                    print(f"  ✗ Scraper returned no data for {name}")
                    
            except Exception as e:
                print(f"  ! Fatal error processing {name}: {e}")
                # Optional: break or continue. Continue is safer for batch.
                continue
            
            # Subtle sleep to prevent rate limiting
            time.sleep(2)

    scraper.close_browser()
    print("\nBatch scraping cycle complete!")

if __name__ == "__main__":
    run_batch()
