# Layout Audit Report

**Date**: 2026-06-03  
**Scope**: All 4 frontend apps (web, admin, doctor, clinic)  
**Focus**: Navbar/header layout misplacements, inconsistencies, and redundancies

---

## Executive Summary

The shared `Navbar` component (`packages/ui/Navbar.tsx`) provides a standardized sticky top bar with app name, route-based nav items, theme toggle, mobile hamburger menu, and a `userMenu` slot. Currently only the **doctor app** uses it correctly. The other 3 apps have layout issues ranging from unused props to completely bypassing the shared component.

---

## Per-App Findings

### 1. Web App (Patient) — port 3000

| Issue | Severity | File |
|-------|----------|------|
| User controls in page body instead of navbar | **High** | `apps/web/app/dashboard/layout.tsx` |
| Redundant "Dashboard" heading | Medium | `apps/web/app/dashboard/layout.tsx` |
| Navbar `userMenu` prop unused | Medium | `apps/web/app/ClientLayout.tsx` |

**Details:**

`ClientLayout.tsx` renders the shared Navbar but never passes `userMenu`:
```tsx
<Navbar
  appName="SwasthyaSeva"
  navItems={NAV_ITEMS}
  currentPath={pathname}
  onNavigate={(path) => router.push(path)}
  // userMenu is NOT passed
/>
```

Instead, `dashboard/layout.tsx` renders user controls (name, profile link, logout) inside the page content area alongside a redundant "Dashboard" h1:
```tsx
<div className="flex items-center justify-between mb-6">
  <h1 className="text-xl font-bold">Dashboard</h1>
  <div className="flex items-center gap-3">
    {name && <span>{name}</span>}
    <Link href="/dashboard/profile">...</Link>  {/* Profile icon */}
    <button onClick={handleLogout}>...</button>   {/* Logout icon */}
  </div>
</div>
```

**Result**: The navbar has wasted space on the right (only theme toggle), while the content area has a full-width bar just for the heading and user controls. On mobile, the username is hidden but the profile/logout icons still sit in the content area instead of the hamburger menu.

---

### 2. Admin App — port 3001

| Issue | Severity | File |
|-------|----------|------|
| Does not use shared Navbar component | **High** | `apps/admin/app/dashboard/ClientDashboard.tsx` |
| Duplicate theme toggle implementation | Medium | same |
| No mobile hamburger menu | Medium | same |
| `mounted` hydration guard duplicated | Low | same |

**Details:**

`ClientDashboard.tsx` builds a completely custom header:
```tsx
<header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
  <div className="flex items-center justify-between px-6 h-14">
    <span className="text-lg font-bold text-primary">SwasthyaSeva Admin</span>
    <div className="flex items-center gap-3">
      <button onClick={toggleTheme}>...</button>  {/* Manual theme toggle */}
      <span>{user?.username}</span>
      <button onClick={logout}>Logout</button>
    </div>
  </div>
  {/* Tab navigation below */}
  <div className="flex gap-0 overflow-x-auto">
    {tabs.map(...)}
  </div>
</header>
```

This duplicates Navbar's app name, theme toggle (with its own hydration guard via `mounted` state), and user display. The tab strip below is fine — it's local-state navigation, not route-based — but the top row should use the shared Navbar.

**Additional**: The `SessionBar` (token-expiry progress bar) is in the root layout (`app/layout.tsx`). It renders above even the login page, but functionally returns `null` when there's no token, so this is acceptable.

---

### 3. Clinic App — port 3003

| Issue | Severity | File |
|-------|----------|------|
| Does not use shared Navbar component | **High** | `apps/clinic/app/dashboard/ClientDashboard.tsx` |
| Near-identical copy of admin's custom header | **High** | same |
| Duplicate theme toggle implementation | Medium | same |
| No mobile hamburger menu | Medium | same |

**Details:**

`ClientDashboard.tsx` is a near-copy of admin's, with clinic-specific tabs and a role badge:
```tsx
<header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
  <div className="flex items-center justify-between px-6 h-14">
    <span className="text-lg font-bold text-primary">SwasthyaSeva Clinic</span>
    <div className="flex items-center gap-2 sm:gap-3">
      <button onClick={toggleTheme}>...</button>
      <span data-testid="header-username">{user?.username}</span>
      <span data-testid="header-role-badge">...</span>
      <button onClick={logout}>Logout</button>
    </div>
  </div>
  {/* Tab navigation */}
</header>
```

Same issues as admin: custom header bypasses shared Navbar, duplicates theme toggle, no mobile hamburger menu. The `header-username` and `header-role-badge` data-testids are used in E2E tests and must be preserved.

---

### 4. Doctor App — port 3002 (Gold Standard)

| Issue | Severity | File |
|-------|----------|------|
| No major issues | — | `apps/doctor/app/dashboard/DashboardClient.tsx` |

**Details:**

Uses the shared Navbar correctly:
```tsx
<Navbar
  appName="SwasthyaSeva Doctor"
  navItems={NAV_ITEMS}
  currentPath={pathname}
  onNavigate={(path) => router.push(path)}
  userMenu={userMenu}  // ← Properly passed
/>
```

The `userMenu` includes "Dr. {name}" display and a Logout button. Route-based navigation with 4 items (Dashboard, Appointments, Patients, Profile). This is the pattern all apps should follow.

---

## Cross-App Summary

| Aspect | Web | Admin | Clinic | Doctor |
|--------|-----|-------|--------|--------|
| Uses shared Navbar | Partial (no userMenu) | No | No | **Yes** |
| User controls location | Page content | Custom header | Custom header | **Navbar** |
| Theme toggle | Navbar (shared) | Custom duplicate | Custom duplicate | **Navbar (shared)** |
| Mobile hamburger | Yes (Navbar) | No | No | **Yes (Navbar)** |
| Auth state management | Local `lib/auth.ts` | `AuthProvider` | `AuthProvider` | `AuthProvider` |

---

## Navbar Component Gap

The shared Navbar needs one small fix to support admin/clinic adoption:

**Hide hamburger button when `navItems` is empty.** Admin and clinic use tab-based (local state) navigation, not route-based. They would pass `navItems=[]` to the Navbar and keep their tab strip as a separate component below. But currently, the hamburger button always renders on mobile even when there are no nav items, opening an empty sidebar.

Location: `packages/ui/Navbar.tsx` lines 45-56 (hamburger button) and 106-150 (sidebar overlay).

---

## Recommended Fix Order

1. **Navbar**: Hide hamburger when `navItems=[]` (prerequisite for admin/clinic)
2. **Web app**: Move user controls into Navbar's `userMenu` prop; remove redundant "Dashboard" h1
3. **Admin app**: Replace custom top bar with shared Navbar; keep tab strip separate below
4. **Clinic app**: Same as admin; preserve `header-username` and `header-role-badge` testids in userMenu
5. **Validate**: Build all apps, regenerate E2E tests, run test suite
