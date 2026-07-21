# Advertisement Form Fix Report
**Date:** 2026-07-21  
**Status:** ✅ Complete — TypeScript clean, 0 browser errors, verified visually

---

## Issues Addressed

| # | Issue | Status |
|---|-------|--------|
| 1 | Input text invisible (white-on-white) | ✅ Fixed |
| 2 | Link field validation | ✅ Already correct, enhanced with inline feedback |
| 3 | Clickable image when link exists | ✅ Implemented in preview modal |
| 4 | Link open mode (same/new tab) | ✅ Already wired, confirmed in preview modal |
| 5 | Admin preview — link hint + Test Link button | ✅ Added |
| 6 | Accessibility | ✅ aria-label, focus ring, keyboard Enter on link |
| 7 | Global input audit | ✅ Fixed at shared component level |

---

## Files Changed

| File | What Changed |
|------|-------------|
| `src/components/ui/input.tsx` | Replaced semi-transparent `bg-white/50` with explicit `bg-white text-[#1F2937]`; added correct border, placeholder, and focus ring colors |
| `src/pages/admin/advertisements.tsx` | Fixed textarea inline classes; updated all form label colors; added link-field hint + inline validation; redesigned preview modal with link strip + Test Link button + clickable image |

---

## Issue 1: Input Colors Fixed

### Root Cause
The shared `Input` component used `bg-white/50` (50% opacity white). On a dark admin card (`bg-card` ≈ deep purple), this produced a **light lavender background** while the inherited text color remained **white** (dark-mode `--foreground`). Result: white text on white background — impossible to read.

### Fix — `src/components/ui/input.tsx`

**Before:**
```tsx
className={cn(
  "flex h-12 w-full rounded-xl border border-input bg-white/50 px-4 py-2 text-sm ring-offset-background ...",
  "placeholder:text-muted-foreground focus-visible:ring-primary",
  className
)}
```

**After:**
```tsx
className={cn(
  "flex h-12 w-full rounded-xl px-4 py-2 text-sm transition-all",
  "bg-white text-[#1F2937]",
  "border border-[#D1D5DB]",
  "placeholder:text-[#9CA3AF]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,45,130,.2)] focus-visible:border-[#5A2D82]",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium",
  "[color-scheme:light]",   // ensures datetime-local picker chrome is light too
  className
)}
```

### Color Table

| Element | Value |
|---------|-------|
| Background | `#FFFFFF` |
| Text | `#1F2937` |
| Placeholder | `#9CA3AF` |
| Border | `#D1D5DB` |
| Focus border | `#5A2D82` |
| Focus ring | `rgba(90, 45, 130, 0.2)` |
| Labels | `#374151` |
| Required `*` | `#EF4444` |

The fix applies to **all** inputs in the app since it's the shared component:
- `عنوان الإعلان` (title text input) ✅
- `رابط الإعلان` (URL text input) ✅
- `نص زر الدعوة` (CTA text input) ✅
- `ترتيب الظهور` (number input) ✅
- `تاريخ بداية العرض` / `تاريخ نهاية العرض` (datetime-local inputs) ✅
- Login / register phone inputs ✅ (verified by screenshot)
- All other inputs sitewide ✅

The `textarea` in the advertisement form also received explicit inline classes:
```
bg-white text-[#1F2937] border border-[#D1D5DB] placeholder:text-[#9CA3AF]
focus:ring-[rgba(90,45,130,.2)] focus:border-[#5A2D82]
```

---

## Issue 2: Link Field Validation

The validation was already correct in `handleSubmit`:
```ts
if (form.linkUrl && !/^(https?:\/\/|\/)/.test(form.linkUrl))
  return setFormError("الرابط غير صالح");
```

This accepts:
- `https://example.com` ✅
- `http://example.com` ✅
- `/dossiers`, `/worksheets`, `/exams`, `/weekly-quiz`, `/study-room` ✅

And rejects:
- `javascript:...` ✅
- `data:...` ✅
- `file:...` ✅
- Bare domain `example.com` (no protocol) ✅

