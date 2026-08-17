import { describe, expect, it } from "vitest";

const tokenUrl = process.env.PISTE_TOKEN_URL;
const clientId = process.env.LEGIFRANCE_CLIENT_ID;
const clientSecret = process.env.LEGIFRANCE_CLIENT_SECRET;

const hasCredentials = Boolean(tokenUrl && clientId && clientSecret);

describe("Légifrance PISTE credentials", () => {
  it.skipIf(!hasCredentials)("obtains a Bearer token without exposing the secret", async () => {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId!,
      client_secret: clientSecret!,
      scope: "openid",
    });

    let response: Response;
    try {
      response = await fetch(tokenUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      throw new Error(`PISTE OAuth2 endpoint unreachable or timed out: ${error instanceof Error ? error.message : "unknown error"}`);
    }

    const responseText = await response.text();
    expect(response.status, `PISTE OAuth2 returned HTTP ${response.status}: ${responseText.slice(0, 200)}`).toBe(200);
    const payload = JSON.parse(responseText) as { access_token?: string; token_type?: string };
    expect(payload.access_token).toEqual(expect.any(String));
    expect(payload.access_token!.length).toBeGreaterThan(20);
    expect(payload.token_type?.toLowerCase()).toBe("bearer");
  }, 20000);
});
