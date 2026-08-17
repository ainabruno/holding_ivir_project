export type PreviewVerdict = "favorable" | "rejected" | "partial";

export type PreviewEntity = {
  sourceId: string;
  juridiction: string;
  verdict: PreviewVerdict;
  niveauConfiance: number;
};

export type PreviewDocument = {
  id: number;
  source: string;
  idSource: string;
  typeDocument: string;
  juridiction: string;
  dateDecision: string;
  dateCollecte: string;
  extractedEntity: PreviewEntity;
};

export type PreviewFilters = {
  limit: number;
  offset: number;
  search?: string;
  source?: string;
  verdict?: PreviewVerdict;
  startDate?: string;
  endDate?: string;
};

/**
 * Synthetic records used only to preview the interface without a backend or secrets.
 * They are never sent to the API and are intentionally labelled as preview data in the UI.
 */
export const FRONTEND_PREVIEW_DOCUMENTS: PreviewDocument[] = [
  {
    id: 1,
    source: "wikipedia",
    idSource: "preview-wiki-001",
    typeDocument: "Décision civile — prévisualisation",
    juridiction: "Paris",
    dateDecision: "2026-08-12T00:00:00.000Z",
    dateCollecte: "2026-08-13T09:30:00.000Z",
    extractedEntity: { sourceId: "preview-wiki-001", juridiction: "Paris", verdict: "favorable", niveauConfiance: 94 },
  },
  {
    id: 2,
    source: "legifrance",
    idSource: "preview-legi-002",
    typeDocument: "Arrêt administratif — prévisualisation",
    juridiction: "Lyon",
    dateDecision: "2026-08-06T00:00:00.000Z",
    dateCollecte: "2026-08-07T10:15:00.000Z",
    extractedEntity: { sourceId: "preview-legi-002", juridiction: "Lyon", verdict: "partial", niveauConfiance: 82 },
  },
  {
    id: 3,
    source: "wikipedia",
    idSource: "preview-wiki-003",
    typeDocument: "Jugement commercial — prévisualisation",
    juridiction: "Marseille",
    dateDecision: "2026-07-28T00:00:00.000Z",
    dateCollecte: "2026-07-29T08:45:00.000Z",
    extractedEntity: { sourceId: "preview-wiki-003", juridiction: "Marseille", verdict: "rejected", niveauConfiance: 76 },
  },
  {
    id: 4,
    source: "legifrance",
    idSource: "preview-legi-004",
    typeDocument: "Décision sociale — prévisualisation",
    juridiction: "Bordeaux",
    dateDecision: "2026-07-20T00:00:00.000Z",
    dateCollecte: "2026-07-21T11:00:00.000Z",
    extractedEntity: { sourceId: "preview-legi-004", juridiction: "Bordeaux", verdict: "favorable", niveauConfiance: 89 },
  },
];

export function getFrontendPreviewDocuments(filters: PreviewFilters) {
  const search = filters.search?.toLocaleLowerCase("fr-FR");
  const filtered = FRONTEND_PREVIEW_DOCUMENTS.filter((document) => {
    const haystack = [document.source, document.idSource, document.typeDocument, document.juridiction, document.extractedEntity.verdict].join(" ").toLocaleLowerCase("fr-FR");
    const decisionDate = new Date(document.dateDecision).getTime();
    const afterStart = !filters.startDate || decisionDate >= new Date(filters.startDate).getTime();
    const beforeEnd = !filters.endDate || decisionDate <= new Date(filters.endDate).getTime();
    return (!search || haystack.includes(search))
      && (!filters.source || document.source === filters.source)
      && (!filters.verdict || document.extractedEntity.verdict === filters.verdict)
      && afterStart
      && beforeEnd;
  });

  return {
    documents: filtered.slice(filters.offset, filters.offset + filters.limit),
    count: filtered.length,
  };
}

export function getFrontendPreviewStatistics() {
  const totalDocuments = FRONTEND_PREVIEW_DOCUMENTS.length;
  const verdictDistribution = (["favorable", "rejected", "partial"] as const).map((verdict) => ({
    verdict,
    count: FRONTEND_PREVIEW_DOCUMENTS.filter((document) => document.extractedEntity.verdict === verdict).length,
  }));
  const averageConfidence = FRONTEND_PREVIEW_DOCUMENTS.reduce((sum, document) => sum + document.extractedEntity.niveauConfiance, 0) / totalDocuments;

  return { totalDocuments, verdictDistribution, averageConfidence };
}
