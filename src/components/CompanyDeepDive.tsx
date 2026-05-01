import { motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft, Building2, TrendingUp, TrendingDown, BarChart3, Grid3X3, Newspaper, BookOpen, Loader2 } from "lucide-react";
import type { CompanyData } from "@/data/mockFinancials";
import { deepDiveData } from "@/data/companyDeepDive";
import CompanyLogo from "@/components/CompanyLogo";
import { useSettings } from "@/hooks/useSettings";
import { useLiveDeepDive } from "@/hooks/useLiveDeepDive";

interface CompanyDeepDiveProps {
  company: CompanyData;
  onBack: () => void;
}

const SectionTitle = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon className="w-4 h-4 text-primary" />
    <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{title}</h3>
  </div>
);

const CompanyDeepDive = ({ company, onBack }: CompanyDeepDiveProps) => {
  const { useMockData } = useSettings();
  const isPositive = company.changePercent >= 0;
  const dragX = useMotionValue(0);
  const pageOpacity = useTransform(dragX, [0, 150], [1, 0.7]);

  // Live data hook (only enabled when not in mock mode)
  const { data: live, isLoading: liveLoading } = useLiveDeepDive(company.id, !useMockData);
  const mockData = deepDiveData[company.id];

  // ---- Build a unified view model ----
  let overview: { sector: string; industry: string; description: string; founded: string; headquarters: string; ceo: string; employees: string } | null = null;
  let stockInfo: { label: string; value: string }[] = [];
  let quarterlyTimeline: { quarter: string; revenue: number; netProfit: number; eps: number }[] = [];
  let metricsGrid: { label: string; value: string }[] = [];
  let news: { date: string; headline: string; summary: string }[] = [];
  let history: { foundingStory: string; milestones: string[]; keyProducts: string[]; competitors: string[] } | null = null;

  if (useMockData && mockData) {
    overview = {
      sector: mockData.overview.sector,
      industry: mockData.overview.industry,
      description: mockData.overview.description,
      founded: mockData.overview.founded,
      headquarters: mockData.overview.headquarters,
      ceo: mockData.overview.ceo,
      employees: mockData.overview.employees,
    };
    stockInfo = [
      { label: "Current Price", value: mockData.stockInfo.currentPrice },
      { label: "Market Cap", value: mockData.stockInfo.marketCap },
      { label: "52W High", value: mockData.stockInfo.high52w },
      { label: "52W Low", value: mockData.stockInfo.low52w },
      { label: "P/E Ratio", value: mockData.stockInfo.peRatio },
      { label: "Div. Yield", value: mockData.stockInfo.dividendYield },
    ];
    quarterlyTimeline = mockData.quarterlyTimeline;
    metricsGrid = [
      { label: "Revenue", value: mockData.keyMetrics.revenue },
      { label: "Gross Margin", value: mockData.keyMetrics.grossMargin },
      { label: "Net Margin", value: mockData.keyMetrics.netMargin },
      { label: "ROE", value: mockData.keyMetrics.roe },
      { label: "ROCE", value: mockData.keyMetrics.roce },
      { label: "Debt/Equity", value: mockData.keyMetrics.debtToEquity },
      { label: "Free Cash Flow", value: mockData.keyMetrics.freeCashFlow },
    ];
    news = mockData.news;
    history = mockData.history;
  } else if (!useMockData && live) {
    const p = live.profile;
    const ls = live.latestSummary;
    overview = {
      sector: ls?.sector || "N.A.",
      industry: p?.industry || "N.A.",
      description: p?.description || "Profile is being generated…",
      founded: p?.founded || "N.A.",
      headquarters: p?.headquarters || "N.A.",
      ceo: p?.ceo || "N.A.",
      employees: p?.employees || "N.A.",
    };
    stockInfo = [
      { label: "Latest Quarter", value: ls?.quarter || "N.A." },
      { label: "Revenue", value: ls?.revenue || "N.A." },
      { label: "Net Profit", value: ls?.profit || "N.A." },
      { label: "Growth (YoY)", value: ls?.growth || "N.A." },
      { label: "P/E Ratio", value: ls?.pe_ratio || "N.A." },
      { label: "Beat/Miss", value: ls?.beat_or_miss || "N.A." },
    ];
    quarterlyTimeline = live.timeline;
    metricsGrid = [
      { label: "Revenue", value: ls?.revenue || "N.A." },
      { label: "Net Profit", value: ls?.profit || "N.A." },
      { label: "EPS", value: ls?.eps || "N.A." },
      { label: "ROE", value: ls?.roe || "N.A." },
      { label: "EBITDA", value: ls?.ebitda || "N.A." },
      { label: "Debt/Equity", value: ls?.debt_equity || "N.A." },
      { label: "Current Ratio", value: ls?.current_ratio || "N.A." },
    ];
    news = ls?.headline
      ? [{ date: ls?.quarter || "Latest", headline: ls.headline, summary: ls.summary || "" }]
      : [];
    history = p
      ? {
          foundingStory: p.founding_story || "",
          milestones: p.milestones || [],
          keyProducts: p.key_products || [],
          competitors: p.competitors || [],
        }
      : null;
  }

  const showLoading = !useMockData && liveLoading && !live;
  const noData = !overview && !showLoading;

  const maxRevenue = Math.max(1, ...quarterlyTimeline.map((q) => q.revenue));
  const maxProfit = Math.max(1, ...quarterlyTimeline.map((q) => q.netProfit));

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.6 }}
      style={{ x: dragX, opacity: pageOpacity }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100 || info.velocity.x > 400) onBack();
      }}
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-[60] bg-background overflow-y-auto touch-pan-y"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-5 py-4 max-w-[430px] mx-auto">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate font-['Space_Grotesk']">{company.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{company.ticker}</p>
          </div>
          <span className={`text-sm font-semibold flex items-center gap-1 ${isPositive ? "text-primary" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isPositive ? "+" : ""}{company.changePercent}%
          </span>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-5 py-6 flex flex-col gap-8 pb-20">
        {showLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Generating company profile…</p>
          </div>
        )}

        {noData && (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">No deep-dive data available yet.</p>
          </div>
        )}

        {overview && (
          <>
            {/* SECTION 1 — Company Overview */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <SectionTitle icon={Building2} title="Company Overview" />
              <div className="flex items-center gap-4 mb-4">
                <CompanyLogo domain={company.domain} name={company.name} ticker={company.ticker} size="lg" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold font-['Space_Grotesk'] text-foreground">{company.name}</h2>
                  <p className="text-xs text-muted-foreground">{overview.sector} · {overview.industry}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground mb-4">{overview.description}</p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Founded", value: overview.founded },
                  { label: "HQ", value: overview.headquarters },
                  { label: "CEO", value: overview.ceo },
                  { label: "Employees", value: overview.employees },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-secondary/40 border border-border/50 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="text-xs font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* SECTION 2 — Stock / Latest Quarter */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <SectionTitle icon={TrendingUp} title={useMockData ? "Stock Information" : "Latest Quarter"} />
              <div className="grid grid-cols-2 gap-2.5">
                {stockInfo.map((item) => (
                  <div key={item.label} className="rounded-xl bg-secondary/60 border border-border p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-sm font-bold font-['Space_Grotesk'] text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* SECTION 3 — Financials Timeline */}
            {quarterlyTimeline.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <SectionTitle icon={BarChart3} title="Financials Timeline" />

                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Revenue</p>
                <div className="flex items-end gap-2 h-28 mb-5">
                  {quarterlyTimeline.map((q, i) => (
                    <div key={`${q.quarter}-r-${i}`} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold font-['Space_Grotesk'] text-foreground">
                        {q.revenue > 1000 ? `${(q.revenue / 1000).toFixed(0)}K` : q.revenue.toFixed(1)}
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(q.revenue / maxRevenue) * 80}%` }}
                        transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                        className="w-full rounded-t-lg bg-primary/80"
                      />
                      <span className="text-[9px] text-muted-foreground mt-1">{q.quarter.replace("FY", "")}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Net Profit</p>
                <div className="flex items-end gap-2 h-24 mb-4">
                  {quarterlyTimeline.map((q, i) => (
                    <div key={`${q.quarter}-p-${i}`} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold font-['Space_Grotesk'] text-foreground">
                        {q.netProfit > 1000 ? `${(q.netProfit / 1000).toFixed(0)}K` : q.netProfit.toFixed(1)}
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(q.netProfit / maxProfit) * 80}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                        className="w-full rounded-t-lg bg-accent/60"
                      />
                      <span className="text-[9px] text-muted-foreground mt-1">{q.quarter.replace("FY", "")}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">EPS Trend</p>
                <div className="flex items-center gap-3">
                  {quarterlyTimeline.map((q, i) => (
                    <div key={`${q.quarter}-e-${i}`} className="flex-1 text-center rounded-xl bg-secondary/40 border border-border/50 py-2.5">
                      <p className="text-xs font-bold font-['Space_Grotesk'] text-primary">{q.eps}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{q.quarter.replace("FY", "")}</p>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* SECTION 4 — Key Metrics */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <SectionTitle icon={Grid3X3} title="Key Metrics" />
              <div className="grid grid-cols-2 gap-2.5">
                {metricsGrid.map((m) => (
                  <div key={m.label} className="rounded-xl bg-secondary/60 border border-border p-3.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{m.label}</p>
                    <p className="text-sm font-bold font-['Space_Grotesk'] text-foreground">{m.value}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* SECTION 5 — News */}
            {news.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <SectionTitle icon={Newspaper} title={useMockData ? "Company News" : "Latest Headline"} />
                <div className="flex flex-col gap-3">
                  {news.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 + i * 0.06 }}
                      className="p-3.5 rounded-xl bg-secondary/40 border border-border/60"
                    >
                      <p className="text-[10px] text-primary font-medium mb-1">{item.date}</p>
                      <p className="text-sm font-semibold text-foreground font-['Space_Grotesk'] mb-0.5">{item.headline}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* SECTION 6 — About & History */}
            {history && (history.foundingStory || history.milestones.length > 0) && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <SectionTitle icon={BookOpen} title="About & History" />
                {history.foundingStory && (
                  <p className="text-sm leading-relaxed text-muted-foreground mb-5">{history.foundingStory}</p>
                )}
                {history.milestones.length > 0 && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">Milestones</h4>
                    <div className="flex flex-col gap-1.5 mb-5">
                      {history.milestones.map((m, i) => (
                        <div key={i} className="flex items-center gap-2.5 py-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <p className="text-xs text-foreground/80">{m}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {history.keyProducts.length > 0 && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">Key Products & Services</h4>
                    <div className="flex flex-wrap gap-2 mb-5">
                      {history.keyProducts.map((p) => (
                        <span key={p} className="text-xs px-3 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground">
                          {p}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {history.competitors.length > 0 && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">Competitors</h4>
                    <div className="flex flex-wrap gap-2">
                      {history.competitors.map((c) => (
                        <span key={c} className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                          {c}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </motion.section>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default CompanyDeepDive;
