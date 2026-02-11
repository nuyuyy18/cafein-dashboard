import json
import os
import re
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

REGIONS = {
    "sleman": "cafe_data_Sleman.json",
    "kota_yogyakarta": "cafe_data_Kota_Yogyakarta.json",
    "bantul": "cafe_data_Bantul.json",
    "kulon_progo": "cafe_data_Kulon_Progo.json",
    "gunung_kidul": "cafe_data_Gunung_Kidul.json"
}

DAYS_MAP = {
    "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, 
    "Thursday": 4, "Friday": 5, "Saturday": 6
}

def parse_hours(hours_list):
    parsed_hours = []
    # hours_list example: ["Tuesday \t 8.00 am–11.00 pm \t ", ...]
    for item in hours_list:
        try:
            # Clean string
            clean_item = item.strip().replace('\t', ' ')
            # Extract day
            day_found = None
            for day_name, day_idx in DAYS_MAP.items():
                if day_name in clean_item:
                    day_found = day_idx
                    break
            
            if day_found is not None:
                # Extract time range
                # Regex for "8.00 am–11.00 pm" or "8.00 am–11.00 pm" (unicode spaces)
                time_match = re.search(r'(\d{1,2}[\.:]\d{2})\s*[aApP][mM]\s*[–-]\s*(\d{1,2}[\.:]\d{2})\s*[aApP][mM]', clean_item)
                if time_match:
                    open_time = convert_to_24h(time_match.group(0).split('–')[0].strip()) # Simplified for now
                    close_time = convert_to_24h(time_match.group(0).split('–')[1].strip())
                    
                    # Better parsing because split by dash might fail if dash is different char
                    # Let's try to match open and close separately if needed, but regex above captures groups?
                    # Actually re.search returns match object.
                    
                    # Re-do regex to capture groups
                    complex_match = re.search(r'(\d{1,2}[\.:]\d{2}\s*[aApP][mM])\s*[–-]\s*(\d{1,2}[\.:]\d{2}\s*[aApP][mM])', clean_item)
                    if complex_match:
                         open_str = complex_match.group(1)
                         close_str = complex_match.group(2)
                         parsed_hours.append({
                             "day_of_week": day_found,
                             "open_time": convert_to_24h(open_str),
                             "close_time": convert_to_24h(close_str),
                             "is_closed": False
                         })
                    else:
                        # Maybe 24h format? or "Closed"?
                        if "24 hours" in clean_item:
                             parsed_hours.append({
                                 "day_of_week": day_found,
                                 "open_time": "00:00",
                                 "close_time": "23:59",
                                 "is_closed": False
                             })
                        elif "Closed" in clean_item:
                             parsed_hours.append({
                                 "day_of_week": day_found,
                                 "open_time": None,
                                 "close_time": None,
                                 "is_closed": True
                             })
        except Exception as e:
            # print(f"Error parsing hours '{item}': {e}")
            pass
    return parsed_hours

def convert_to_24h(time_str):
    try:
        # Replace dot with colon if needed, remove unicode spaces
        clean = time_str.replace('.', ':').replace('\u202f', ' ').strip()
        dt = datetime.strptime(clean, '%I:%M %p')
        return dt.strftime('%H:%M:00')
    except Exception as e:
        # print(f"Time parse error {time_str}: {e}")
        return None

