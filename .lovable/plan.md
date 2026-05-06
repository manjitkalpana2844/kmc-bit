## Goals

1. **Welcome name** — show the user's first name (from profile.name or Google `full_name`, fallback to email local-part) on the homepage hero greeting.
2. **FWU imagery** — add a generated FWU campus/logo hero image to splash screen, login page, and homepage hero.
3. **Editable profile picture** — allow user to upload an avatar image on `/profile` (uses existing public `avatars` bucket).
4. **Admin Users tab simplified** — strip it down to a clean list of users (name, email, avatar, subscription badges). Move all action buttons (promote, access, quick unlock, confirm email, resend, CSV) into a separate **"User actions"** sub-tab so the main Users view is just a directory as requested.
5. **Configurable total semesters** — add a setting in `AdminSettings` to set total semester count (default 8, allow 1–12). Store in `app_settings` under key `curriculum`. Update homepage semester grid, semester pass selectors, and quick-unlock to read from this setting.
6. **Mobile back button + bottom nav** —
   - Add a top-left back arrow on every sub-page (not on `/`).
   - Add a fixed **bottom navigation bar** on mobile (≤sm) with: Home, Books, Library, Profile.
   - Keep only one search entry point (the header search icon); remove duplicate search affordances if present.

## Files

**New**
- `src/assets/fwu-hero.jpg` — generated FWU university hero image
- `src/components/MobileBottomNav.tsx` — fixed bottom nav (mobile only)
- `src/components/BackButton.tsx` — reusable back arrow (hidden on `/`)
- `src/hooks/use-semester-count.tsx` — reads `app_settings.curriculum.total_semesters`

**Edited**
- `src/routes/index.tsx` — welcome name + FWU hero image, semester grid uses dynamic count
- `src/routes/login.tsx` — FWU hero on the side
- `src/components/SplashScreen.tsx` — FWU image
- `src/routes/profile.tsx` — avatar upload control
- `src/routes/__root.tsx` — render `MobileBottomNav` + `BackButton` slot, add `pb-16 sm:pb-0` for nav clearance
- `src/components/AppHeader.tsx` — remove duplicate search if any (keep one)
- `src/components/admin/AdminUsers.tsx` — split into "Directory" (read-only list) and "Actions" subviews using inner Tabs
- `src/components/admin/AdminSettings.tsx` — add total-semesters input
- `src/components/admin/AdminSemesters.tsx` & semester selectors — use dynamic count
- `src/components/admin/QuickUnlock` (in AdminUsers) — render N buttons from setting

## Technical notes

- Welcome name: derive in homepage as `profile?.name?.split(" ")[0] ?? user.user_metadata.full_name?.split(" ")[0] ?? user.email?.split("@")[0]`.
- Avatar upload: `supabase.storage.from("avatars").upload(\`${user.id}/avatar.jpg\`, file, { upsert: true })` then `update profiles set avatar_url`.
- Semester count: stored as `{ total_semesters: number }` in `app_settings` row with key `curriculum`. Hook returns count with default 8 if missing. No DB schema change required.
- Bottom nav: `fixed bottom-0 inset-x-0 sm:hidden border-t bg-background`. Active link styled via `activeProps`.
- Back button: uses `useRouter().history.back()` or `<Link to="..">`; hidden on `/` and on screens with their own back UI.

## Out of scope
- Adding additional subjects per semester (kept simple — only count is configurable now).
- Gesture handling (swipe-back) — relying on browser/OS back gesture; explicit back button covers it.
