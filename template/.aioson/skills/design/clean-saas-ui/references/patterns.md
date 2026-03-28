# Patterns — Clean SaaS UI

Page-level composition patterns. Always build from these patterns — never invent a new shell without a domain reason.

---

## App Shell

```
┌──────────────────────────────────────────────────────────┐
│ [Logo] ProductName           [Search]  [?]  [Avatar ▾]   │  ← 56px top bar (optional)
├────────────────┬─────────────────────────────────────────┤
│                │  Page Header (title + breadcrumbs +      │
│   SIDEBAR      │  actions)                                │
│   256px        ├─────────────────────────────────────────┤
│   bg-surface   │  Filter Bar / Tab Bar (when needed)      │
│   border-right ├─────────────────────────────────────────┤
│                │  CONTENT AREA                            │
│   Nav groups   │  padding: 24px                           │
│   Active state │  scroll: vertical                        │
│                │                                          │
│   [User]       │                                          │
└────────────────┴─────────────────────────────────────────┘
```

**Rules:**
- Sidebar: `256px` fixed, `bg-surface`, `border-r border-default`, scrollable independently
- Top bar: optional — some apps omit it if sidebar has logo + user footer
- Content area: `flex-1 overflow-y-auto`, `padding: 24px`
- Page header: inside content area, not full-width — stays within the scrollable zone
- Sidebar collapses to hamburger menu below `1024px`

---

## 1. List Page

**Use for:** contacts, accounts, tickets, orders, products, users

```
┌─────────────────────────────────────────────────────────┐
│ Contacts                            [Export] [+ New]     │  ← page header
├─────────────────────────────────────────────────────────┤
│ [Search...]  [Status ▾]  [Owner ▾]  ×2 filters  [Clear] │  ← filter bar
├─────────────────────────────────────────────────────────┤
│ ☐  Name ↕     Company ↕    Status      Created     (…)  │  ← sticky table header
│ ☐  J. Smith   Acme Corp    ● Active    Mar 12           │
│ ☐  A. Jones   Beta Ltd     ○ Inactive  Mar 10           │
│ ☐  R. Miller  Gamma Inc    ⚠ Warning   Mar 8            │
├─────────────────────────────────────────────────────────┤
│ Showing 1–25 of 143          [← Prev]  1 2 3  [Next →] │  ← pagination
└─────────────────────────────────────────────────────────┘
```

**Composition rules:**
- Page header always: title + subtitle + right actions
- Filter bar always below header, sticky below `--z-sticky`
- Table fills remaining space, sticky header
- Pagination anchored to bottom of table, not page
- Bulk action bar replaces filter bar when rows selected (slides in)

---

## 2. Detail Page

**Use for:** contact detail, account detail, ticket detail, order detail

```
┌─────────────────────────────────────────────────────────┐
│ Contacts > Acme Corp                                     │  ← breadcrumb
│ Acme Corp                  [Archive]  [Edit]  [+ Task]   │  ← title + status badge + actions
├─────────────────────────────────────────────────────────┤
│ Overview │ Contacts │ Activity │ Documents │ Settings    │  ← tabs
├───────────────────────────────┬─────────────────────────┤
│  MAIN CONTENT                 │  SIDEBAR DETAIL RAIL    │
│  (primary info, main data)    │  Key metrics / info     │
│                               │  Related items          │
│                               │  Quick actions          │
└───────────────────────────────┴─────────────────────────┘
```

**Composition rules:**
- Breadcrumb above title — always
- Status badge inline with title
- Tabs separate content areas (Overview, Activity, etc.)
- Two-column layout: main content (2/3) + detail rail (1/3)
- Detail rail: `bg-surface border-l border-default px-4 py-5`

---

## 3. Form Page

**Use for:** create contact, new deal, edit settings section, configure integration

```
┌─────────────────────────────────────────────────────────┐
│ Contacts > New Contact                                   │  ← breadcrumb
│ New Contact                                              │  ← title
├──────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Basic Information                                    │ │  ← section card
│  │ Fill in the contact's core details.                  │ │
│  │ ─────────────────────────────────────────────────── │ │
│  │ First name *    [ __________________ ]               │ │
│  │ Last name *     [ __________________ ]               │ │
│  │ Email           [ __________________ ]               │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Company Details                                      │ │  ← section card 2
│  └─────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│ [Cancel]                              [Save Contact]      │  ← sticky save bar
└─────────────────────────────────────────────────────────┘
```

