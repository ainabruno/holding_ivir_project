"""
Module Alpha: Web Scraping for Legal Intelligence Platform
Scrapes legal sources (Wikipedia, Légifrance) with deduplication, retry logic, and structured output.
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import logging
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("scraping.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
URLS = [
    "https://fr.wikipedia.org/wiki/Droit_civil",
    "https://fr.wikipedia.org/wiki/Garantie_d%C3%A9cennale",
    "https://fr.wikipedia.org/wiki/Tribunal_judiciaire_(France)",
    "https://fr.wikipedia.org/wiki/Code_civil_(France)",
    "https://fr.wikipedia.org/wiki/Responsabilit%C3%A9_civile_en_France",
]

OUTPUT_DIR = Path("output")
OUTPUT_FILE = OUTPUT_DIR / "raw_data.json"
DELAY_BETWEEN_REQUESTS = 1.5  # seconds
MAX_RETRIES = 3
BACKOFF_FACTOR = 2  # exponential backoff multiplier


def generate_identifier(url: str) -> str:
    """Generate unique identifier using MD5 hash of URL."""
    return hashlib.md5(url.encode("utf-8")).hexdigest()[:12]


def load_existing_data() -> Dict[str, Any]:
    """Load existing documents to avoid duplicates."""
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {item["id_source"]: item for item in data}
        except (json.JSONDecodeError, KeyError, TypeError):
            logger.warning("Existing file unreadable, starting fresh.")
    return {}


def clean_text(text: str) -> str:
    """Remove extra whitespace and line breaks."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return " ".join(lines)


def scrape_page(url: str, max_retries: int = MAX_RETRIES) -> Optional[Dict[str, Any]]:
    """
    Scrape a single page with retry logic and exponential backoff.
    Returns structured data or None on failure.
    """
    headers = {
        "User-Agent": "HoldingIVIR-LegalScraper/1.0 (contact: support@holding-ivir.fr)"
    }

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Scraping attempt {attempt}/{max_retries}: {url}")
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Extract title
            title_tag = soup.find("h1", {"id": "firstHeading"})
            title = title_tag.get_text(strip=True) if title_tag else "Unknown Title"

            # Extract content
            content_div = soup.find("div", {"class": "mw-parser-output"})
            paragraphs = content_div.find_all("p") if content_div else []
            raw_text = " ".join(p.get_text() for p in paragraphs)
            raw_text = clean_text(raw_text)

            if not raw_text:
                logger.warning(f"No text extracted from {url}")
                return None

            # Truncate to 10000 characters for storage
            raw_text = raw_text[:10000]

            return {
                "id_source": generate_identifier(url),
                "source": "wikipedia",
                "date_decision": None,
                "juridiction": None,
                "type_document": "legal_reference",
                "texte_brut": raw_text,
                "url_source": url,
                "date_collecte": datetime.now().isoformat(),
                "niveau_confiance_extraction": None,
                "necessite_verification_humaine": 0,
            }

        except requests.RequestException as e:
            logger.warning(f"Attempt {attempt} failed: {e}")
            if attempt < max_retries:
                wait_time = BACKOFF_FACTOR ** (attempt - 1)
                logger.info(f"Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                logger.error(f"Failed to scrape {url} after {max_retries} attempts")
                return None

    return None


def scrape_all_sources(urls: list = URLS) -> Dict[str, Any]:
    """
    Scrape all sources, avoiding duplicates.
    Returns summary of scraping operation.
    """
    logger.info("Starting scraping operation...")
    existing_data = load_existing_data()
    results = list(existing_data.values())
    new_count = 0
    failed_count = 0

    for url in urls:
        identifier = generate_identifier(url)

        if identifier in existing_data:
            logger.info(f"Already collected, skipping: {url}")
            continue

        logger.info(f"Processing: {url}")
        document = scrape_page(url)

        if document:
            results.append(document)
            new_count += 1
            logger.info(f"✓ Success: '{document['texte_brut'][:50]}...'")
        else:
            failed_count += 1
            logger.error(f"✗ Failed to scrape: {url}")

        # Respect rate limits
        time.sleep(DELAY_BETWEEN_REQUESTS)

    # Save results
    OUTPUT_DIR.mkdir(exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    summary = {
        "total_documents": len(results),
        "new_documents": new_count,
        "failed_documents": failed_count,
        "output_file": str(OUTPUT_FILE),
        "timestamp": datetime.now().isoformat(),
    }

    logger.info(f"Scraping complete: {summary}")
    return summary


if __name__ == "__main__":
    summary = scrape_all_sources()
    print(json.dumps(summary, indent=2))
