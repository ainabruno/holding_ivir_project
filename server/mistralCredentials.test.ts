import { describe, expect, it } from "vitest";

const apiKey = process.env.MISTRAL_API_KEY;

describe("Mistral API credentials", () => {
  it.skipIf(!apiKey)("can access the Mistral models endpoint without logging the key", async () => {
    const response = await fetch("https://api.mistral.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.text();
    expect(response.status, `Mistral returned HTTP ${response.status}: ${body.slice(0, 200)}`).toBe(200);
    const payload = JSON.parse(body) as { data?: unknown[] };
    expect(Array.isArray(payload.data)).toBe(true);
  }, 20000);
});
