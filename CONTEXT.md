# FinPulse — End-to-End Build Prompt

> Paste this entire file into a fresh Lovable chat to rebuild the app from zero. It is the master spec: vision, design, UX, data, infra.

---

## 1. One-line pitch
**TikTok-style mobile-first feed for Indian + US earnings reports.** Swipe through AI-summarized financial results like Instagram Reels — Bloomberg-grade info in Instagram-grade UX.

## 2. Audience & vision
- Retail investors who hate PDFs but love charts.
- Mobile-only experience, locked to **375px viewport**, vertical snap-scroll.
- Mantra: *Skimmable headlines, deep on demand.*

## 3. Design system (non-negotiable)
- **Theme:** dark only. Navy/black background, white text.
- **Accent:** teal `#00FFD1` → `hsl(174 100% 50%)`.
- **Fonts:** `Space Grotesk` for headings, `Inter` for body. **Never** Poppins, never serif.
- **No visible scrollbars** anywhere — apply a `no-scrollbar` utility.
- **Cards:** `rounded-2xl`, `p-4`, glow ring (`ring-2 ring-primary shadow-[0_0_24px_hsl(var(--primary)/0.4)]`) when selected for compare.
- **Logos:** fetched from **logo.dev**, wrapped with **4px white background padding** so they're visible on dark.
- **Motion:** Framer Motion springs (not ease) for every transition. AnimatePresence on every overlay.
- **Tokens:** every color/gradient/shadow lives in `src/index.css` as HSL semantic tokens. Never hardcode `text-white`, `bg-black`, or hex values in components.

## 4. Core UX model
- **Vertical snap-scroll feed**, one company per viewport (`snap-y snap-mandatory`).
- **Swipe left** on a card → opens **Deep Dive** page.
- **Tap "Read Report"** → opens **bottom-sheet** with full financial report.
- **Long-press 2 cards** → **CompareSheet** (beta) shows side-by-side revenue/margin/EPS.
- **Bookmark / Share** buttons on every card.
- All overlays use `window.history.pushState({ overlay: "..." }, "")` + a `popstate` listener so the **Android system back button** closes them.
- **Splash screen** on cold start, 2.2s, then fades out.
- **Empty filter state**: trendy catchphrase ("You're all caught up 🎉 — touch grass, hydrate, tweak filters").

## 5. Feed card anatomy — `FinanceCard.tsx`
**Header row:** logo (logo.dev w/ white pad) + company name + ticker + quarter badge.

**Tabs under company name** (horizontally scrollable pills, no scrollbar):
| Tab | Content (≤60 words, bullet style) |
|---|---|
| **FIN** | headline + revenue · profit · growth bullets |
| **CA** | corporate actions — dividends, splits, bonuses |
| **Holdings** | promoter · FII · DII · public bullets |
| **News** | headline + 3-line clamp of `company.summary` |
| **Research** | 2–3 analyst-style bullets — momentum, driver, risk |

`AnimatePresence` for tab transitions. `min-h-[180px]` content container so layout doesn't jump.

**Action row:** Bookmark · Share · Read Report · Deep Dive arrow.

## 6. Bottom navigation
`Feed · Search · Bookmarks · Leaderboard · Settings` — `BottomNav.tsx`, bookmark count badge.

## 7. Filters
- **Top-bar pills:** All / 🇮🇳 India / 🇺🇸 US / 💻 Tech / 🏦 Banking.
- **Advanced popover** (`SlidersHorizontal` icon): Region · Sector · Period (Quarterly / Annual). Dot indicator when any advanced filter is active. Reset button.

## 8. Data pipeline
- **Source:** NSE corporate filings API, polled by `fetch-nse-reports` edge function.
- **Processing:** `process-report` edge function downloads the PDF, **chunk-encodes base64 in 8KB slices** (NEVER `btoa(String.fromCharCode(...bigArray))` — stack overflow), sends to Gemini via **Lovable AI Gateway**, stores structured summary.
- **Feed query:** `useInfiniteQuery` — **15 rows first page, 10 per subsequent**. Dedup keeps only the latest summary per company across pages. Prefetch next page when `activeIndex >= loaded.length - 3`. Tail skeleton card while `isFetchingNextPage`.
- **Mock-vs-live switch:** Settings toggle. Architecture supports both static `src/data/mockFinancials.ts` and the live pipeline behind the same `FeedCompany` shape.
- **NSE live status indicator** in Settings via `useNseStatus` hook.

## 9. Push notifications
- Mobile build via **Capacitor** (iOS + Android).
- **FCM HTTP v1** delivered by `send-push` edge function, triggered on insert into `report_summaries`.
- `device_tokens` table. Opt-in toggle in Settings.

