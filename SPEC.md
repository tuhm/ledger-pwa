# Ledger — App Spec

A personal income/expense ledger, calendar-first, built as an installable
iOS PWA (Add to Home Screen). No backend — everything lives in the
browser's `localStorage` on-device. Single-device by design; a JSON
backup/restore feature exists for moving between devices.

**Live URL:** https://tuhm.github.io/ledger-pwa/
**Repo:** https://github.com/tuhm/ledger-pwa (public — no personal data is
committed to the repo; only app code)

## Tech stack

- Plain HTML/CSS/JS. No framework, no build step, no bundler.
- `js/storage.js` — data layer (localStorage read/write).
- `js/lock.js` — PIN lock screen, self-contained module (`LedgerLock`).
- `js/app.js` — everything else: rendering, state, event wiring.
- `sw.js` — service worker, network-first (falls back to cache when offline),
  forces an update check on every launch (see PWA section).
- `manifest.json` — PWA manifest (standalone display, piggy-face icon).
- Deployed via GitHub Pages from the `main` branch.

## Data model

All data in `localStorage`, plain JSON, under these keys:

| Key | Shape | Notes |
|---|---|---|
| `ledger.entries` | `Entry[]` | all transactions |
| `ledger.categories` | `Category[]` | seeded from a default list on first read, then fully user-editable via Settings |
| `ledger.budgets` | `{ [categoryId]: number }` | monthly budget per expense category; seeded with real starting values (see Budgets below), then user-editable |
| `ledger.pinHash` | `string` (SHA-256 hex) | gates app access |

**Entry**
```
{
  id: string,
  date: 'YYYY-MM-DD',
  type: 'expense' | 'income' | 'transfer',
  categoryId: string,
  amount: number,               // always positive; sign is inferred from type
  method: 'cash' | 'card' | null,  // only meaningful for type: 'expense'
  memo: string,
  installmentGroupId?: string,  // present only if created via installment split
  createdAt: number,            // epoch ms, used for stable ordering within a day
}
```

**Category**
```
{ id: string, name: string, type: 'expense' | 'income' | 'transfer' }
```
`name` is a single string combining icon + label, e.g. `"🍽️ Foods"` (split
on the first space for editing). Seeded from `DEFAULT_CATEGORIES` in
`storage.js` the first time `ledger.categories` is read; from then on the
live list is whatever's in localStorage, fully managed from the Settings
page (add / rename / re-icon / delete). The `inc-carried-over` category is
system-managed (see Balance below) — excluded from the entry form's
category picker and from the Settings page.

## Screens

### 1. Calendar (`#screen-calendar`) — default screen, first bottom tab

Fixed three-panel layout, no page-level scroll, panels sized **15% / 53% /
32%** (summary / calendar / day-details) of the available height — the
calendar panel is deliberately compact since a day cell only ever needs a
day number + up to 3 amount lines.

- **Top panel** — month nav (‹ month-year ›), action icons (🏷️ Settings,
  ⬇ Export), and a 2×2 summary tile grid: **Income | Cash Exp** /
  **Balance | Card Exp**. Tapping the tile grid jumps to the Summary tab.
  There is no "+" button here — adding an entry happens from the day panel
  below (see next).
