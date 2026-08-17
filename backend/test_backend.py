import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import init_db, Base, engine
from backend.scraper import LegalScraper
from backend.extractor import LegalAIExtractor
from backend.exports import generate_csv_export, generate_pdf_export

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_api_statistics():
    response = client.get("/api/legal/statistics")
    assert response.status_code == 200
    data = response.json()
    assert "totalDocuments" in data
    assert "verdictDistribution" in data
    assert "averageConfidence" in data

def test_api_documents_list():
    response = client.get("/api/legal/documents?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "documents" in data
    assert "count" in data

def test_trigger_scraping_with_url(monkeypatch):
    fake_document = {
        "source": "custom",
        "id_source": "custom-test-1",
        "url_source": "https://example.test/legal",
        "type_document": "Document juridique de test",
        "juridiction": "Paris",
        "date_decision": "2026-08-17",
        "texte_brut": "Un texte juridique suffisamment long pour être envoyé à l’extraction.",
        "hash_dedup": "a" * 32,
    }
    monkeypatch.setattr("backend.main.LegalScraper.scrape_url", lambda self, url: [fake_document])
    monkeypatch.setattr("backend.main.LegalAIExtractor.extract_entities", lambda self, text, source_id: {
        "juridiction": "Paris",
        "verdict": "partial",
        "montant_alloue": None,
        "parties": ["Partie demanderesse", "Partie défenderesse"],
        "references_legales": ["Code civil"],
        "niveau_confiance": 88.0,
        "resume_automatique": "Extraction de test.",
    })
    response = client.post("/api/admin/trigger-scraping", json={
        "source": "custom",
        "url": "https://example.test/legal",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["documents_added"] == 1
    assert "https://example.test/legal" in data["message"]

    dashboard_response = client.get("/api/legal/documents?limit=10")
    assert dashboard_response.status_code == 200
    dashboard_data = dashboard_response.json()
    assert dashboard_data["count"] == 1
    assert dashboard_data["documents"][0]["urlSource"] == "https://example.test/legal"
    assert dashboard_data["documents"][0]["extractedEntity"]["verdict"] in ["favorable", "rejected", "partial"]
    assert dashboard_data["documents"][0]["extractedEntity"]["parties"] == ["Partie demanderesse", "Partie défenderesse"]

def test_trigger_scraping_rejects_invalid_url():
    response = client.post("/api/admin/trigger-scraping", json={
        "source": "custom",
        "url": "not-a-url",
    })
    assert response.status_code == 422

def test_scraper_respects_robots_denial(monkeypatch):
    class DenyRobots:
        def __init__(self, url):
            self.url = url
        def read(self):
            return None
        def can_fetch(self, user_agent, url):
            return False
        def crawl_delay(self, user_agent):
            return None
    monkeypatch.setattr("backend.scraper.urllib.robotparser.RobotFileParser", DenyRobots)
    with pytest.raises(PermissionError, match="robots.txt"):
        LegalScraper().scrape_url("https://example.test/legal")

def test_scraper_honors_robots_crawl_delay(monkeypatch):
    delays = []
    class AllowRobots:
        def __init__(self, url):
            self.url = url
        def read(self):
            return None
        def can_fetch(self, user_agent, url):
            return True
        def crawl_delay(self, user_agent):
            return 0.25
    monkeypatch.setattr("backend.scraper.urllib.robotparser.RobotFileParser", AllowRobots)
    monkeypatch.setattr("backend.scraper.time.sleep", lambda seconds: delays.append(seconds))
    scraper = LegalScraper()
    monkeypatch.setattr(scraper, "fetch_with_retry", lambda url: "<html><body><main><p>Un texte juridique suffisamment long pour le test de crawl delay.</p></main></body></html>")
    scraper.scrape_url("https://example.test/legal")
    assert delays == [0.25]

def test_csv_export_format():
    rows = [{
        "document_id": 1,
        "source_id": "test-1",
        "source": "wikipedia",
        "url_source": "https://example.test",
        "date_decision": "2026-08-17",
        "date_collecte": "2026-08-17T12:00:00",
        "juridiction": "Paris",
        "type_document": "Arrêt",
        "verdict": "favorable",
        "montant_alloue": 1000.0,
        "parties": ["A", "B"],
        "references_legales": ["Art 1"],
        "niveau_confiance": 95.0,
        "resume_automatique": "Test résumé"
    }]
    csv_text = generate_csv_export(rows)
    assert csv_text.startswith("\ufeff")
    assert "test-1" in csv_text
    assert "Paris" in csv_text
    assert "favorable" in csv_text
    assert "A; B" in csv_text or "A, B" in csv_text
    assert "Art 1" in csv_text
    assert "Test résumé" in csv_text

def test_pdf_export_bytes():
    rows = [{
        "document_id": 1,
        "source_id": "test-1",
        "source": "wikipedia",
        "juridiction": "Paris",
        "verdict": "favorable",
        "niveau_confiance": 95.0,
        "resume_automatique": "Test résumé"
    }]
    pdf_bytes = generate_pdf_export(rows)
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-")

def test_extractor_fallback():
    extractor = LegalAIExtractor()
    res = extractor.extract_entities("Texte juridique test", "doc-1")
    assert res["juridiction"] is not None
    assert res["verdict"] in ["favorable", "rejected", "partial"]
    assert res["niveau_confiance"] > 0


def test_legifrance_search_payload_and_document_mapping(monkeypatch):
    captured = {}

    def fake_search(self, **kwargs):
        captured.update(kwargs)
        return [{
            "id": "JURI-123",
            "titre": "Arrêt sur malfaçon de construction",
            "texte": "Une décision judiciaire détaillée sur une malfaçon de construction et la garantie décennale.",
            "dateDecision": "2026-08-17",
            "juridiction": "Cour d'appel de Paris",
            "url": "https://www.legifrance.gouv.fr/juri/JURI-123",
        }]

    monkeypatch.setattr("backend.main.LegifranceClient.search_jurisprudence", fake_search)
    monkeypatch.setattr("backend.main.LegalAIExtractor.extract_entities", lambda self, text, source_id: {
        "juridiction": "Cour d'appel de Paris",
        "verdict": "partial",
        "montant_alloue": 45000.0,
        "parties": ["Entreprise A", "Client B"],
        "references_legales": ["Article 1792 du Code civil"],
        "niveau_confiance": 91.0,
        "resume_automatique": "Décision de test issue de Légifrance.",
    })

    response = client.post("/api/admin/legifrance/search", json={
        "keywords": "malfaçon construction",
        "start_date": "2026-01-01",
        "end_date": "2026-08-17",
        "page": 1,
        "page_size": 20,
    })
    assert response.status_code == 200
    assert response.json()["documents_added"] == 1
    assert captured["keywords"] == "malfaçon construction"
    assert captured["start_date"].isoformat() == "2026-01-01"

    dashboard = client.get("/api/legal/documents?source=legifrance")
    assert dashboard.status_code == 200
    data = dashboard.json()
    assert data["count"] == 1
    assert data["documents"][0]["source"] == "legifrance"
    assert data["documents"][0]["extractedEntity"]["verdict"] == "partial"


def test_legifrance_search_rejects_invalid_date(monkeypatch):
    monkeypatch.setattr("backend.main.LegifranceClient.search_jurisprudence", lambda self, **kwargs: [])
    response = client.post("/api/admin/legifrance/search", json={
        "keywords": "construction",
        "start_date": "17-08-2026",
    })
    assert response.status_code == 422
    assert "Date invalide" in response.json()["detail"]


def test_admin_authentication_required_outside_testing(monkeypatch):
    monkeypatch.setenv("TESTING", "false")
    monkeypatch.setenv("ADMIN_API_TOKEN", "test-admin-secret")
    denied = client.get("/api/auth/me")
    assert denied.status_code == 401

    allowed = client.get("/api/auth/me", headers={"Authorization": "Bearer test-admin-secret"})
    assert allowed.status_code == 200
    assert allowed.json()["role"] == "admin"
