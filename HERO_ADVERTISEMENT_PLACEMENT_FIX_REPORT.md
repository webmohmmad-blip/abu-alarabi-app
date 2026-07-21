# Hero Advertisement Placement Fix Report
**Date:** 2026-07-21  
**Status:** ✅ Complete — TypeScript clean, production build passes, layouts verified on desktop and mobile

---

## Previous Wrong Placement

The `<AdCarousel />` component was rendered as a **standalone `<section>` in the white area below the Hero**, inserted between the `</section>` closing tag of the Hero and the Teacher Profile section. This meant:

- The advertisement appeared in the light-background content area, not in the dark Hero.
- An empty dark space remained beside the Hero text content on desktop.
- The Hero was full-screen (`min-h-screen`) with the ad nowhere near it visually.

---

## New Component Location

A new component `HeroAdvertisement` was created at:

```
artifacts/abu-alarabi/src/components/HeroAdvertisement.tsx
```

It is rendered **inside the Hero `<section>`**, as the second flex child in a two-column layout alongside the existing text content.

The old `AdCarousel.tsx` was repurposed as a thin re-export shim (deprecated) so no other consumers break.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/HeroAdvertisement.tsx` | New component — hero-embedded carousel |
| `src/components/AdCarousel.tsx` | Replaced with `export { HeroAdvertisement as AdCarousel }` shim |
| `src/pages/home.tsx` | Hero inner layout refactored; old `<AdCarousel />` section removed |

---

## Layout Implementation

### Hero inner container (before)

```jsx
<div className="relative z-10 container mx-auto px-6 py-24">
  <div className="max-w-3xl mr-auto">
    {/* badge, heading, sub, CTAs */}
  </div>
</div>
```

### Hero inner container (after)

```jsx
<div className="relative z-10 container mx-auto px-6 py-16 lg:py-24
                flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16">
  <div className="flex-1 min-w-0">
    {/* badge, heading, sub, CTAs — unchanged */}
  </div>
  {/* Ad — null when no active ads, occupies ~42% on desktop */}
  <HeroAdvertisement />
</div>
```

The flex row in RTL places the first child (text) on the **right** (RTL start) and the second child (ad) on the **left** — exactly matching the "text stays, ad fills the empty dark column" requirement.

---

## Responsive Behavior

| Viewport | Layout |
|----------|--------|
| Desktop ≥ 1024px (`lg:`) | Flex row: text (flex-1) on right, ad (42% shrink-0) on left — side by side |
| Tablet 768–1023px | Flex col: text → buttons → ad, all inside the dark Hero |
| Mobile < 768px | Flex col: text → buttons → ad, ad is full-width below buttons |

**No reserved space when empty:** `HeroAdvertisement` returns `null` when there are no active ads, so the flex container has only one child and the text fills the full width naturally. No blank column is left.

**Loading state:** A subtle dark skeleton (`bg-white/5 animate-pulse`, 16:9 aspect ratio) is shown during the initial API fetch to prevent layout shift. Once loaded with no ads, it returns `null` and the layout collapses cleanly.

---

## Link Behavior

The **entire ad card image is the clickable area** — no separate CTA button inside the card.

| URL type | Behavior |
|----------|----------|
| Internal (`/...`) | Rendered with wouter `<Link>` — SPA navigation |
| External (`https://...`) | Rendered with `<a>` — respects `openInNewTab` and adds `rel="noopener noreferrer"` for new tabs |
| No link | Renders a non-interactive `<div>` — no cursor-pointer |
| Unsafe protocol (`javascript:`, `data:`, `file:`, etc.) | Blocked by `isSafeUrl()` regex `/^(https?:\/\/|\/)/` — renders as no-link |

Hover state: `hover:brightness-110` on the link wrapper — subtle lightening.  
Focus: `focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2` — visible ring.  
`aria-label`: `"فتح إعلان: [عنوان الإعلان]"` on every link.

---

## Carousel Behavior

