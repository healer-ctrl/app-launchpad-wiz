import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, FileText, Bookmark, Share2 } from "lucide-react";
import type { CompanyData } from "@/data/mockFinancials";
import CompanyLogo from "@/components/CompanyLogo";

interface FinanceCardProps {
  company: CompanyData;
  onReadReport?: () => void;
  onSwipeLeft?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  onLongPress?: () => void;
  isBookmarked?: boolean;
  isCompareSelected?: boolean;
}

type TabKey = "fin" | "ca" | "shareholding" | "news" | "research";
const TABS: { key: TabKey; label: string }[] = [
  { key: "fin", label: "FIN" },
  { key: "ca", label: "CA" },
  { key: "shareholding", label: "Holdings" },
  { key: "news", label: "News" },
  { key: "research", label: "Research" },
];

const FinanceCard = ({ company, onReadReport, onSwipeLeft, onBookmark, onShare, onLongPress, isBookmarked = false, isCompareSelected = false }: FinanceCardProps) => {
  const isPositive = company.changePercent >= 0;
  const [showBookmarkAnim, setShowBookmarkAnim] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("fin");
  const x = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const startLongPress = () => {
    longPressFired.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress?.();
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Visual feedback during drag
  const leftIndicatorOpacity = useTransform(x, [-120, -60, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 60, 120], [0, 0.5, 1]);
  const rotate = useTransform(x, [-200, 0, 200], [-5, 0, 5]);

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 80;
    const velocityThreshold = 300;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      onSwipeLeft?.();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      onBookmark?.();
      setShowBookmarkAnim(true);
      setTimeout(() => setShowBookmarkAnim(false), 1200);
    }
  };

  return (
    <div className="h-screen w-full snap-start flex items-start justify-center px-5 pt-10 pb-4 relative overflow-hidden">
      {/* Swipe indicators */}
      <motion.div
        style={{ opacity: leftIndicatorOpacity }}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1"
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[10px] text-primary font-medium">Deep Dive</span>
      </motion.div>

      <motion.div
        style={{ opacity: rightIndicatorOpacity }}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1"
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <Bookmark className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[10px] text-primary font-medium">Save</span>
      </motion.div>

      {/* Bookmark animation overlay */}
      <AnimatePresence>
        {showBookmarkAnim && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <Bookmark className="w-10 h-10 text-primary fill-primary" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={cardRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragStart={cancelLongPress}
        onDragEnd={handleDragEnd}
        onDoubleClick={() => onReadReport?.()}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}
        style={{ x, rotate }}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.5 }}
        className={`w-full max-w-[375px] flex flex-col gap-3 touch-pan-y rounded-2xl transition-shadow ${
          isCompareSelected ? "ring-2 ring-primary shadow-[0_0_24px_hsl(var(--primary)/0.4)] p-4 -m-4" : ""
        }`}
      >
        {/* Top pill — quarter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          viewport={{ once: true }}
          className="self-start flex items-center gap-2"
        >
          <span className="text-xs font-medium tracking-widest uppercase px-3 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground">
            {company.quarter}
          </span>
          {isBookmarked && (
            <Bookmark className="w-3.5 h-3.5 text-primary fill-primary" />
          )}
        </motion.div>

        {/* Company header */}
        <div className="flex items-center gap-4">
          <CompanyLogo domain={company.domain} name={company.name} ticker={company.ticker} size="md" />
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

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(t.key);
              }}
              className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                activeTab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/60 text-muted-foreground border-border"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl bg-secondary/40 border border-border p-4 min-h-[180px]"
        >
          {activeTab === "fin" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold font-['Space_Grotesk'] text-foreground leading-snug">
                {company.headline}
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1.5 mt-2">
                <li>• Revenue: <span className="text-foreground font-semibold">{company.revenue}</span></li>
                <li>• Profit: <span className="text-foreground font-semibold">{company.profit}</span></li>
                <li>• Growth: <span className={`font-semibold ${isPositive ? "text-primary" : "text-destructive"}`}>{company.growth}</span></li>
              </ul>
            </div>
          )}
          {activeTab === "ca" && (
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• No recent corporate actions</li>
              <li>• Dividend & split history coming soon</li>
            </ul>
          )}
          {activeTab === "shareholding" && (
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Promoters: <span className="text-foreground font-semibold">—</span></li>
              <li>• FII: <span className="text-foreground font-semibold">—</span></li>
              <li>• DII: <span className="text-foreground font-semibold">—</span></li>
              <li>• Public: <span className="text-foreground font-semibold">—</span></li>
            </ul>
          )}
          {activeTab === "news" && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold font-['Space_Grotesk'] text-foreground leading-snug">
                {company.headline}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {company.summary}
              </p>
            </div>
          )}
          {activeTab === "research" && (
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• FIN view: {isPositive ? "Constructive — momentum intact" : "Cautious — watch for reversal"}</li>
              <li>• Key driver: {company.growth} growth</li>
              <li>• Risk: macro & sector rotation</li>
            </ul>
          )}
        </motion.div>

        {/* Read Full Report link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.3 }}
          viewport={{ once: true }}
          className="flex items-center justify-between"
        >
          <button
            onClick={onReadReport}
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline underline-offset-2 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            Read Full Report
          </button>
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary font-medium transition-colors"
            aria-label="Share as image"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default FinanceCard;
