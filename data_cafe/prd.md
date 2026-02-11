# Product Requirements Document (PRD) - Cafe Scraping System Data Yogyakarta

## 1. Overview
The goal is to develop a systematic, structured, and efficient scraping system to collect data on cafes in Yogyakarta. The system should extract key information and export it to a JSON format.

## 2. Objectives
- Automated data collection of cafes in Yogyakarta.
- High efficiency and reliability.
- Structured JSON output.

## 3. Data Requirements
For each cafe, the following fields must be scraped:
- **Name**: The name of the cafe.
- **Address**: Full address of the cafe. (CRITICAL)
- **Rating**: User rating (e.g., 4.5).
- **Reviews Count**: Number of reviews.
- **Category**: E.g., Coffee Shop, Cafe, etc.
- **Link**: URL to the maps entry.
- **[NEW] Phone Number**: Contact number.
- **[NEW] Opening Hours**: Complete daily schedule.
- **[NEW] Menu**: Links to menu images or text.
- **[NEW] Customer Reviews**: Sample of text reviews.

## 4. Technical Requirements
- **Target Source**: Google Maps (or similar directory typically used for this).
- **Output Format**: JSON.
- **Method**: Headless browser automation (Playwright).
- **Behavior**: 
    - **Auto-Scroll**: Scroll page to load dynamic content (Reviews, Photos).
    - **Slider Interaction**: Detect and interact with photo sliders (especially for Menus).
- **Efficiency**: Pagination/scrolling.

## 5. Constraints
- Respect basic rate limits to avoid immediate IP bans (implementation of delays).
- Error handling for missing fields.