- **Middle panel** — 7-column calendar grid. Each day cell shows the day
  number and up to 4 stacked amount lines (income +green, cash expense red,
  card expense blue, transfer violet) for that day, omitting any that are
  zero. Today is outlined in accent color; the selected day has a solid
  accent border. **Swipe left/right** on the grid changes month (same as
  the ‹ › buttons, and same as Summary's month nav). Tapping a day selects it.
- **Bottom panel** — entries for the selected day, each showing category,
  payment method (or "↔ Balance deduction" / "Automatic" for transfers /
  carried-over), memo, and amount. Scrolls internally if there are many.
  A large circular **+** button (44px, top-right of this panel) is the
  **sole entry point** for adding a new entry, pre-dated to the selected day.

**Top-tile semantics** (all for the *displayed month*, independent of which
day is selected within it):
- Income / Cash Exp / Card Exp = that month's totals by type/method.
  Transfers are excluded from these three.
- Balance = running total carried forward from all prior months, fixed for
  every day within the displayed month, only changing when you navigate to
  a different month. See "Balance & Carried Over" below for the formula.

Navigating months (buttons, swipe, or from Summary) auto-selects: **today**
if landing on the real current month, otherwise the **last day** of that
month.

### 2. Summary (`#screen-summary`) — second bottom tab

Three sections, in this order: **Expenses, Income, Deductions**, each with
a month nav header shared across the page. Every category of that type is
always listed (even at ₩0), sorted by descending amount for the displayed
month. Expense rows (and the Expenses section total) show a budget
comparison line when a budget is set: `🎯 ₩budget · Under by ₩x` (blue) or
`Over by ₩x` (red). Tapping any category row opens its yearly detail (see
below).

### 3. Category Detail (`#screen-category-detail`) — reached via tap

Bar chart of one category's totals across all 12 months of a selectable
year (‹ year ›, unbounded in both directions). Bar color matches the
category's type (green/red/violet). Expense categories with a budget show
a dashed horizontal reference line at the budget height. "‹ Back" returns
to the Summary tab.

### 4. Settings (`#screen-categories`, page title "Settings") — reached via 🏷️ icon on Calendar

Full CRUD for categories and budgets, grouped into Expense / Income /
Transfer lists (Carried Over excluded). "+" opens the add form; tapping a
row opens it pre-filled for editing.

- **Add**: pick type (Expense/Income/Transfer — locked after creation),
  icon (any text, typically an emoji), name, and (expense only) a monthly
  budget.
- **Edit**: same fields except type, which is shown as a read-only label.
- **Delete**: if the category has entries, you must pick another category
  of the *same type* to reassign them to first (blocked with an explanatory
  message if none exists); zero-entry categories delete with a plain
  confirm.

Bottom of the page: **Change PIN** (re-verifies current PIN, then sets a
new one) and the **full JSON backup** export/import buttons (see below).

## Entry form (modal, shared for add/edit)

Fields: Type (Expense/Income/Transfer — 3-way toggle), Date, Category
(filtered by type), Amount (₩), Payment method (**Card/Cash**, in that
order, Card is the default — expense only), Installments (expense-only,
new-entry-only — see below), Memo (optional, with autocomplete — see below).

- Tapping the dimmed backdrop behind the sheet cancels it, same as the
  Cancel button (applies to every modal in the app: entry, export,
  category).
- Editing an existing entry never shows the installment option. If the
  entry being edited belongs to an installment series, the Type toggle is
  **disabled** (locked to Expense) and a hint banner explains what cascades
  (see Installments below).

### Installments

For a **new** expense entry, checking "Split into installments" and
entering a month count (2–120) divides the amount evenly across that many
consecutive months, on the same day-of-month as the original date,
clamping to the target month's length when needed (e.g. Oct 31 → Nov 30 →
Dec 31 → Jan 31 → Feb 28). Any remainder from integer division is added to
the first installment so the total matches exactly. All installments share
one `installmentGroupId` and get a `(n/total)` suffix appended to their memo.

**Series editing** — installments are managed as a linked group after
creation:
- Editing **category, payment method, amount, or memo** on *any* entry in
  the series applies that change to **every** entry in the series. Memo's
  `(n/total)` tag is re-derived per entry by chronological date order (not
  copied verbatim), so editing the description doesn't stamp one entry's
  index onto its siblings.
- Editing **date** only changes that single entry; the rest of the series
  is untouched.
- The **number of installments cannot be changed** after creation — delete
  the whole series (see below) and recreate it instead.
- **Deleting any one installment deletes the entire series**, with a
  confirm showing the total entry count.
- Note: entries created before this series-linking existed have no
  `installmentGroupId` and can't retroactively cascade — only entries
  created (or fully recreated) after the feature shipped are linked.

### Memo autocomplete

