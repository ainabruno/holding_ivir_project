import express from "express";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { registerLegalExportRoutes } from "./legalExportRoutes";

let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()));
  server = undefined;
});

async function startTestServer() {
  const app = express();
  registerLegalExportRoutes(app);
  server = app.listen(0);
  await new Promise<void>((resolve) => server?.once("listening", () => resolve()));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe("legal export HTTP routes", () => {
  it("allows public dashboard access to CSV and PDF exports", async () => {
    const baseUrl = await startTestServer();
    const [csvResponse, pdfResponse] = await Promise.all([
      fetch(`${baseUrl}/api/legal/export.csv`),
      fetch(`${baseUrl}/api/legal/export.pdf`),
    ]);

    expect(csvResponse.status).toBe(200);
    expect(csvResponse.headers.get("content-type")).toContain("text/csv");
    expect(csvResponse.headers.get("content-disposition")).toContain(".csv");
    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers.get("content-type")).toContain("application/pdf");
    expect(pdfResponse.headers.get("content-disposition")).toContain(".pdf");
  });

  it("rejects invalid verdict filters before querying data", async () => {
    const baseUrl = await startTestServer();
    const response = await fetch(`${baseUrl}/api/legal/export.csv?verdict=unknown`);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid verdict filter" });
  });
});
