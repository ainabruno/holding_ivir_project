import { describe, expect, it } from "vitest";

const adminToken = process.env.ADMIN_API_TOKEN;
const apiBaseUrl = process.env.PYTHON_API_URL || "http://127.0.0.1:8000";

describe("admin API token", () => {
  it.skipIf(!adminToken)("is accepted by the lightweight auth endpoint without logging the secret", async () => {
    const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      signal: AbortSignal.timeout(10000),
    });
    expect(response.status).toBe(200);
    const payload = await response.json() as { role?: string };
    expect(payload.role).toBe("admin");
  });
});
