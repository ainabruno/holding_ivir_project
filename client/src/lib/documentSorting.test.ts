import { describe, expect, it } from "vitest";
import { sortLegalDocuments } from "./documentSorting";

const documents = [
  { idSource: "a", source: "wikipedia", dateDecision: "2026-08-01", extractedEntity: { verdict: "rejected", niveauConfiance: 72 } },
  { idSource: "b", source: "legifrance", dateDecision: "2026-08-12", extractedEntity: { verdict: "favorable", niveauConfiance: 94 } },
  { idSource: "c", source: "wikipedia", dateDecision: "2026-08-06", extractedEntity: { verdict: "partial", niveauConfiance: 81 } },
];

describe("legal document sorting", () => {
  it("sorts confidence descending and source ascending without mutating input", () => {
    expect(sortLegalDocuments(documents, "confidence", "desc").map((document) => document.idSource)).toEqual(["b", "c", "a"]);
    expect(sortLegalDocuments(documents, "source", "asc").map((document) => document.idSource)).toEqual(["b", "a", "c"]);
    expect(documents.map((document) => document.idSource)).toEqual(["a", "b", "c"]);
  });

  it("sorts decision dates ascending", () => {
    expect(sortLegalDocuments(documents, "date", "asc").map((document) => document.idSource)).toEqual(["a", "c", "b"]);
  });
});
