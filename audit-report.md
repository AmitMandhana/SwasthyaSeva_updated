# SwasthyaSeva UI Audit Report

**Date**: 2026-04-11
**Tool**: Impeccable Design Audit
**Scope**: Shared component library + all 4 apps (web, admin, doctor, clinic)

---

## Audit Health Scores

| Area | A11y | Perf | Theming | Responsive | Anti-Patterns | Total |
|------|:----:|:----:|:-------:|:----------:|:------------:|:-----:|
| Shared UI (`packages/ui/`) | 1.5 | 3 | 2 | 2.5 | 2.5 | **11.5/20** |
| Web App | 1 | 3 | 1 | 2 | 2 | **9/20** |
| Admin App | 2 | 3 | 3 | 2 | 3 | **13/20** |
| Doctor App | 1 | 2 | 2 | 2 | 2 | **9/20** |
| Clinic App | 2 | 3 | 3 | 2 | 3 | **13/20** |
| **Weighted Avg** | **1.5** | **2.8** | **2.2** | **2.1** | **2.5** | **~11/20** |

**Rating: Acceptable (10-13) -- significant work needed.**

Admin and clinic are the most mature. Web and doctor apps have the worst scores. Theming and accessibility are the weakest dimensions across the board.

---

## Anti-Patterns Verdict

**Does this look AI-generated?** Partially. The codebase avoids the worst AI slop tells (no gradient text, no side-stripe borders, no bounce easing) but has these recognizable patterns:
- Generic `sans-serif` font stack -- no distinctive typography
- `shadow-md` on every card, creating the "rounded cards with shadows everywhere" look
- `backdrop-blur-sm` glassmorphism in Toast and doctor modals
- Landing page hero with gradient and centered everything
- Hard-coded gray palette in web app screams "default Tailwind"

---

## P0 -- Critical (Fix Immediately)

### 1. Undefined CSS tokens render text invisible (29 occurrences across all apps)
- `text-primary-foreground` (14x) -- should be `text-primary-alt`
- `text-muted-foreground` (15x) -- should be `text-muted-alt`
- In Tailwind v4, these resolve to transparent -- **hiding CTA button text and labels**
- **Files**: `web/page.tsx`, `web/slot-search/page.tsx`, `web/dashboard/page.tsx`, `web/dashboard/profile/page.tsx`, `doctor/DoctorInterfacePage.tsx`, `doctor/AppointmentQueue.tsx`, `doctor/AppointmentList.tsx`, `doctor/LabTests.tsx`, `clinic/AppointmentTab.tsx`, `clinic/BookAppointmentModal.tsx`, `clinic/AnalyticsTab.tsx`, `clinic/LeadTab.tsx`, `admin/SlotTab.tsx`, `packages/ui/TabPillMultiSelect.tsx`, `packages/ui/FilterSearchBar.tsx`
- **Suggested command**: `/colorize` (token correction)

