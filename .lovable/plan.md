# BIT KMC Question Bank — Build Plan

A complete student learning portal for Kailali Multiple Campus BIT program, with admin-managed PDFs organized by semester, subject, exam type, and year (2078–2085).

## 1. Authentication
- **Email + password** signup/login (default role: Student).
- **Google OAuth** (Lovable Cloud native).
- **GitHub OAuth** — you'll connect Supabase directly to enable this.
- Profile captured: name, email, avatar, login provider.
- Password reset flow with `/reset-password` page.

## 2. Roles & Admin Access
- Roles stored in a separate `user_roles` table (Student / Admin) — secure, no privilege escalation.
- New signups are always Student. Admins are promoted manually via SQL (I'll give you the one-liner to make Manjit Rana admin).
- **Hidden admin login**: long-press the app logo on the login screen opens a dedicated admin login modal (email + password). Visually identical to normal login otherwise.
- Admin-only routes are guarded both client-side (route guard) and server-side (RLS + role check).

## 3. Dashboard
- Welcome banner with user avatar & name.
- Search bar (filters across subjects/PDFs).
- Grid of 8 semester cards (1st–8th) with lock icon 🔒 on locked ones.
- Bell icon 🔔 with unread notification count.
- Admin button visible only to admins → opens Admin Panel.
- Theme toggle (light/dark), mobile responsive, blue + orange accent palette.

## 4. Semester & Subject Browsing
- Default: only 1st semester unlocked; 2nd–8th locked.
- Tapping a locked semester shows a "Locked by admin" message — view & download blocked at the database level too.
- Each semester shows its hardcoded subject list (the full list you provided for all 8 semesters).
- Subject page → filter by **Exam Type** (First Term, Mid Term, Final, Board, Model Questions) and **Year** (2078–2085).

## 5. PDF Viewer
- In-app PDF viewer with zoom, scroll, page navigation.
- Download and Share buttons (disabled if semester is locked).
- Files stored in Lovable Cloud Storage, max 50MB, PDF only.

## 6. Admin Panel
- **Upload PDF**: form with semester, subject, exam type, year, file picker. Validates type & size.
- **Manage PDFs**: list, edit metadata, delete.
- **Semester lock control**: toggle lock/unlock per semester.
- **Send notification**: title, message, type (New Paper / Exam Reminder / Announcement), optional link to a PDF.
- **Manage users**: list users, change role.

## 7. Notifications
- In-app bell with unread count and dropdown list.
- Tapping a notification marks it read and opens the linked PDF (if any).
- Real-time updates via Lovable Cloud subscriptions.

## 8. Database (Lovable Cloud)
- `profiles` (id, name, email, avatar_url, login_provider)
- `user_roles` (user_id, role) — separate table, RLS-protected
- `semester_status` (semester 1–8, is_locked) — seeded with only sem 1 unlocked
- `pdf_files` (id, semester, subject, exam_type, year, file_url, uploaded_by, created_at)
- `notifications` (id, title, message, type, pdf_id?, created_at)
- `notification_reads` (user_id, notification_id) — track unread per user
- Storage bucket `pdfs` with RLS: admin write; students read only if semester unlocked.

## 9. UI / UX
- Card-based layout, smooth transitions, lucide icons.
- Light + dark mode with semantic color tokens.
- Mobile-first responsive design.
- Branded as **BIT KMC Question Bank** — Owner: Manjit Rana, Program: BIT, Kailali Multiple Campus.

## What you'll do after I build
1. Connect Supabase integration to enable GitHub OAuth (I'll point you to the exact dashboard setting).
2. Sign up once with your email — I'll give you the SQL snippet to promote yourself to Admin.
3. Start uploading PDFs and unlocking semesters as your students progress.
