export type DocumentSortKey = "date" | "source" | "verdict" | "confidence";
export type DocumentSortDirection = "asc" | "desc";

export type SortableDocument = {
  id?: number;
  idSource?: string | null;
  source?: string | null;
  dateDecision?: Date | string | null;
  dateCollecte?: Date | string | null;
  juridiction?: string | null;
  typeDocument?: string | null;
  extractedEntity?: {
    sourceId?: string | null;
    juridiction?: string | null;
    verdict?: string | null;
    niveauConfiance?: number | null;
  } | null;
};

export function sortLegalDocuments<T extends SortableDocument>(documents: T[], key: DocumentSortKey, direction: DocumentSortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...documents].sort((left, right) => {
    const leftValue = getSortValue(left, key);
    const rightValue = getSortValue(right, key);
    if (leftValue < rightValue) return -1 * multiplier;
    if (leftValue > rightValue) return 1 * multiplier;
    return 0;
  });
}

function getSortValue(document: SortableDocument, key: DocumentSortKey): string | number {
  if (key === "confidence") return Number(document.extractedEntity?.niveauConfiance ?? -1);
  if (key === "date") return new Date(document.dateDecision ?? document.dateCollecte ?? 0).getTime();
  if (key === "verdict") return document.extractedEntity?.verdict ?? "";
  return document.source ?? document.juridiction ?? document.typeDocument ?? "";
}
