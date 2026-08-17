import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Database, ExternalLink, Loader2, Play, Search, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { pythonApi } from "@/lib/pythonApiClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const frontendOnly = import.meta.env.VITE_FRONTEND_ONLY === "true";

type ConnectionState = { configured: boolean; apiBaseUrl: string; environment: string } | null;
type SearchResult = { results_received: number; documents_added: number; documents_enriched: number; message: string } | null;

export default function LegifranceSearch() {
  const [keywords, setKeywords] = useState("malfaçon construction");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [connection, setConnection] = useState<ConnectionState>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult>(null);

  useEffect(() => {
    if (frontendOnly) {
      setIsChecking(false);
      return;
    }
    pythonApi.getLegifranceStatus().then(setConnection).catch((reason: any) => setError(reason?.response?.data?.detail || "Impossible de lire l’état Légifrance.")).finally(() => setIsChecking(false));
  }, []);

  const checkConnection = async () => {
    setError(null);
    setStatus(null);
    setIsChecking(true);
    try {
      const current = await pythonApi.getLegifranceStatus();
      setConnection(current);
      if (!current.configured) {
        setError("Les identifiants PISTE ne sont pas configurés côté serveur.");
        return;
      }
      await pythonApi.pingLegifrance();
      setStatus("Connexion PISTE / Légifrance vérifiée avec succès.");
    } catch (reason: any) {
      setError(reason?.response?.data?.detail || "La connexion Légifrance a échoué. Vérifiez les credentials PISTE et l’environnement sandbox.");
    } finally {
      setIsChecking(false);
    }
  };

  const runSearch = async () => {
    if (keywords.trim().length < 2) {
      setError("Saisissez au moins deux caractères de recherche.");
      return;
    }
    setError(null);
    setStatus(null);
    setResult(null);
    setIsRunning(true);
    try {
      const response = await pythonApi.searchLegifrance({ keywords: keywords.trim(), start_date: startDate || undefined, end_date: endDate || undefined, page: 1, page_size: 20 });
      setResult(response);
      setStatus(response.message);
    } catch (reason: any) {
      setError(reason?.response?.data?.detail || "La recherche Légifrance a échoué.");
    } finally {
      setIsRunning(false);
    }
  };

  const configured = connection?.configured && !frontendOnly;

  return <main className="min-h-screen p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Module Alpha · Source officielle</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Recherche Légifrance</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Recherchez les décisions de jurisprudence judiciaire via l’API PISTE, enregistrez les résultats et lancez leur enrichissement IA dans le corpus Holding IVIR.</p></div><Link href="/dashboard" className="text-sm font-medium text-teal-700 underline underline-offset-4">Voir le corpus enregistré</Link></header>

    {frontendOnly && <Alert className="border-amber-200 bg-amber-50"><AlertCircle className="h-4 w-4 text-amber-700" /><AlertDescription className="text-amber-900"><strong>Mode front-only actif.</strong> Cette page reste une prévisualisation d’interface et ne lance aucune requête. Démarrez FastAPI sans `VITE_FRONTEND_ONLY=true` pour exécuter une recherche réelle.</AlertDescription></Alert>}
    {error && <Alert className="border-rose-200 bg-rose-50"><AlertCircle className="h-4 w-4 text-rose-700" /><AlertDescription className="text-rose-900">{error}</AlertDescription></Alert>}
    {status && <Alert className="border-emerald-200 bg-emerald-50"><CheckCircle2 className="h-4 w-4 text-emerald-700" /><AlertDescription className="text-emerald-900">{status}</AlertDescription></Alert>}

    <section className="grid gap-4 md:grid-cols-3" aria-label="État de la connexion Légifrance"><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-teal-700" />Credentials PISTE</CardTitle></CardHeader><CardContent><Badge className={configured ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}>{isChecking ? "Vérification…" : configured ? "Configurés" : "À configurer"}</Badge><p className="mt-2 text-xs leading-5 text-slate-500">Les secrets restent côté serveur et ne sont jamais affichés dans l’interface.</p></CardContent></Card><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Database className="h-4 w-4 text-teal-700" />Environnement API</CardTitle></CardHeader><CardContent><p className="font-medium text-slate-900">{connection?.environment || "—"}</p><p className="mt-1 break-all text-xs text-slate-500">{connection?.apiBaseUrl || "Base non détectée"}</p></CardContent></Card><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Search className="h-4 w-4 text-teal-700" />Contrôle de connexion</CardTitle></CardHeader><CardContent><Button type="button" variant="outline" size="sm" onClick={checkConnection} disabled={isChecking || frontendOnly}>{isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Tester PISTE</Button></CardContent></Card></section>

    <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-teal-700" />Lancer une recherche de décisions</CardTitle><CardDescription>Le backend utilise le fonds JURI, la pagination et les filtres de date de l’API officielle. Les résultats nouveaux sont dédupliqués, stockés puis enrichis par le module Bêta.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><label className="space-y-1.5 md:col-span-2"><span className="text-sm font-medium">Mots-clés juridiques</span><Input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="malfaçon, garantie décennale, vice caché" disabled={isRunning || frontendOnly} /></label><label className="space-y-1.5"><span className="text-sm font-medium">Date de début</span><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={isRunning || frontendOnly} /></label><label className="space-y-1.5"><span className="text-sm font-medium">Date de fin</span><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} disabled={isRunning || frontendOnly} /></label></div><Button type="button" onClick={runSearch} disabled={isRunning || frontendOnly || !configured} className="w-full bg-slate-950 text-white hover:bg-slate-800">{isRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Recherche et enrichissement en cours…</> : <><Play className="mr-2 h-4 w-4" />Rechercher dans Légifrance et enregistrer</>}</Button><p className="text-xs leading-5 text-slate-500">Une recherche peut prendre du temps selon le quota PISTE et le nombre de documents à enrichir. Les résultats sont consultables ensuite dans la <Link href="/dashboard" className="font-medium text-teal-700 underline underline-offset-2">vue d’ensemble</Link>.</p></CardContent></Card>

    {result && <section className="grid gap-4 sm:grid-cols-3" aria-label="Résultat de la recherche"><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardHeader className="pb-2"><CardTitle className="text-sm">Résultats reçus</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{result.results_received}</p><p className="text-xs text-slate-500">Réponse API Légifrance</p></CardContent></Card><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardHeader className="pb-2"><CardTitle className="text-sm">Nouveaux documents</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-teal-700">{result.documents_added}</p><p className="text-xs text-slate-500">Après déduplication</p></CardContent></Card><Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200"><CardHeader className="pb-2"><CardTitle className="text-sm">Documents enrichis</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{result.documents_enriched}</p><p className="text-xs text-slate-500">Extraction Bêta terminée</p></CardContent></Card></section>}

    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><p className="font-semibold text-slate-800">Accès et documentation PISTE</p><p className="mt-1 leading-6">L’accès API est soumis aux credentials PISTE, aux quotas et à l’environnement sandbox/production autorisé. Consultez <a href="https://piste.gouv.fr/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-700 underline underline-offset-2">le portail PISTE <ExternalLink className="h-3 w-3" aria-hidden="true" /></a> pour gérer l’application et ses droits.</p></div>
  </div></main>;
}
