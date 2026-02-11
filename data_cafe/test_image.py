import requests
import cv2
import numpy as np

url = "https://lh3.googleusercontent.com/p/AF1QipP9j9pOaLDdOj_J7ebRHh3J1OdkOwQPvObgXj4i=s0"

try:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    resp = requests.get(url, headers=headers, stream=True, timeout=10)
    print(f"Status: {resp.status_code}")
    print(f"Content-Type: {resp.headers.get('Content-Type')}")
    print(f"Content-Length: {len(resp.content)}")
    
    image_array = np.asarray(bytearray(resp.content), dtype=np.uint8)
    img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    
    if img is None:
        print("Failed to decode image")
    else:
        print(f"Image shape: {img.shape}")
        
    # Detect face
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    print(f"Faces detected: {len(faces)}")

except Exception as e:
    print(f"Error: {e}")
