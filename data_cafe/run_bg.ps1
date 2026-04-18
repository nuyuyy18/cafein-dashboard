Write-Host "Starting Scraper..."
python scraper.py
Write-Host "Scraping complete. Starting Sync..."
python sync_data.py
Write-Host "Sync complete!"
