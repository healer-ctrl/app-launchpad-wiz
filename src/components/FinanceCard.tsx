import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import type { CompanyData } from "@/data/mockFinancials";

interface FinanceCardProps {
  company: CompanyData;
  index: number;
}

const FinanceCard = ({ company, index }: FinanceCardProps) => {
  const isPositive = company.changePercent >= 0;

  return (
    <div className="h-screen w-full snap-start flex items-center justify-center px-5 py-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.5 }}
        className="w-full max-w-[375px] flex flex-col gap-5"
      >
        {/* Top pill — quarter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          viewport={{ once: true }}
          className="self-start"
        >
          <span className="text-xs font-medium tracking-widest uppercase px-3 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground">
            {company.quarter}
          </span>
        </motion.div>

        {/* Company header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center border border-border">
            <span className="text-xl font-bold font-['Space_Grotesk'] text-foreground">
              {company.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-foreground truncate">
              {company.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-mono text-muted-foreground">{company.ticker}</span>
              <span className={`text-sm font-semibold flex items-center gap-0.5 ${isPositive ? "text-primary" : "text-destructive"}`}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isPositive ? "+" : ""}{company.changePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <motion.h3
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          viewport={{ once: true }}
          className="text-lg font-semibold font-['Space_Grotesk'] leading-snug text-foreground"
        >
          {company.headline}
        </motion.h3>

        {/* Summary */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          viewport={{ once: true }}
          className="text-sm leading-relaxed text-muted-foreground"
        >
          {company.summary}
        </motion.p>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          viewport={{ once: true }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Revenue", value: company.revenue },
            { label: "Profit", value: company.profit },
            { label: "Growth", value: company.growth },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-secondary/60 border border-border p-3 text-center"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {stat.label}
              </p>
              <p className="text-sm font-bold font-['Space_Grotesk'] text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Read more button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.3 }}
          viewport={{ once: true }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:brightness-90"
        >
          Read Full Report
          <ExternalLink className="w-4 h-4" />
        </motion.button>

        {/* Scroll indicator */}
        <div className="flex justify-center pt-2">
          <div className="flex gap-1.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "bg-primary w-4" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FinanceCard;
