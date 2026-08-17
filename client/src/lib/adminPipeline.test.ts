import { describe, expect, it } from "vitest";
import { isValidSourceUrl, pipelineStatusMessage } from "./adminPipeline";

describe("AdminPanel pipeline contract", () => {
  it("accepts only absolute HTTP or HTTPS source URLs", () => {
    expect(isValidSourceUrl("https://fr.wikipedia.org/wiki/Droit")).toBe(true);
    expect(isValidSourceUrl("http://example.test/legal")).toBe(true);
    expect(isValidSourceUrl("bad-url")).toBe(false);
    expect(isValidSourceUrl("javascript:alert(1)")).toBe(false);
  });

  it("exposes the user-visible running, success and error states", () => {
    expect(pipelineStatusMessage("running")).toContain("Traitement en cours");
    expect(pipelineStatusMessage("success")).toContain("terminé avec succès");
    expect(pipelineStatusMessage("error", "URL invalide")).toBe("Erreur : URL invalide");
  });
});

  it("handles custom warning messages propagated from the backend", () => {
    const warningMsg = "Avertissement : robots.txt interdit l'accès à ce chemin.";
    expect(pipelineStatusMessage("error", warningMsg)).toBe(`Erreur : ${warningMsg}`);
  });
