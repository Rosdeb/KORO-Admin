# API Mapping

This document is the authoritative cross-reference between admin panel pages and
the Koro backend REST API. It was built by combining the written API reference
(`/doc` at the repo root) with the **live OpenAPI spec fetched from the running
backend** at `GET /v3/api-docs` — the live spec is the ground truth for exact
field names, parameters, and which endpoints actually exist. Where the two
sources disagreed, that's called out explicitly below and in
[BACKEND_GAPS.md](./BACKEND_GAPS.md).

```
Admin Page  →  Frontend Service (src/api/*.ts)  →  Swagger Endpoint  →  Backend
```

## Authentication

| Page / Feature | Frontend service | Endpoint | Auth | Notes |
|---|---|---|---|---|
| Login | `api/auth.ts` → `authApi.login` | `POST /api/v1/auth/login` | Public | Response is `{ token: { access_token, refresh_token }, id, name, email, roles }` — note the nested snake_case `token` object, confirmed against the live server. |
| Session bootstrap / silent refresh | `api/client.ts` interceptor | `POST /api/v1/auth/refresh` | Public (needs refresh token) | Response is flat camelCase: `{ accessToken, refreshToken, tokenType }` — a **different shape** than login's response. The Axios interceptor calls this automatically on any `401` and retries the original request once. |
| Logout | `api/auth.ts` → `authApi.logout` | `POST /api/v1/auth/logout` | Bearer | Best-effort; local session is cleared regardless of server response. |
| Session validity check on page load | `features/auth/auth-context.tsx` | `GET /api/v1/users/profile` | Bearer | Used only as a cheap "is my token still good" ping during app bootstrap; not stored beyond that. |

## Dashboard (Overview & Analytics)

Both pages are composed entirely from existing list/statistics endpoints — no
single "analytics" endpoint exists, so the frontend aggregates client-side
(`src/lib/analytics.ts`).

| Metric | Source endpoint(s) | Computation |
|---|---|---|
| Total / Active Users, role & status breakdowns | `GET /api/v1/admin/users` | Counted and grouped client-side from the full user list. |
| New Users / User Growth trend | `GET /api/v1/admin/users` | Bucketed by `createdAt` (day/week), current vs. prior period % change. |
| Pending Submissions count & trend | `GET /api/v1/admin/submissions/pending` | Length of the returned array; bucketed by `createdAt` for the trend chart. |
| Languages / Categories / Concepts / Translations totals | `GET /api/v1/languages`, `/categories`, `/concepts`, `/translations` | Array lengths. |
| "Backend Statistics (raw)" panel | `GET /api/v1/admin/statistics` | Rendered as-is — the backend declares this response as a bare `object` with no documented schema, so the UI shows whatever keys come back instead of assuming field names. |
| Users by native/preferred language | `GET /api/v1/admin/users` | Grouped by the `nativeLanguage` / `preferredLanguage` fields. |
| Translations by language / Concepts by category | `GET /api/v1/translations`, `/concepts` | Grouped by `languageName` / `category.name`. |

## Users

| Page | Frontend service | Endpoint | Auth |
|---|---|---|---|
| All Users (list, search, filter, sort, paginate) | `api/admin-users.ts` → `adminUsersApi.list` | `GET /api/v1/admin/users` | Admin only. Returns the full array — no `page`/`size`/`q`/`sort` query params exist, so search/filter/sort/pagination all happen client-side (`src/hooks/use-pagination.ts`, `use-debounced-value.ts`). |
| Activate / Suspend / Deactivate | `adminUsersApi.updateStatus` | `PUT /api/v1/admin/users/{id}/status?status=` | Admin only. `status` is a query param, enum `ACTIVE \| INACTIVE \| SUSPENDED`. |
| Grant / revoke roles | `adminUsersApi.updateRoles` | `PUT /api/v1/admin/users/{id}/roles` | Admin only. Body is a raw JSON array of role names, e.g. `["ADMIN","USER"]`. **Not present in the live `/v3/api-docs` output** — see [BACKEND_GAPS.md](./BACKEND_GAPS.md) for why it's still wired up. |
| User Details | Reuses `adminUsersApi.list` (filtered client-side by id — there is no `GET /admin/users/{id}`) | — | Admin only. |
| Activity Timeline (User Details) | `api/activity.ts` → `activityApi.list` | `GET /api/v1/activity` | Only rendered when viewing **your own** account — the endpoint is scoped to the signed-in user for every role. See gap below. |

## Content Management

