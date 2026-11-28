import { useState } from "react";
import { Link } from "react-router-dom";
import { Info, ShieldCheck, ClipboardCheck, User as UserIcon, Wrench, Check, Minus, Search, ArrowUpRight, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABEL } from "@/components/shared/status-badge";
import type { Role } from "@/types/api";

type AccessKey = "user" | "reviewer" | "moderator" | "admin";
const ROLES = [
  { role: "ROLE_USER", key: "user", who: "Every registered account", description: "Use the app and contribute translations.", features: ["Search, translate, and scan", "Save collections and export", "Submit new translations"], icon: UserIcon },
  { role: "ROLE_LANGUAGE_REVIEWER", key: "reviewer", who: "Content reviewer", description: "Review community contributions for quality.", features: ["All standard app features", "Approve or reject submissions", "View personal review history"], icon: ClipboardCheck },
  { role: "ROLE_MODERATOR", key: "moderator", who: "Content moderator", description: "Review submissions and maintain dictionary content.", features: ["All reviewer permissions", "Edit existing concepts", "Correct existing translations"], icon: Wrench },
  { role: "ROLE_ADMIN", key: "admin", who: "Platform operator", description: "Manage platform content, accounts, and access.", features: ["All moderator permissions", "Create and delete content", "Manage users and role access"], icon: ShieldCheck },
] satisfies { role: Role; key: AccessKey; who: string; description: string; features: string[]; icon: typeof UserIcon }[];
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

const PERMISSION_DETAILS = [
  { name: "Browse the dictionary", description: "View languages, categories, concepts, and translations.", group: "App features" },
  { name: "Search translations", description: "Find translations by text and concept.", group: "App features" },
  { name: "Manage personal collections", description: "Create, update, and delete your own saved collections.", group: "App features" },
  { name: "Scan and recognize images", description: "Recognize images and access scan history and files.", group: "App features" },
  { name: "Create and view exports", description: "Export content to PDF and view your own export history.", group: "App features" },
  { name: "Download shared exports", description: "Download export files through a public link.", group: "App features" },
  { name: "Submit translations", description: "Contribute translations and view submissions.", group: "App features" },
  { name: "View the review queue", description: "Access pending submissions and personal review history.", group: "Content review" },
  { name: "Review submissions", description: "Approve or reject individual contributions.", group: "Content review" },
  { name: "Approve submissions in bulk", description: "Approve all pending submissions in one action.", group: "Content review" },
  { name: "Edit existing concepts", description: "Correct dictionary concepts that already exist.", group: "Content management" },
  { name: "Edit existing translations", description: "Correct translations that already exist.", group: "Content management" },
  { name: "View platform statistics", description: "Access platform-wide dashboard statistics.", group: "Administration" },
  { name: "View user accounts", description: "Browse the platform's user directory.", group: "Administration" },
  { name: "Manage user access", description: "Change account status and grant or remove roles.", group: "Administration" },
  { name: "Manage languages and categories", description: "Create, edit, and delete languages and categories.", group: "Content management" },
  { name: "Create and delete dictionary content", description: "Add or delete concepts and translations.", group: "Content management" },
];
const PERMISSIONS = MATRIX.map((row, index) => ({ ...row, ...PERMISSION_DETAILS[index] }));
const GROUPS = ["App features", "Content review", "Content management", "Administration"];

function AccessIndicator({ allowed }: { allowed: boolean }) {
  return <span className={`inline-flex items-center justify-center rounded-full p-1 ${allowed ? "bg-primary/10 text-primary" : "text-muted-foreground/50"}`}>
    {allowed ? <Check className="size-3.5" aria-hidden="true" /> : <Minus className="size-3.5" aria-hidden="true" />}
    <span className="sr-only">{allowed ? "Allowed" : "Not allowed"}</span>
  </span>;
}

function PermissionDescription({ permission }: { permission: typeof PERMISSIONS[number] }) {
  return <details className="group min-w-0">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="text-sm font-medium leading-5">{permission.name}</span>
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
    </summary>
    <div className="mt-2 space-y-2">
      <p className="text-xs leading-5 text-muted-foreground">{permission.description}</p>
      <p className="text-[11px] text-muted-foreground">{permission.group}</p>
      <div className="space-y-1 rounded-lg border-0 bg-muted/40 p-2.5 text-xs text-muted-foreground shadow-2xs">
        <p className="font-medium">{permission.method}</p>
        <code className="block break-all text-[11px] leading-5">{permission.endpoint}</code>
      </div>
    </div>
  </details>;
}

