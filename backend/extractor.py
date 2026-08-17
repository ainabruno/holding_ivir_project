import json
import logging
import os
import time
from typing import List, Literal

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

        try:
            from mistralai.client import MistralClient
            from mistralai.models.chat_completion import ChatMessage
            client = MistralClient(api_key=self.api_key)
        except Exception as error:
            logger.error("Mistral client initialization failed: %s", error)
            return self.fallback(source_id)

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
                response = client.chat(
                    model="mistral-small-latest",
                    messages=[ChatMessage(role="user", content=prompt)],
                    response_format={"type": "json_object"},
                )
                content = response.choices[0].message.content
                data = json.loads(content)
                return LegalExtractionSchema(**data).model_dump()
            except Exception as error:
                logger.warning("Mistral extraction attempt %s/%s failed for %s: %s", attempt + 1, self.retries, source_id, error)
                if attempt < self.retries - 1:
                    time.sleep(1.5 ** attempt)

        return self.fallback(source_id)
