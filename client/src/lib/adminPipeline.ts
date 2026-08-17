export function isValidSourceUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function pipelineStatusMessage(status: "running" | "success" | "error", detail?: string): string {
  if (status === "running") return "Traitement en cours : téléchargement, déduplication puis extraction IA…";
  if (status === "success") return "Traitement terminé avec succès.";
  return `Erreur : ${detail || "Erreur inconnue"}`;
}
