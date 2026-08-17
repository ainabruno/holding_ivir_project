import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "./appRoutes";

describe("frontend route contract", () => {
  it("uses the Holding IVIR dashboard as the home route", () => {
    expect(APP_ROUTES.home).toBe("/");
    expect(APP_ROUTES.dashboard).toBe("/dashboard");
    expect(APP_ROUTES.home).not.toBe("/example");
  });
});
