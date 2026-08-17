"""Typed HTTP client for the PISTE Légifrance API.

The endpoint paths and JURI search contract follow the official DILA API
examples. The client keeps the API-specific payload isolated from the scraper
so each module remains independently testable.
"""

from __future__ import annotations

import logging
import os
from datetime import date
from typing import Any

import requests

from backend.legifrance_auth import LegifranceAuthError, clear_token_cache, get_legifrance_token

logger = logging.getLogger("holding_ivir.legifrance_client")

DEFAULT_API_BASE_URL = "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app"
API_APPLICATION_PATH = "/dila/legifrance/lf-engine-app"


class LegifranceApiError(RuntimeError):
    """Raised when a PISTE API request fails or returns an invalid response."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


def _clean_base_url(value: str) -> str:
    return value.rstrip("/")


class LegifranceClient:
    """Client for tokenized calls to the Légifrance API."""

    def __init__(self, *, base_url: str | None = None, timeout: float = 30.0) -> None:
        configured = base_url or os.getenv("LEGIFRANCE_API_BASE_URL", DEFAULT_API_BASE_URL)
        configured = _clean_base_url(configured)
        if configured.endswith("sandbox-api.piste.gouv.fr") or configured.endswith("api.piste.gouv.fr"):
            configured = f"{configured}{API_APPLICATION_PATH}"
        self.base_url = configured
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json", "User-Agent": "HoldingIVIR/2.1"})

    def _request(self, method: str, path: str, *, json_payload: dict[str, Any] | None = None) -> Any:
        url = f"{self.base_url}/{path.lstrip('/')}"
        try:
            token = get_legifrance_token(timeout=min(self.timeout, 15.0))
            response = self.session.request(
                method,
                url,
                headers={"Authorization": f"Bearer {token}"},
                json=json_payload,
                timeout=self.timeout,
            )
            if response.status_code == 401:
                clear_token_cache()
                token = get_legifrance_token(timeout=min(self.timeout, 15.0), force_refresh=True)
                response = self.session.request(
                    method,
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                    json=json_payload,
                    timeout=self.timeout,
                )
            if response.status_code == 403:
                raise LegifranceApiError(
                    "Accès API Légifrance refusé (HTTP 403). Le token OAuth2 est accepté, "
                    "mais l’application PISTE n’a probablement pas encore l’abonnement ou les droits "
                    "sur l’API Légifrance sandbox. Activez l’API dans PISTE puis demandez l’accès sandbox.",
                    status_code=403,
                )
            response.raise_for_status()
            if not response.content:
                return {}
            return response.json()
        except LegifranceAuthError:
            raise
        except requests.RequestException as error:
            detail = ""
            if getattr(error, "response", None) is not None:
                detail = f" HTTP {error.response.status_code}: {error.response.text[:300]}"
            raise LegifranceApiError(
                f"Erreur API Légifrance sur {path}:{detail}",
                status_code=error.response.status_code if getattr(error, "response", None) is not None else None,
            ) from error
        except ValueError as error:
            raise LegifranceApiError(f"Réponse non JSON de l’API Légifrance sur {path}.") from error

    def ping(self) -> Any:
        """Call the official lightweight health endpoint."""
        return self._request("GET", "/list/ping")

    def search_jurisprudence(
        self,
        *,
        keywords: str,
        start_date: date | None = None,
        end_date: date | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> list[dict[str, Any]]:
        """Search judicial decisions in the JURI fund and normalize result rows."""

        if not keywords.strip():
            raise ValueError("Un mot-clé est obligatoire pour une recherche Légifrance.")
        if page < 1 or page_size < 1 or page_size > 100:
            raise ValueError("La pagination doit être comprise entre 1 et 100 résultats.")

        filters: list[dict[str, Any]] = []
        if start_date or end_date:
            filters.append(
                {
                    "facette": "DATE_DECISION",
                    "dates": {
                        "start": (start_date or date.min).isoformat(),
                        "end": (end_date or date.max).isoformat(),
                    },
                }
            )

        payload = {
            "fond": "JURI",
            "recherche": {
                "champs": [
                    {
                        "criteres": [
                            {
                                "operateur": "ET",
                                "proximite": 2,
                                "typeRecherche": "UN_DES_MOTS",
                                "valeur": keywords.strip(),
                            }
                        ],
                        "operateur": "ET",
                        "typeChamp": "ALL",
                    }
                ],
                "filtres": filters,
                "fromAdvancedRecherche": False,
                "operateur": "ET",
                "pageNumber": page,
                "pageSize": page_size,
                "secondSort": "DATE_DESC",
                "sort": "PERTINENCE",
                "typePagination": "DEFAUT",
            },
        }
        response = self._request("POST", "/search", json_payload=payload)
        return self._extract_result_rows(response)

    @staticmethod
    def _extract_result_rows(response: Any) -> list[dict[str, Any]]:
        """Normalize known search response shapes without assuming one wrapper."""
        if isinstance(response, list):
            return [row for row in response if isinstance(row, dict)]
        if not isinstance(response, dict):
            return []
        for key in ("results", "resultats", "items", "listResults", "result"):
            value = response.get(key)
            if isinstance(value, list):
                return [row for row in value if isinstance(row, dict)]
            if isinstance(value, dict):
                nested = LegifranceClient._extract_result_rows(value)
                if nested:
                    return nested
        for value in response.values():
            if isinstance(value, dict):
                nested = LegifranceClient._extract_result_rows(value)
                if nested:
                    return nested
        return []

    @staticmethod
    def document_from_result(row: dict[str, Any]) -> dict[str, Any]:
        """Map a JURI result to the Alpha document contract."""
        identifier = str(
            row.get("id")
            or row.get("idDecision")
            or row.get("id_source")
            or row.get("cid")
            or ""
        )
        title = str(row.get("title") or row.get("titre") or row.get("natureDecision") or "Décision JURI")
        raw_text = str(
            row.get("text")
            or row.get("texte")
            or row.get("content")
            or row.get("extrait")
            or row.get("summary")
            or title
        )
        decision_date = str(row.get("dateDecision") or row.get("date_decision") or "")[:10] or None
        jurisdiction = str(row.get("juridiction") or row.get("formation") or "Juridiction judiciaire")
        source_url = str(row.get("url") or row.get("url_source") or "https://www.legifrance.gouv.fr/")
        return {
            "source": "legifrance",
            "id_source": identifier or None,
            "url_source": source_url,
            "type_document": title,
            "juridiction": jurisdiction,
            "date_decision": decision_date,
            "texte_brut": raw_text,
            "legifrance_raw": row,
        }