## 10. Tech stack
React 18 · Vite · TypeScript · Tailwind v3 · shadcn/ui · Framer Motion · TanStack Query · React Router · Lovable Cloud (Supabase: auth/DB/edge functions/storage) · Lovable AI Gateway (Gemini) · Capacitor.

## 11. Database schema (Lovable Cloud / Supabase)
```
companies(id, name, ticker, sector, exchange, domain)
reports(id, company_id, pdf_url, processed_at)
report_summaries(id, report_id, company_id, headline, summary,
                 revenue, profit, growth, quarter,
                 eps, pe_ratio, debt_equity, ebitda, current_ratio, roe,
                 beat_or_miss, full_report_text, sector, processed_at)
device_tokens(id, user_id, token, platform, created_at)
user_roles(id, user_id, role app_role)   -- SEPARATE table, never on profile
```
**Every** `CREATE TABLE public.x` must be followed in the same migration by:
1. `GRANT` to `authenticated` (and `service_role`; `anon` only if policy allows public reads),
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`,
3. `CREATE POLICY ...`.

Roles use a `has_role(_user_id, _role)` **security-definer** function — never check roles client-side, never store roles on profile.

## 12. Hard constraints
- Mobile-first 375px only — **no desktop layout**.
- Semantic CSS tokens only — no hardcoded colors in components.
- No purple/indigo gradients, no Inter/Poppins as heading font, no generic AI aesthetics.
- PDFs over a few hundred KB **must** chunk-encode base64.
- Roles never on profile/users table.
- Overlays must push history state.
- No backend code in the repo — use edge functions only.

## 13. File map (key files)
```
src/
  pages/
    Index.tsx              -- feed + filters + nav orchestration
    Settings.tsx           -- mock toggle, NSE status, push opt-in
  components/
    FinanceCard.tsx        -- tabbed card (FIN/CA/Holdings/News/Research)
    CompareSheet.tsx       -- long-press side-by-side
    FinancialReportSheet.tsx
    CompanyDeepDive.tsx
    CompanyDetailPage.tsx
    BottomNav.tsx
    SplashScreen.tsx
    FeedSkeleton.tsx / FeedEmptyState.tsx
    ShareableCard.tsx
    CompanyLogo.tsx        -- logo.dev + 4px white pad
  hooks/
    useFeedData.ts         -- useInfiniteQuery, dedupe, mock switch
    useSettings.ts useShareCard.ts useNseStatus.ts
    useSearchCompanies.ts useLeaderboard.ts useLiveDeepDive.ts
    usePushNotifications.ts
  data/mockFinancials.ts
supabase/functions/
  fetch-nse-reports/  process-report/  generate-company-profile/
  send-push/  feed/
```

---

## 14. COPY-PASTE STARTER PROMPT

> Build **FinPulse**, a mobile-first TikTok-style financial earnings app for Indian + US markets. Follow the spec above verbatim:
>
> - Dark theme, teal `#00FFD1` accent, Space Grotesk headings, no scrollbars.
> - Lock the viewport to 375px, vertical snap-scroll, one company card per screen.
> - Each card has a header (logo from logo.dev with 4px white pad, name, ticker, quarter) and 5 tabs under the name: **FIN, CA, Holdings, News, Research**, each ≤60 words of bullets. Bookmark · Share · Read Report · Deep Dive in the action row.
> - Bottom nav: Feed · Search · Bookmarks · Leaderboard · Settings.
> - Top filter pills (All / India / US / Tech / Banking) + advanced popover (Region, Sector, Period).
> - Swipe-left opens Deep Dive; Read Report opens a bottom sheet; long-press two cards opens a Compare sheet (beta). All overlays push browser history so the back button closes them.
> - Splash screen 2.2s on cold start. "All caught up" trendy empty state when filters return nothing.
> - Use Lovable Cloud for auth/DB/edge functions. Tables: `companies`, `reports`, `report_summaries`, `device_tokens`, `user_roles`. Always GRANT + RLS + policies. Roles in a separate table behind a `has_role` security-definer function.
> - Edge functions: `fetch-nse-reports` polls NSE; `process-report` downloads PDFs, **chunk-encodes base64 in 8KB slices**, calls Gemini via the Lovable AI Gateway, writes `report_summaries`. `send-push` fires FCM HTTP v1 on new summaries.
> - Feed uses `useInfiniteQuery`: 15 first page, 10 thereafter, dedup latest per company, prefetch when activeIndex ≥ length-3, tail skeleton while loading.
> - Settings has a mock-vs-live data toggle and a live NSE status indicator.
> - Wrap with Capacitor for native iOS/Android, push opt-in in Settings.
>
> Stack: React 18 + Vite + TS + Tailwind + shadcn/ui + Framer Motion + TanStack Query + Lovable Cloud + Lovable AI Gateway + Capacitor. Mobile-only, no desktop layout, no hardcoded colors, no purple gradients.
