import type { Express, Request, Response } from "express";
import { getLegalExportRows } from "./db";
import {
  contentDisposition,
  createLegalCsv,
  createLegalPdf,
  getExportFilename,
  isVerdict,
  parseDateFilter,
  parseFilterArray,
  toLegalExportRow,
} from "./legalExports";

function queryString(value: unknown): string | undefined {
  if (Array.isArray(value)) return queryString(value[0]);
  return parseFilterArray(value);
}

function buildFilters(req: Request) {
  const search = queryString(req.query.search)?.slice(0, 200);
  const source = queryString(req.query.source)?.slice(0, 100);
  const verdict = queryString(req.query.verdict);
  const startDateValue = queryString(req.query.startDate);
  const endDateValue = queryString(req.query.endDate);
  const startDate = parseDateFilter(startDateValue);
  const endDate = parseDateFilter(endDateValue);

  if (startDateValue && !startDate) throw new Error("Invalid startDate filter");
  if (endDateValue && !endDate) throw new Error("Invalid endDate filter");
  if (verdict && !isVerdict(verdict)) throw new Error("Invalid verdict filter");
  if (startDate && endDate && startDate > endDate) throw new Error("startDate must be before endDate");

  return { search, source, verdict, startDate, endDate };
}

async function getRows(req: Request) {
  const filters = buildFilters(req);
  const joinedRows = await getLegalExportRows(filters);
  return joinedRows.map(({ document, entity }) => toLegalExportRow(document, entity));
}

function handleExportError(error: unknown, res: Response) {
  const message = error instanceof Error ? error.message : "Unable to export legal data";
  const status = message.startsWith("Invalid") || message.startsWith("startDate") ? 400 : 500;
  if (status === 500) console.error("[Legal Export] Failed:", error);
  res.status(status).json({ error: message });
}

/**
 * Exports are intentionally public because the dashboard's legal result list is public read-only.
 * Admin-only actions remain protected in Module Delta (scraping and extraction triggers).
 */
export function registerLegalExportRoutes(app: Express) {
  app.get("/api/legal/export.csv", async (req, res) => {
    try {
      const rows = await getRows(req);
      res
        .status(200)
        .setHeader("Content-Type", "text/csv; charset=utf-8")
        .setHeader("Content-Disposition", contentDisposition(getExportFilename("csv")))
        .send(createLegalCsv(rows));
    } catch (error) {
      handleExportError(error, res);
    }
  });

  app.get("/api/legal/export.pdf", async (req, res) => {
    try {
      const rows = await getRows(req);
      const pdf = await createLegalPdf(rows);
      res
        .status(200)
        .setHeader("Content-Type", "application/pdf")
        .setHeader("Content-Disposition", contentDisposition(getExportFilename("pdf")))
        .send(pdf);
    } catch (error) {
      handleExportError(error, res);
    }
  });
}
