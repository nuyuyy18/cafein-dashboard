import json
import os
import cv2
import numpy as np
import requests
import glob
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# Load the cascade
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def detect_faces(image_url):
    """
    Detects if there are faces in the image at the given URL.
    Returns True if faces are detected, False otherwise.
    """
    try:
        # Download the image with headers, shorter timeout
        resp = requests.get(image_url, headers=HEADERS, stream=True, timeout=5)
        
        if resp.status_code != 200:
            # print(f"Failed to fetch {image_url}: {resp.status_code}")
            return False

        # Convert to numpy array
        image_array = np.asarray(bytearray(resp.content), dtype=np.uint8)
        
        # Decode the image
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        if img is None:
            return False

        # Resize for speed if image is large
        height, width = img.shape[:2]
        if width > 600:
            scale = 600 / width
            new_height = int(height * scale)
            img = cv2.resize(img, (600, new_height), interpolation=cv2.INTER_AREA)

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        # scaleFactor=1.1, minNeighbors=5 (strict to avoid false positives)
        # minSize=(20, 20) suitable for resized image
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(20, 20))
        
        # If faces are found, return True
        if len(faces) > 0:
            return True
            
        return False
        
    except Exception as e:
        # print(f"Error processing {image_url}: {e}")
        return False

def process_cafe_images(cafe_data):
    """
    Iterates through cafe images and removes those with faces.
    """
    # 1. Process 'cafe_images' (top level) if it exists
    if 'cafe_images' in cafe_data and isinstance(cafe_data['cafe_images'], list):
        original_count = len(cafe_data['cafe_images'])
        clean_images = []
        for img_entry in cafe_data['cafe_images']:
            url = ""
            if isinstance(img_entry, dict):
                url = img_entry.get('image_url') or img_entry.get('url')
            elif isinstance(img_entry, str):
                url = img_entry
            
            if url:
                if detect_faces(url):
                    # print(f"Face detected in cafe_images: {url} - Removing.")
                    pass
                else:
                    clean_images.append(img_entry)
            else:
                 clean_images.append(img_entry)
        
        cafe_data['cafe_images'] = clean_images
        new_count = len(clean_images)
        if original_count != new_count:
            print(f"Cafe '{cafe_data.get('name', 'Unknown')}' cafe_images reduced from {original_count} to {new_count}")

    # 2. Process 'menu' -> 'images' (nested)
    if 'menu' in cafe_data and isinstance(cafe_data['menu'], dict):
        menu_images = cafe_data['menu'].get('images', [])
        if isinstance(menu_images, list) and len(menu_images) > 0:
            original_count = len(menu_images)
            clean_menu_images = []
            
            for url in menu_images:
                if isinstance(url, str) and url:
                    if detect_faces(url):
                        # print(f"Face detected in menu.images: {url} - Removing.")
                        pass
                    else:
                        clean_menu_images.append(url)
                else:
                    clean_menu_images.append(url)
            
            cafe_data['menu']['images'] = clean_menu_images
            new_count = len(clean_menu_images)
            if original_count != new_count:
                print(f"Cafe '{cafe_data.get('name', 'Unknown')}' menu images reduced from {original_count} to {new_count}")

    return cafe_data

def process_file(filepath):
    print(f"Processing file: {filepath}")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
            # Parallel processing with robust error handling
            processed_data = data # Modify in place or copy? In place is fine if we save
            
            # Identify cafes to process
            cafes_to_process = []
            for i, cafe in enumerate(data):
                if not cafe.get('images_cleaned'):
                    cafes_to_process.append((i, cafe))
            
            total = len(cafes_to_process)
            print(f"Cafes to process: {total}/{len(data)}")
            
            if total > 0:
                with ThreadPoolExecutor(max_workers=10) as executor: # Reduced workers slightly
                    # Submit in batches to allow saving
                    batch_size = 50
                    for batch_start in range(0, total, batch_size):
                        batch = cafes_to_process[batch_start:batch_start+batch_size]
                        
                        future_to_index = {executor.submit(process_cafe_images, cafe): i for i, cafe in batch}
                        
                        for future in as_completed(future_to_index):
                            index = future_to_index[future]
                            try:
                                updated_cafe = future.result()
                                updated_cafe['images_cleaned'] = True
                                processed_data[index] = updated_cafe
                            except Exception as exc:
                                print(f"Cafe at index {index} exception: {exc}")
                        
                        # Save after batch
                        print(f"Saving progress... ({batch_start+len(batch)}/{total})")
                        with open(filepath, 'w', encoding='utf-8') as f:
                            json.dump(processed_data, f, indent=2, ensure_ascii=False)
            
            else:
                print("All cafes already processed.")

        
    except Exception as e:
        print(f"Error processing file {filepath}: {e}")

def main():
    data_dir = os.path.dirname(os.path.abspath(__file__))
    json_files = glob.glob(os.path.join(data_dir, "cafe_data_*.json"))
    
    print(f"Found {len(json_files)} JSON files to process.")
    
    for json_file in json_files:
        process_file(json_file)

if __name__ == "__main__":
    main()