### 2. Modal has no ARIA dialog role or focus trap
- `packages/ui/Modal.tsx` -- missing `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap
- Affects every modal across all 4 apps
- **Suggested command**: `/audit` follow-up

### 3. Default theme is light, contradicting "dark mode primary" brand directive
- `packages/ui/themes.ts` line 8 -- `defaultTheme: 'light'`
- Should be `'dark'` or `'system'`
- **Suggested command**: `/colorize`

### 4. Doctor app missing `<ToastProvider>` -- forced to use `alert()`/`confirm()`
- `apps/doctor/app/layout.tsx` -- only app without ToastProvider
- 9 uses of `alert()`/`confirm()` in the doctor's primary workflow
- **Suggested command**: `/clarify`

### 5. Broken `text-info`/`bg-info` tokens in FilterSearchBar
- `packages/ui/FilterSearchBar.tsx` -- `--info` token doesn't exist in `tokens.css`
- Cyan chip styling is invisible/broken
- **Suggested command**: `/colorize`

---

## P1 -- Major (Fix Before Release)

### 6. Web app login page bypasses entire token system
- `apps/web/app/login/page.tsx` -- 12 unique hard-coded color references
- Only login page that doesn't use design tokens (admin/doctor/clinic all do)
- **Suggested command**: `/colorize`

### 7. Web prescription page: 44 hard-coded color references
- `apps/web/app/dashboard/prescriptions/[id]/page.tsx` -- worst offender
- Full rewrite to design tokens needed
- **Suggested command**: `/colorize`

### 8. Web dashboard layout bypasses tokens
- `apps/web/app/dashboard/layout.tsx` -- `bg-gray-50 dark:bg-gray-900` pattern throughout
- **Suggested command**: `/colorize`

### 9. No focus-visible indicators on any interactive element
- `packages/ui/Button.tsx`, `ConfirmModal.tsx` -- zero `focus-visible:` usage across the component library
- Keyboard users cannot see what's focused
- **Suggested command**: `/audit`

### 10. SelectField and TagMultiSelect missing ARIA combobox pattern
- `packages/ui/SelectField.tsx` -- no `role="combobox"`, `aria-expanded`, `aria-haspopup`
- `packages/ui/TagMultiSelect.tsx` -- zero ARIA attributes
- **Suggested command**: `/audit`

### 11. Tab interfaces lack ARIA roles (admin + clinic)
- Admin: 6 tabs, Clinic: 7 tabs -- no `role="tablist"`, `role="tab"`, `aria-selected`
- **Suggested command**: `/audit`

### 12. Shared STATUS_COLORS anti-pattern (web + doctor)
- 3 components independently define hard-coded status color maps
- Light-mode-only colors break in dark mode
- Clinic solved this correctly with `<Badge>` component
- **Suggested command**: `/colorize`

### 13. Toast glassmorphism
- `packages/ui/Toast.tsx` -- `backdrop-blur-sm` contradicts design spec
- **Suggested command**: `/quieter`

### 14. Hard-coded colors in shared components (11 instances)
- `bg-white`, `bg-black/60`, `text-white`, `#8b5cf6`, `stroke="white"` across ToggleSwitch, ImageUpload, Modal, Navbar, FilterSearchBar, TagMultiSelect
- **Suggested command**: `/colorize`

### 15. Card collapse uses max-height animation (layout thrashing)
- `packages/ui/Card.tsx` -- `transition-all` on `max-h-0` triggers layout recalculation per frame
- **Suggested command**: `/animate`

### 16. Charts completely inaccessible (clinic)
- `apps/clinic/app/dashboard/components/AnalyticsTab.tsx` -- SVG charts with no text alternatives
- **Suggested command**: `/audit`

### 17. Slot search page not mobile-friendly
- `apps/web/app/slot-search/page.tsx` -- 3-column layout, 4-item filter bar, no mobile adaptation
- **Suggested command**: `/adapt`

---

## P2 -- Minor (Next Pass)

| # | Issue | Location | Command |
|---|-------|----------|---------|
| 18 | TextField/TextAreaField no `id`/`htmlFor` label association | `packages/ui/TextField.tsx`, `TextAreaField.tsx` | `/audit` |
| 19 | DataTable action buttons no row-context `aria-label` | `packages/ui/DataTable.tsx` | `/audit` |
| 20 | Modal close button no `aria-label` | `packages/ui/Modal.tsx` | `/audit` |
| 21 | Navbar sidebar no focus management, fixed `w-72` | `packages/ui/Navbar.tsx` | `/adapt` |
| 22 | Generic `sans-serif` font stack | `packages/theme/tokens.css` | `/typeset` |
| 23 | `shadow-md` on every Card by default | `packages/ui/Card.tsx` | `/quieter` |
| 24 | Hard-coded overlay colors (`bg-black/50`) | Modal, Navbar | `/colorize` |
| 25 | Small touch targets: Checkbox 16px, ToggleSwitch 20px, TabPills 24px | `packages/ui/` | `/adapt` |
| 26 | Admin/Clinic tab bars overflow on narrow screens | Both `ClientDashboard.tsx` | `/adapt` |
| 27 | Clinic analytics grid no mobile breakpoints | `AnalyticsTab.tsx` | `/adapt` |
| 28 | Web metadata still "Create Next App" | `apps/web/app/layout.tsx` | `/clarify` |
| 29 | Doctor cards use shadow-md inconsistent with admin/clinic | Doctor dashboard components | `/quieter` |
| 30 | Hard-coded status colors in doctor app | `AppointmentQueue.tsx`, `AppointmentList.tsx` | `/colorize` |
| 31 | Duplicate `:root` and `[data-theme="light"]` token blocks | `packages/theme/tokens.css` | `/distill` |

