# Backend Requirements / API Gaps

Found by cross-referencing the written API doc (`/doc`) against the **live**
OpenAPI spec at `GET /v3/api-docs` on the running backend (fetched during
development — endpoints were confirmed present or absent by inspecting the
actual generated `paths` object, not by guessing). Nothing in the admin panel
fabricates data to paper over these — see the "Not available" panels on the
Analytics and Submission Queue pages, and the inline notices on Categories,
Concepts, and Translations.

---

### 1. No platform-wide activity feed for admins

**Feature:** Activity Tracking / Monitoring section of the admin panel
(sections 8–9 of the spec) — viewing *any* user's actions, not just your own.

**Current behavior:** `GET /api/v1/activity` is scoped to the authenticated
caller only, for every role including `ROLE_ADMIN` (confirmed in `/doc`'s
permission matrix — marked "own" across User, Reviewer, and Admin columns).
There is no way for an admin to see another user's activity log, and no
platform-wide feed to power DAU/WAU/MAU, most-active-hour, or "recent activity
across the platform" widgets.

**Required endpoint:** `GET /api/v1/admin/activity`

**Why it's needed:** Every admin panel with an activity/monitoring section
needs to observe the platform, not just the operator's own actions. Sections
8, 9, and parts of 5 (DAU/WAU/MAU, usage trends) of the panel spec depend on
this and are currently either omitted or narrowed to "my activity only."

**Suggested method:** `GET`

**Suggested request:** Query params mirroring the existing `/api/v1/activity`
(`from`, `to` as `date`), plus `userId` (optional filter) and `activityType`
(optional filter). Pagination params would also resolve gap #6 below.

**Suggested response:** Same `ActivityLog[]` shape as the existing endpoint,
just without the implicit caller-only filter (admin-only authorization
instead).

**Priority:** High — this is the single biggest gap for the "Monitoring" and
"Real-Time Activity" sections of the spec.

---

### 2. No single-user lookup endpoint

**Feature:** User Details page.

