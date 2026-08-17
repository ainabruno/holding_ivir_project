export type PreviewEntity = {
  parties?: unknown;
  referencesLegales?: unknown;
  montantAlloue?: number | string | null;
  niveauConfiance?: number | string | null;
  resumeAutomatique?: string | null;
};

export function normalizePreviewList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") return value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

export function previewAmount(value: PreviewEntity["montantAlloue"]): string {
  if (value == null || value === "") return "—";
  return `${Number(value).toLocaleString("fr-FR")} €`;
}
