# Admin User Guide

A plain-language guide to using the Koro Admin Panel. No development
knowledge required.

## Signing in

1. Go to the admin panel's URL and sign in with your email and password.
2. Only accounts with an **Admin** or **Language Reviewer** role can access
   the panel. If you sign in with a regular account, you'll see a "You don't
   have access to the admin panel" screen instead — this is expected and not
   an error. Ask an existing Admin to grant you a role (see *Managing Roles*
   below).
3. Your session stays signed in across page reloads. If it ever expires
   unexpectedly, you'll be returned to the sign-in screen.

## Dashboard → Overview

The first screen you see after signing in. It shows:

- **KPI cards** — Total Users, Active Users, Pending Submissions, Languages,
  Categories, Concepts, Translations, and New Users in the last 30 days, each
  with a trend arrow comparing to the prior period where that comparison is
  meaningful.
- **Pending Submission Queue** — a quick preview of the newest items waiting
  for review, with a link to the full queue.
- **Backend Statistics (raw)** — whatever the server's own statistics
  endpoint reports, shown as-is.

If a number can't be reliably calculated from the API, the card shows a dash
(—) and a short explanation instead of guessing.

## Dashboard → Analytics

Charts and breakdowns: user growth over time, account status mix, role
distribution, native/learning language breakdowns, translations by language,
concepts by category, and language activation status. A card at the bottom
lists analytics that the current API can't support yet (e.g. daily/weekly
active users, approval-rate trends) so it's clear those aren't missing by
accident.

## Users → All Users

- **Search** by name or email (top left).
- **Filter** by status (Active/Inactive/Suspended) or role.
- **Sort/paginate** using the table controls and the page-size dropdown.
- **Export CSV** downloads exactly the rows currently matching your filters.
- Click any row (or the **⋯** menu) to **view details**, **activate**,
  **suspend**, or **mark inactive**. Status changes ask for confirmation
  first since they immediately affect what that user can do.

## Users → User Details

Shows the account's profile, registration date, last activity, and current
roles/status. From here you can:

- **Edit roles** — check/uncheck Admin, Language Reviewer, or Moderator, then
  save. Every account always keeps the base "User" role; you're only
  choosing which *additional* roles to grant. Changes take effect
  immediately and require confirmation before saving.
- **View activity timeline** — only available when viewing your **own**
  account. The API doesn't currently expose other users' activity logs, so
  that section explains this rather than showing an empty or fake timeline
  for other accounts.

## Content → Languages / Categories / Concepts / Translations

- **Languages** support full management: add, edit, and delete, plus an
  Active/Inactive toggle (inactive languages are hidden from end users).
- **Categories, Concepts, and Translations** currently support **add and
  view only** — the backend doesn't yet have an edit/delete endpoint for
  these three, which is called out directly on each page. Fixing a typo or
  removing an entry currently requires a developer with database access;
  see `docs/BACKEND_GAPS.md` if you want this prioritized.
- Use the search box and (on Concepts/Translations) the category/language
  filters to narrow long lists.

## Moderation → Submission Queue

Shows crowd-sourced translation suggestions waiting for review (visible to
Admins and Language Reviewers). For each one:

- **Approve** or **Reject**, optionally adding a note explaining the
  decision — this note is stored with the submission.
- Once decided, an item leaves the queue. There's currently no way to look
  back at past decisions from the admin panel (the API doesn't expose
  submission history yet).

## Moderation → My Activity

Your own action history — logins, reviews, edits — with a date range filter
and search. This is *your* activity only; there is no cross-user activity
view today (see the note on the page itself, and `docs/BACKEND_GAPS.md`).

## Reports

Three tabs:

- **Summary** — a snapshot table of every key metric, exportable to CSV.
- **User Growth** — weekly new-registration trend, exportable to CSV.
- **Content Usage** — translations-per-language and concepts-per-category
  tables, each independently exportable.

## Administration

- **Admin Users** — everyone currently holding an Admin or Reviewer role, for
  a quick overview of who has elevated access. Manage grants from that
  user's detail page.
- **Roles & Permissions** — a reference table explaining what each role can
  do. This is static documentation, not a live editor (the backend has no
  API for it).
- **Settings** — currently just your personal light/dark theme preference,
  stored in your browser only. There's no platform-wide settings API yet.

## Troubleshooting

| Problem | What's happening |
|---|---|
| "You don't have access to the admin panel" after signing in | Your account only has the standard User role. Ask an Admin to grant you Admin or Language Reviewer access. |
| A page shows "Unable to load this data" with a Retry button | The backend didn't respond successfully. Check that the API server is running and reachable, then Retry. |
| "Unable to reach the server" | A network problem, not a login problem — check your connection or whether the backend URL is configured correctly for this deployment. |
| A create/edit action fails with an error toast | The message shown comes directly from the backend's error response — it usually explains what field was invalid. |
| An action seems to have no effect | Some resources (Categories, Concepts, Translations, submission history) genuinely can't be edited or looked back on yet — check `docs/BACKEND_GAPS.md` before assuming it's a bug. |