| Module | List | Create | Update | Delete |
|---|---|---|---|---|
| Languages | `GET /api/v1/languages` (public) | `POST /api/v1/admin/languages` | `PUT /api/v1/admin/languages/{id}` | `DELETE /api/v1/admin/languages/{id}` |
| Categories | `GET /api/v1/categories` (public) | `POST /api/v1/admin/categories` | `PUT /api/v1/admin/categories/{id}` | `DELETE /api/v1/admin/categories/{id}` |
| Concepts | `GET /api/v1/concepts?categoryId=` (public) | `POST /api/v1/admin/concepts` | `PUT /api/v1/admin/concepts/{id}` | `DELETE /api/v1/admin/concepts/{id}` |
| Translations | `GET /api/v1/translations?conceptId=&languageId=` (public) | `POST /api/v1/admin/translations` | `PUT /api/v1/admin/translations/{id}` | `DELETE /api/v1/admin/translations/{id}` |

Create requests for Language/Category/Concept post the **entity schema itself**
(no separate `*Request` DTO exists for these three in the OpenAPI spec) — see
`src/types/api.ts` (`LanguagePayload`, `CategoryPayload`, `ConceptPayload`).
Concept's nested `category` reference only needs `{ id }` populated for the
backend to resolve it via JPA.

Update/delete for Categories, Concepts, and Translations were previously a
known backend gap ("Known gap, not yet built" in `/doc`); all three now have
full edit/delete live on the backend and in the admin panel.

## Moderation

A submission is a full dictionary entry — a word in its **source language**, plus
the two translations that are always required (Bangla, English) — not a generic
suggestion against a pre-existing Concept. On approval, the backend finds-or-creates
a `Concept` by `englishTranslation` (tagged with the submission's category) and
upserts `Translation` rows for the source language and for Bangla/English (skipped
for whichever of those the source language already is); the word then simply shows
up through the existing `/api/v1/translations` family — no separate dictionary-read
endpoint exists.

| Page | Endpoint | Auth |
|---|---|---|
| Submission Queue (list) | `GET /api/v1/admin/submissions/pending` → `TranslationSubmission[]` (`category`, `sourceLanguage`, `sourceWord`, `banglaTranslation`, `englishTranslation`, `pronunciation`, `exampleSentence`, `notes`, `status`, `rejectionReason`, …) | Admin or Reviewer. **Only pending submissions are listable** — no endpoint returns approved/rejected history. |
| Approve | `POST /api/v1/admin/submissions/{id}/approve` `{ reviewerNote? }` | Admin or Reviewer |
| Reject | `POST /api/v1/admin/submissions/{id}/reject` `{ reviewerNote?, rejectionReason }` — `rejectionReason` is required, `400` if missing/blank | Admin or Reviewer |
| My Activity | `GET /api/v1/activity?from=&to=` | Any role, but scoped to the caller's own actions | `from`/`to` are `date` (not `date-time`) query params. |
| My Activity statistics panel | `GET /api/v1/activity/statistics` | Same as above | Also an undocumented-schema `object` — rendered dynamically like `/admin/statistics`. |

## Reports

Built entirely from the same list endpoints as Overview/Analytics
(`src/pages/reports/reports-page.tsx`), with client-side CSV export
(`src/lib/utils.ts` → `downloadCsv`) — no server-side export endpoint exists
for these tabular reports (as distinct from the PDF vocabulary export under
`/api/v1/export/**`, which is an end-user feature, not an admin report).

## Administration

| Page | Data source |
|---|---|
| Admin Users | `GET /api/v1/admin/users`, filtered client-side to accounts holding `ROLE_ADMIN` or `ROLE_LANGUAGE_REVIEWER`. |
| Roles & Permissions | Static reference table sourced from `/doc`'s permission matrix — there is no roles/permissions endpoint to fetch this from live. |
| Settings | Local browser preference (theme) only; no platform settings endpoint exists. |

## Endpoints intentionally not surfaced in the admin panel

These exist in the API but are end-user (owner-scoped) features, not admin
functionality, and the API gives admins no way to see other users' data for
them:

- `/api/v1/collections/**` — a user's saved vocabulary, owner-only.
- `/api/v1/images/**` — AI vision recognition history, owner-only.
- `/api/v1/export/**` — PDF export history, owner-only (except `POST /pdf` and
  file download, which aren't admin actions either).
- `/api/v1/submissions` — `GET` ("my submissions") and `POST` (`SubmissionRequest`:
  `categoryId`, `sourceLanguageId`, `sourceWord`, `banglaTranslation`,
  `englishTranslation` required, `pronunciation`/`exampleSentence`/`note`
  optional; `409` if the source word already exists for that language among
  official entries or non-rejected submissions) — the end-user "submit a word"
  flow, distinct from `/api/v1/admin/submissions/pending`. `SubmissionRequest`
  is typed in `src/types/api.ts` for schema parity but has no consuming UI here.
