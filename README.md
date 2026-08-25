# Koro Admin Panel

A production-ready admin dashboard for the Koro Multilingual & Indigenous
Language Platform, built strictly against the existing backend REST API
(see `/doc` at the repository root, or `http://localhost:8080/swagger-ui/index.html`
when the backend is running). No backend endpoints were invented — every
screen maps to a real, verified endpoint. See [docs/API_MAPPING.md](./docs/API_MAPPING.md)
for the full cross-reference and [docs/BACKEND_GAPS.md](./docs/BACKEND_GAPS.md)
for what the API doesn't support yet.

## Requirements

- Node.js 20+ and npm
- The Koro backend running and reachable (default expected at
  `http://localhost:8080`)
- An account with the `ROLE_ADMIN` or `ROLE_LANGUAGE_REVIEWER` role — plain
  `ROLE_USER` accounts can sign in but are redirected to a "no access" screen

## Setup

```bash
npm install
cp .env.example .env   # then edit VITE_API_BASE_URL if your backend isn't on localhost:8080
npm run dev
```

The dev server runs at `http://localhost:3030`. The backend must have CORS
enabled for that origin (or be fronted by a reverse proxy) — Vite does not
proxy API requests in this setup.

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the Koro backend REST API | `http://localhost:8080` |

No production URLs are hardcoded anywhere in source — see `.env.example`.

## Scripts

```bash
npm run dev       # start the Vite dev server
npm run build     # type-check (tsc -b) and produce a production build in dist/
npm run preview   # locally preview the production build
npm run lint      # oxlint
```

## Documentation

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — stack, folder structure,
  data flow, auth/RBAC design.
- [docs/API_MAPPING.md](./docs/API_MAPPING.md) — every admin page mapped to
  its backing endpoint(s).
- [docs/BACKEND_GAPS.md](./docs/BACKEND_GAPS.md) — API gaps found while
  building this, with suggested endpoints to close them.
- [docs/ADMIN_GUIDE.md](./docs/ADMIN_GUIDE.md) — how to use the panel, for
  non-developer administrators.
- [docs/PRODUCTION_CHECKLIST.md](./docs/PRODUCTION_CHECKLIST.md) — what's
  verified and how.

## Tech stack

React 19 · TypeScript · Vite · React Router · TanStack Query · Axios ·
Tailwind CSS v4 · Radix UI · React Hook Form + Zod · Recharts · Sonner
