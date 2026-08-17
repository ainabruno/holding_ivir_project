import PDFDocument from "pdfkit";

export type LegalExportRow = {
  documentId: number;
  sourceId: string;
  source: string;
  urlSource: string | null;
  dateDecision: string | null;
  dateCollecte: Date | null;
  juridiction: string | null;
  typeDocument: string | null;
  verdict: string | null;
  montantAlloue: number | null;
  parties: string[];
  referencesLegales: string[];
  niveauConfiance: number | null;
  resumeAutomatique: string | null;
};

export const LEGAL_EXPORT_HEADERS = [
  "document_id",
  "source_id",
  "source",
  "url_source",
  "date_decision",
  "date_collecte",
  "juridiction",
  "type_document",
  "verdict",
  "montant_alloue",
  "parties",
  "references_legales",
  "niveau_confiance",
  "resume_automatique",
] as const;

function normalizeArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Legacy rows may contain a plain text value instead of JSON.
  }
  return [value];
}

export function toLegalExportRow(document: any, entity?: any | null): LegalExportRow {
  return {
    documentId: Number(document.id),
    sourceId: String(document.idSource),
    source: String(document.source),
    urlSource: document.urlSource ?? null,
    dateDecision: document.dateDecision ?? entity?.dateDecision ?? null,
    dateCollecte: document.dateCollecte ?? null,
    juridiction: entity?.juridiction ?? document.juridiction ?? null,
    typeDocument: document.typeDocument ?? null,
    verdict: entity?.sensVerdict ?? null,
    montantAlloue: entity?.montantAlloue ?? null,
    parties: normalizeArray(entity?.intervenants),
    referencesLegales: normalizeArray(entity?.referencesLegales),
    niveauConfiance: entity?.niveauConfiance ?? document.niveauConfianceExtraction ?? null,
    resumeAutomatique: entity?.resumeAutomatique ?? null,
  };
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join("; ") : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createLegalCsv(rows: LegalExportRow[]): string {
  const lines = [LEGAL_EXPORT_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.documentId,
        row.sourceId,
        row.source,
        row.urlSource,
        row.dateDecision,
        row.dateCollecte?.toISOString() ?? null,
        row.juridiction,
        row.typeDocument,
        row.verdict,
        row.montantAlloue,
        row.parties,
        row.referencesLegales,
        row.niveauConfiance,
        row.resumeAutomatique,
      ].map(csvCell).join(",")
    );
  }
  return `\ufeff${lines.join("\r\n")}\r\n`;
}

function pdfValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}

export function createLegalPdf(rows: LegalExportRow[], generatedAt = new Date()): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({
      size: "A4",
      margin: 42,
      info: {
        Title: "Holding IVIR — Export des données juridiques",
        Author: "Holding IVIR",
        Subject: "Données juridiques extraites",
      },
    });
    const chunks: Buffer[] = [];

    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    pdf.fontSize(18).fillColor("#172033").text("Holding IVIR", { continued: true });
    pdf.fontSize(11).fillColor("#526071").text(" — Export des données juridiques", { continued: false });
    pdf.moveDown(0.35);
    pdf.fontSize(9).fillColor("#6b7280").text(`Généré le ${generatedAt.toLocaleString("fr-FR")} · ${rows.length} résultat(s)`);
    pdf.moveDown(0.8);

    if (rows.length === 0) {
      pdf.fontSize(11).fillColor("#172033").text("Aucune donnée ne correspond aux filtres sélectionnés.");
      pdf.end();
      return;
    }

    rows.forEach((row, index) => {
      if (index > 0) pdf.moveDown(0.7);
      pdf.fontSize(12).fillColor("#0f766e").text(`${index + 1}. ${pdfValue(row.typeDocument || row.source)}`);
      pdf.moveDown(0.2);
      pdf.fontSize(9.5).fillColor("#172033");

      const fields = [
        ["Source", row.source],
        ["Identifiant", row.sourceId],
        ["Juridiction", row.juridiction],
        ["Date de décision", row.dateDecision],
        ["Verdict", row.verdict],
        ["Montant alloué", row.montantAlloue === null ? null : `${row.montantAlloue} €`],
        ["Parties", row.parties],
        ["Références légales", row.referencesLegales],
        ["Confiance", row.niveauConfiance === null ? null : `${row.niveauConfiance}%`],
        ["Résumé", row.resumeAutomatique],
        ["URL source", row.urlSource],
      ] as const;

      for (const [label, value] of fields) {
        pdf.text(`${label} : ${pdfValue(value)}`, { width: 510 });
      }

      if (index < rows.length - 1) {
        pdf.moveDown(0.35);
        pdf.strokeColor("#d9e1ea").moveTo(42, pdf.y).lineTo(553, pdf.y).stroke();
      }
    });

    pdf.end();
  });
}

export function contentDisposition(filename: string): string {
  return `attachment; filename="${filename.replaceAll('"', "")}"`;
}

export function parseFilterArray(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function parseDateFilter(value: unknown): Date | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export const VERDICTS = ["favorable", "rejected", "partial"] as const;
export type Verdict = (typeof VERDICTS)[number];

export function isVerdict(value: string | undefined): value is Verdict {
  return Boolean(value && VERDICTS.includes(value as Verdict));
}

export function filterRows(rows: LegalExportRow[], filters: { search?: string; source?: string; verdict?: string; startDate?: Date; endDate?: Date }): LegalExportRow[] {
  const search = filters.search?.toLowerCase().trim();
  return rows.filter((row) => {
    if (filters.source && row.source !== filters.source) return false;
    if (filters.verdict && row.verdict !== filters.verdict) return false;
    if (filters.startDate && (!row.dateCollecte || row.dateCollecte < filters.startDate)) return false;
    if (filters.endDate && (!row.dateCollecte || row.dateCollecte > filters.endDate)) return false;
    if (!search) return true;
    const haystack = [
      row.source,
      row.sourceId,
      row.urlSource,
      row.juridiction,
      row.typeDocument,
      row.verdict,
      row.resumeAutomatique,
      ...row.parties,
      ...row.referencesLegales,
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search);
  });
}

export function getExportFilename(extension: "csv" | "pdf", now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `holding-ivir-donnees-juridiques-${stamp}.${extension}`;
}

export function formatFilterSummary(filters: { search?: string; source?: string; verdict?: string; startDate?: Date; endDate?: Date }): string {
  const active: string[] = [];
  if (filters.search) active.push(`recherche: ${filters.search}`);
  if (filters.source) active.push(`source: ${filters.source}`);
  if (filters.verdict) active.push(`verdict: ${filters.verdict}`);
  if (filters.startDate) active.push(`du: ${filters.startDate.toLocaleDateString("fr-FR")}`);
  if (filters.endDate) active.push(`au: ${filters.endDate.toLocaleDateString("fr-FR")}`);
  return active.length ? active.join(" · ") : "aucun filtre";
}
