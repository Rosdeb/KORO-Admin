import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { NAV_SECTIONS } from "./nav-config";

const TITLES: Record<string, string> = {
  dashboard: "Overview",
  analytics: "Analytics",
  users: "All Users",
  content: "Content",
  languages: "Languages",
  categories: "Categories",
  concepts: "Concepts",
  translations: "Translations",
  submissions: "Submission Queue",
  activity: "My Activity",
  reports: "Platform Reports",
  administration: "Administration",
  "admin-users": "Admin Users",
  "roles-permissions": "Roles & Permissions",
  settings: "Settings",
};

function labelFor(segment: string, isLast: boolean, params: Record<string, string | undefined>) {
  if (isLast && params.id === segment) return "Details";
  return TITLES[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs() {
  const location = useLocation();
  const params = useParams();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const flatNavLookup = new Map<string, string>();
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) flatNavLookup.set(item.to, item.label);
  }

  const crumbs = segments.reduce<{ label: string; to: string; isLast: boolean }[]>((acc, segment, i) => {
    const to = `${acc[i - 1]?.to ?? ""}/${segment}`;
    const isLast = i === segments.length - 1;
    const navLabel = flatNavLookup.get(to);
    acc.push({ label: navLabel ?? labelFor(segment, isLast, params), to, isLast });
    return acc;
  }, []);

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {crumbs.map((crumb) => (
        <span key={crumb.to} className="flex items-center gap-1.5">
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <>
              <Link to={crumb.to} className="hover:text-foreground">
                {crumb.label}
              </Link>
              <ChevronRight className="size-3.5" />
            </>
          )}
        </span>
      ))}
    </nav>
  );
}