As you type in the Memo field, it suggests up to **2** words pulled only
from memos already stored on-device (no external dictionary, nothing sent
anywhere) — matched by prefix against whatever word you're currently
typing (the text since the last space). A trailing `(n/total)` installment
tag is stripped before words are extracted, so those don't pollute
suggestions. Tapping a suggestion completes just that word (not the whole
memo) and leaves the cursor ready to keep typing.

## Budgets

Monthly budget per expense category, stored in `ledger.budgets`. Seeded via
`DEFAULT_BUDGETS` in `storage.js` (same seed-then-user-editable pattern as
categories) with real starting values — current seed totals ₩3,350,000
across all expense categories except Flexible, which intentionally has
none. Any edit made via Settings persists the whole budgets map (defaults
included), so the seed only matters until the first edit is saved. Budgets
show up in two places: per-category on the Summary page (actual vs. budget,
under/over), and as an aggregate on the Expenses section total.

## Balance & Carried Over

Balance is **not** a live all-time lookback — it's made concrete via an
automatic income entry:

- On every app load, `ensureCarryOverEntries()` walks month-by-month from
  the earliest entry's month up through the real current month. For each
  month missing a Carried Over entry (or where the existing one's amount is
  stale), it creates/updates one dated the 1st of that month, in category
  `inc-carried-over`, with amount = the *previous* month's net.
- **Month net** = income − cash expense − transfers (card expenses excluded
  until paid off via a `trf-card-payment` transfer entry).
- Carried Over entries are **read-only** in the UI (tapping shows an
  explanatory alert instead of opening the editor) and excluded from the
  manual category picker, to keep the chain from being corrupted.
- Because it's a real entry, the Summary/Calendar Income figures for a
  month include that month's Carried Over amount.

This design means editing a past month's entries automatically
self-corrects every later month's Carried Over amount on the next app load.

## Export

Two entirely separate export features:

1. **CSV expense summary** (Calendar screen, ⬇ icon) — pick a From/To month
   range (dropdowns reach 10+ years out), and it shares (via `navigator.share`
   with files, falling back to a direct download) a CSV of
   `Month, Category, Amount (KRW)` — category-level monthly totals for
   expenses only, matching what the Summary page shows. No individual
   transactions, no income/transfers.
2. **Full JSON backup** (Settings screen, bottom buttons) — exports/imports
   *everything*: entries, categories, budgets, and the PIN hash, via the
   same share-or-download pattern. Import requires an explicit confirm
   (it replaces all local data) and reloads the app afterward. This is the
   only way to move data to a new device/reinstall — there is no sync.

## PIN lock (`js/lock.js`)

A full-screen numeric keypad gate (84px keys) shown on every fresh app
launch. First run prompts to set a 4-digit PIN (enter twice to confirm);
later runs prompt to enter it. Wrong PIN shakes and clears. "Forgot PIN?
Erase app data" on the unlock screen wipes everything (entries, categories,
budgets, PIN) with a confirm, since there's no password recovery — only a
full reset or restoring an old JSON backup.

This is explicitly a **casual-access deterrent**, not real security — it's
all client-side, the source is public, and a 4-digit PIN hash is trivially
brute-forceable if a backup file were to leak.

## PWA / installation notes

- `manifest.json`: standalone display, dark theme color (`#0f1115`), piggy-
  face icon (mint background) in 192/512 + maskable variants.
- Install via Safari → Share → **Add to Home Screen**, once. Re-adding
  creates a **separate, isolated storage silo** on iOS (a known platform
  quirk) — always reuse the existing icon; never delete-and-re-add casually.
- `sw.js` is network-first: every load tries the network first and falls
  back to cache only when offline. On top of that, `app.js` explicitly
  calls `registration.update()` on every launch and reloads once (guarded
  against loops) the moment a new worker takes control — because browsers
  throttle service worker update checks to roughly once per 24h by default,
  which otherwise made a freshly-deployed change invisible for up to a day
  even after force-quitting and reopening. Bump `CACHE_NAME` on deploy to
  invalidate old cached assets.
- No servers, no accounts, no analytics. The GitHub repo is public (required
  for free GitHub Pages) but contains no user data — only app code.
