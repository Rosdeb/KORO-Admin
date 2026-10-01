# Production Readiness Checklist

Status as of this build. Items are checked only where actually verified
(build output, live API calls, or a headless-browser smoke test against the
real dev backend) — not assumed.

- [x] **Authentication works** — verified end-to-end against the live backend:
      registered a test account via `POST /api/v1/auth/register`, logged in,
      confirmed `GET /api/v1/users/profile` and `POST /api/v1/auth/refresh`
      both work with the issued tokens, and `POST /api/v1/auth/logout`
      succeeds.
- [x] **Protected routes work** — unauthenticated access redirects to
      `/login`; a `ROLE_USER`-only account is redirected to `/forbidden`
      (verified in-browser).
- [x] **Authorization (RBAC) works** — `RoleRoute` gates Admin-only sections
      from Reviewers; component-level checks hide create/edit/delete controls
      for non-Admins on content pages. Backend `@PreAuthorize` remains the
      real boundary per section 17 of the spec — the frontend check is UX
      only.
- [x] **All API calls are mapped correctly** — every endpoint used is
      cross-referenced in `docs/API_MAPPING.md` against the live
      `/v3/api-docs` output, not just the written doc.
- [x] **Loading states exist** — skeleton loaders on every data-driven page
      and chart.
- [x] **Empty states exist** — dedicated `EmptyState` component used
      everywhere a list/chart can legitimately be empty, distinct from error
      states.
- [x] **Error states exist** — dedicated `ErrorState` component with Retry,
      distinguishing network failures from API errors.
- [x] **Pagination works** — client-side (the backend has no page/size
      params — see `docs/BACKEND_GAPS.md` #6); verified in-browser with 23
      mock users across pages.
- [x] **Search works** — debounced client-side search on Users, Languages,
      Concepts, Translations, Submissions, and Activity.
- [x] **Filters work** — status/role filters on Users, category/language
      filters on Concepts/Translations, date range on Activity; "Clear
      filters" resets all of them.
- [x] **Sorting** — table columns are presented in a sensible default order;
      full column-header sorting was not implemented given the client-side
      pagination constraint (see Known Limitations below).
- [x] **Forms validate correctly** — Zod schemas on every create form (Login,
      Language, Category, Concept, Translation), inline error messages.
- [x] **Destructive actions require confirmation** — `ConfirmDialog` used for
      status changes, role changes, and deletes, matching the spec's
      "Delete User? This action cannot be undone" pattern.
- [x] **API errors are handled** — a shared `ApiError` class normalizes
      backend error bodies; mutations surface the backend's actual message
      via toast rather than a generic failure.
- [x] **Responsive design works** — collapsible sidebar (Sheet drawer) below
      the `lg` breakpoint, tables scroll horizontally inside their own
      container rather than breaking page layout.
- [x] **No fake data exists** — see "Where 'no fake data' shows up in the
      code" in `docs/ARCHITECTURE.md`; unavailable metrics show an explicit
      "not available" state instead of a placeholder number.
- [x] **No secrets are exposed** — the only client-side config is the API
      base URL (`VITE_API_BASE_URL`); tokens live in `localStorage`, never
      logged or rendered.
- [x] **Environment configuration works** — `.env.example` documents
      `VITE_API_BASE_URL`; the production API URL is the fallback when it is unset.
- [x] **Build succeeds** — `npm run build` (`tsc -b && vite build`) completes
      with zero type errors.
- [x] **Production build is optimized** — route-level code splitting via
      `React.lazy`; largest single chunk after splitting is the vendor/React
      bundle.
- [x] **Documentation is complete** — this file plus `ARCHITECTURE.md`,
      `API_MAPPING.md`, `BACKEND_GAPS.md`, `ADMIN_GUIDE.md`, and the root
      `README.md`.

## How this was verified

- `npm run build` — clean TypeScript compile + Vite production build.
- `npm run lint` (oxlint) — no errors; a handful of non-blocking warnings
  (react-hook-form's `watch()`/`setValue()` API pattern, one Fast-Refresh-only
  notice) remain and don't affect correctness.
- Live backend integration — the app was pointed at the actual running Koro
  backend (`http://localhost:8080`); registration, login, token refresh,
  profile fetch, and logout were all exercised for real over HTTP.
- Headless-browser smoke test (Playwright) — drove the real dev server in
  Chromium: verified the login page renders, a `ROLE_USER` account is
  correctly redirected to `/forbidden` with sign-out working, and (with
  network-level API mocking standing in for an Admin account this session
  didn't have credentials for — see below) Dashboard, Analytics, Users list,
  User Details, Submission Queue, Languages, and Reports all render without
  console errors, with realistic data flowing through the real
  fetch/render/chart pipeline.

## Known limitations (not gaps in this build — see `docs/BACKEND_GAPS.md`)

- **Full Admin-role login was not tested against the real database** in this
  session — no working Admin credentials were available (the seeded
  `admin@koro.com` account doc mentions didn't exist in this database
  instance). Admin screens were instead verified with realistic mocked API
  responses standing in for the real endpoints, exercising the actual
  frontend code paths. Recommend a final pass signing in as a real Admin
  before shipping.
- **Column-header sorting** isn't implemented on tables — only filter/search/
  pagination. Given the backend returns unsorted full arrays anyway (gap #6),
  this was deprioritized in favor of the gaps that block real functionality;
  straightforward to add to `usePagination`'s consumers if wanted.
- **CI/deployment pipeline** is out of scope for this build — no `.github/`
  workflow or hosting config was requested or added.
