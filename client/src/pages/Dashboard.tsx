import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, Loader2, Search, SlidersHorizontal } from "lucide-react";

const PAGE_SIZE = 25;

type Verdict = "favorable" | "rejected" | "partial";

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-FR");
}

function verdictClass(verdict: string | null | undefined) {
  if (verdict === "favorable") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (verdict === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  if (verdict === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function Dashboard() {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [verdict, setVerdict] = useState<"all" | Verdict>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filters = useMemo(() => ({
    search: search.trim() || undefined,
    source: source === "all" ? undefined : source,
    verdict: verdict === "all" ? undefined : verdict,
    startDate: startDate ? new Date(`${startDate}T00:00:00.000Z`).toISOString() : undefined,
    endDate: endDate ? new Date(`${endDate}T23:59:59.999Z`).toISOString() : undefined,
  }), [endDate, search, source, startDate, verdict]);

  const queryInput = useMemo(() => ({ limit: PAGE_SIZE, offset, ...filters }), [filters, offset]);
  const { data: documentsData, isLoading: docsLoading } = trpc.legal.listDocuments.useQuery(queryInput);
  const { data: stats } = trpc.legal.getStatistics.useQuery();

  const exportQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.source) params.set("source", filters.source);
    if (filters.verdict) params.set("verdict", filters.verdict);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    return params.toString();
  }, [filters]);

  const exportUrl = (extension: "csv" | "pdf") => `/api/legal/export.${extension}${exportQuery ? `?${exportQuery}` : ""}`;
  const totalDocuments = Number(stats?.totalDocuments ?? 0);
  const averageConfidence = Number(stats?.averageConfidence ?? 0);
  const verdictCount = (value: Verdict) => Number(stats?.verdictDistribution?.find((item) => item.verdict === value)?.count ?? 0);

  const resetFilters = () => {
    setSearch("");
    setSource("all");
    setVerdict("all");
    setStartDate("");
    setEndDate("");
    setOffset(0);
  };

  return (
    <main className="min-h-screen bg-slate-50/70 p-4 text-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Module Interface</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Legal intelligence dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Recherchez, filtrez et exportez les données juridiques enrichies par l’IA.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Exports">
            <Button asChild variant="outline" className="border-slate-300 bg-white">
              <a href={exportUrl("csv")} download>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-700" />
                Export CSV
              </a>
            </Button>
            <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
              <a href={exportUrl("pdf")} download>
                <FileText className="mr-2 h-4 w-4" />
                Export PDF
              </a>
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs clés">
          <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/70">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{totalDocuments}</div><p className="mt-1 text-xs text-slate-500">Corpus collecté</p></CardContent>
          </Card>
          <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/70">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-slate-500">Favorable</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold text-emerald-700">{verdictCount("favorable")}</div><p className="mt-1 text-xs text-slate-500">Décisions favorables</p></CardContent>
          </Card>
          <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/70">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rejected</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold text-rose-700">{verdictCount("rejected")}</div><p className="mt-1 text-xs text-slate-500">Décisions rejetées</p></CardContent>
          </Card>
          <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/70">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confiance moyenne</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{averageConfidence.toFixed(0)}%</div><p className="mt-1 text-xs text-slate-500">Score des extractions</p></CardContent>
          </Card>
        </section>

        <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/70">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-teal-700" />Recherche et filtres</CardTitle>
                <CardDescription className="mt-1">Les mêmes filtres sont appliqués aux exports CSV et PDF.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={resetFilters} className="self-start text-slate-600 lg:self-auto">Réinitialiser</Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 md:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1.5 lg:col-span-2"><span className="text-xs font-medium text-slate-600">Recherche</span><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); }} placeholder="Juridiction, source, référence…" className="pl-9" /></div></label>
            <label className="space-y-1.5"><span className="text-xs font-medium text-slate-600">Source</span><Select value={source} onValueChange={(value) => { setSource(value); setOffset(0); }}><SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les sources</SelectItem><SelectItem value="wikipedia">Wikipedia</SelectItem><SelectItem value="legifrance">Légifrance</SelectItem></SelectContent></Select></label>
            <label className="space-y-1.5"><span className="text-xs font-medium text-slate-600">Verdict</span><Select value={verdict} onValueChange={(value: "all" | Verdict) => { setVerdict(value); setOffset(0); }}><SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les verdicts</SelectItem><SelectItem value="favorable">Favorable</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="partial">Partial</SelectItem></SelectContent></Select></label>
            <div className="grid grid-cols-2 gap-2 lg:col-span-5"><label className="space-y-1.5"><span className="text-xs font-medium text-slate-600">Du</span><Input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setOffset(0); }} /></label><label className="space-y-1.5"><span className="text-xs font-medium text-slate-600">Au</span><Input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setOffset(0); }} /></label></div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm ring-1 ring-slate-200/70">
          <CardHeader className="border-b border-slate-100 pb-4"><div className="flex items-center justify-between gap-3"><div><CardTitle>Données juridiques extraites</CardTitle><CardDescription className="mt-1">{documentsData?.count ?? 0} résultat(s) correspondant aux filtres.</CardDescription></div><Download className="h-5 w-5 text-slate-400" /></div></CardHeader>
          <CardContent className="p-0">
            {docsLoading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-700" /></div> : documentsData?.documents?.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Document</TableHead><TableHead>Juridiction</TableHead><TableHead>Verdict</TableHead><TableHead>Date</TableHead><TableHead>Confiance</TableHead></TableRow></TableHeader><TableBody>{documentsData.documents.map((doc) => { const entity = doc.extractedEntity; return <TableRow key={`${doc.id}-${entity?.sourceId ?? "document"}`}><TableCell><Badge variant="outline">{doc.source}</Badge></TableCell><TableCell className="min-w-[220px] max-w-sm"><div className="truncate font-medium">{doc.typeDocument || "Document juridique"}</div><div className="truncate text-xs text-slate-500">{doc.idSource}</div></TableCell><TableCell>{entity?.juridiction || doc.juridiction || "—"}</TableCell><TableCell><Badge variant="outline" className={verdictClass(entity?.verdict)}>{entity?.verdict || "Non classé"}</Badge></TableCell><TableCell className="whitespace-nowrap">{dateLabel(doc.dateDecision || doc.dateCollecte)}</TableCell><TableCell>{entity?.niveauConfiance == null ? "—" : `${entity.niveauConfiance}%`}</TableCell></TableRow>; })}</TableBody></Table></div> : <div className="px-6 py-14 text-center text-sm text-slate-500">Aucun document ne correspond aux filtres.</div>}
            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs text-slate-500">Page {Math.floor(offset / PAGE_SIZE) + 1}</span><div className="flex gap-2"><Button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0} variant="outline" size="sm">Précédent</Button><Button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={!documentsData || offset + PAGE_SIZE >= documentsData.count} variant="outline" size="sm">Suivant</Button></div></div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