**Current behavior:** Only `GET /api/v1/admin/users` (full list) exists. The
User Details page finds the requested user by filtering the already-fetched
list client-side, which works but means the detail page can't be deep-linked
without also fetching the entire user table first, and can't scale once the
user base is large enough that the list endpoint itself needs pagination
(see gap #6).

**Required endpoint:** `GET /api/v1/admin/users/{id}`

**Why it's needed:** Standard REST practice for a detail view; avoids forcing
a full-table fetch just to resolve one profile.

**Suggested method:** `GET`

**Suggested request:** Path param `id`.

**Suggested response:** Single `UserResponse` object (same shape as one array
element from the list endpoint).

**Priority:** Medium.

---

### 3. No history of reviewed (approved/rejected) submissions

**Feature:** Submission Queue / Moderation reporting.

**Current behavior:** `GET /api/v1/admin/submissions/pending` only returns
submissions still awaiting review. Once approved or rejected, a submission
disappears from what the admin panel can query — there's no way to show
review history, reviewer performance, or approval/rejection trend charts.

**Required endpoint:** `GET /api/v1/admin/submissions?status=PENDING|APPROVED|REJECTED`

**Why it's needed:** Moderation accountability (section 22, audit trail) and
the Reports section both need visibility into decisions already made, not
just the current queue.

**Suggested method:** `GET`

**Suggested request:** Optional `status` query param; ideally also `from`/`to`
and pagination.

**Suggested response:** `TranslationSubmission[]`, same shape as the existing
pending-queue response.

**Priority:** High.

---

### 4. ~~No update/delete for Categories, Concepts, and Translations~~ — Resolved

**Feature:** Content Management (section 10).

`PUT`/`DELETE` are now live for all three resources
(`/api/v1/admin/categories/{id}`, `/api/v1/admin/concepts/{id}`,
`/api/v1/admin/translations/{id}`), mirroring the existing Language pattern.
The Categories, Concepts, and Translations pages all have full edit/delete
in the admin panel now — this gap is closed.

---

### 5. `PUT /api/v1/admin/users/{id}/roles` is undocumented in the live OpenAPI spec

**Feature:** Role management on the User Details page.

**Current behavior:** `/doc` describes this endpoint in full detail as a
working, recently-added feature, and calling it unauthenticated returns `401`
(meaning the route is registered in Spring Security's filter chain) rather
than `404`. However, it does **not** appear in the generated
`/v3/api-docs` output at all — every other admin endpoint does. Because
Spring Security's `AuthorizationFilter` rejects unauthenticated requests to
any `/api/v1/admin/**` path before Spring MVC resolves the handler, a `401` on
an unauthenticated probe doesn't actually prove the controller method exists;
it's inconclusive either way.

**What the admin panel does:** Calls it exactly as documented in `/doc`
(`adminUsersApi.updateRoles`), since that's the authoritative written contract
for this backend, and surfaces the raw error (including a "may not be
deployed yet" hint on `404`) if it fails.

**Action needed:** Confirm with the backend team whether this controller
method is present in the currently-deployed build. If it's missing, it needs
to be added per the existing `/doc` spec:
`PUT /api/v1/admin/users/{id}/roles`, body: `string[]` of role names, response:
updated `UserResponse`. If it's present but simply missing `@Operation`
metadata or excluded from springdoc scanning, no code change is needed —
just confirm and this note can be deleted.

**Priority:** High — blocks the "grant elevated roles" flow, the only way to
create new Admin/Reviewer accounts short of direct DB writes.

---

### 6. No pagination, search, filter, or sort query parameters on any list endpoint

**Feature:** Every list-based page (Users, Languages, Categories, Concepts,
Translations, Submissions, Activity).

**Current behavior:** Every `GET` list endpoint returns the entire collection
with no `page`, `size`, `q`, `sort`, or comparable params (confirmed against
the live OpenAPI spec — none of the list operations declare query
parameters beyond the few noted in [API_MAPPING.md](./API_MAPPING.md), e.g.
`categoryId` on Concepts). The admin panel implements pagination, search,
filtering and sorting entirely client-side after fetching the full list
(`src/hooks/use-pagination.ts`, `use-debounced-value.ts`).

**Why it's needed:** This works fine at seed-data scale but will not scale —
fetching every user/translation/activity row on every page load becomes a
real performance and payload-size problem as the platform grows (directly
contradicts section 21's "do not load thousands of records into the browser"
guidance, which the current API leaves no way to avoid).

**Required change:** Add `page`, `size`, and ideally `sort`/`q` query params
to `GET /api/v1/admin/users`, `/api/v1/translations`, `/api/v1/concepts`, and
`GET /api/v1/activity` at minimum, returning a paged envelope (e.g.
`{ content, totalElements, totalPages, page, size }`, matching typical Spring
Data `Page<T>` serialization).

**Priority:** Medium now, High as data volume grows.

---

### 7. No platform settings / feature-flag endpoint

**Feature:** Administration → Settings (section 3, "Administration" nav).

**Current behavior:** No endpoint exists for platform-level configuration
(feature flags, email templates, moderation thresholds, etc.). The Settings
page in the admin panel only exposes this browser's local theme preference and
says so explicitly rather than presenting fake toggles.

**Required endpoint:** `GET/PUT /api/v1/admin/settings` (shape TBD once
concrete settings are identified).

**Priority:** Low — nothing in the current product requires platform-level
settings yet; only relevant if/when such a requirement appears.

---

### 8. No geographic (country/region) field on users

**Feature:** "Geographic Analytics" (section 5).

**Current behavior:** `UserResponse` has no location/country field — only
`nativeLanguage` and `preferredLanguage`. The admin panel substitutes
language-based breakdowns ("Users by Native Language", "Users by Preferred
Language") on the Analytics page, which is the closest real signal the API
provides for a language-learning platform, but this is not geography.

**Required change:** If true geographic analytics are wanted, add an optional
`country`/`region` field to the user profile (captured at registration or
inferred from IP at login) and expose it on `UserResponse`.

**Priority:** Low — the language-based substitute is arguably more relevant
for Koro's actual use case than geography would be.
