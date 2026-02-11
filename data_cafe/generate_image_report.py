import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_KEY")
    exit(1)

supabase: Client = create_client(url, key)

def generate_report():
    print("Fetching all cafe images...")
    response = supabase.table("cafe_images").select("*").execute()
    images = response.data
    
    print(f"Found {len(images)} images")
    
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cafe Images Report</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
            .card { border: 1px solid #ddd; padding: 10px; border-radius: 8px; overflow: hidden; }
            .card img { width: 100%; height: 200px; object-fit: cover; border-radius: 4px; }
            .info { margin-top: 10px; font-size: 12px; word-break: break-all; }
            .delete-btn { 
                display: block; width: 100%; padding: 5px; margin-top: 5px; 
                background: #ff4444; color: white; border: none; cursor: pointer; text-align: center;
            }
        </style>
    </head>
    <body>
        <h1>Cafe Images Report</h1>
        <p>Total Images: {count}</p>
        <div class="grid">
    """
    
    html_content = html_content.replace("{count}", str(len(images)))
    
    for img in images:
        html_content += f"""
            <div class="card">
                <a href="{img['image_url']}" target="_blank">
                    <img src="{img['image_url']}" loading="lazy" alt="Cafe Image">
                </a>
                <div class="info">
                    <strong>ID:</strong> {img['id']}<br>
                    <strong>Cafe ID:</strong> {img['cafe_id']}<br>
                </div>
            </div>
        """
        
    html_content += """
        </div>
    </body>
    </html>
    """
    
    output_path = os.path.join(os.path.dirname(__file__), 'cafe_images_report.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
        
    print(f"Report generated at: {output_path}")

if __name__ == "__main__":
    generate_report()
