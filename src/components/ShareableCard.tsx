import { forwardRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { CompanyData } from "@/data/mockFinancials";
import CompanyLogo from "@/components/CompanyLogo";

interface ShareableCardProps {
  company: CompanyData;
}

/**
 * Off-screen, fixed-size card used to render a PNG snapshot for sharing.
 * 1080x1350 — Instagram/WhatsApp-friendly portrait ratio.
 */
const ShareableCard = forwardRef<HTMLDivElement, ShareableCardProps>(({ company }, ref) => {
  const isPositive = company.changePercent >= 0;

  return (
    <div
      ref={ref}
      style={{ width: 1080, height: 1350 }}
      className="bg-background text-foreground flex flex-col justify-between p-16 font-['Space_Grotesk']"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-5xl font-bold tracking-tight">
          Fin<span className="text-primary">Pulse</span>
        </h1>
        <span className="text-2xl font-medium tracking-widest uppercase px-5 py-2 rounded-full border border-border bg-secondary text-muted-foreground">
          {company.quarter}
        </span>
      </div>

      {/* Company */}
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-6">
          <div style={{ transform: "scale(2)", transformOrigin: "left center" }}>
            <CompanyLogo domain={company.domain} name={company.name} ticker={company.ticker} size="md" />
          </div>
          <div className="ml-16">
            <h2 className="text-5xl font-bold">{company.name}</h2>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-3xl font-mono text-muted-foreground">{company.ticker}</span>
              <span className={`text-3xl font-semibold flex items-center gap-1 ${isPositive ? "text-primary" : "text-destructive"}`}>
                {isPositive ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
                {isPositive ? "+" : ""}{company.changePercent}%
              </span>
            </div>
          </div>
        </div>

        <h3 className="text-4xl font-semibold leading-snug">{company.headline}</h3>

        <p className="text-2xl leading-relaxed text-muted-foreground line-clamp-6">
          {company.summary}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: "Revenue", value: company.revenue },
          { label: "Profit", value: company.profit },
          { label: "Growth", value: company.growth },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-secondary/60 border border-border p-6 text-center">
            <p className="text-lg uppercase tracking-wider text-muted-foreground mb-2">{s.label}</p>
            <p className="text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xl text-muted-foreground">
        <span>AI-summarized earnings</span>
        <span className="text-primary font-medium">finpulse.app</span>
      </div>
    </div>
  );
});

ShareableCard.displayName = "ShareableCard";

export default ShareableCard;
