import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Settings as SettingsIcon, SlidersHorizontal, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { type CompanyData, type CompanyCategory } from "@/data/mockFinancials";
import { useFeedData, type FeedCompany } from "@/hooks/useFeedData";
import { useSettings } from "@/hooks/useSettings";
import FinanceCard from "@/components/FinanceCard";
import FeedSkeleton from "@/components/FeedSkeleton";
import FeedEmptyState from "@/components/FeedEmptyState";
import FinancialReportSheet from "@/components/FinancialReportSheet";
import CompanyDeepDive from "@/components/CompanyDeepDive";
import CompanyDetailPage from "@/components/CompanyDetailPage";
import BottomNav, { type TabType } from "@/components/BottomNav";
import SearchTab from "@/components/SearchTab";
import BookmarksTab from "@/components/BookmarksTab";
import LeaderboardTab from "@/components/LeaderboardTab";
import Settings from "@/pages/Settings";
import ShareableCard from "@/components/ShareableCard";
import SplashScreen from "@/components/SplashScreen";
import CompareSheet from "@/components/CompareSheet";
import { useShareCard } from "@/hooks/useShareCard";

type FilterType = "all" | CompanyCategory;

const filters: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "🇮🇳 India", value: "india" },
  { label: "🇺🇸 US", value: "us" },
  { label: "💻 Tech", value: "tech" },
  { label: "🏦 Banking", value: "banking" },
];

