import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreviewRow } from "./Dashboard";

describe("Dashboard legal preview row", () => {
  it("renders the extracted legal fields when expanded", () => {
    const html = renderToStaticMarkup(
      <PreviewRow
        expanded
        onToggle={() => undefined}
        doc={{
          id: 42,
          source: "wikipedia",
          idSource: "legal-42",
          typeDocument: "Décision juridique",
          juridiction: "Paris",
          dateDecision: "2026-08-17",
          urlSource: "https://example.test/legal-42",
          extractedEntity: {
            sourceId: "legal-42",
            juridiction: "Paris",
            verdict: "favorable",
            niveauConfiance: 92,
            montantAlloue: 12500,
            parties: ["Demandeur", "Défendeur"],
            referencesLegales: ["Article 123"],
            resumeAutomatique: "Résumé de la décision.",
          },
        }}
      />,
    );

    expect(html).toContain("Demandeur · Défendeur");
    expect(html).toContain("Article 123");
    expect(html).toContain("12 500 €");
    expect(html).toContain("Résumé de la décision.");
    expect(html).toContain("https://example.test/legal-42");
  });
});
