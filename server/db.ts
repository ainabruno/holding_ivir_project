import { eq, desc, gte, lte, and, count, avg } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, LegalDocument, InsertLegalDocument, LegalEntity, InsertLegalEntity, legalDocuments, legalEntities } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Module Gamma: Database query helpers for legal documents and entities
export async function createLegalDocument(doc: InsertLegalDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(legalDocuments).values(doc);
  return result;
}

export async function getLegalDocumentByIdSource(idSource: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(legalDocuments)
    .where(eq(legalDocuments.idSource, idSource))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllLegalDocuments(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(legalDocuments)
    .orderBy(desc(legalDocuments.dateCollecte))
    .limit(limit)
    .offset(offset);
}

export async function getLegalDocumentsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(legalDocuments)
    .where(
      and(
        gte(legalDocuments.dateCollecte, startDate),
        lte(legalDocuments.dateCollecte, endDate)
      )
    )
    .orderBy(desc(legalDocuments.dateCollecte));
}

export async function getLegalDocumentsBySource(source: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(legalDocuments)
    .where(eq(legalDocuments.source, source))
    .orderBy(desc(legalDocuments.dateCollecte));
}

export async function createLegalEntity(entity: InsertLegalEntity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(legalEntities).values(entity);
  return result;
}

export async function getLegalEntityBySourceId(sourceId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(legalEntities)
    .where(eq(legalEntities.sourceId, sourceId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLegalEntitiesByVerdict(verdict: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(legalEntities)
    .where(eq(legalEntities.sensVerdict, verdict))
    .orderBy(desc(legalEntities.createdAt));
}

export async function getLegalEntitiesByJuridiction(juridiction: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(legalEntities)
    .where(eq(legalEntities.juridiction, juridiction))
    .orderBy(desc(legalEntities.createdAt));
}

export async function getStatistics() {
  const db = await getDb();
  if (!db) return null;
  
  // Get total documents
  const totalDocs = await db
    .select({ count: count() })
    .from(legalDocuments);
  
  // Get verdict distribution
  const verdictDist = await db
    .select({
      verdict: legalEntities.sensVerdict,
      count: count(),
    })
    .from(legalEntities)
    .groupBy(legalEntities.sensVerdict);
  
  // Get top jurisdictions
  const topJurisdictions = await db
    .select({
      juridiction: legalEntities.juridiction,
      count: count(),
    })
    .from(legalEntities)
    .groupBy(legalEntities.juridiction)
    .orderBy(desc(count()))
    .limit(10);
  
  // Get average confidence
  const avgConfidence = await db
    .select({ avg: avg(legalEntities.niveauConfiance) })
    .from(legalEntities);
  
  return {
    totalDocuments: totalDocs[0]?.count || 0,
    verdictDistribution: verdictDist,
    topJurisdictions,
    averageConfidence: avgConfidence[0]?.avg || 0,
  };
}
