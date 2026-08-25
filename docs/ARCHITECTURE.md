# Architecture

## Overview

The Koro Admin Panel is a single-page React application that consumes the
existing Koro backend REST API (`/doc` at the repo root, live Swagger at
`/swagger-ui/index.html`) with no backend of its own. It's built for the two
elevated roles the API defines — `ROLE_ADMIN` and `ROLE_LANGUAGE_REVIEWER` —
and every screen maps to real endpoints; see [API_MAPPING.md](./API_MAPPING.md)
for the full cross-reference and [BACKEND_GAPS.md](./BACKEND_GAPS.md) for what
isn't available yet.

## Stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Language | TypeScript (strict) |
| UI framework | React 19 |
| Routing | React Router v7 |
| Server state / caching | TanStack Query |
| HTTP client | Axios, one shared instance with interceptors |
| Styling | Tailwind CSS v4 |
| Component primitives | Radix UI (unstyled, accessible) + hand-written shadcn-style wrappers in `src/components/ui` |
| Forms & validation | React Hook Form + Zod |
| Charts | Recharts |
| Toasts | Sonner |

## Folder structure

```
src/
├── api/            One file per backend resource (auth, admin-users, languages,
│                    categories, concepts, translations, submissions, statistics,
│                    activity) + client.ts (the shared Axios instance/interceptors).
│                    Nothing outside this folder calls axios directly.
├── components/
│   ├── ui/          Generic, app-agnostic primitives (Button, Table, Dialog, ...).
│   └── shared/       App-specific composites built from ui/ (StatCard, PageHeader,
│                     EmptyState, ErrorState, ConfirmDialog, Pagination, ...).
├── features/
│   └── auth/         AuthContext/AuthProvider — the one piece of client-global state.
├── hooks/            use-auth, use-pagination, use-debounced-value, use-theme.
├── layouts/           AppLayout (sidebar + topbar shell), nav-config.ts (role-gated
│                     nav model), breadcrumbs.
├── lib/               utils.ts (cn, formatting, CSV export), analytics.ts (all
│                     trend/growth/bucketing math), chart-colors.ts, query-keys.ts,
│                     token-storage.ts / auth-storage.ts (localStorage wrappers).
├── pages/             One folder per nav section; each file is a route's screen.
├── routes/             ProtectedRoute (auth gate), RoleRoute (role gate).
└── types/api.ts       Types mirroring the *live* OpenAPI schemas (see below).
```

## Data flow

```
Page component
  → TanStack Query (useQuery/useMutation, keyed via lib/query-keys.ts)
    → src/api/<resource>.ts function
      → httpClient (src/api/client.ts, shared Axios instance)
        → Koro backend
```

Every list/detail page follows the same loading → error → empty → data
sequence, using the shared `ErrorState`/`EmptyState`/`Skeleton` components so
behavior is consistent across the app (see section 18 of the product spec).

## Why types were pulled from the *live* spec, not just the doc

The written `/doc` reference is detailed but proved to be slightly ahead of
(and in one case, silent about) what's actually deployed. Before writing any
code, the live OpenAPI JSON was fetched from the running backend
(`GET /v3/api-docs`) and every request/response schema in `src/types/api.ts`
was checked against it field-by-field — this caught, for example, that list
endpoints return bare arrays with no pagination envelope, and that
`admin/statistics` and `activity/statistics` are undocumented `object` blobs
rather than typed DTOs. Where the two sources disagreed, that's called out in
[BACKEND_GAPS.md](./BACKEND_GAPS.md) instead of silently picking one.

## Authentication

- Login (`POST /api/v1/auth/login`) returns an access token, a refresh token,
  and the user's `id`/`name`/`email`/`roles`. Both tokens are stored in
  `localStorage` (`src/lib/token-storage.ts`); the user object is stored
  separately (`src/lib/auth-storage.ts`) so the UI has roles/name available
  without decoding the JWT.
- Every request carries `Authorization: Bearer <token>` via an Axios request
  interceptor.
- On a `401` (excluding calls to `/api/v1/auth/**` itself), a response
  interceptor calls `POST /api/v1/auth/refresh` once, retries the original
  request with the new token, and only clears the session and redirects to
  `/login` if the refresh itself fails. Concurrent requests share a single
  in-flight refresh call (no thundering herd of refresh calls).
- On app boot, `AuthProvider` calls `GET /api/v1/users/profile` as a cheap
  liveness check for the stored token (also exercising the refresh flow
  transparently if the access token had expired while the tab was closed).

## Authorization (RBAC)

Two layers, matching how the backend itself enforces roles (defense in depth,
per `/doc`):

1. **Route-level** — `ProtectedRoute` requires `ROLE_ADMIN` or
   `ROLE_LANGUAGE_REVIEWER` to enter the panel at all (a plain `ROLE_USER`
   account is redirected to `/forbidden`); `RoleRoute` further restricts
   Admin-only sections (Dashboard, Analytics, Users, Reports, Administration)
   from Reviewers, who only get Content (read-only) and Moderation.
2. **Component-level** — pages like Languages/Categories/Concepts/Translations
   check `hasRole("ROLE_ADMIN")` to decide whether to render create/edit/delete
   controls at all, so a Reviewer sees the same data as a read-only table.

The frontend check is a UX convenience only — the backend's own
`@PreAuthorize` annotations remain the actual security boundary, exactly as
section 17 of the product spec requires.

## Where "no fake data" shows up in the code

- `src/pages/dashboard/overview-page.tsx` and `analytics-page.tsx` render the
  raw `GET /admin/statistics` / `GET /activity/statistics` payloads
  dynamically (iterating whatever keys come back) rather than assuming
  field names that aren't in the OpenAPI schema.
- Every chart/table has an explicit `isEmpty` state distinct from
  `isLoading`/`error` — an empty array renders "No data" copy, never a zero
  bar chart.
- The Analytics page has a dedicated "Not available from the current API"
  card listing exactly what was left out and why (DAU/WAU/MAU, submission
  review trends, search/view analytics, retention) instead of omitting them
  silently.
- `docs/BACKEND_GAPS.md` is the single place gaps are tracked, and pages that
  hit a gap link to it inline (e.g. the Categories/Concepts/Translations
  "create only" notices, the Submission Queue's "pending only" notice, the
  User Details activity-timeline notice for other users' accounts).

## Performance

- **Code splitting**: every route page is `React.lazy`-loaded (see
  `src/App.tsx`), so the initial bundle only includes the shell, login, and
  routing — not every admin screen.
- **Debounced search**: `useDebouncedValue` (300ms) on every search input.
- **Client-side pagination**: since the backend has no `page`/`size` params
  (see gap #6), `usePagination` slices already-fetched arrays rather than
  rendering thousands of rows at once.
- **Query caching**: TanStack Query's default `staleTime` (30s) avoids
  redundant refetches when navigating between pages that share data (e.g.
  Users list and User Details both read the same `admin-users` query).
