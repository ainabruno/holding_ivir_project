import { useEffect, useState } from "react";
import { pythonApi } from "@/lib/pythonApiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Play, Database, LogOut } from "lucide-react";
import { isValidSourceUrl, pipelineStatusMessage } from "@/lib/adminPipeline";

const frontendOnly = import.meta.env.VITE_FRONTEND_ONLY === "true";

type RunResult = {
  success?: boolean;
  message?: string;
  documents_added?: number;
  processed?: number;
};

export default function AdminPanel() {
  const [selectedSource, setSelectedSource] = useState("wikipedia");
  const [sourceUrl, setSourceUrl] = useState("https://fr.wikipedia.org/wiki/Droit");
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(frontendOnly);
  const [adminToken, setAdminToken] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<{ mistral_configured: boolean; legifrance_configured: boolean; admin_protection_enabled: boolean; environment: string } | null>(null);

  useEffect(() => {
    if (frontendOnly) return;
    pythonApi.me().then((user) => {
      const authenticated = user?.role === "admin";
      setIsAdmin(authenticated);
      if (authenticated) pythonApi.getAdminStatus().then(setSystemStatus).catch(() => setSystemStatus(null));
    }).catch(() => setIsAdmin(false));
  }, []);

  const handleAdminLogin = async () => {
    if (!adminToken.trim()) {
      setAuthError("Saisissez le jeton administrateur fourni par l’administrateur du déploiement.");
      return;
    }
    setIsLoading(true);
    setAuthError(null);
    try {
      await pythonApi.authenticateAdmin(adminToken.trim());
      setIsAdmin(true);
      setAdminToken("");
      pythonApi.getAdminStatus().then(setSystemStatus).catch(() => setSystemStatus(null));
    } catch (error: any) {
      pythonApi.clearAdminToken();
      setAuthError(error?.response?.data?.detail || "Jeton administrateur refusé par l’API FastAPI.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    pythonApi.clearAdminToken();
    try {
      await pythonApi.logout();
    } catch {
      // The client-side token is already cleared even if the stateless API logout fails.
    }
    setIsAdmin(false);
    setAuthError(null);
    setJobStatus(null);
    setRunResult(null);
    setSystemStatus(null);
  };

  const handleTriggerPipeline = async () => {
    const normalizedUrl = sourceUrl.trim();
    if (!isValidSourceUrl(normalizedUrl)) {
      setJobStatus(pipelineStatusMessage("error", "saisissez une URL http:// ou https:// valide."));
      setRunResult(null);
      return;
    }

    setIsLoading(true);
    setJobStatus(pipelineStatusMessage("running"));
    setRunResult(null);

    try {
      const result = await pythonApi.triggerScraping(selectedSource, normalizedUrl);
      setRunResult(result);
      setJobStatus(result.success ? pipelineStatusMessage("success") : pipelineStatusMessage("error", "Le traitement s’est terminé avec un avertissement."));
    } catch (error: any) {
      const statusCode = error?.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        pythonApi.clearAdminToken();
        setIsAdmin(false);
        setAuthError("Votre session administrateur est absente ou expirée. Reconnectez-vous avec ADMIN_API_TOKEN ; MISTRAL_API_KEY ne doit pas être saisie ici.");
      }
      const detail = error?.response?.data?.detail || error?.message || "Erreur inconnue";
      setJobStatus(pipelineStatusMessage("error", detail));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerExtraction = async () => {
    setIsLoading(true);
    setJobStatus("Extraction IA en cours sur les documents existants…");
    setRunResult(null);
    try {
      const result = await pythonApi.triggerExtraction();
      setRunResult(result);
      setJobStatus("Extraction terminée avec succès.");
    } catch (error: any) {
      const statusCode = error?.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        pythonApi.clearAdminToken();
        setIsAdmin(false);
        setAuthError("Votre session administrateur est absente ou expirée. Reconnectez-vous avec ADMIN_API_TOKEN ; MISTRAL_API_KEY ne doit pas être saisie ici.");
      }
      const detail = error?.response?.data?.detail || error?.message || "Erreur inconnue";
      setJobStatus(pipelineStatusMessage("error", detail));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 text-slate-950 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-xl space-y-6">
          <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Accès sécurisé</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Connexion administrateur</h1><p className="mt-2 text-sm leading-6 text-slate-600">Les actions de collecte, de recherche Légifrance et d’extraction modifient le corpus. Elles nécessitent le jeton Bearer configuré côté serveur.</p></header>
          {authError && <Alert className="border-red-200 bg-red-50"><AlertCircle className="h-4 w-4 text-red-600" /><AlertDescription className="text-red-800">{authError}</AlertDescription></Alert>}
          <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardHeader><CardTitle>Se connecter à FastAPI</CardTitle><CardDescription>Le jeton est conservé uniquement en mémoire de session du navigateur et n’est pas affiché. <strong>N’entrez pas MISTRAL_API_KEY ici :</strong> cette clé reste côté serveur et sert uniquement au module Bêta.</CardDescription></CardHeader><CardContent className="space-y-4"><label className="block space-y-2"><span className="text-sm font-medium">Jeton administrateur</span><Input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleAdminLogin(); }} placeholder="Bearer token" autoComplete="current-password" /></label><Button type="button" onClick={handleAdminLogin} disabled={isLoading} className="w-full bg-slate-950 text-white hover:bg-slate-800">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification…</> : "Se connecter"}</Button></CardContent></Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Module Delta · Administration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Lancer un traitement juridique</h1><p className="mt-2 text-sm text-slate-600">Indiquez l’URL à analyser. Le clic lance le scraping Python, la déduplication, puis l’extraction IA sur chaque document collecté.</p></div><Button type="button" variant="outline" size="sm" onClick={handleLogout} className="shrink-0"><LogOut className="mr-2 h-4 w-4" />Se déconnecter</Button></div>
        </header>

        {frontendOnly && <Alert className="border-amber-200 bg-amber-50"><AlertCircle className="h-4 w-4 text-amber-600" /><AlertDescription className="text-amber-900">Mode front-only : le bouton est visible pour prévisualiser l’interface, mais l’exécution réelle nécessite le backend FastAPI lancé.</AlertDescription></Alert>}

        {systemStatus && <section className="grid gap-3 sm:grid-cols-3" aria-label="État de configuration serveur"><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mistral IA</p><p className={`mt-2 text-sm font-semibold ${systemStatus.mistral_configured ? "text-emerald-700" : "text-amber-700"}`}>{systemStatus.mistral_configured ? "Clé configurée" : "Clé manquante"}</p><p className="mt-1 text-xs text-slate-500">Jamais affichée au navigateur</p></CardContent></Card><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Légifrance PISTE</p><p className={`mt-2 text-sm font-semibold ${systemStatus.legifrance_configured ? "text-emerald-700" : "text-amber-700"}`}>{systemStatus.legifrance_configured ? "Credentials configurés" : "À configurer"}</p><p className="mt-1 text-xs text-slate-500">Les droits API restent contrôlés par PISTE</p></CardContent></Card><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Protection admin</p><p className="mt-2 text-sm font-semibold text-emerald-700">Bearer active</p><p className="mt-1 text-xs text-slate-500">Environnement : {systemStatus.environment}</p></CardContent></Card></section>}

        {jobStatus && <Alert className={jobStatus.startsWith("Erreur") ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}>{jobStatus.startsWith("Erreur") ? <AlertCircle className="h-4 w-4 text-red-600" /> : <CheckCircle className="h-4 w-4 text-emerald-600" />}<AlertDescription className={jobStatus.startsWith("Erreur") ? "text-red-800" : "text-emerald-800"}>{jobStatus}</AlertDescription></Alert>}

        {runResult && <div className="grid gap-4 sm:grid-cols-2"><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardHeader className="pb-2"><CardTitle className="text-sm">Documents ajoutés</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-teal-700">{runResult.documents_added ?? 0}</p><p className="text-xs text-slate-500">Dédupliqués puis enregistrés</p></CardContent></Card><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardHeader className="pb-2"><CardTitle className="text-sm">Documents traités</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-slate-900">{runResult.processed ?? runResult.documents_added ?? 0}</p><p className="text-xs text-slate-500">Extraction IA exécutée</p></CardContent></Card></div>}

        <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200">
          <CardHeader><CardTitle className="flex items-center gap-2"><Play className="h-5 w-5 text-teal-700" />Scraping + extraction</CardTitle><CardDescription>Ce bouton exécute le pipeline complet sur l’URL indiquée.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <label className="block space-y-2"><span className="text-sm font-medium">URL de la source juridique</span><Input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://fr.wikipedia.org/wiki/Droit" type="url" disabled={isLoading} /></label>
            <label className="block space-y-2"><span className="text-sm font-medium">Type de source</span><Select value={selectedSource} onValueChange={setSelectedSource} disabled={isLoading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="wikipedia">Wikipedia</SelectItem><SelectItem value="legifrance">Légifrance</SelectItem><SelectItem value="custom">Autre source HTTP</SelectItem></SelectContent></Select></label>
            <Button onClick={handleTriggerPipeline} disabled={isLoading || frontendOnly} className="w-full bg-slate-900 text-white hover:bg-slate-800">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Traitement en cours…</> : <><Play className="mr-2 h-4 w-4" />Lancer le traitement</>}</Button>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200">
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-teal-700" />Retraiter les documents existants</CardTitle><CardDescription>Relance uniquement l’extraction IA sur les documents déjà présents dans la base.</CardDescription></CardHeader>
          <CardContent><Button onClick={handleTriggerExtraction} disabled={isLoading || frontendOnly} variant="secondary" className="w-full">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extraction en cours…</> : "Lancer l’extraction sur l’existant"}</Button></CardContent>
        </Card>
      </div>
    </main>
  );
}