---

## P3 -- Polish (If Time Permits)

| # | Issue | Location |
|---|-------|----------|
| 32 | Button has redundant inline styles overriding className | `packages/ui/Button.tsx` |
| 33 | `disableTransitionOnChange={false}` causes flash on theme switch | `packages/ui/ThemeProvider.tsx` |
| 34 | Card/CollapsibleSection missing `aria-expanded` | `packages/ui/Card.tsx`, `CollapsibleSection.tsx` |
| 35 | Toast module-level mutable counter (SSR risk) | `packages/ui/Toast.tsx` |
| 36 | AuthProvider polls with setInterval instead of setTimeout to expiry | `packages/ui/AuthProvider.tsx` |
| 37 | Font setup disconnected -- web imports Geist but tokens say `sans-serif` | `web/layout.tsx` vs `tokens.css` |

---

## Systemic Patterns

1. **Token name confusion**: 29 references use `*-foreground` suffix instead of `*-alt`. This is the single highest-impact bug -- a global find-replace fixes it.

2. **Web app theming divergence**: 107 hard-coded Tailwind color classes in the web app alone. Login, dashboard, and prescription pages completely bypass the design system.

3. **No focus-visible anywhere**: Zero components use `focus-visible:` -- keyboard users are blind.

4. **Shadow overuse**: Every `Card` gets `shadow-md` by default, creating the generic "cards with shadows" look the design spec rejects.

5. **No ARIA on complex widgets**: Tabs, comboboxes, multi-selects, and modals all lack required ARIA patterns.

---

## Positive Findings

- Token system architecture is solid -- semantic tokens via `@theme` directive
- Admin and clinic apps are well-structured with excellent token usage
- Keyboard navigation in SelectField (arrow keys, Enter, Escape)
- Portal-based dropdowns prevent overflow clipping
- ToggleSwitch has correct `role="switch"` + `aria-checked`
- Escape key handling in modals and dropdowns
- Good lazy loading in web app (dynamic imports for map/location)
- Clinic analytics charts use CSS variables for theming
- Print stylesheet support on prescription page

---

## Recommended Action Plan

Run these Impeccable commands in order:

1. **`/colorize`** -- Fix all broken tokens, replace 107+ hard-coded colors across web app, standardize token usage (P0+P1, highest impact)
2. **`/clarify`** -- Add ToastProvider to doctor app, replace alert/confirm, fix metadata (P0+P1)
3. **`/audit`** -- Fix ARIA: modal dialog role, focus trap, combobox patterns, tab roles, focus-visible indicators (P0+P1)
4. **`/adapt`** -- Fix responsive: mobile slot search, tab overflow, touch targets, navbar sidebar (P1+P2)
5. **`/typeset`** -- Choose distinctive font stack, fix type hierarchy (P2)
6. **`/quieter`** -- Remove shadows from cards, remove glassmorphism from toast, reduce visual noise (P2)
7. **`/animate`** -- Fix card collapse animation to use grid-template-rows instead of max-height (P1)
8. **`/distill`** -- Clean up duplicate token blocks, redundant styles (P2+P3)
9. **`/polish`** -- Final pass for consistency and refinement

> You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `/audit` after fixes to see your score improve.
