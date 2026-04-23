import requests
import re
import urllib.parse
from bs4 import BeautifulSoup

def get_og_image(query):
    encoded = urllib.parse.quote(query)
    url = f"https://www.google.com/maps/search/{encoded}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    og_image = soup.find('meta', property='og:image')
    if og_image:
         return og_image['content']
    return None

print(get_og_image("Wande Kopi Roastery Bantul"))
