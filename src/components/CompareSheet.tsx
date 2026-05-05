import { motion } from "framer-motion";
import { X, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import type { CompanyData } from "@/data/mockFinancials";
import CompanyLogo from "@/components/CompanyLogo";

interface CompareSheetProps {
  a: CompanyData;
  b: CompanyData;
  onClose: () => void;
}

const Side = ({ c }: { c: CompanyData }) => {
  const positive = c.changePercent >= 0;
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <CompanyLogo domain={c.domain} name={c.name} ticker={c.ticker} size="md" />
        <div className="min-w-0 w-full">
          <p className="text-sm font-bold font-['Space_Grotesk'] text-foreground truncate">{c.name}</p>
          <p className="text-[11px] font-mono text-muted-foreground truncate">{c.ticker}</p>
        </div>
        <span
          className={`text-xs font-semibold flex items-center gap-0.5 ${
            positive ? "text-primary" : "text-destructive"
          }`}
        >
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {positive ? "+" : ""}
          {c.changePercent}%
        </span>
      </div>
    </div>
  );
};

const Row = ({ label, av, bv }: { label: string; av: string; bv: string }) => (
  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-3 border-b border-border/40 last:border-b-0">
    <p className="text-sm font-bold font-['Space_Grotesk'] text-foreground text-center truncate">{av}</p>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">
      {label}
    </p>
    <p className="text-sm font-bold font-['Space_Grotesk'] text-foreground text-center truncate">{bv}</p>
  </div>
);

const CompareSheet = ({ a, b, onClose }: CompareSheetProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold font-['Space_Grotesk'] text-foreground">Compare</h2>
          <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-primary/40 text-primary bg-primary/10 font-semibold">
            Beta
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close compare"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex-1 overflow-y-auto px-5 py-6"
      >
        <div className="flex items-start gap-3 mb-4">
          <Side c={a} />
          <div className="self-center text-[10px] uppercase tracking-widest text-muted-foreground px-2">vs</div>
          <Side c={b} />
        </div>

        <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-2">
          <Row label="Revenue" av={a.revenue} bv={b.revenue} />
          <Row label="Profit / Margin" av={a.profit} bv={b.profit} />
          <Row label="Growth (EPS)" av={a.growth} bv={b.growth} />
          <Row label="Period" av={a.quarter} bv={b.quarter} />
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground text-center leading-relaxed px-4">
          Side-by-side snapshot. Best for sector peers (e.g. HDFC vs ICICI). Tap close to exit.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default CompareSheet;
