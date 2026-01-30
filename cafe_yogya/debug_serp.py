from serpapi import GoogleSearch
import os
from dotenv import load_dotenv
import json

load_dotenv()

SERP_API_KEY = os.getenv("SERP_API_KEY")

params = {
    "engine": "google",
    "type": "search",
    "q": "Coffeeshop in Yogyakarta",
    "ll": "@-7.7729949,110.3309142,13z",
    "start": "0",
    "num": "5",
    "api_key": SERP_API_KEY
}

search = GoogleSearch(params)
results = search.get_dict()

local_results = results.get("local_results", [])
print(f"Type: {type(local_results)}")

if isinstance(local_results, dict):
    print(f"Keys: {local_results.keys()}")
    # print first key's value type
    first_key = list(local_results.keys())[0]
    print(f"Value of '{first_key}': {type(local_results[first_key])}")
elif isinstance(local_results, list):
    if local_results:
        print(f"First item type: {type(local_results[0])}")
        print(f"First item: {local_results[0]}")
else:
    print("Unknown type")

