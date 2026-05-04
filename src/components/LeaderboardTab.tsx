import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";
import { useLeaderboard, type LeaderboardRegion, type LeaderboardEntry } from "@/hooks/useLeaderboard";
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

const rankStyles = [
  "bg-gradient-to-br from-yellow-400 to-amber-600 text-black", // 1
  "bg-gradient-to-br from-slate-300 to-slate-500 text-black",  // 2
  "bg-gradient-to-br from-amber-700 to-amber-900 text-white",  // 3
  "bg-secondary text-muted-foreground",
  "bg-secondary text-muted-foreground",
];

function shortGrowth(g: string): string {
  if (!g) return "—";
  const m = g.match(/[+-]?\d+(?:\.\d+)?\s*%/);
  return m ? m[0].replace(/\s+/g, "") : g.split(/[\s(]/)[0] || "—";
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

const LeaderboardTab = ({ onSelectCompany }: LeaderboardTabProps) => {
  const [region, setRegion] = useState<LeaderboardRegion>("all");
  const { data: groups, isLoading } = useLeaderboard(region);

  return (
    <div className="min-h-screen bg-background pt-[120px] pb-24 max-w-[375px] mx-auto">
      {/* Beta badge + region pills (sit under the existing top header) */}
      <div className="px-5 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold font-['Space_Grotesk']">Quarter Winners</h2>
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/20 text-primary">
            Beta
          </span>
        </div>
      </div>

      <div className="flex gap-2 px-5 mb-5 overflow-x-auto no-scrollbar">
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

      {isLoading ? (
        <div className="px-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-secondary/40 animate-pulse" />
          ))}
        </div>
      ) : !groups || groups.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <Trophy className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No 'Beat' winners yet for this region.</p>
        </div>
      ) : (
        <div className="px-5 space-y-6">
          {groups.map((group, gi) => (
            <motion.section
              key={group.quarter}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: gi * 0.05 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold font-['Space_Grotesk'] text-foreground">
                  {group.quarter}
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Top {group.entries.length} • Beat
                </span>
              </div>

              <div className="space-y-2">
                {group.entries.map((e, idx) => (
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
                        <span className="text-[10px] text-muted-foreground">{e.ticker}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{e.headline}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-primary text-sm font-bold">
                        <TrendingUp className="w-3 h-3" />
                        {e.growth || "—"}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{e.revenue}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardTab;
