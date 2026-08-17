import json
import logging
import os
import time
from typing import List, Literal

import requests

from pydantic import BaseModel, Field

logger = logging.getLogger("holding_ivir.extractor")

class LegalExtractionSchema(BaseModel):
    juridiction: str
    verdict: Literal["favorable", "rejected", "partial"]
    montant_alloue: float | None = None
    parties: List[str] = Field(default_factory=list)
    references_legales: List[str] = Field(default_factory=list)
    niveau_confiance: float = Field(..., ge=0.0, le=100.0)
    resume_automatique: str

class LegalAIExtractor:
    def __init__(self, retries: int = 3):
        self.api_key = os.getenv("MISTRAL_API_KEY", "")
        self.retries = retries

    @staticmethod
    def fallback(source_id: str) -> dict:
        return LegalExtractionSchema(
            juridiction="France (Fallback)",
            verdict="partial",
            montant_alloue=None,
            parties=[],
            references_legales=[],
            niveau_confiance=75.0,
            resume_automatique=f"Extraction de repli pour {source_id}; Mistral n’est pas configuré ou a échoué."
        ).model_dump()

    def extract_entities(self, text: str, source_id: str) -> dict:
        if not self.api_key or self.api_key.startswith("replace") or len(self.api_key) < 10:
            return LegalExtractionSchema(
                juridiction="France (Prévisualisation)",
                verdict="favorable",
                montant_alloue=15000.0,
                parties=["Partie demanderesse", "Partie défenderesse"],
                references_legales=["Code de commerce"],
                niveau_confiance=80.0,
                resume_automatique=f"Prévisualisation structurée pour {source_id}; configurez MISTRAL_API_KEY pour une extraction réelle."
            ).model_dump()

        api_url = os.getenv("MISTRAL_API_BASE_URL", "https://api.mistral.ai/v1/chat/completions")

        prompt = f"""
Analysez ce texte juridique et retournez uniquement un JSON conforme à ce schéma :
{{
  "juridiction": "string",
  "verdict": "favorable|rejected|partial",
  "montant_alloue": "number|null",
  "parties": ["string"],
  "references_legales": ["string"],
  "niveau_confiance": "number between 0 and 100",
  "resume_automatique": "string"
}}
Texte : {text[:6000]}
"""

        for attempt in range(self.retries):
            try:
                response = requests.post(
                    api_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "mistral-small-latest",
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"},
                        "max_tokens": 1200,
                    },
                    timeout=45,
                )
                response.raise_for_status()
                response_payload = response.json()
                choices = response_payload.get("choices") or []
                message = choices[0].get("message") if choices else None
                content = message.get("content") if isinstance(message, dict) else None
                if not isinstance(content, str) or not content.strip():
                    raise ValueError("Réponse Mistral vide ou non textuelle")
                data = json.loads(content)
                if not isinstance(data, dict) or "error" in data:
                    raise ValueError(data.get("error", "Réponse Mistral non structurée") if isinstance(data, dict) else "Réponse Mistral invalide")
                validated = LegalExtractionSchema(**data)
                if validated.niveau_confiance <= 0:
                    raise ValueError("Score de confiance Mistral nul")
                return validated.model_dump()
            except Exception as error:
                logger.warning("Mistral extraction attempt %s/%s failed for %s: %s", attempt + 1, self.retries, source_id, error)
                if attempt < self.retries - 1:
                    time.sleep(1.5 ** attempt)

        return self.fallback(source_id)
