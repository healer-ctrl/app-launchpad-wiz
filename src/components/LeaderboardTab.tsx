import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";
import { useLeaderboard, type LeaderboardRegion, type LeaderboardMode, type LeaderboardEntry } from "@/hooks/useLeaderboard";
import CompanyLogo from "@/components/CompanyLogo";
import type { CompanyData } from "@/data/mockFinancials";

interface LeaderboardTabProps {
  onSelectCompany?: (company: CompanyData) => void;
}

const regions: { label: string; value: LeaderboardRegion }[] = [
  { label: "🌐 All", value: "all" },
  { label: "🇮🇳 India", value: "india" },
  { label: "🇺🇸 US", value: "us" },
];

const modes: { label: string; value: LeaderboardMode }[] = [
  { label: "Beat", value: "beat" },
  { label: "YoY", value: "yoy" },
  { label: "Revenue", value: "revenue" },
  { label: "Profit", value: "profit" },
  { label: "EPS", value: "eps" },
];

const rankStyles = [
  "bg-gradient-to-br from-yellow-400 to-amber-600 text-black",
  "bg-gradient-to-br from-slate-300 to-slate-500 text-black",
  "bg-gradient-to-br from-amber-700 to-amber-900 text-white",
  "bg-secondary text-muted-foreground",
  "bg-secondary text-muted-foreground",
];

function shortVal(v: string): string {
  if (!v) return "—";
  const m = v.match(/[+-]?\d+(?:\.\d+)?\s*%/);
  if (m) return m[0].replace(/\s+/g, "");
  return v.split(/[\s(]/)[0] || "—";
}

function entryToCompany(e: LeaderboardEntry): CompanyData {
  return {
    id: e.companyId,
    name: e.name,
    ticker: e.ticker,
    headline: e.headline,
    summary: "",
    revenue: e.revenue,
    profit: e.profit,
    growth: e.growth,
    quarter: e.quarter,
    changePercent: e.growthValue,
    accentColor: "174 100% 50%",
    categories: [],
    domain: e.domain,
  } as CompanyData;
}

function displayFor(e: LeaderboardEntry, mode: LeaderboardMode): { primary: string; secondary: string } {
  switch (mode) {
    case "revenue": return { primary: shortVal(e.revenue), secondary: e.growth ? shortVal(e.growth) : "" };
    case "profit": return { primary: shortVal(e.profit), secondary: e.growth ? shortVal(e.growth) : "" };
    case "eps": return { primary: shortVal(e.eps), secondary: e.growth ? shortVal(e.growth) : "" };
    case "yoy": return { primary: shortVal(e.growth), secondary: shortVal(e.revenue) };
    case "beat":
    default: return { primary: shortVal(e.growth), secondary: shortVal(e.revenue) };
  }
}

const LeaderboardTab = ({ onSelectCompany }: LeaderboardTabProps) => {
  const [region, setRegion] = useState<LeaderboardRegion>("all");
  const [mode, setMode] = useState<LeaderboardMode>("beat");
  const { data: groups, isLoading } = useLeaderboard(region, mode);

  const cycleMode = (dir: 1 | -1) => {
    const idx = modes.findIndex((m) => m.value === mode);
    const next = (idx + dir + modes.length) % modes.length;
    setMode(modes[next].value);
  };

  return (
    <div className="min-h-screen bg-background pt-[120px] pb-24 max-w-[375px] mx-auto overflow-x-hidden">
      <div className="px-5 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold font-['Space_Grotesk']">Quarter Winners</h2>
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/20 text-primary">
            Beta
          </span>
        </div>
      </div>

      {/* Region pills */}
      <div className="flex gap-2 px-5 mb-3 overflow-x-auto no-scrollbar">
        {regions.map((r) => (
          <button
            key={r.value}
            onClick={() => setRegion(r.value)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              region === r.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/60 text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Mode pills */}
      <div className="flex gap-1.5 px-5 mb-2 overflow-x-auto no-scrollbar">
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
              mode === m.value
                ? "bg-primary/20 text-primary border-primary/60"
                : "bg-transparent text-muted-foreground border-border/60 hover:border-primary/40"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="px-5 mb-3 text-[10px] text-muted-foreground/70">Swipe ← → to switch ranking</p>

      {isLoading ? (
        <div className="px-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-secondary/40 animate-pulse" />
          ))}
        </div>
      ) : !groups || groups.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <Trophy className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No winners yet for this filter.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) cycleMode(1);
              else if (info.offset.x > 60) cycleMode(-1);
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="px-5 space-y-6 touch-pan-y"
          >
            {groups.map((group, gi) => (
              <section key={group.quarter}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold font-['Space_Grotesk'] text-foreground">
                    {group.quarter}
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Top {group.entries.length} • {modes.find((m) => m.value === mode)?.label}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.entries.map((e, idx) => {
                    const { primary, secondary } = displayFor(e, mode);
                    return (
                      <button
                        key={e.id}
                        onClick={() => onSelectCompany?.(entryToCompany(e))}
                        className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/40 transition-colors p-3 flex items-center gap-3"
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${rankStyles[idx]}`}
                        >
                          {idx + 1}
                        </div>
                        <CompanyLogo domain={e.domain} name={e.name} ticker={e.ticker} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">{e.name}</p>
                            <span className="text-[10px] text-muted-foreground shrink-0">{e.ticker}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{e.headline}</p>
                        </div>
                        <div className="text-right shrink-0 max-w-[80px]">
                          <div className="flex items-center justify-end gap-1 text-primary text-sm font-bold">
                            <TrendingUp className="w-3 h-3 shrink-0" />
                            <span className="truncate">{primary}</span>
                          </div>
                          {secondary && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{secondary}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default LeaderboardTab;
