"""
Module Beta: AI/NLP Extraction for Legal Intelligence Platform
Extracts structured legal entities from raw text using Mistral AI with Pydantic validation.
"""

import json
import logging
import os
from typing import Optional, List
from pydantic import BaseModel, ValidationError, field_validator
from mistralai.client import Mistral
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("extraction.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# Pydantic models for validation
class LegalEntitiesExtraction(BaseModel):
    """Structured legal entities extracted from text."""
    date_decision: Optional[str] = None  # YYYY-MM-DD format
    juridiction: Optional[str] = None
    type_litige: str
    secteur: str = "construction"
    sens_verdict: str  # "favorable", "rejected", "partial"
    montant_alloue: Optional[float] = None
    intervenants: List[str] = []
    references_legales: List[str] = []
    resume_automatique: str
    niveau_confiance: float  # 0.0 to 1.0

    @field_validator("sens_verdict")
    @classmethod
    def validate_verdict(cls, v):
        """Ensure verdict is one of the allowed values."""
        allowed = {"favorable", "rejected", "partial"}
        if v not in allowed:
            raise ValueError(f"sens_verdict must be one of {allowed}, got: {v}")
        return v

    @field_validator("niveau_confiance")
    @classmethod
    def validate_confidence(cls, v):
        """Ensure confidence is between 0.0 and 1.0."""
        if not (0.0 <= v <= 1.0):
            raise ValueError("niveau_confiance must be between 0.0 and 1.0")
        return v


# System prompt for LLM
SYSTEM_PROMPT = """Tu es un système d'extraction de données juridiques spécialisé en droit de la construction.

Tu dois répondre UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, sans balises markdown.

Règles strictes :
1. Si une information n'est pas présente explicitement dans le texte, utilise null.
2. N'invente JAMAIS de données qui ne sont pas dans le texte fourni.
3. Le champ "sens_verdict" doit être EXACTEMENT une de ces trois valeurs : "favorable", "rejected", "partial".
4. "niveau_confiance" est un nombre entre 0.0 et 1.0 reflétant ta certitude globale sur l'extraction.
5. "resume_automatique" : maximum 2 phrases.
6. "type_litige" : classifie le type de litige (malfaçon, retard, garantie_décennale, etc.)
7. "secteur" : toujours "construction" pour ce pipeline.

Format JSON attendu :
{
  "date_decision": "AAAA-MM-JJ ou null",
  "juridiction": "string ou null",
  "type_litige": "string",
  "secteur": "construction",
  "sens_verdict": "favorable | rejected | partial",
  "montant_alloue": nombre ou null,
  "intervenants": ["liste de strings"],
  "references_legales": ["liste de strings"],
  "resume_automatique": "string",
  "niveau_confiance": nombre entre 0.0 et 1.0
}
"""


def call_llm(text: str, client: Mistral, previous_error: Optional[str] = None) -> dict:
    """
    Call Mistral AI to extract legal entities.
    Supports retry with error feedback.
    """
    user_message = f"Texte à analyser :\n\n{text}"
    if previous_error:
        user_message += f"\n\nATTENTION : ta réponse précédente était invalide : {previous_error}. Corrige et renvoie un JSON valide."

    try:
        response = client.chat.complete(
            model="mistral-small-latest",
            response_format={"type": "json_object"},
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )

        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise


def extract_with_validation(text: str, client: Mistral, max_attempts: int = 3) -> Optional[LegalEntitiesExtraction]:
    """
    Extract legal entities with validation and retry logic.
    Returns validated LegalEntitiesExtraction or None on failure.
    """
    previous_error = None

    for attempt in range(1, max_attempts + 1):
        logger.info(f"Extraction attempt {attempt}/{max_attempts}...")
        try:
            json_data = call_llm(text, client, previous_error)
            entities = LegalEntitiesExtraction(**json_data)
            logger.info("Extraction validated successfully.")
            return entities

        except json.JSONDecodeError as e:
            previous_error = f"JSON malformé : {str(e)}"
            logger.warning(previous_error)

        except ValidationError as e:
            previous_error = f"Schéma invalide : {str(e)}"
            logger.warning(previous_error)

        except Exception as e:
            previous_error = f"Erreur : {str(e)}"
            logger.warning(previous_error)

    logger.error(f"Extraction failed after {max_attempts} attempts.")
    return None


def extract_from_documents(documents: List[dict]) -> List[dict]:
    """
    Extract entities from a list of documents.
    Returns list of extracted entities with metadata.
    """
    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        raise ValueError("MISTRAL_API_KEY environment variable not set")

    client = Mistral(api_key=api_key)
    results = []

    for doc in documents:
        logger.info(f"Processing document: {doc.get('id_source', 'unknown')}")

        if not doc.get("texte_brut"):
            logger.warning(f"Document {doc.get('id_source')} has no text, skipping.")
            continue

        # Extract entities
        entities = extract_with_validation(doc["texte_brut"], client)

        if entities:
            result = {
                "id_decision": f"{doc['id_source']}_extracted",
                "source_id": doc["id_source"],
                "type_litige": entities.type_litige,
                "secteur": entities.secteur,
                "juridiction": entities.juridiction,
                "date_decision": entities.date_decision,
                "sens_verdict": entities.sens_verdict,
                "montant_alloue": int(entities.montant_alloue) if entities.montant_alloue else None,
                "intervenants": json.dumps(entities.intervenants),
                "references_legales": json.dumps(entities.references_legales),
                "niveau_confiance": int(entities.niveau_confiance * 100),  # Convert to 0-100 scale
                "resume_automatique": entities.resume_automatique,
                "created_at": datetime.now().isoformat(),
            }
            results.append(result)
            logger.info(f"✓ Extracted: {result['id_decision']}")
        else:
            logger.error(f"✗ Failed to extract from {doc['id_source']}")

    return results


if __name__ == "__main__":
    # Example usage
    sample_text = """
    Par jugement rendu le 14 mars 2024, le Tribunal judiciaire de Lyon a condamné la société 
    Constructions Dubois SARL à verser la somme de 87 500 euros à Monsieur et Madame Fontaine en 
    réparation des désordres affectant leur maison individuelle. Les experts judiciaires ont constaté des 
    malfaçons graves dans la réalisation de la toiture et des fondations, constitutives d'un manquement à 
    l'obligation de résultat de l'entrepreneur. La garantie décennale prévue à l'article 1792 du Code civil 
    a été retenue. La société Constructions Dubois SARL a également été condamnée aux dépens et à 
    verser 3 500 euros au titre de l'article 700 du Code de procédure civile.
    """

    api_key = os.environ.get("MISTRAL_API_KEY")
    if api_key:
        client = Mistral(api_key=api_key)
        result = extract_with_validation(sample_text, client)
        if result:
            print(json.dumps(result.model_dump(), ensure_ascii=False, indent=2))
    else:
        print("MISTRAL_API_KEY not set. Skipping example.")
