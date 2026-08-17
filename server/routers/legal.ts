import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createLegalDocument,
  getLegalDocumentByIdSource,
  getAllLegalDocuments,
  getLegalDocumentsByDateRange,
  getLegalDocumentsBySource,
  createLegalEntity,
  getLegalEntityBySourceId,
  getLegalEntitiesByVerdict,
  getLegalEntitiesByJuridiction,
  getStatistics,
} from "../db";
import { InsertLegalDocument, InsertLegalEntity } from "../../drizzle/schema";

/**
 * Module Delta: tRPC API for legal documents and entities
 * Provides typed procedures for scraping, extraction, and data retrieval
 */

// Admin-only procedure for triggering scraping
export const triggerScrapingProcedure = protectedProcedure
  .use(({ ctx, next }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admins can trigger scraping");
    }
    return next({ ctx });
  })
  .input(z.object({ source: z.string() }))
  .mutation(async ({ input }) => {
    // This would trigger the scraping job
    // For now, return a placeholder response
    return {
      success: true,
      message: `Scraping job triggered for source: ${input.source}`,
      jobId: `job_${Date.now()}`,
    };
  });

// Admin-only procedure for triggering extraction
export const triggerExtractionProcedure = protectedProcedure
  .use(({ ctx, next }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admins can trigger extraction");
    }
    return next({ ctx });
  })
  .input(z.object({ documentIds: z.array(z.number()).optional() }))
  .mutation(async ({ input }) => {
    // This would trigger the extraction job
    return {
      success: true,
      message: "Extraction job triggered",
      jobId: `job_${Date.now()}`,
      documentsToProcess: input.documentIds?.length || "all",
    };
  });

// Public procedure to list legal documents
export const listDocumentsProcedure = publicProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ input }) => {
    const documents = await getAllLegalDocuments(input.limit, input.offset);
    return {
      documents,
      count: documents.length,
    };
  });

// Public procedure to filter documents by date range
export const filterDocumentsByDateProcedure = publicProcedure
  .input(
    z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    })
  )
  .query(async ({ input }) => {
    const documents = await getLegalDocumentsByDateRange(
      new Date(input.startDate),
      new Date(input.endDate)
    );
    return {
      documents,
      count: documents.length,
    };
  });

// Public procedure to filter documents by source
export const filterDocumentsBySourceProcedure = publicProcedure
  .input(z.object({ source: z.string() }))
  .query(async ({ input }) => {
    const documents = await getLegalDocumentsBySource(input.source);
    return {
      documents,
      count: documents.length,
    };
  });

// Public procedure to get enriched entities for a document
export const getEntitiesByDocumentProcedure = publicProcedure
  .input(z.object({ sourceId: z.string() }))
  .query(async ({ input }) => {
    const entity = await getLegalEntityBySourceId(input.sourceId);
    return entity || null;
  });

// Public procedure to filter entities by verdict
export const filterEntitiesByVerdictProcedure = publicProcedure
  .input(z.object({ verdict: z.enum(["favorable", "rejected", "partial"]) }))
  .query(async ({ input }) => {
    const entities = await getLegalEntitiesByVerdict(input.verdict);
    return {
      entities,
      count: entities.length,
    };
  });

// Public procedure to filter entities by jurisdiction
export const filterEntitiesByJurisdictionProcedure = publicProcedure
  .input(z.object({ juridiction: z.string() }))
  .query(async ({ input }) => {
    const entities = await getLegalEntitiesByJuridiction(input.juridiction);
    return {
      entities,
      count: entities.length,
    };
  });

// Public procedure to get statistics
export const getStatisticsProcedure = publicProcedure.query(async () => {
  const stats = await getStatistics();
  return stats;
});

// Create the legal router
export const legalRouter = router({
  // Admin procedures
  triggerScraping: triggerScrapingProcedure,
  triggerExtraction: triggerExtractionProcedure,

  // Public read procedures
  listDocuments: listDocumentsProcedure,
  filterDocumentsByDate: filterDocumentsByDateProcedure,
  filterDocumentsBySource: filterDocumentsBySourceProcedure,
  getEntitiesByDocument: getEntitiesByDocumentProcedure,
  filterEntitiesByVerdict: filterEntitiesByVerdictProcedure,
  filterEntitiesByJurisdiction: filterEntitiesByJurisdictionProcedure,
  getStatistics: getStatisticsProcedure,
});