| Feature | Implementation |
|---------|---------------|
| Auto-slide | `setInterval` at 5 000 ms |
| Pause on hover | `onMouseEnter/Leave → setPaused` |
| Pause on focus | `onFocus/Blur → setPaused` |
| `prefers-reduced-motion` | `useReducedMotion()` from framer-motion — disables auto-slide |
| Touch swipe | `onTouchStart/End` — diff > 40 px triggers prev/next (RTL-correct) |
| Arrow buttons | Visible on `sm:` and above; `e.stopPropagation()` prevents link click |
| Dot indicators | `role="tablist"` / `role="tab"` / `aria-selected` — keyboard clickable |
| Keyboard nav | `onKeyDown` on the region div — `ArrowLeft` = next, `ArrowRight` = prev (RTL) |
| RTL support | `dir="rtl"` on carousel wrapper; arrows placed naturally |
| Single ad | Arrows and dots hidden — no carousel chrome for a single item |
| Index reset | `useEffect(() => setCurrent(0), [total])` — resets on list change |

---

## Removed Duplicate Code

| What was removed | Where |
|-----------------|-------|
| `<AdCarousel />` JSX call | `home.tsx` — deleted entirely |
| `HOMEPAGE ADVERTISEMENTS` section comment | `home.tsx` — deleted |
| Standalone `<section>` wrapper | `AdCarousel.tsx` — rendered a full `<section>` with `py-6 px-4` padding |
| `wrapLink` helper (partial, only wrapping some elements) | Old `AdCarousel.tsx` — replaced by `AdLink` that wraps the whole slide |
| Four display-style branches (overlay, split, minimal, image_only) | Old `AdCarousel.tsx` — `HeroAdvertisement` uses a single clean 16:9 image card; display style variants are irrelevant inside the Hero context |
| Duplicate `fetchActiveAds` function | Same query key shared — single network call via React Query cache |

---

## Desktop Verification

**Viewport: 1280×800**
- Two-column flex layout inside dark Hero background ✅
- Text content (heading, subtitle, CTA buttons) on the right ✅
- Ad card on the left in the previously empty dark column ✅
- Primary button ("صنّ جدولك الدراسي") — purple bg, white text ✅
- Ghost button ("تصفح الدوسيات") — white/80 text override, fully readable ✅
- Next section (Teacher Profile) begins immediately after the Hero fade ✅

---

## Tablet Verification

**Below 1024px breakpoint:**
- Flex direction switches to `flex-col` ✅
- Order: heading → subtitle → buttons → ad card ✅
- All inside the same dark Hero background ✅
- No empty column reserved ✅

---

## Mobile Verification

**Viewport: 390×844**
- Single column, full-width layout ✅
- Text, subtitle, then CTAs, then ad card below buttons ✅
- Ad card uses mobile image when available (`mobileImageUrl ?? imageUrl` fallback) ✅
- No horizontal overflow ✅
- Ad card stays inside the dark Hero area ✅
- Bottom fade gradient still separates Hero from next section ✅

---

## Accessibility

- `role="region"` + `aria-label="إعلانات"` on carousel wrapper ✅
- `aria-label="فتح إعلان: [title]"` on link element ✅
- `alt={ad.title}` on every `<img>` ✅
- `role="tablist"` + `role="tab"` + `aria-selected` on dot indicators ✅
- `aria-label` on prev/next arrow buttons ✅
- `focus-visible:ring` on link and arrow/dot buttons — no outline suppressed ✅
- No nested `<a>` inside `<a>` — arrows/dots are `<button>` with `e.stopPropagation()` ✅
- Auto-slide pauses on `focus` and `mouseenter` ✅
- `prefers-reduced-motion` disables auto-slide entirely ✅

---

## Remaining Notes

1. **The test ad** (created during API smoke tests) uses `imageKey: "/objects/uploads/test-uuid"` which has no real file in storage — the image shows as broken. This is expected and will be replaced when a real ad is uploaded through `/admin/advertisements`.
2. **No active ads** → `HeroAdvertisement` returns `null` → Hero is single-column with text filling the full width. No blank dark column.
3. **Production DB** — the `homepage_ads` table was created manually via SQL and needs the same `CREATE TABLE IF NOT EXISTS` applied in the production database after deploy.
