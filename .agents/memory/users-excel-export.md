---
name: Users Excel Export
description: Excel export endpoint for admin users page — routing gotcha and phone formatting
---

## Rule
Register the export router (`/admin`, route `/users/export`) BEFORE the main admin router in `routes/index.ts`, or Express will catch `/users/export` as `/users/:id` with `:id="export"` → `parseInt` → `NaN` → 500.

**Why:** adminRouter has a `GET /users/:id` catch-all. Any sub-path like `/users/export` must be declared in a router mounted first.

**How to apply:** Any new `/admin/users/<named-subpath>` route should be in its own file registered before `router.use("/admin", adminRouter)`.

## Phone number formatting
Excel auto-converts numeric strings to scientific notation (e.g. `0792535437` → `7.92535E+8`).
Fix: `cell.numFmt = "@"` and assign value as `String(phone)`. Do not omit either step.

## Aggregate counts (no N+1)
Use a single SQL with `COUNT(DISTINCT CASE WHEN e.type != 'weekly' THEN ea.id END)` grouped by userId, load into a Map, join in memory. 2 DB queries total regardless of user count.

## Library
ExcelJS — `workbook.xlsx.write(res)` streams directly to the response, no temp files. Supports RTL worksheet direction via `views: [{ rightToLeft: true }]`.
