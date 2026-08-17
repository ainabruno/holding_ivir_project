import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
  describe("Admin Procedures", () => {
    it("should allow admin to trigger scraping", async () => {
      const ctx = createMockContext(adminUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.triggerScraping({ source: "wikipedia" });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("jobId");
    });

    it("should deny non-admin from triggering scraping", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.legal.triggerScraping({ source: "wikipedia" });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.message).toContain("admin");
      }
    });

    it("should allow admin to trigger extraction", async () => {
      const ctx = createMockContext(adminUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.triggerExtraction({});

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("jobId");
    });

    it("should deny non-admin from triggering extraction", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.legal.triggerExtraction({});
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.message).toContain("admin");
      }
    });
  });

  describe("Public Procedures", () => {
    it("should allow public users to list documents", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.legal.listDocuments({ limit: 10, offset: 0 });

      expect(result).toHaveProperty("documents");
      expect(result).toHaveProperty("count");
      expect(Array.isArray(result.documents)).toBe(true);
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

      expect(result).toHaveProperty("totalDocuments");
      expect(result).toHaveProperty("verdictDistribution");
      expect(result).toHaveProperty("topJurisdictions");
      expect(result).toHaveProperty("averageConfidence");
    });
  });

  describe("Input Validation", () => {
    it("should validate limit parameter in listDocuments", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      try {
        // @ts-ignore - intentionally passing invalid input
        await caller.legal.listDocuments({ limit: 1000 });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("max");
      }
    });

    it("should validate verdict enum in filterEntitiesByVerdict", async () => {
      const ctx = createMockContext(publicUser);
      const caller = appRouter.createCaller(ctx);

      try {
        // @ts-ignore - intentionally passing invalid verdict
        await caller.legal.filterEntitiesByVerdict({ verdict: "invalid" });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.message).toContain("enum");
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
        expect(error.message).toContain("datetime");
      }
    });
  });
});

describe("Module Alpha - Web Scraping", () => {
  it("should generate unique identifiers consistently", () => {
    const url = "https://example.com/page";
    const id1 = require("../modules/alpha_scraping").generate_identifier(url);
    const id2 = require("../modules/alpha_scraping").generate_identifier(url);

    expect(id1).toBe(id2);
    expect(id1).toHaveLength(12);
  });

  it("should clean text properly", () => {
    const text = "  Line 1  \n\n  Line 2  \n  Line 3  ";
    const cleaned = require("../modules/alpha_scraping").clean_text(text);

    expect(cleaned).toBe("Line 1 Line 2 Line 3");
    expect(cleaned).not.toContain("\n");
    expect(cleaned).not.toContain("  ");
  });
});

describe("Module Beta - AI Extraction", () => {
  it("should validate legal entities schema", () => {
    const { LegalEntitiesExtraction } = require("../modules/beta_extraction");

    const validEntity = {
      type_litige: "malfaçon",
      secteur: "construction",
      sens_verdict: "favorable",
      resume_automatique: "Test summary",
      niveau_confiance: 0.85,
    };

    expect(() => new LegalEntitiesExtraction(validEntity)).not.toThrow();
  });

  it("should reject invalid verdict values", () => {
    const { LegalEntitiesExtraction } = require("../modules/beta_extraction");

    const invalidEntity = {
      type_litige: "malfaçon",
      secteur: "construction",
      sens_verdict: "invalid_verdict",
      resume_automatique: "Test summary",
      niveau_confiance: 0.85,
    };

    expect(() => new LegalEntitiesExtraction(invalidEntity)).toThrow();
  });

  it("should reject confidence scores outside 0-1 range", () => {
    const { LegalEntitiesExtraction } = require("../modules/beta_extraction");

    const invalidEntity = {
      type_litige: "malfaçon",
      secteur: "construction",
      sens_verdict: "favorable",
      resume_automatique: "Test summary",
      niveau_confiance: 1.5, // Invalid: > 1.0
    };

    expect(() => new LegalEntitiesExtraction(invalidEntity)).toThrow();
  });
});

describe("Module Gamma - Database", () => {
  it("should export database helper functions", () => {
    const db = require("../db");

    expect(typeof db.createLegalDocument).toBe("function");
    expect(typeof db.getLegalDocumentByIdSource).toBe("function");
    expect(typeof db.getAllLegalDocuments).toBe("function");
    expect(typeof db.getLegalDocumentsByDateRange).toBe("function");
    expect(typeof db.getLegalDocumentsBySource).toBe("function");
    expect(typeof db.createLegalEntity).toBe("function");
    expect(typeof db.getLegalEntityBySourceId).toBe("function");
    expect(typeof db.getLegalEntitiesByVerdict).toBe("function");
    expect(typeof db.getLegalEntitiesByJuridiction).toBe("function");
    expect(typeof db.getStatistics).toBe("function");
  });
});
