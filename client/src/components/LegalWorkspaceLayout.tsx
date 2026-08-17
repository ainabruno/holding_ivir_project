import { BarChart3, Database, Gavel, Search, Settings2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "Vue d’ensemble", icon: BarChart3 },
  { href: "/legifrance", label: "Recherche Légifrance", icon: Search },
  { href: "/admin", label: "Pipeline & administration", icon: Settings2 },
];

export default function LegalWorkspaceLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-slate-950"><Gavel className="h-5 w-5" aria-hidden="true" /></span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold tracking-tight">Holding IVIR</span><span className="block truncate text-[11px] text-slate-300">Veille juridique & intelligence économique</span></span>
          </Link>
          <div className="hidden items-center gap-2 text-xs text-slate-300 md:flex"><Database className="h-4 w-4 text-teal-300" aria-hidden="true" />Corpus connecté à FastAPI</div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white lg:min-h-[calc(100vh-4rem)] lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <nav aria-label="Navigation principale" className="flex gap-2 overflow-x-auto p-3 lg:sticky lg:top-16 lg:block lg:space-y-1 lg:p-4">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = location === href || (href === "/dashboard" && location === "/");
              return <Link key={href} href={href} className={`flex min-w-max items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 lg:w-full ${active ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`} aria-current={active ? "page" : undefined}><Icon className="h-4 w-4" aria-hidden="true" />{label}</Link>;
            })}
          </nav>
          <div className="hidden border-t border-slate-100 p-4 text-xs leading-5 text-slate-500 lg:block"><p className="font-semibold text-slate-700">Environnement de travail</p><p className="mt-1">Les recherches Légifrance lancées depuis ce poste sont enregistrées dans le corpus puis enrichies par le module Bêta.</p></div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