**Composition rules:**
- Max content width: `640px` (centered within content area or left-aligned)
- Section cards: `bg-surface border border-default rounded-lg`
- Section header: `px-5 py-4 border-b border-default` — title `text-base font-semibold` + description `text-sm text-secondary`
- Form fields inside: `px-5 py-5 space-y-4`
- Sticky save bar: `fixed bottom-0 left-[256px] right-0 bg-surface border-t border-default px-6 py-3 flex justify-between`
- Auto-save indicator: `text-xs text-secondary` in save bar left

---

## 4. Dashboard Page

**Use for:** main dashboard, analytics, reporting overview, exec summary

```
┌─────────────────────────────────────────────────────────┐
│ Dashboard           [This month ▾]  [Export]             │  ← page header + date range
├─────────────────────────────────────────────────────────┤
│  [MRR: $48K ↑]  [ARR: $580K]  [Churn: 1.2%]  [NPS: 42] │  ← stat cards row
├─────────────────────────────────────────────────────────┤
│  [Revenue Chart (2/3)]  │  [Top Sources (1/3)]           │  ← charts section
├─────────────────────────────────────────────────────────┤
│  Recent Accounts                    [View all →]         │  ← section header
│  [table snippet — 5 rows max]                            │
└─────────────────────────────────────────────────────────┘
```

**Composition rules:**
- Date range selector: prominent in page header, right-aligned
- Stat cards: 4-column grid, `gap-4`
- Charts: 2/3 + 1/3 or 1/2 + 1/2 — never all equal width
- Table snippets: 5 rows max with "View all" link — do not paginate on dashboard
- Section headers: `flex justify-between items-center mb-3` — title + link

---

## 5. Settings Page

**Use for:** account settings, team settings, notifications, billing, integrations

```
┌──────────────────────┬──────────────────────────────────┐
│ SETTINGS NAV         │  Profile                          │
│                      │  Update your name and email.      │
│ Profile              │  ─────────────────────────────── │
│ Security          ▶  │  [form content]                  │
│ Notifications        │                                   │
│ Billing              │  API Keys                         │
│ Integrations         │  ─────────────────────────────── │
│ Team                 │  [form content]                  │
└──────────────────────┴──────────────────────────────────┘
```

**Composition rules:**
- Settings nav: `200px` left sub-nav, `text-sm`, active item with accent color + weight-medium
- Content area: `flex-1 max-w-2xl`
- Each settings section: card with header + content
- Dangerous actions (delete account): separate section at bottom with danger styling

---

## 6. Empty / Onboarding Page

**Use for:** first-run, empty state for a feature, setup completion

```
┌─────────────────────────────────────────────────────────┐
│                   [Step 1/4 progress]                    │
│                                                          │
│                  [geometric illustration]                 │
│                                                          │
│                  Connect your CRM                        │
│           Import your contacts automatically             │
│           from Salesforce, HubSpot, or CSV.              │
│                                                          │
│              [Skip]          [Connect CRM →]             │
└─────────────────────────────────────────────────────────┘
```

**Composition rules:**
- Centered, `max-w-sm` to `max-w-md`
- Progress: `text-xs text-secondary` or step dots above illustration
- Illustration: clean geometric SVG, 120–160px
- Title: `text-xl font-semibold`
- Description: `text-sm text-secondary text-center max-w-xs`
- Actions: ghost (skip) + primary (main action), `gap-3 mt-8`

---

## Responsive rules

| Breakpoint | Behavior |
|-----------|---------|
| `< 640px` | Single column, cards stack |
| `< 768px` | Tables scroll horizontally (NEVER stack into cards) |
| `< 1024px` | Sidebar collapses to hamburger; settings nav becomes tab bar |
| `>= 1024px` | Full app shell with fixed sidebar |

**Critical:** Tables **never** become card lists on mobile. Tabular data stays in a table, always with horizontal scroll. This is non-negotiable in this design system.

**Control heights** are maintained at all breakpoints — touch targets stay at minimum 36px.
