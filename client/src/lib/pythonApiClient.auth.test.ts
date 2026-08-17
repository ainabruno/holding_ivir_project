import { afterEach, describe, expect, it } from "vitest";
import { pythonApi } from "./pythonApiClient";

const storage = new Map<string, string>();
const sessionStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { sessionStorage: sessionStorageMock },
});

describe("admin session client", () => {
  afterEach(() => storage.clear());

  it("clears the Bearer token on logout", () => {
    storage.set("holding-ivir-admin-token", "temporary-admin-token");
    pythonApi.clearAdminToken();
    expect(storage.has("holding-ivir-admin-token")).toBe(false);
  });
});
