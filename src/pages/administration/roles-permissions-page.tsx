import { Info, ShieldCheck, ClipboardCheck, User as UserIcon, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL } from "@/components/shared/status-badge";
import type { Role } from "@/types/api";

const ROLES: { role: Role; who: string; scope: string; icon: LucideIcon }[] = [
  {
    role: "ROLE_USER",
    who: "Every registered account",
    scope: "Standard app features: translate, search, scan, save, submit, export.",
    icon: UserIcon,
  },
  {
    role: "ROLE_LANGUAGE_REVIEWER",
    who: "Content reviewer",
    scope:
      "Everything ROLE_USER can do, plus the submission review queue (approve/reject) and personal review history. No dictionary-editing rights, no user/category/language management.",
    icon: ClipboardCheck,
  },
  {
    role: "ROLE_MODERATOR",
    who: "Content moderator",
    scope:
      "Everything ROLE_USER can do, plus the submission review queue and personal review history, plus limited dictionary editing — can correct an existing concept or translation (PUT), but cannot create new ones directly or delete them. No category/language/user/role management.",
    icon: Wrench,
  },
  {
    role: "ROLE_ADMIN",
    who: "Platform operator",
    scope:
      "Full control: everything above, plus user management (status + role grants), full category/language/concept/translation CRUD (create + update + delete), and dashboard statistics.",
    icon: ShieldCheck,
  },
];

const MATRIX: { endpoint: string; method: string; user: boolean; reviewer: boolean; moderator: boolean; admin: boolean }[] = [
  { endpoint: "/api/v1/languages, /categories, /concepts, /translations", method: "GET", user: true, reviewer: true, moderator: true, admin: true },
  { endpoint: "/api/v1/translations/search", method: "POST", user: true, reviewer: true, moderator: true, admin: true },
  { endpoint: "/api/v1/collections/**", method: "GET/POST/PUT/PATCH/DELETE (own)", user: true, reviewer: true, moderator: true, admin: true },
  { endpoint: "/api/v1/images/recognize, /history, /files/{name}", method: "POST/GET", user: true, reviewer: true, moderator: true, admin: true },
  { endpoint: "/api/v1/export/pdf, /history, /{id}", method: "POST/GET (own)", user: true, reviewer: true, moderator: true, admin: true },
  { endpoint: "/api/v1/export/files/{name}", method: "GET (public link)", user: true, reviewer: true, moderator: true, admin: true },
  { endpoint: "/api/v1/submissions", method: "GET/POST", user: true, reviewer: true, moderator: true, admin: true },
  {
    endpoint: "/api/v1/admin/submissions/pending, /{id}, /history",
    method: "GET",
    user: false,
    reviewer: true,
    moderator: true,
    admin: true,
  },
  { endpoint: "/api/v1/admin/submissions/{id}/approve, /reject", method: "POST", user: false, reviewer: true, moderator: true, admin: true },
  { endpoint: "/api/v1/admin/submissions/approve-all", method: "POST", user: false, reviewer: false, moderator: false, admin: true },
  { endpoint: "/api/v1/admin/concepts/{id}", method: "PUT", user: false, reviewer: false, moderator: true, admin: true },
  { endpoint: "/api/v1/admin/translations/{id}", method: "PUT", user: false, reviewer: false, moderator: true, admin: true },
  { endpoint: "/api/v1/admin/statistics", method: "GET", user: false, reviewer: false, moderator: false, admin: true },
  { endpoint: "/api/v1/admin/users", method: "GET", user: false, reviewer: false, moderator: false, admin: true },
  { endpoint: "/api/v1/admin/users/{id}/status, /roles", method: "PUT", user: false, reviewer: false, moderator: false, admin: true },
  { endpoint: "/api/v1/admin/languages, /categories", method: "POST/PUT/DELETE", user: false, reviewer: false, moderator: false, admin: true },
  { endpoint: "/api/v1/admin/concepts, /translations", method: "POST/DELETE", user: false, reviewer: false, moderator: false, admin: true },
];

function Cell({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <Badge variant="success">Allowed</Badge>
  ) : (
    <span className="text-xs text-muted-foreground">—</span>
  );
}

export function RolesPermissionsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Roles & Permissions" description="Reference for how access control is enforced across the Koro API." />

      <div className="flex items-start gap-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          This page is a static reference — the backend has no roles/permissions API to fetch this from live. It's
          enforced identically in two layers (SecurityConfig request filters and @PreAuthorize on each controller
          method), sourced from <code className="font-mono">docs/backend_api</code>.
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>What each role can access across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map((r) => (
              <div key={r.role} className="rounded-lg border border-border p-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <r.icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold">{ROLE_LABEL[r.role]}</span>
                    <p className="font-mono text-xs text-muted-foreground">{r.role}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{r.who}.</span> {r.scope}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>Key endpoints and which role can call them.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Moderator</TableHead>
                <TableHead>Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MATRIX.map((row) => (
                <TableRow key={row.endpoint}>
                  <TableCell className="font-mono text-xs">{row.endpoint}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.method}</TableCell>
                  <TableCell>
                    <Cell allowed={row.user} />
                  </TableCell>
                  <TableCell>
                    <Cell allowed={row.reviewer} />
                  </TableCell>
                  <TableCell>
                    <Cell allowed={row.moderator} />
                  </TableCell>
                  <TableCell>
                    <Cell allowed={row.admin} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
