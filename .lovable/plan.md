# Create `CONTEXT.md` — Full End-to-End App Prompt

A single self-contained document at the project root that any fresh Lovable session (or another AI) could paste in to rebuild **FinPulse** from scratch. Written as a "master prompt" — product vision + design system + features + data model + tech stack — not a changelog.

## File: `CONTEXT.md`

Structured into these sections:

### 1. One-line pitch
TikTok-style mobile-first feed for Indian + US earnings reports. Swipe through AI-summarized financial results like Reels.

### 2. Product vision & audience
- Retail investors who want Bloomberg-grade info in Instagram-grade UX
- Mobile-only, 375px viewport, vertical snap-scroll
- "Skimmable headlines, deep on demand"

### 3. Design system (locked)
- Dark theme: navy/black bg, white text, **teal `#00FFD1` (hsl 174 100% 50%)** accent
- Font: **Space Grotesk** (headings) + Inter (body)
- No visible scrollbars anywhere (`no-scrollbar` util)
- Aesthetic reference: Bloomberg Terminal × Instagram Reels
- Card padding `p-4`, rounded-2xl, glow ring on compare-select
- Company logos via **logo.dev** with 4px white bg padding for dark-mode visibility
- Framer Motion for every transition (spring, not ease)

### 4. Core UX model
- **Vertical snap-scroll feed** — one company per viewport
- **Swipe left** → Deep Dive page
- **Tap "Read Report"** → bottom-sheet full financial report
- **Long-press 2 cards** → side-by-side Compare sheet (beta)
- **Bookmark / Share** buttons on each card
- All overlays use `window.history.pushState` so Android back button closes them
- Splash screen on cold start (2.2s)

### 5. Feed card anatomy (FinanceCard.tsx)
Header: logo + company name + ticker + quarter badge
Tabs under name (horizontally scrollable pills):
  - **FIN** — headline + revenue/profit/growth bullets
  - **CA** — corporate actions bullets
  - **Holdings** — promoter/FII/DII/public bullets
  - **News** — headline + 3-line clamp summary
  - **Research** — 2-3 analyst-style bullets
Action row: Bookmark · Share · Read Report · Deep Dive arrow

### 6. Tabs (BottomNav)
Feed · Search · Bookmarks · Leaderboard · Settings

### 7. Filters
Top-bar pills: All / 🇮🇳 India / 🇺🇸 US / 💻 Tech / 🏦 Banking
Popover advanced filters: Region · Sector · Period (Quarterly / Annual)
"All caught up" empty state with trendy catchphrase when filters return nothing

### 8. Data pipeline
- **Source**: NSE corporate-filings API polled by `fetch-nse-reports` edge function
- **Processing**: `process-report` edge function downloads PDF, **chunked base64 encode (8KB) to avoid stack overflow**, sends to Gemini via Lovable AI Gateway, stores summary
- **Tables**: `companies`, `reports`, `report_summaries` (latest per company shown)
- **Feed query**: `useInfiniteQuery` — 15 first page, 10 per subsequent; dedupe latest summary per company; prefetch when activeIndex ≥ length-3
- **Mock data toggle** in Settings — full architecture supports static `mockFinancials.ts` OR live pipeline
- **NSE live status indicator** in Settings (useNseStatus hook)

### 9. Notifications
- Capacitor native build for iOS/Android
- FCM HTTP v1 push via `send-push` edge function, triggered on new `report_summaries` row
- `device_tokens` table; opt-in toggle in Settings

### 10. Tech stack
- React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- Framer Motion · TanStack Query · React Router
- Lovable Cloud (Supabase) — auth, DB, edge functions, storage
- Lovable AI Gateway (Gemini) for summarization
- Capacitor for native mobile shell

### 11. Database schema (high level)
- `companies` (id, name, ticker, sector, exchange, domain)
- `reports` (id, company_id, pdf_url, processed_at)
- `report_summaries` (id, report_id, company_id, headline, summary, revenue, profit, growth, quarter, eps, pe_ratio, debt_equity, ebitda, roe, beat_or_miss, full_report_text, sector)
- `device_tokens` (user_id, token, platform)
- `user_roles` (separate table, enum `app_role`, `has_role()` security-definer fn) — RLS pattern
- Every public table: GRANT + RLS + policies

### 12. Constraints / non-negotiables
- Mobile-first 375px only — no desktop layout
- No hardcoded colors — semantic tokens in `index.css`
- No purple/indigo gradients, no Inter/Poppins as headings
- Large PDFs MUST chunk-encode base64
- Roles never on profile table

### 13. "Build this" prompt block
A copy-paste-ready prompt at the bottom: *"Build FinPulse, a mobile-first TikTok-style financial earnings app. Use the spec above verbatim…"* — so the file doubles as a Lovable starter prompt.

## Out of scope
- No code changes to the app
- No new features — purely documentation
- File lives at repo root as `CONTEXT.md` (~6-8KB)
