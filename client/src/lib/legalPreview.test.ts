import { describe, expect, it } from "vitest";
import { normalizePreviewList, previewAmount } from "./legalPreview";

describe("legal preview helpers", () => {
  it("normalizes extracted parties and legal references from arrays or strings", () => {
    expect(normalizePreviewList(["Demandeur", "Défendeur"])).toEqual(["Demandeur", "Défendeur"]);
    expect(normalizePreviewList("Article 123 ; Article 456")).toEqual(["Article 123", "Article 456"]);
    expect(normalizePreviewList(null)).toEqual([]);
  });

  it("formats amounts consistently before export preview", () => {
    expect(previewAmount(12500)).toContain("12 500");
    expect(previewAmount(null)).toBe("—");
  });
});
