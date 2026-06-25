# Infinite Scroll Feed with Smart Prefetch

Yes — totally feasible and a great UX choice. We have **501 summaries across 397 companies** in the DB, so paginating is the right call.

## Strategy

- Load **15 reports** initially.
- When the user's active card index reaches `loadedCount - 3`, prefetch the **next 10**.
- React Query caches each page, so scrolling back is instant.
- A skeleton card appears at the tail while the next page is in flight (usually invisible since we prefetch 3 cards early).
- Stop fetching when the server returns fewer rows than the page size.

## Changes

### 1. `src/hooks/useFeedData.ts` — switch to `useInfiniteQuery`
- Replace `useQuery` with TanStack's `useInfiniteQuery` (already available, no new deps).
- Page params: first page `limit=15`, subsequent pages `limit=10`.
- Query: `.order("processed_at", { ascending: false }).range(offset, offset + limit - 1)`.
- `getNextPageParam`: return `undefined` when last page returned `< limit` rows (end of data).
- Apply current dedup (latest summary per company) **across all loaded pages**, not per-page, so the same company never appears twice as new pages arrive.
- Return shape: `{ companies, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading }`.

### 2. `src/pages/Index.tsx` — trigger prefetch
- Destructure new fields from the hook.
- Effect watching `activeIndex`:
  ```
  if (hasNextPage && !isFetchingNextPage && activeIndex >= filteredCompanies.length - 3) {
    fetchNextPage();
  }
  ```
- Append a `<FeedSkeleton />` as the last snap section while `isFetchingNextPage` is true so the user can keep scrolling without bumping into a wall.
- No UI/color/layout changes — just one extra skeleton card at the tail when loading.

## Technical notes

- Supabase `.range(from, to)` is inclusive on both ends.
- `staleTime: 5 * 60 * 1000` stays — pages cached for 5 min.
- Prefetch threshold (3 cards) is tunable.
- No DB schema changes, no edge function changes, no design changes.
- Mock-data path unchanged (still returns full mock array in one shot).
- Filters remain client-side over loaded pages (existing behavior preserved).

## Out of scope
- No changes to bookmarks/search tabs.
- Dedup behavior unchanged — still one card per company (latest report).
