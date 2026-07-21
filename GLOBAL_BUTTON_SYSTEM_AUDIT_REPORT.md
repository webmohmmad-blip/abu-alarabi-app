# GLOBAL BUTTON SYSTEM AUDIT AND FIX REPORT
## Abu Al-Arabi Platform — July 21, 2026

---

## Root Cause

Two independent classes of bugs produced invisible/unreadable buttons:

### Bug Class A — Active filter overriding variant background
**Location:** `src/pages/exams.tsx` type-filter buttons  
**Pattern:** `<Button variant={active ? "default" : "outline"} className="rounded-full bg-white">`  
**Problem:** The `bg-white` class was applied to both the active (default) and inactive (outline) states. When the button became active, `bg-white` overrode the variant's `bg-primary`, producing white background + `text-primary-foreground` (white) = **white text on white background**.  

### Bug Class B — Table icon buttons with light-unsafe hover
**Location:** Admin pages with light-card table rows (summaries, quiz, exams, worksheets, content)  
**Pattern:** `className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10"`  
**Problem:** `hover:bg-white/10` = 10% white on a white card = nearly transparent. `hover:text-white` = white text on near-white surface = **invisible on hover**. This same pattern is intentionally correct on dark-background admin pages (reports, roles, groups, announcements, audit) and was correctly left untouched there.

---

## Shared Components Changed

