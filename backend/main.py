import os
import json
import hashlib
import hmac
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Query, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import AnyHttpUrl, BaseModel, Field

from backend.database import init_db, get_db, LegalDocumentModel, LegalEntityModel
from backend.scraper import LegalScraper
from backend.extractor import LegalAIExtractor
from backend.exports import generate_csv_export, generate_pdf_export
from backend.legifrance_client import LegifranceApiError, LegifranceClient
from backend.legifrance_auth import LegifranceAuthError

import pathlib
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(
    title="Holding IVIR Legal Intelligence API",
    version="2.0.0",
    description="Backend 100% Python FastAPI pour la plateforme Holding IVIR"
)

security = HTTPBearer(auto_error=False)


def require_admin(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str:
    """Require the configured admin Bearer token in non-test environments."""
    expected = os.getenv("ADMIN_API_TOKEN", "").strip()
    if os.getenv("TESTING", "false").lower() == "true":
        return "test-admin"
    if not expected:
        raise HTTPException(status_code=503, detail="ADMIN_API_TOKEN n’est pas configuré côté serveur.")
    if not credentials or credentials.scheme.lower() != "bearer" or not hmac.compare_digest(credentials.credentials, expected):
        raise HTTPException(status_code=401, detail="Authentification administrateur requise.", headers={"WWW-Authenticate": "Bearer"})
    return credentials.credentials


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# Serve built frontend static files if dist/public exists
dist_dir = pathlib.Path(__file__).parent.parent / "dist" / "public"
if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")


# Pydantic Schemas for API
class TriggerScrapingRequest(BaseModel):
    source: str = Field("wikipedia", description="Source à scraper")
    url: AnyHttpUrl = Field(..., description="URL HTTP/HTTPS à scraper")

class TriggerExtractionRequest(BaseModel):
    document_ids: list[int] | None = Field(None, description="IDs optionnels à enrichir")

class LegifranceSearchRequest(BaseModel):
    keywords: str = Field(..., min_length=2, max_length=200, description="Mots-clés à rechercher dans la jurisprudence judiciaire")
    start_date: str | None = Field(None, description="Date de début ISO YYYY-MM-DD")
    end_date: str | None = Field(None, description="Date de fin ISO YYYY-MM-DD")
    page: int = Field(1, ge=1, le=100)
    page_size: int = Field(20, ge=1, le=100)

# Helper to format export row dict
def build_export_row(doc: LegalDocumentModel, entity: LegalEntityModel | None) -> dict:
    parties_list = []
    refs_list = []
    if entity:
        try:
            parties_list = json.loads(entity.parties) if entity.parties else []
        except:
            parties_list = [p.strip() for p in entity.parties.split(";") if p.strip()] if entity.parties else []
            
        try:
            refs_list = json.loads(entity.references_legales) if entity.references_legales else []
        except:
            refs_list = [r.strip() for r in entity.references_legales.split(";") if r.strip()] if entity.references_legales else []

    return {
        "document_id": doc.id,
        "source_id": doc.id_source,
        "source": doc.source,
        "url_source": doc.url_source,
        "date_decision": doc.date_decision,
        "date_collecte": doc.date_collecte,
        "juridiction": entity.juridiction if entity else doc.juridiction,
        "type_document": doc.type_document,
        "verdict": entity.verdict if entity else "partial",
        "montant_alloue": entity.montant_alloue if entity else None,
        "parties": parties_list,
        "references_legales": refs_list,
        "niveau_confiance": entity.niveau_confiance if entity else 0.0,
        "resume_automatique": entity.resume_automatique if entity else None,
    }

@app.post("/api/admin/trigger-scraping")
def trigger_scraping(payload: TriggerScrapingRequest, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    scraper = LegalScraper(str(payload.url))
    extractor = LegalAIExtractor()
    
    try:
        raw_docs = scraper.scrape_url(str(payload.url))
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    added_count = 0
    
    for item in raw_docs:
        existing = db.query(LegalDocumentModel).filter(LegalDocumentModel.hash_dedup == item["hash_dedup"]).first()
        if existing:
            continue
            
        doc = LegalDocumentModel(
            source=item["source"],
            id_source=item["id_source"],
            url_source=item["url_source"],
            type_document=item["type_document"],
            juridiction=item["juridiction"],
            date_decision=item["date_decision"],
            texte_brut=item["texte_brut"],
            hash_dedup=item["hash_dedup"],
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        # Auto-extract with AI
        extracted = extractor.extract_entities(doc.texte_brut or "", doc.id_source)
        entity = LegalEntityModel(
            document_id=doc.id,
            source_id=doc.id_source,
            juridiction=extracted.get("juridiction"),
            verdict=extracted.get("verdict", "favorable"),
            montant_alloue=extracted.get("montant_alloue"),
            parties=json.dumps(extracted.get("parties", []), ensure_ascii=False),
            references_legales=json.dumps(extracted.get("references_legales", []), ensure_ascii=False),
            niveau_confiance=extracted.get("niveau_confiance", 85.0),
            resume_automatique=extracted.get("resume_automatique"),
        )
        db.add(entity)
        db.commit()
        added_count += 1

    return {
        "success": True,
        "message": f"Scraping et extraction terminés pour {payload.source} depuis {payload.url}",
        "documents_added": added_count,
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/api/admin/legifrance/status")
def legifrance_status():
    """Return configuration status without exposing client credentials."""
    configured = bool(os.getenv("LEGIFRANCE_CLIENT_ID") and os.getenv("LEGIFRANCE_CLIENT_SECRET"))
    return {
        "configured": configured,
        "apiBaseUrl": os.getenv("LEGIFRANCE_API_BASE_URL", "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app"),
        "environment": "sandbox" if "sandbox" in os.getenv("LEGIFRANCE_API_BASE_URL", "sandbox") else "production",
    }

@app.post("/api/admin/legifrance/ping")
def legifrance_ping(_: str = Depends(require_admin)):
    try:
        result = LegifranceClient(timeout=15).ping()
        return {"success": True, "result": result}
    except (LegifranceAuthError, LegifranceApiError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

@app.post("/api/admin/legifrance/search")
def legifrance_search(payload: LegifranceSearchRequest, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    """Search real judicial decisions in Légifrance, persist and enrich them."""
    from datetime import date

    def parse_date(value: str | None) -> date | None:
        if not value:
            return None
        try:
            return date.fromisoformat(value)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=f"Date invalide : {value}") from error

    try:
        client = LegifranceClient()
        result_rows = client.search_jurisprudence(
            keywords=payload.keywords,
            start_date=parse_date(payload.start_date),
            end_date=parse_date(payload.end_date),
            page=payload.page,
            page_size=payload.page_size,
        )
    except (LegifranceAuthError, LegifranceApiError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    extractor = LegalAIExtractor()
    added = 0
    enriched = 0
    for row in result_rows:
        item = client.document_from_result(row)
        text_content = item["texte_brut"]
        if not text_content or len(text_content.strip()) < 20:
            continue
        source_id = item.get("id_source") or hashlib.md5(text_content.encode("utf-8")).hexdigest()
        dedup_hash = hashlib.md5(text_content.encode("utf-8")).hexdigest()
        existing = db.query(LegalDocumentModel).filter(LegalDocumentModel.hash_dedup == dedup_hash).first()
        if existing:
            continue

        doc = LegalDocumentModel(
            source="legifrance",
            id_source=source_id,
            url_source=item["url_source"],
            type_document=item["type_document"],
            juridiction=item["juridiction"],
            date_decision=item["date_decision"],
            texte_brut=text_content,
            hash_dedup=dedup_hash,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        added += 1

        extracted = extractor.extract_entities(text_content, doc.id_source)
        db.add(LegalEntityModel(
            document_id=doc.id,
            source_id=doc.id_source,
            juridiction=extracted.get("juridiction") or doc.juridiction,
            verdict=extracted.get("verdict", "partial"),
            montant_alloue=extracted.get("montant_alloue"),
            parties=json.dumps(extracted.get("parties", []), ensure_ascii=False),
            references_legales=json.dumps(extracted.get("references_legales", []), ensure_ascii=False),
            niveau_confiance=extracted.get("niveau_confiance", 0.0),
            resume_automatique=extracted.get("resume_automatique"),
        ))
        db.commit()
        enriched += 1

    return {
        "success": True,
        "source": "legifrance",
        "keywords": payload.keywords,
        "results_received": len(result_rows),
        "documents_added": added,
        "documents_enriched": enriched,
        "message": "Recherche Légifrance terminée et résultats enregistrés dans le corpus.",
    }

@app.post("/api/admin/trigger-extraction")
def trigger_extraction(payload: TriggerExtractionRequest, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    extractor = LegalAIExtractor()
    query = db.query(LegalDocumentModel)
    if payload.document_ids:
        query = query.filter(LegalDocumentModel.id.in_(payload.document_ids))
        
    docs = query.all()
    processed = 0
    for doc in docs:
        extracted = extractor.extract_entities(doc.texte_brut or "", doc.id_source)
        existing_entity = db.query(LegalEntityModel).filter(LegalEntityModel.document_id == doc.id).first()
        if existing_entity:
            existing_entity.juridiction = extracted.get("juridiction")
            existing_entity.verdict = extracted.get("verdict", "favorable")
            existing_entity.montant_alloue = extracted.get("montant_alloue")
            existing_entity.parties = json.dumps(extracted.get("parties", []), ensure_ascii=False)
            existing_entity.references_legales = json.dumps(extracted.get("references_legales", []), ensure_ascii=False)
            existing_entity.niveau_confiance = extracted.get("niveau_confiance", 85.0)
            existing_entity.resume_automatique = extracted.get("resume_automatique")
        else:
            entity = LegalEntityModel(
                document_id=doc.id,
                source_id=doc.id_source,
                juridiction=extracted.get("juridiction"),
                verdict=extracted.get("verdict", "favorable"),
                montant_alloue=extracted.get("montant_alloue"),
                parties=json.dumps(extracted.get("parties", []), ensure_ascii=False),
                references_legales=json.dumps(extracted.get("references_legales", []), ensure_ascii=False),
                niveau_confiance=extracted.get("niveau_confiance", 85.0),
                resume_automatique=extracted.get("resume_automatique"),
            )
            db.add(entity)
        db.commit()
        processed += 1

    return {"success": True, "processed": processed}

@app.get("/api/legal/documents")
def list_documents(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = None,
    source: str | None = None,
    verdict: str | None = None,
    startDate: str | None = None,
    endDate: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(LegalDocumentModel, LegalEntityModel).outerjoin(LegalEntityModel, LegalDocumentModel.id == LegalEntityModel.document_id)
    
    if source and source != "all":
        query = query.filter(LegalDocumentModel.source == source)
    if verdict and verdict != "all":
        query = query.filter(LegalEntityModel.verdict == verdict)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (LegalDocumentModel.source.ilike(term)) |
            (LegalDocumentModel.id_source.ilike(term)) |
            (LegalDocumentModel.type_document.ilike(term)) |
            (LegalEntityModel.juridiction.ilike(term)) |
            (LegalEntityModel.resume_automatique.ilike(term))
        )
    if startDate:
        query = query.filter(LegalDocumentModel.date_decision >= startDate[:10])
    if endDate:
        query = query.filter(LegalDocumentModel.date_decision <= endDate[:10])

    total_count = query.count()
    results = query.offset(offset).limit(limit).all()
    
    documents = []
    for doc, entity in results:
        row = build_export_row(doc, entity)
        documents.append({
            "id": doc.id,
            "source": doc.source,
            "idSource": doc.id_source,
            "urlSource": doc.url_source,
            "typeDocument": doc.type_document,
            "juridiction": doc.juridiction,
            "dateDecision": doc.date_decision,
            "dateCollecte": doc.date_collecte,
            "extractedEntity": {
                "sourceId": doc.id_source,
                "juridiction": row["juridiction"],
                "verdict": row["verdict"],
                "niveauConfiance": row["niveau_confiance"],
                "montantAlloue": row["montant_alloue"],
                "parties": row["parties"],
                "referencesLegales": row["references_legales"],
                "resumeAutomatique": row["resume_automatique"],
            }
        })

    return {
        "documents": documents,
        "count": total_count,
    }

@app.get("/api/legal/statistics")
def get_statistics(db: Session = Depends(get_db)):
    docs = db.query(LegalDocumentModel).all()
    entities = db.query(LegalEntityModel).all()
    
    total_docs = len(docs)
    verdict_counts = {"favorable": 0, "rejected": 0, "partial": 0}
    total_conf = 0.0
    
    for e in entities:
        if e.verdict in verdict_counts:
            verdict_counts[e.verdict] += 1
        total_conf += e.niveau_confiance
        
    avg_conf = (total_conf / len(entities)) if entities else 0.0
    
    verdict_distribution = [
        {"verdict": "favorable", "count": verdict_counts["favorable"]},
        {"verdict": "rejected", "count": verdict_counts["rejected"]},
        {"verdict": "partial", "count": verdict_counts["partial"]},
    ]
    
    return {
        "totalDocuments": total_docs,
        "verdictDistribution": verdict_distribution,
        "averageConfidence": avg_conf,
    }

@app.get("/api/legal/export.csv")
def export_csv(
    search: str | None = None,
    source: str | None = None,
    verdict: str | None = None,
    startDate: str | None = None,
    endDate: str | None = None,
    db: Session = Depends(get_db)
):
    if verdict and verdict not in ["all", "favorable", "rejected", "partial"]:
        raise HTTPException(status_code=400, detail="Invalid verdict filter")
        
    query = db.query(LegalDocumentModel, LegalEntityModel).outerjoin(LegalEntityModel, LegalDocumentModel.id == LegalEntityModel.document_id)
    if source and source != "all":
        query = query.filter(LegalDocumentModel.source == source)
    if verdict and verdict != "all":
        query = query.filter(LegalEntityModel.verdict == verdict)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (LegalDocumentModel.source.ilike(term)) |
            (LegalDocumentModel.id_source.ilike(term)) |
            (LegalEntityModel.juridiction.ilike(term))
        )
    if startDate:
        query = query.filter(LegalDocumentModel.date_decision >= startDate[:10])
    if endDate:
        query = query.filter(LegalDocumentModel.date_decision <= endDate[:10])

    rows = [build_export_row(doc, entity) for doc, entity in query.all()]
    csv_text = generate_csv_export(rows)
    filename = f"holding-ivir-donnees-juridiques-{datetime.utcnow().strftime('%Y-%m-%d')}.csv"
    
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.get("/api/legal/export.pdf")
def export_pdf(
    search: str | None = None,
    source: str | None = None,
    verdict: str | None = None,
    startDate: str | None = None,
    endDate: str | None = None,
    db: Session = Depends(get_db)
):
    if verdict and verdict not in ["all", "favorable", "rejected", "partial"]:
        raise HTTPException(status_code=400, detail="Invalid verdict filter")
        
    query = db.query(LegalDocumentModel, LegalEntityModel).outerjoin(LegalEntityModel, LegalDocumentModel.id == LegalEntityModel.document_id)
    if source and source != "all":
        query = query.filter(LegalDocumentModel.source == source)
    if verdict and verdict != "all":
        query = query.filter(LegalEntityModel.verdict == verdict)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (LegalDocumentModel.source.ilike(term)) |
            (LegalDocumentModel.id_source.ilike(term)) |
            (LegalEntityModel.juridiction.ilike(term))
        )
    if startDate:
        query = query.filter(LegalDocumentModel.date_decision >= startDate[:10])
    if endDate:
        query = query.filter(LegalDocumentModel.date_decision <= endDate[:10])

    rows = [build_export_row(doc, entity) for doc, entity in query.all()]
    pdf_bytes = generate_pdf_export(rows)
    filename = f"holding-ivir-donnees-juridiques-{datetime.utcnow().strftime('%Y-%m-%d')}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.get("/api/auth/me")
def auth_me(_: str = Depends(require_admin)):
    return {
        "id": 1,
        "openId": "python-admin-user",
        "name": "Administrateur Python",
        "email": "admin@holding-ivir.test",
        "role": "admin"
    }

@app.post("/api/auth/logout")
def auth_logout():
    return {"success": True}

@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    index_file = dist_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Holding IVIR FastAPI Backend is running. Frontend build not found."}