export function RolesPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<AccessKey | "all">("all");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const visible = PERMISSIONS.filter((permission) =>
    (selectedRole === "all" || permission[selectedRole]) &&
    (group === "all" || permission.group === group) &&
    `${permission.name} ${permission.description} ${permission.endpoint} ${permission.method}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const displayedRoles = ROLES.filter((role) => selectedRole === "all" || role.key === selectedRole);
  const selected = ROLES.find((role) => role.key === selectedRole);
  const filtered = selectedRole !== "all" || group !== "all" || search !== "";
  function reset() { setSelectedRole("all"); setSearch(""); setGroup("all"); }

  return <div className="space-y-4">
    <PageHeader title=" " description="Understand each role and compare access across the platform." actions={<Button variant="outline" asChild><Link to="/users">Manage user access <ArrowUpRight /></Link></Button>} />

    <section aria-label="Choose a role to explore" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Platform roles <span className="ml-1 font-normal text-muted-foreground">· 4 roles</span></h2>
        <p className="text-xs text-muted-foreground">Select a role to explore its permissions</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((role) => <button key={role.key} type="button" aria-pressed={selectedRole === role.key} onClick={() => setSelectedRole(selectedRole === role.key ? "all" : role.key)} className={`flex min-w-0 flex-col rounded-xl border-0 p-3.5 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedRole === role.key ? "bg-primary/10 ring-2 ring-primary/20 shadow-xs" : "bg-card shadow-sm hover:bg-muted/30"}`}>
          <div className="flex w-full items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><role.icon className="size-4" /></span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{ROLE_LABEL[role.role]}</h3>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{PERMISSIONS.filter((p) => p[role.key]).length} permissions</p>
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{role.description}</p>
        </button>)}
      </div>
    </section>

    <Card className="border-0 shadow-sm bg-card overflow-hidden">
      <CardHeader className="gap-2.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle className="leading-snug">{selected ? `${ROLE_LABEL[selected.role]} permissions` : "Permission comparison"}</CardTitle><CardDescription className="mt-1 text-xs">{selected ? "Actions this role is allowed to perform." : "Compare what each role can do. Expand a permission for details."}</CardDescription></div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><AccessIndicator allowed />Allowed</span><span className="flex items-center gap-1"><AccessIndicator allowed={false} />Not allowed</span></div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 size-3.5 text-muted-foreground" /><Input type="search" aria-label="Search permissions" placeholder="Search permissions…" value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-9 bg-background border border-input shadow-xs" /></div>
          <select aria-label="Filter permission category" value={group} onChange={(event) => setGroup(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs"><option value="all">All categories</option>{GROUPS.map((category) => <option key={category}>{category}</option>)}</select>
          {filtered && <Button variant="ghost" className="h-9" onClick={reset}>Clear filters</Button>}
        </div>
        <p role="status" className="text-xs text-muted-foreground">Showing {visible.length} of {PERMISSIONS.length} permissions{selected ? ` · ${ROLE_LABEL[selected.role]}` : " · All roles"}</p>
      </CardHeader>
      <CardContent className="p-0">
        {visible.length === 0 ? <div className="flex flex-col items-center gap-2 px-4 py-12 text-center"><Search className="size-6 text-muted-foreground" /><p className="text-sm font-medium">No matching permissions</p><p className="text-xs text-muted-foreground">Try another search or clear your filters.</p><Button variant="outline" size="sm" onClick={reset}>Clear filters</Button></div> : <>
          <div className="hidden md:block"><Table className="min-w-0 table-fixed"><TableHeader><TableRow><TableHead className="w-[48%]">Permission</TableHead>{displayedRoles.map((role) => <TableHead key={role.key} className="text-center">{ROLE_LABEL[role.role]}</TableHead>)}</TableRow></TableHeader><TableBody>
            {visible.map((permission) => <TableRow key={permission.endpoint}><TableCell className="px-3 py-2.5"><PermissionDescription permission={permission} /></TableCell>{displayedRoles.map((role) => <TableCell key={role.key} className="text-center"><AccessIndicator allowed={permission[role.key]} /></TableCell>)}</TableRow>)}
          </TableBody></Table></div>
          <div className="divide-y divide-border md:hidden">{visible.map((permission) => <div key={permission.endpoint} className="space-y-2 p-3"><PermissionDescription permission={permission} /><div className="grid grid-cols-2 gap-2">{displayedRoles.map((role) => <div key={role.key} className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1 text-xs"><span>{ROLE_LABEL[role.role]}</span><AccessIndicator allowed={permission[role.key]} /></div>)}</div></div>)}</div>
        </>}
      </CardContent>
    </Card>
    <div className="flex items-start gap-2.5 rounded-xl border-0 bg-muted/30 p-3.5 text-xs leading-5 text-muted-foreground shadow-2xs"><Info className="mt-0.5 size-3.5 shrink-0 text-primary" /><p>This reference reflects documented access rules. Accounts can hold multiple roles; manage assignments from the user directory.</p></div>
  </div>;
}