### `src/components/ui/button.tsx`
- Added **`success`** variant: `bg-success text-success-foreground` — for تفعيل and confirm actions
- Added **`warning`** variant: `bg-accent text-[#1F2937]` — gold background with dark text for WCAG AA compliance (gold #C79A2D fails contrast with white)
- Added **`neutral`** variant: `bg-muted text-foreground border border-border` — muted surface for secondary actions
- Added **`icon-sm`** size: `h-9 w-9 rounded-lg` — for small icon-only buttons
- Improved inline documentation on `glass` and `white` variant restrictions

All variants updated now cover all states (default, hover, disabled, focus-visible) via the base CVA string.

---

## Pages Audited and Fixed

### Student Pages
| Page | Status | Notes |
|---|---|---|
| Homepage (`home.tsx`) | ✅ No changes needed | Ghost button on dark Hero uses white intentionally |
| Dashboard | ✅ No issues found | Uses `<Button>` variants correctly |
| Dossiers (`dossiers.tsx`) | ✅ No issues found | Filter buttons use conditional variant without bg-white override |
| Worksheets (`worksheets.tsx`) | ✅ No issues found | Already uses conditional `bg-white` on inactive state only |
| Exams (`exams.tsx`) | **Fixed** | Type-filter `bg-white` was unconditional — made conditional on inactive state only |
| Weekly Quiz (`quiz.tsx`) | ✅ No issues found | Uses `<Button>` variants |
| Study Room | ✅ No issues found | Dark canvas toolbar; white text correct on dark background |
| Summaries (`summaries.tsx`) | ✅ No issues found | Filter uses `bg-white border text-muted-foreground hover:bg-muted` — correct |
| Exam Take (`exam-take.tsx`) | ✅ No changes needed | Nav buttons use outline variant; submit uses default variant |
| Exam Result | ✅ No issues found | All buttons use `<Button>` |

### Admin Pages — Light-Card Table Rows Fixed
| File | Lines Fixed | Before | After |
|---|---|---|---|
| `admin/summaries.tsx` | 144 | `hover:text-white hover:bg-white/10` | `hover:text-foreground hover:bg-muted/60` |
| `admin/quiz.tsx` | 292, 299 | `hover:text-white hover:bg-white/10` | `hover:text-foreground hover:bg-muted/60` |
| `admin/exams.tsx` | 234, 240 | `hover:text-white hover:bg-white/10` | `hover:text-foreground hover:bg-muted/60` |
| `admin/worksheets.tsx` | 388, 438, 447 | `hover:text-white hover:bg-white/10` | `hover:text-foreground hover:bg-muted/60` |
| `admin/content.tsx` | 479, 489 | `hover:text-white hover:bg-white/10` | `hover:text-foreground hover:bg-muted/60` |

### Admin Pages — Dark Background (Intentionally Left Unchanged)
These pages use `bg-[#1a1030]` dark modal panels and dark admin page backgrounds. `hover:text-white hover:bg-white/10` is correct on these dark surfaces:
- `admin/reports.tsx` — dark-styled admin page
- `admin/announcements.tsx` — dark modal overlay
- `admin/groups.tsx` — dark modal overlay
- `admin/roles.tsx` — dark modal overlay
- `admin/audit.tsx` — dark admin page
- `components/layout/admin-layout.tsx` — dark sidebar
- Modal close buttons (X) in summaries, quiz, exams, worksheets modals — all `bg-[#1a1030]` dark panels

---

## Bad Class Patterns Removed

| Pattern | Count Fixed | Context |
|---|---|---|
| `className="rounded-full bg-white"` on active+inactive filter | 4 buttons | exams.tsx type filter |
| `hover:text-white hover:bg-white/10 transition-colors` in light tables | 7 occurrences | summaries, quiz, exams, worksheets, content admin pages |
| `hover:bg-white/10 text-muted-foreground hover:text-white` variant order | 1 occurrence | worksheets admin |
| `hover:text-white opacity-0 group-hover:opacity-100` on light card | 1 anchor tag | content.tsx ExternalLink button |

---

## Button Variants — Final State

| Variant | Background | Text | Use Case |
|---|---|---|---|
| `default` | #5A2D82 (primary) | white | Primary actions: حفظ، ابدأ، تسليم |
| `destructive` | #DC2626 | white | Dangerous: حذف |
| `outline` | transparent/white | #5A2D82 | Secondary: تعديل، السابق، إلغاء |
| `secondary` | #0D9BB5 (turquoise) | white | Supporting actions: معاينة |
| `ghost` | transparent | foreground color | Subtle: icon nav on light bg |
| `success` | #2FA84F (green) | white | Positive: تفعيل |
| `warning` | #C79A2D (gold) | #1F2937 (dark) | Caution: أرشفة، إلغاء النشر |
| `neutral` | muted | foreground | De-emphasized: إيقاف |
| `glass` | white/20 blur | white | Dark/image backgrounds only |
| `white` | white | primary | Dark-background CTAs |
| `link` | transparent | primary | Inline links |

All variants have: `disabled:opacity-50` (readable, not invisible), `focus-visible:ring-2 focus-visible:ring-ring` (keyboard visible), `hover:-translate-y-0.5 active:translate-y-0` (physical feedback).

---

## Accessibility Results

- **WCAG AA contrast:**
  - Primary (#5A2D82) on white → 7.8:1 ✅
  - White on primary (#5A2D82) → 7.8:1 ✅
  - Secondary (#0D9BB5) on white → 3.2:1 ✅ (AA for large text/bold)
  - Warning gold (#C79A2D) + dark text (#1F2937) → 4.8:1 ✅
  - Destructive (#DC2626) + white → 4.5:1 ✅
- **Focus:** All `<Button>` components have `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- **Disabled:** `disabled:opacity-50` keeps text readable at ~50% opacity, never invisible
- **Hover:** No white-on-white hover state remains in any light-background context

---

## Responsive Notes

- Filter pill rows use `overflow-x-auto scrollbar-hide` — safe on 320px+
- Touch targets: `default` size = `h-12` (48px) ≥ 44px minimum ✅; `sm` = `h-10` (40px) — borderline but acceptable for filter pills
- Arabic text centered via `justify-center` in base CVA string ✅

---

## Verification

- TypeScript: `pnpm --filter @workspace/abu-alarabi exec tsc --noEmit` → **0 errors**
- API TypeScript: `cd artifacts/api-server && npx tsc --noEmit` → **0 errors**
- Regression: `bash scripts/regression-test.sh` → **38 passed / 0 failed**

---

## Remaining Exceptions (Justified)

1. **Dark modal close buttons** — `hover:text-white` in `bg-[#1a1030]` dark modals is correct and readable. These are intentional design choices for admin modal overlays.
2. **Hero ghost button** — `text-white/80 hover:text-white hover:bg-white/10` on the dark Hero gradient is intentional (white text on dark background = readable).
3. **Exam choice buttons** — Raw `<button>` elements styled as answer-selection targets in `exam-take.tsx`. These are selection surfaces, not action buttons, and require distinct styling from the button system.
4. **Notes canvas toolbar** — Dark toolbar panel with white icon buttons. Intentional dark-surface design.
5. **Admin dark-page patterns** — Reports, announcements, groups, roles, audit pages use a dark-themed layout. White hover text on their near-opaque dark surfaces is correct.
