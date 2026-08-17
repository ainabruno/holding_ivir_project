import { describe, expect, it } from "vitest";
import {
  createLegalCsv,
  createLegalPdf,
  filterRows,
  getExportFilename,
  type LegalExportRow,
} from "./legalExports";

const rows: LegalExportRow[] = [
  {
    documentId: 1,
    sourceId: "wiki-1",
    source: "wikipedia",
    urlSource: "https://example.test/1",
    dateDecision: "2026-08-01",
    dateCollecte: new Date("2026-08-02T10:00:00.000Z"),
    juridiction: "Paris",
    typeDocument: "Décision civile",
    verdict: "favorable",
    montantAlloue: 12500,
    parties: ["Société A", "Société B"],
    referencesLegales: ["Code civil, art. 1231-1"],
    niveauConfiance: 92,
    resumeAutomatique: "Résumé, avec virgule",
  },
  {
    documentId: 2,
    sourceId: "legifrance-2",
    source: "legifrance",
    urlSource: null,
    dateDecision: "2026-07-12",
    dateCollecte: new Date("2026-07-13T10:00:00.000Z"),
    juridiction: "Lyon",
    typeDocument: "Arrêt",
    verdict: "rejected",
    montantAlloue: null,
    parties: [],
    referencesLegales: [],
    niveauConfiance: 76,
    resumeAutomatique: null,
  },
];

describe("legal exports", () => {
  it("produces a UTF-8 CSV with stable headers and escaped values", () => {
    const csv = createLegalCsv(rows);

    expect(csv.startsWith("\ufeffdocument_id,source_id,source")).toBe(true);
    expect(csv).toContain('"Résumé, avec virgule"');
    expect(csv).toContain("Société A; Société B");
    expect(csv.split("\r\n")).toHaveLength(4);
  });

  it("produces a readable PDF document", async () => {
    const pdf = await createLegalPdf(rows);

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("filters by source, verdict, date and full-text search", () => {
    expect(filterRows(rows, { source: "wikipedia" })).toHaveLength(1);
    expect(filterRows(rows, { verdict: "rejected" })).toHaveLength(1);
    expect(filterRows(rows, { startDate: new Date("2026-08-01T00:00:00.000Z") })).toHaveLength(1);
    expect(filterRows(rows, { search: "art. 1231" })).toHaveLength(1);
  });

  it("creates deterministic, safe filenames", () => {
    const now = new Date("2026-08-17T12:00:00.000Z");
    expect(getExportFilename("csv", now)).toBe("holding-ivir-donnees-juridiques-2026-08-17.csv");
    expect(getExportFilename("pdf", now)).toBe("holding-ivir-donnees-juridiques-2026-08-17.pdf");
  });
});
