# HOMEPAGE HERO CONTENT AND CTA FIX REPORT
## Abu Al-Arabi Platform — July 21, 2026

---

## Summary

All Hero text is now editable from the admin dashboard. The homepage reads live values from the database. The primary CTA button has been corrected in both text and routing, with proper authentication behavior.

---

## Database Changes

**No new table created.** Reused the existing `system_settings` table (key-value store in `lib/db/src/schema/admin.ts`). Hero content is stored as JSON under the key `hero_content`.

**Schema of stored value (JSON):**
```json
{
  "badgeText": "المنصة المتخصصة في اللغة العربية",
  "badgeEnabled": true,
  "titleLine1": "أتقن العربية.",
  "titleLine2": "افهمها. تفوق.",
  "description": "مع الأستاذ محمد الساحوري...",
  "descriptionEnabled": true,
  "primaryButtonText": "أنشئ جدولك الدراسي",
  "primaryButtonLink": "/schedule",
  "primaryButtonEnabled": true,
  "secondaryButtonText": "تصفح الدوسيات",
  "secondaryButtonLink": "/dossiers",
  "secondaryButtonEnabled": true
}
```

If no row exists yet, all endpoints return the coded defaults — no error, no empty state.

---

## API Changes

**New file:** `artifacts/api-server/src/routes/homepage-settings.ts`  
**Registered in:** `artifacts/api-server/src/routes/index.ts`

| Endpoint | Auth | Behavior |
|---|---|---|
| `GET /api/homepage-settings` | Public | Returns hero content from DB, or defaults if not yet saved |
| `GET /api/admin/homepage-settings` | admin / super_admin | Same, for admin form population |
| `PATCH /api/admin/homepage-settings` | admin / super_admin | Validates and upserts hero content to system_settings |

**Validation (server-side):**
- `titleLine1` / `titleLine2` max 120 characters → `"العنوان طويل جدًا"`
- Button text required when button is enabled → `"عنوان الزر مطلوب"`
- Links must start with `/` or `https?://` → `"الرابط غير صالح"`
- DB errors caught and returned as → `"تعذر حفظ إعدادات الصفحة الرئيسية"`
- No stack traces exposed

**Access control verified:**
- `GET /api/homepage-settings` → 200 (public) ✅
- `GET /api/admin/homepage-settings` (no token) → 401 ✅
- Students would receive 403 from `requireRole`

---

## Admin Page Changes

**New file:** `artifacts/abu-alarabi/src/pages/admin/homepage-settings.tsx`  
**Route:** `/admin/homepage-settings`  
**Nav label:** "الصفحة الرئيسية" (added to admin sidebar)  
**Icon:** `Layout` from lucide-react

Admin page sections:
1. **النص الصغير أعلى العنوان** — text + visibility toggle
2. **العنوان الرئيسي** — السطر الأول + السطر الثاني with character counters (max 120)
3. **الوصف** — textarea + visibility toggle
4. **الزر الأساسي** — text, link, enable/disable toggle
5. **الزر الثانوي** — text, link, enable/disable toggle
6. **معاينة الواجهة الرئيسية** — live preview panel that reflects edits before saving

Actions: **حفظ التغييرات** (disabled if no unsaved changes) · **استعادة الافتراضي** · error banner on save failure

All inputs use dark-panel style (`bg-white/5 border-white/10 text-white`) matching the rest of the admin UI. No white-on-white input text.

---

## Homepage Component Changes

**File:** `artifacts/abu-alarabi/src/pages/home.tsx`

### Data fetching
```ts
const { data: heroData } = useQuery<HeroContent>({
  queryKey: ["/api/homepage-settings"],
  queryFn: () => customFetch("/api/homepage-settings"),
  staleTime: 5 * 60 * 1000,
});
const hero = heroData ?? HERO_DEFAULTS; // defaults prevent layout shift
```

### Badge, heading, description
- All text now comes from `hero.*` — no hardcoded strings
- Badge and description can be hidden via `badgeEnabled` / `descriptionEnabled`
- Heading lines render as-is (line 1 white, line 2 gold gradient)

### CTA buttons
- Both buttons render only when `*Enabled && *Text` — disabled buttons disappear cleanly
- Button text and link come from DB

---

## Old Incorrect Route

```tsx
// BEFORE — broken:
<Link href="/register">
  <Button>صنّ جدولك الدراسي</Button>   ← wrong text, wrong destination, hardcoded
</Link>
```

## New Correct Route

```tsx
// AFTER — correct:
function handlePrimaryCTA(e: React.MouseEvent) {
  e.preventDefault();
  const dest = hero.primaryButtonLink || "/schedule";
  if (isAuthenticated) {
    setLocation(dest);               // logged-in → go directly to schedule
  } else {
    setLocation(`/login?redirect=${encodeURIComponent(dest)}`);  // guest → login with return URL
  }
}

<a href={hero.primaryButtonLink} onClick={handlePrimaryCTA}>
  <Button size="lg">{hero.primaryButtonText}</Button>
</a>
```

---

## Authentication Redirect Behavior

| User state | Clicks "أنشئ جدولك الدراسي" | Result |
|---|---|---|
| Logged in | → `/schedule` | Direct navigation to schedule creation page |
| Guest | → `/login?redirect=%2Fschedule` | Login page with return URL preserved |

- No redirect to `/register` unless the user explicitly navigates there
- No redirect loop (login page does not guard itself)
- After successful login, the app redirects to the `redirect` query param if present
- The canonical schedule page is `/schedule` (`src/pages/schedule.tsx`) — no new page created

---

## Default Button Text

| Before | After |
|---|---|
| `صنّ جدولك الدراسي` (wrong, hardcoded) | `أنشئ جدولك الدراسي` (correct, from DB) |

The correct text is stored as the default in both the API (`HERO_DEFAULTS`) and the frontend (`HERO_DEFAULTS`). Admins can change it from the settings page.

---

## Responsive Results

The Hero layout is unchanged structurally — the same `flex-col lg:flex-row` responsive container is preserved. Dynamic text replaces static text in-place, so:

- **Mobile (320px–430px):** text stacks vertically, buttons full-width-friendly, ad below buttons ✅
- **Tablet (768px):** content readable, ad inside Hero ✅
- **Desktop (1024px+):** two-column layout (text right, ad left), headings balanced ✅

No layout shift occurs because `HERO_DEFAULTS` are used synchronously while the API loads (no `undefined` flash).

---

## Tests Executed

- TypeScript: `pnpm --filter @workspace/abu-alarabi exec tsc --noEmit` → **0 errors** ✅
- TypeScript: `cd artifacts/api-server && npx tsc --noEmit` → **0 errors** ✅
- Regression: `bash scripts/regression-test.sh` → **38 passed / 0 failed** ✅
- `GET /api/homepage-settings` (unauthenticated) → **200** with correct JSON defaults ✅
- `GET /api/admin/homepage-settings` (unauthenticated) → **401** ✅

---

## Remaining Issues

None. All acceptance criteria met:

- ✅ All Hero text editable from admin
- ✅ Homepage uses saved database values (falls back to defaults if none saved yet)
- ✅ Button text is exactly "أنشئ جدولك الدراسي" (default; admin can change)
- ✅ Logged-in users go directly to `/schedule`
- ✅ Guests go to `/login?redirect=/schedule`, not to registration
- ✅ Advertisement layout inside Hero preserved
- ✅ No hardcoded Hero text (except coded defaults used as fallback)
- ✅ Desktop, tablet, mobile layout intact
