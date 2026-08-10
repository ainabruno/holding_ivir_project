import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock user contexts
const adminUser = {
  id: 1,
  openId: "admin-user",
  email: "admin@example.com",
  name: "Admin User",
  loginMethod: "manus",
  role: "admin" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const publicUser = {
  id: 2,
  openId: "public-user",
  email: "user@example.com",
  name: "Public User",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createMockContext(user: typeof adminUser | typeof publicUser | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Module Delta - tRPC Legal Router", () => {
  describe("Admin Procedures - Authorization", () => {
    it("should allow admin to trigger scraping", async () => {
      const ctx = createMockContext(adminUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.triggerScraping({ source: "wikipedia" });

      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("jobId");
      expect(typeof result.jobId).toBe("string");
    });

    it("should deny non-admin from triggering scraping", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.legal.triggerScraping({ source: "wikipedia" });
        expect.fail("Should have thrown error for non-admin user");
      } catch (error: any) {
        expect(error.message).toContain("admin");
      }
    });

    it("should allow admin to trigger extraction", async () => {
      const ctx = createMockContext(adminUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.triggerExtraction({});

      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("jobId");
    });

    it("should deny non-admin from triggering extraction", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.legal.triggerExtraction({});
        expect.fail("Should have thrown error for non-admin user");
      } catch (error: any) {
        expect(error.message).toContain("admin");
      }
    });
  });

  describe("Public Procedures - Data Access", () => {
    it("should allow public users to list documents with pagination", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.listDocuments({ limit: 10, offset: 0 });

      expect(result).toHaveProperty("documents");
      expect(result).toHaveProperty("count");
      expect(Array.isArray(result.documents)).toBe(true);
      expect(typeof result.count).toBe("number");
    });

    it("should respect limit parameter in listDocuments", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.listDocuments({ limit: 5, offset: 0 });

      expect(result.documents.length).toBeLessThanOrEqual(5);
    });

    it("should allow filtering documents by date range", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const result = await caller.legal.filterDocumentsByDate({
        startDate,
        endDate,
      });

      expect(result).toHaveProperty("documents");
      expect(result).toHaveProperty("count");
      expect(Array.isArray(result.documents)).toBe(true);
    });

    it("should allow filtering documents by source", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.filterDocumentsBySource({ source: "wikipedia" });

      expect(result).toHaveProperty("documents");
      expect(result).toHaveProperty("count");
    });

    it("should allow filtering entities by verdict", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.filterEntitiesByVerdict({ verdict: "favorable" });

      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("count");
      expect(Array.isArray(result.entities)).toBe(true);
    });

    it("should allow filtering entities by jurisdiction", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.filterEntitiesByJurisdiction({
        juridiction: "Tribunal judiciaire de Lyon",
      });

      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("count");
    });

    it("should allow getting statistics", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.getStatistics();

      expect(result).toBeTruthy();
      expect(result).toHaveProperty("totalDocuments");
      expect(result).toHaveProperty("verdictDistribution");
      expect(result).toHaveProperty("topJurisdictions");
      expect(result).toHaveProperty("averageConfidence");
      expect(typeof result.totalDocuments).toBe("number");
    });

    it("should allow getting entities for a specific document", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.getEntitiesByDocument({ sourceId: "test-id" });

      // Result can be null if document doesn't exist
      expect(result === null || typeof result === "object").toBe(true);
    });
  });

  describe("Input Validation", () => {
    it("should validate limit parameter in listDocuments", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      try {
        // @ts-ignore - intentionally passing invalid input
        await caller.legal.listDocuments({ limit: 1000, offset: 0 });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("<=");
      }
    });

    it("should validate minimum limit in listDocuments", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      try {
        // @ts-ignore - intentionally passing invalid input
        await caller.legal.listDocuments({ limit: 0, offset: 0 });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain(">=");
      }
    });

    it("should validate verdict enum in filterEntitiesByVerdict", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      try {
        // @ts-ignore - intentionally passing invalid verdict
        await caller.legal.filterEntitiesByVerdict({ verdict: "invalid_verdict" });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Invalid option");
      }
    });

    it("should validate date format in filterDocumentsByDate", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      try {
        // @ts-ignore - intentionally passing invalid date
        await caller.legal.filterDocumentsByDate({
          startDate: "invalid-date",
          endDate: new Date().toISOString(),
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("Invalid");
      }
    });

    it("should validate source parameter in triggerScraping", async () => {
      const ctx = createMockContext(adminUser);
      const caller = appRouter.createCaller(ctx);

      // Valid sources should work
      const result = await caller.legal.triggerScraping({ source: "wikipedia" });
      expect(result.success).toBe(true);
    });
  });

  describe("Verdict Classification", () => {
    it("should support all three verdict types", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      const verdicts = ["favorable", "rejected", "partial"] as const;

      for (const verdict of verdicts) {
        const result = await caller.legal.filterEntitiesByVerdict({ verdict });
        expect(result).toHaveProperty("entities");
        expect(result).toHaveProperty("count");
      }
    });
  });
});