const FilterGroup = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) => (
  <div className="mb-3">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
            value === o.v
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-secondary/40 text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  </div>
);

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>("feed");
  const [showSettings, setShowSettings] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [reportCompany, setReportCompany] = useState<CompanyData | null>(null);
  const [deepDiveCompany, setDeepDiveCompany] = useState<CompanyData | null>(null);
  const [detailCompany, setDetailCompany] = useState<CompanyData | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showSplash, setShowSplash] = useState(true);
  const [advRegion, setAdvRegion] = useState<"all" | "india" | "us">("all");
  const [advSector, setAdvSector] = useState<"all" | "tech" | "banking">("all");
  const [advPeriod, setAdvPeriod] = useState<"all" | "quarterly" | "annual">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [compareToast, setCompareToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const { useMockData, toggleMockData } = useSettings();
  const { ref: shareRef, pendingCompany: sharePending, share: shareCompany } = useShareCard();

  // Fetch real data from Supabase (falls back to mock)
  const { data: companies, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeedData(useMockData);

  const openDeepDive = useCallback((company: CompanyData) => {
    window.history.pushState({ overlay: "deepDive" }, "");
    setDeepDiveCompany(company);
  }, []);

  const closeDeepDive = useCallback(() => {
    setDeepDiveCompany((prev) => {
      if (prev) {
        if (window.history.state?.overlay === "deepDive") {
          window.history.back();
        }
      }
      return null;
    });
  }, []);

  const openDetail = useCallback((company: CompanyData) => {
    window.history.pushState({ overlay: "detail" }, "");
    setDetailCompany(company);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailCompany((prev) => {
      if (prev) {
        if (window.history.state?.overlay === "detail") {
          window.history.back();
        }
      }
      return null;
    });
  }, []);

  // Smart prefetch: when user is within 3 cards of the end, fetch the next page
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    if (companies.length === 0) return;
    if (activeIndex >= companies.length - 3) {
      fetchNextPage();
    }
  }, [activeIndex, companies.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const handlePopState = () => {
      if (deepDiveCompany) {
        setDeepDiveCompany(null);
      } else if (detailCompany) {
        setDetailCompany(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [deepDiveCompany, detailCompany]);

  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCompanies = useMemo(() => {
    let list = companies;
    if (activeFilter !== "all") list = list.filter((c) => c.categories.includes(activeFilter));
    if (advRegion !== "all") list = list.filter((c) => c.categories.includes(advRegion));
    if (advSector !== "all") list = list.filter((c) => c.categories.includes(advSector));
    if (advPeriod === "quarterly") list = list.filter((c) => /Q[1-4]/i.test(c.quarter));
    if (advPeriod === "annual") list = list.filter((c) => /(FY|Annual)/i.test(c.quarter) && !/Q[1-4]/i.test(c.quarter));
    return list;
  }, [activeFilter, companies, advRegion, advSector, advPeriod]);

  const bookmarkedCompanies = useMemo(
    () => companies.filter((c) => bookmarkedIds.has(c.id)),
    [bookmarkedIds, companies]
  );

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const cardHeight = containerRef.current.clientHeight;
    const newIndex = Math.round(scrollTop / cardHeight);
    setActiveIndex(Math.min(newIndex, filteredCompanies.length - 1));
  }, [filteredCompanies.length]);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setActiveIndex(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>
      {/* Top bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="flex items-center justify-between px-5 py-3">
          <h1 className="text-lg font-bold font-['Space_Grotesk'] text-foreground tracking-tight">
            Fin<span className="text-primary">Pulse</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground font-medium">Live</span>
            </div>
            <button onClick={() => setShowSettings(true)} className="text-muted-foreground hover:text-foreground transition-colors">
              <SettingsIcon className="w-4.5 h-4.5" />
            </button>
            {activeTab === "feed" && (
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <button
                    aria-label="Filters"
                    className={`relative text-muted-foreground hover:text-foreground transition-colors ${
                      advRegion !== "all" || advSector !== "all" || advPeriod !== "all" ? "text-primary" : ""
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    {(advRegion !== "all" || advSector !== "all" || advPeriod !== "all") && (
                      <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="w-64 p-3 bg-background/95 backdrop-blur-xl border-border">
                  <FilterGroup
                    label="Region"
                    value={advRegion}
                    onChange={(v) => setAdvRegion(v as any)}
                    options={[
                      { v: "all", l: "All" },
                      { v: "india", l: "🇮🇳 India" },
                      { v: "us", l: "🇺🇸 US" },
                    ]}
                  />
                  <FilterGroup
                    label="Sector"
                    value={advSector}
                    onChange={(v) => setAdvSector(v as any)}
                    options={[
                      { v: "all", l: "All" },
                      { v: "tech", l: "💻 Tech" },
                      { v: "banking", l: "🏦 Banking" },
                    ]}
                  />
                  <FilterGroup
                    label="Period"
                    value={advPeriod}
                    onChange={(v) => setAdvPeriod(v as any)}
                    options={[
                      { v: "all", l: "All" },
                      { v: "quarterly", l: "Quarterly" },
                      { v: "annual", l: "Annual" },
                    ]}
                  />
                  <button
                    onClick={() => {
                      setAdvRegion("all");
                      setAdvSector("all");
                      setAdvPeriod("all");
                    }}
                    className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-md border border-border/50"
                  >
                    Reset
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {activeTab === "feed" && (
          <div className="flex gap-2 px-5 pb-3 overflow-x-auto no-scrollbar">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  activeFilter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/60 text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </motion.header>

      {/* Feed tab */}
      {activeTab === "feed" && (
        <>
          {isLoading ? (
            <FeedSkeleton />
          ) : filteredCompanies.length === 0 && !useMockData ? (
            <FeedEmptyState onSwitchToMock={() => toggleMockData(true)} />
          ) : filteredCompanies.length === 0 ? (
            <div className="h-screen flex flex-col items-center justify-center px-8 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-xl font-bold font-['Space_Grotesk'] text-foreground mb-2">
                You're all caught up!
              </h2>
              <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
                No more reports matching these filters. Touch grass, hydrate, or tweak your filters. 📈
              </p>
            </div>
          ) : (
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className="snap-container h-screen overflow-y-scroll snap-y snap-mandatory"
            >
              {filteredCompanies.map((company) => (
                <FinanceCard
                  key={company.id}
                  company={company}
                  onReadReport={() => setReportCompany(company)}
                  onSwipeLeft={() => openDeepDive(company)}
                  onBookmark={() => toggleBookmark(company.id)}
                  onShare={() => shareCompany(company)}
                  isBookmarked={bookmarkedIds.has(company.id)}
                />
              ))}
            </div>
          )}

        </>
      )}

      {activeTab === "bookmarks" && (
        <BookmarksTab
          bookmarkedCompanies={bookmarkedCompanies}
          onSelectCompany={openDetail}
          onRemoveBookmark={(id) => toggleBookmark(id)}
        />
      )}

      {activeTab === "leaderboard" && (
        <LeaderboardTab onSelectCompany={openDetail} />
      )}

      {activeTab === "search" && (
        <SearchTab onSelectCompany={openDetail} />
      )}

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        bookmarkCount={bookmarkedIds.size}
      />

      <AnimatePresence>
        {reportCompany && (
          <FinancialReportSheet
            company={reportCompany}
            onClose={() => setReportCompany(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deepDiveCompany && (
          <CompanyDeepDive
            company={deepDiveCompany}
            onBack={closeDeepDive}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailCompany && (
          <CompanyDetailPage
            company={detailCompany}
            onBack={closeDetail}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && <Settings onBack={() => setShowSettings(false)} />}
      </AnimatePresence>

      {/* Off-screen snapshot target for share-as-image */}
      <div
        aria-hidden
        style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}
      >
        {sharePending && <ShareableCard ref={shareRef} company={sharePending} />}
      </div>
    </div>
  );
};

export default Index;
