import hashlib
import json
import logging
import time
import requests
from bs4 import BeautifulSoup
from datetime import datetime

logger = logging.getLogger("holding_ivir.scraper")

class LegalScraper:
    def __init__(self, target_url: str = "https://fr.wikipedia.org/wiki/Droit"):
        self.target_url = target_url
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "HoldingIVIR-Scraper/1.0 (+https://ivirlegal.manus.space)"
        })

    def fetch_with_retry(self, url: str, retries: int = 3, backoff: float = 1.5) -> str | None:
        for attempt in range(retries):
            try:
                response = self.session.get(url, timeout=10)
                if response.status_code == 200:
                    return response.text
                logger.warning(f"Attempt {attempt + 1} failed for {url} with status {response.status_code}")
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} exception for {url}: {e}")
            time.sleep(backoff ** attempt)
        return None

    def scrape_wikipedia_legal(self) -> list[dict]:
        html = self.fetch_with_retry(self.target_url)
        if not html:
            logger.error("Failed to fetch target legal page")
            return []

        soup = BeautifulSoup(html, "html.parser")
        documents = []

        # Extract sections or subpages as legal document candidates
        content_div = soup.find("div", {"id": "mw-content-text"})
        if not content_div:
            return []

        headings = content_div.find_all(["h2", "h3", "p"])
        current_heading = "Généralités du Droit"
        current_text = []

        for tag in headings:
            if tag.name in ["h2", "h3"]:
                if current_text and len(" ".join(current_text)) > 150:
                    text_content = " ".join(current_text)
                    doc_id = f"wiki-{hashlib.md5(current_heading.encode('utf-8')).hexdigest()[:12]}"
                    hash_dedup = hashlib.md5(text_content.encode('utf-8')).hexdigest()
                    documents.append({
                        "source": "wikipedia",
                        "id_source": doc_id,
                        "url_source": self.target_url,
                        "type_document": f"Article encyclopédique — {current_heading}",
                        "juridiction": "France (National)",
                        "date_decision": datetime.utcnow().strftime("%Y-%m-%d"),
                        "texte_brut": text_content,
                        "hash_dedup": hash_dedup,
                    })
                current_heading = tag.get_text().strip().replace("[modifier]", "")
                current_text = []
            elif tag.name == "p":
                current_text.append(tag.get_text().strip())

        logger.info(f"Scraped {len(documents)} legal document records from Wikipedia")
        return documents