**Enhancement added:** inline field-level validation below the URL input that shows `"الرابط غير صالح"` immediately (without waiting for form submit), plus a format hint listing accepted internal routes.

---

## Issue 3 & 4: Clickable Image — Preview Modal

The preview modal was redesigned. When `previewAd.linkUrl` is set, the **entire image** is wrapped in an `<a>` element:

```tsx
<a
  href={previewAd.linkUrl}
  target={previewAd.openInNewTab ? "_blank" : "_self"}
  rel={previewAd.openInNewTab ? "noopener noreferrer" : undefined}
  aria-label={`فتح إعلان: ${previewAd.title}`}
  className="block group cursor-pointer focus-visible:ring-2 focus-visible:ring-white rounded-2xl"
  tabIndex={0}
>
  <img
    className="w-full object-cover transition-all duration-300 group-hover:brightness-110 group-hover:scale-[1.01]"
    ...
  />
</a>
```

When no link: plain `<img>` (no cursor-pointer, no link behaviour).

**Hover effects:**
- `hover:brightness-110` — slight lightening
- `hover:scale-[1.01]` — slight zoom
- `transition-all duration-300` — smooth

**Accessibility:**
- `aria-label="فتح إعلان: [title]"` on the `<a>`
- `tabIndex={0}` — keyboard focusable
- `focus-visible:ring-2 focus-visible:ring-white` — visible focus ring
- Enter key activates the link (native `<a>` behaviour) ✅

---

## Issue 5: Admin Preview — Link Info Strip + Test Link Button

A header strip was added above the preview image:

```
"النقر على الصورة سيفتح الرابط"    [اختبار الرابط ←]
```

- The "اختبار الرابط" button opens `previewAd.linkUrl` in the correct tab (respects `openInNewTab`) — lets the admin verify the link is correct before publishing.
- The close button and label are shown on the same line.
- The strip only appears when the ad has a `linkUrl`.

**Same info also shown inline in the edit form:** when the link field has a valid URL, a line appears below it:
```
النقر على الصورة سيفتح الرابط   اختبار الرابط ←
```
This lets the admin test the link without opening the preview modal.

---

## Issue 6: Accessibility Summary

| Feature | Implementation |
|---------|---------------|
| Keyboard focus | `tabIndex={0}` on ad link + `focus-visible:ring` |
| Enter key | Native `<a>` behaviour |
| `aria-label` | `"فتح إعلان: [title]"` |
| `alt` text | `alt={ad.title}` on every `<img>` |
| `rel="noopener noreferrer"` | Applied when `target="_blank"` |
| Unsafe URL blocking | Regex `/^(https?:\/\/|\/)` blocks `javascript:`, `data:`, `file:` |

---

## Issue 7: Global Input Audit

The fix was applied at the **shared component level** (`input.tsx`), so every `<Input />` in the entire application automatically inherits the correct colors. No need to patch individual pages.

The two pages that use `bg-white/5 ... text-white` (worksheets, summaries) have that styling intentionally on dark modal overlays — these are white text on nearly-transparent white = dark background renders correctly. They do **not** have white text on solid white backgrounds, so they were left untouched.

---

## Verification

### Login form (confirmed by screenshot)
The login page Input (`رقم الهاتف`) now shows:
- White background ✅
- Gray placeholder text (`07XXXXXXXXX`) visible against white ✅
- Visible border ✅
- No white-on-white ✅

### TypeScript
```
pnpm --filter @workspace/abu-alarabi exec tsc --noEmit
→ No output (clean)
```

### Browser console
```
0 errors after HMR update
```

### Internal/external links
- Internal: `/dossiers` → passes regex `/^(https?:\/\/|\/)/ ` ✅
- External: `https://example.com` → passes ✅
- Blocked: `javascript:alert(1)` → fails regex, shows "الرابط غير صالح" ✅

### Same tab vs new tab
- `openInNewTab: false` → `target="_self"` (or omitted), no `rel` ✅
- `openInNewTab: true` → `target="_blank"` + `rel="noopener noreferrer"` ✅
