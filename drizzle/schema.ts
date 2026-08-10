import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Module Gamma: Database schema for legal documents and enriched entities
 */
export const legalDocuments = mysqlTable("legal_documents", {
  id: int("id").autoincrement().primaryKey(),
  idSource: varchar("id_source", { length: 255 }).notNull().unique(),
  source: varchar("source", { length: 100 }).notNull(), // e.g., "legifrance", "wikipedia"
  dateDecision: varchar("date_decision", { length: 10 }), // YYYY-MM-DD format
  juridiction: varchar("juridiction", { length: 255 }),
  typeDocument: varchar("type_document", { length: 100 }),
  texteBrut: text("texte_brut"),
  urlSource: varchar("url_source", { length: 500 }),
  dateCollecte: timestamp("date_collecte").defaultNow().notNull(),
  niveauConfianceExtraction: int("niveau_confiance_extraction"), // 0-100 scale
  necessiteVerificationHumaine: int("necessite_verification_humaine").default(0), // boolean
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type LegalDocument = typeof legalDocuments.$inferSelect;
export type InsertLegalDocument = typeof legalDocuments.$inferInsert;

export const legalEntities = mysqlTable("legal_entities", {
  id: int("id").autoincrement().primaryKey(),
  idDecision: varchar("id_decision", { length: 255 }).notNull().unique(),
  sourceId: varchar("source_id", { length: 255 }).notNull(), // Reference to legalDocuments.idSource
  typeLitige: varchar("type_litige", { length: 100 }).notNull(),
  secteur: varchar("secteur", { length: 100 }),
  juridiction: varchar("juridiction", { length: 255 }),
  dateDecision: varchar("date_decision", { length: 10 }),
  sensVerdict: varchar("sens_verdict", { length: 50 }).notNull(), // "favorable", "rejected", "partial"
  montantAlloue: int("montant_alloue"),
  intervenants: text("intervenants"), // JSON array as text
  referencesLegales: text("references_legales"), // JSON array as text
  niveauConfiance: int("niveau_confiance"), // 0-100 scale
  resumeAutomatique: text("resume_automatique"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type LegalEntity = typeof legalEntities.$inferSelect;
export type InsertLegalEntity = typeof legalEntities.$inferInsert;

export const scrapingJobs = mysqlTable("scraping_jobs", {
  id: int("id").autoincrement().primaryKey(),
  status: varchar("status", { length: 50 }).notNull(), // "pending", "running", "completed", "failed"
  source: varchar("source", { length: 100 }).notNull(),
  documentsCollected: int("documents_collected").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ScrapingJob = typeof scrapingJobs.$inferSelect;
export type InsertScrapingJob = typeof scrapingJobs.$inferInsert;

export const extractionJobs = mysqlTable("extraction_jobs", {
  id: int("id").autoincrement().primaryKey(),
  status: varchar("status", { length: 50 }).notNull(), // "pending", "running", "completed", "failed"
  documentId: int("document_id").notNull(),
  entitiesExtracted: int("entities_extracted").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ExtractionJob = typeof extractionJobs.$inferSelect;
export type InsertExtractionJob = typeof extractionJobs.$inferInsert;