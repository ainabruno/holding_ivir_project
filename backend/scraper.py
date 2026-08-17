import hashlib
import logging
import time
from datetime import datetime
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("holding_ivir.scraper")

class LegalScraper:
    def __init__(self, target_url: str = "https://fr.wikipedia.org/wiki/Droit"):
        self.target_url = target_url
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "HoldingIVIR-Scraper/1.0 (+https://ivirlegal-h7p5argk.manus.space)"
        })

    def fetch_with_retry(self, url: str, retries: int = 3, backoff: float = 1.5) -> str | None:
        for attempt in range(retries):
            try:
                response = self.session.get(url, timeout=15)
                response.raise_for_status()
                return response.text
            except Exception as error:
                logger.warning("Attempt %s failed for %s: %s", attempt + 1, url, error)
                if attempt < retries - 1:
                    time.sleep(backoff ** attempt)
        return None

    def scrape_url(self, url: str) -> list[dict]:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("L’URL doit commencer par http:// ou https://")

        html = self.fetch_with_retry(url)
        if not html:
            logger.error("Failed to fetch target legal page: %s", url)
            return []

        soup = BeautifulSoup(html, "html.parser")
        content = soup.find("div", {"id": "mw-content-text"}) or soup.find("main") or soup.body
        if not content:
            return []

        source = "wikipedia" if "wikipedia.org" in parsed.netloc.lower() else "custom"
        headings = content.find_all(["h1", "h2", "h3", "p"])
        documents: list[dict] = []
        current_heading = soup.title.get_text(strip=True) if soup.title else parsed.path.strip("/") or "Document juridique"
        current_text: list[str] = []

        def append_document(heading: str, paragraphs: list[str]) -> None:
            text_content = " ".join(part for part in paragraphs if part).strip()
            if len(text_content) < 80:
                return
            hash_dedup = hashlib.md5(text_content.encode("utf-8")).hexdigest()
            doc_id = f"{source}-{hashlib.md5((url + heading).encode('utf-8')).hexdigest()[:12]}"
            documents.append({
                "source": source,
                "id_source": doc_id,
                "url_source": url,
                "type_document": f"Article juridique — {heading}",
                "juridiction": "France (à confirmer)",
                "date_decision": datetime.utcnow().strftime("%Y-%m-%d"),
                "texte_brut": text_content,
                "hash_dedup": hash_dedup,
            })

        for tag in headings:
            if tag.name in {"h1", "h2", "h3"}:
                append_document(current_heading, current_text)
                current_heading = tag.get_text(" ", strip=True).replace("[modifier]", "")
                current_text = []
            elif tag.name == "p":
                current_text.append(tag.get_text(" ", strip=True))
        append_document(current_heading, current_text)

        # Generic pages without headings still produce one structured document.
        if not documents:
            append_document(current_heading, [content.get_text(" ", strip=True)])

        # Deduplicate within one scrape response.
        unique: dict[str, dict] = {doc["hash_dedup"]: doc for doc in documents}
        logger.info("Scraped %s legal document record(s) from %s", len(unique), url)
        return list(unique.values())

    def scrape_wikipedia_legal(self) -> list[dict]:
        return self.scrape_url(self.target_url)
