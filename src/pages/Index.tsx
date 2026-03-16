import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { companies } from "@/data/mockFinancials";
import FinanceCard from "@/components/FinanceCard";

const Index = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const cardHeight = containerRef.current.clientHeight;
    const newIndex = Math.round(scrollTop / cardHeight);
    setActiveIndex(Math.min(newIndex, companies.length - 1));
  }, []);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Top bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div>
          <h1 className="text-lg font-bold font-['Space_Grotesk'] text-foreground tracking-tight">
            Fin<span className="text-primary">Pulse</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">Live</span>
        </div>
      </motion.header>

      {/* Swipe feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="snap-container h-screen overflow-y-scroll snap-y snap-mandatory"
      >
        {companies.map((company, index) => (
          <FinanceCard key={company.id} company={company} index={activeIndex} />
        ))}
      </div>

      {/* Side progress bar */}
      <div className="fixed right-2 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1">
        {companies.map((_, i) => (
          <motion.div
            key={i}
            className="w-1 rounded-full bg-muted-foreground/20"
            animate={{
              height: i === activeIndex ? 20 : 6,
              backgroundColor: i === activeIndex
                ? "hsl(174, 100%, 50%)"
                : "hsl(215, 20%, 55%, 0.2)",
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