def sync_data():
    all_cafes = []
    
    print("Loading data from JSON files...")
    for region_key, filename in REGIONS.items():
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
                all_cafes.extend(data)

    print(f"Total cafes loaded: {len(all_cafes)}")

    # Fetch existing cafes to link IDs
    print("Fetching existing map...")
    cafe_map = {} # name -> id
    
    # We need to fetch ALL cafes to map names to IDs for child tables
    # Assuming the previous sync created them with the same names
    page = 0
    while True:
        res = supabase.table("cafes").select("id, name").range(page*1000, (page+1)*1000 - 1).execute()
        if not res.data: break
        for c in res.data:
            cafe_map[c['name']] = c['id']
        page += 1
        if len(res.data) < 1000: break
    
    print(f"Mapped {len(cafe_map)} existing cafes.")

    hours_data = []
    reviews_data = []
    images_data = []
    menus_data = []
    cafes_update_data = []

    print("Processing rich data...")
    for cafe in all_cafes:
        name = cafe.get("name")
        if not name or name not in cafe_map:
            continue
            
        cafe_id_db = cafe_map[name]

        # 1. Operating Hours
        if "opening_hours" in cafe and isinstance(cafe["opening_hours"], list):
            parsed = parse_hours(cafe["opening_hours"])
            for h in parsed:
                h["cafe_id"] = cafe_id_db
                hours_data.append(h)

        # Update Cafe Stats (Rating/Review Count)
        # JSON: "rating": "4.7", "reviews_count": "284" (or "review_count")
        try:
            r_val = cafe.get("rating", 0)
            rating = float(r_val) if r_val else 0
        except:
            rating = 0
            
        try:
            rc_val = cafe.get("reviews_count") or cafe.get("review_count") or 0
            # Remove non-digit chars if any (e.g. "1.2k") - complex parsing might be needed
            # For now assume mostly clean numbers or simple integers
            if isinstance(rc_val, str):
                rc_val = rc_val.replace(',', '').replace('.', '') # simplistic
            review_count = int(rc_val)
        except:
            review_count = 0
            
        cafes_update_data.append({
            "id": cafe_id_db,
            "rating": rating,
            "review_count": review_count
        })

        # 2. Images (Menu/Cafe) & Menu Link
        if "menu" in cafe and isinstance(cafe["menu"], dict):
            # Images
            img_list = cafe["menu"].get("images")
            if isinstance(img_list, list):
                for url in img_list:
                    if url:
                        images_data.append({
                            "cafe_id": cafe_id_db,
                            "image_url": url,
                            "is_primary": False
                        })
            
            # Menu Link
            menu_link = cafe["menu"].get("link")
            if menu_link:
                # Store as a special menu item since we don't have a column
                # We'll use a hack: Category='non_coffee' (since it's an enum), name='Digital Menu', description=URL
                # Check valid categories: 'coffee', 'non_coffee', 'food'
                # Just insert into cafe_menus directly via separate list if needed, 
                # but we can't batch insert easily if we don't have a "menus_data" list yet.
                # Let's add a list for menus.
                pass 
                # Actually, I need to create a menus_data list and batch insert it too.
                # But wait, the table 'cafe_menus' exists.
                
            # Menu Link
            menu_link = cafe["menu"].get("link")
            if menu_link:
                menus_data.append({
                    "cafe_id": cafe_id_db,
                    "name": "Link Menu",
                    "price": 0,
                    "category": "non_coffee", # Valid enum value
                    "description": menu_link,
                    "is_available": True
                })


        # 3. Reviews
        if "customer_reviews" in cafe and isinstance(cafe["customer_reviews"], list):
            for rev in cafe["customer_reviews"]:
                # "author": "Name", "rating": "5", "text": "Comment"
                try:
                    rating = int(float(rev.get("rating", 5)))
                except:
                    rating = 5
                
                comment = rev.get("text", "")
                author = rev.get("author", "Anonymous")
                
                # Prepend author to comment if present
                full_comment = f"[{author}] {comment}" if comment else f"Rating by {author}"

                reviews_data.append({
                    "cafe_id": cafe_id_db,
                    "rating": rating,
                    "comment": full_comment,
                    "user_id": None, # Scraped
                    "is_admin_created": False
                })

    print(f"Prepared {len(hours_data)} hours, {len(images_data)} images, {len(reviews_data)} reviews.")

    # Batch Insert Helper
    def batch_insert(table, data, batch_size=50):
        if not data: return
        print(f"Inserting into {table}...")
        total = 0
        for i in range(0, len(data), batch_size):
            chunk = data[i:i+batch_size]
            try:
                # Use upsert or insert?
                # For hours: upsert on cafe_id + day_of_week conflict? Schema constraint might not exist.
                # Ideally delete existing for these cafes and re-insert?
                # For now, just insert. If run twice, duplicates will happen unless we handle it.
                # Let's try Insert. Ideally we should ignore duplicates but Supabase bulk insert + ignore duplicates is tricky.
                # Assuming this is a one-off run or we assume data is clean.
                supabase.table(table).insert(chunk).execute()
                total += len(chunk)
                print(f" {total}/{len(data)}", end='\r')
            except Exception as e:
                # print(f"Error: {e}")
                pass # Continue
        print(f"\nDone {table}.")

    # CAUTION: To avoid duplicates, we might want to clean up existing derived data for these cafes?
    # Or just rely on the fact we just created them.
    # Since step 1 created cafes, this step populates children. 
    # If we run this twice, we get duplicates. 
    # Decision: Just insert.
    
    batch_insert("operating_hours", hours_data)
    batch_insert("cafe_images", images_data)
    batch_insert("reviews", reviews_data)
    batch_insert("cafe_menus", menus_data)
    
    print(f"Updating stats for {len(cafes_update_data)} cafes...")
    # Batch update is tricky. Let's do it in chunks of single updates if upsert is risky.
    # Or... we know we have name/address from JSON. We could reconstruct the full object.
    # But that's heavy.
    # Let's try looping updates. 2000 items -> 2000 requests. Might be slow (3-5 mins).
    # Faster way: Use a custom RPC or assumption that upsert partial works? 
    # Supabase/Postgrest UPSERT requires a full row for new items, but for existing items it acts as UPDATE?
    # Only if we provide enough data.
    # Let's do a loop for now, it's safer.
    
    count = 0
    for update_item in cafes_update_data:
        try:
            supabase.table("cafes").update({
                "rating": update_item["rating"], 
                "review_count": update_item["review_count"]
            }).eq("id", update_item["id"]).execute()
            count += 1
            if count % 50 == 0:
                print(f"Updated {count}/{len(cafes_update_data)} stats", end='\r')
        except Exception as e:
            pass
    print("\nDone stats update.")

if __name__ == "__main__":
    sync_data()
