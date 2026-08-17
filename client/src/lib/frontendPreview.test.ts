import { describe, expect, it } from "vitest";
import {
  FRONTEND_PREVIEW_DOCUMENTS,
  getFrontendPreviewDocuments,
  getFrontendPreviewStatistics,
} from "./frontendPreview";

describe("frontend-only preview", () => {
  it("provides clearly scoped local preview documents", () => {
    expect(FRONTEND_PREVIEW_DOCUMENTS).toHaveLength(4);
    expect(FRONTEND_PREVIEW_DOCUMENTS.every((document) => document.idSource.startsWith("preview-"))).toBe(true);
  });

  it("applies search, source and verdict filters locally", () => {
    expect(getFrontendPreviewDocuments({ limit: 25, offset: 0, source: "wikipedia" }).count).toBe(2);
    expect(getFrontendPreviewDocuments({ limit: 25, offset: 0, verdict: "favorable" }).count).toBe(2);
    expect(getFrontendPreviewDocuments({ limit: 25, offset: 0, search: "Lyon" }).documents[0]?.idSource).toBe("preview-legi-002");
  });

  it("returns preview KPIs without a backend", () => {
    const stats = getFrontendPreviewStatistics();
    expect(stats.totalDocuments).toBe(4);
    expect(stats.averageConfidence).toBe(85.25);
    expect(stats.verdictDistribution).toEqual([
      { verdict: "favorable", count: 2 },
      { verdict: "rejected", count: 1 },
      { verdict: "partial", count: 1 },
    ]);
  });
});
