## Goal
Make each Corporate Action item in the CA tab expandable to reveal full details (ex-date, record date, ratio, face value, purpose, AGM summary, etc.).

## Changes

**`src/components/CompanyDeepDive.tsx` (CA tab only)**
- Convert each CA row into a clickable card using a local `expandedCaId` state (only one open at a time; tap again to close).
- Collapsed view (unchanged): icon + action type + short purpose + ex-date badge + chevron that rotates when open.
- Expanded view (animated with framer-motion height): renders a details grid based on `action_type`:
  - **Dividend** → Purpose, Ex-Date, Record Date, Face Value (from `nseData.financials.face_value`), Dividend amount (parsed from `purpose`/`details` when present, e.g. "Rs 8 per share"), Type (Interim/Final if detected in purpose).
  - **Bonus / Split** → Ratio (parsed from purpose e.g. "1:1", "5:1"), Ex-Date, Record Date, Face Value before/after (for splits when parseable), Announcement note.
  - **Buyback** → Purpose, Ex-Date, Record Date, Details text.
  - **AGM / EGM** → Meeting date (ex-date), 1–2 line summary derived from `purpose`/`details`.
  - **Fallback / other** → Purpose, Ex-Date, Record Date, raw Details.
- Add a tiny `parseCaDetails(action)` helper inside the file to extract ratio / dividend amount / type from the `purpose` + `details` strings using simple regex — no backend changes.
- Mock-mode CA cards (the current placeholder list) get the same expand behavior with hardcoded sample details so both modes feel consistent.

## Out of scope
- No DB schema changes, no new edge function calls, no new fields fetched. Everything is derived from data already stored in `nse_corporate_actions` + `nse_financials`.
