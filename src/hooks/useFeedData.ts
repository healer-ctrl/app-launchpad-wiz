import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyData, CompanyCategory } from "@/data/mockFinancials";
import { companies as mockCompanies } from "@/data/mockFinancials";

export interface FeedCompany extends CompanyData {
  reportSummaryId?: string;
  reportId?: string;
  fullReportText?: string;
  beatOrMiss?: string;
  eps?: string;
  peRatio?: string;
  debtEquity?: string;
  ebitda?: string;
  currentRatio?: string;
  roe?: string;
  sector?: string;
}

const FIRST_PAGE_SIZE = 15;
const NEXT_PAGE_SIZE = 10;

function mapDbToCompany(item: any): FeedCompany {
  const company = item.companies;
  const growthStr = item.growth || "+0%";
  const growthNum = parseFloat(growthStr.replace(/[^-\d.]/g, "")) || 0;

  const categories: CompanyCategory[] = [];
  if (company.exchange === "NSE" || company.exchange === "BSE") categories.push("india");
  if (company.exchange === "NASDAQ" || company.exchange === "NYSE") categories.push("us");
  const sectorLower = (company.sector || item.sector || "").toLowerCase();
  if (sectorLower.includes("tech") || sectorLower.includes("software") || sectorLower.includes("semiconductor") || sectorLower.includes("it ")) categories.push("tech");
  if (sectorLower.includes("bank") || sectorLower.includes("financial")) categories.push("banking");

  return {
    id: company.id,
    name: company.name,
    ticker: company.ticker,
    headline: item.headline || "",
    summary: item.summary || "",
    revenue: item.revenue || "",
    profit: item.profit || "",
    growth: item.growth || "",
    quarter: item.quarter || "",
    changePercent: growthNum,
    accentColor: "174 100% 50%",
    categories,
    domain: company.domain || "",
    reportSummaryId: item.id,
    reportId: item.report_id,
    fullReportText: item.full_report_text,
    beatOrMiss: item.beat_or_miss,
    eps: item.eps,
    peRatio: item.pe_ratio,
    debtEquity: item.debt_equity,
    ebitda: item.ebitda,
    currentRatio: item.current_ratio,
    roe: item.roe,
    sector: item.sector || company.sector,
  };
}

interface PageResult {
  items: any[];
  nextOffset: number | null;
}

export function useFeedData(useMockData = false) {
  const mockQuery = useQuery({
    queryKey: ["feed-mock"],
    queryFn: async (): Promise<FeedCompany[]> => mockCompanies as FeedCompany[],
    enabled: useMockData,
    staleTime: Infinity,
  });

  const infiniteQuery = useInfiniteQuery({
    queryKey: ["feed-infinite"],
    enabled: !useMockData,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<PageResult> => {
      const offset = pageParam as number;
      const limit = offset === 0 ? FIRST_PAGE_SIZE : NEXT_PAGE_SIZE;
      const { data, error } = await supabase
        .from("report_summaries")
        .select(`
          *,
          companies (
            id,
            name,
            ticker,
            sector,
            exchange,
            domain
          )
        `)
        .order("processed_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Feed query error:", error);
        throw error;
      }

      const items = data || [];
      const nextOffset = items.length < limit ? null : offset + items.length;
      return { items, nextOffset };
    },
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo<FeedCompany[]>(() => {
    if (useMockData) return mockQuery.data ?? [];
    const allItems = infiniteQuery.data?.pages.flatMap((p) => p.items) ?? [];
    // Deduplicate across all loaded pages: keep first (latest) per company
    const seen = new Set<string>();
    const deduped = allItems.filter((item) => {
      if (seen.has(item.company_id)) return false;
      seen.add(item.company_id);
      return true;
    });
    return deduped.map(mapDbToCompany);
  }, [useMockData, mockQuery.data, infiniteQuery.data]);

  return {
    data,
    isLoading: useMockData ? mockQuery.isLoading : infiniteQuery.isLoading,
    fetchNextPage: infiniteQuery.fetchNextPage,
    hasNextPage: useMockData ? false : infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
  };
}
