import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Trophy,
  LineChart,
  Users,
  Languages,
  FolderTree,
  BookOpen,
  Type,
  ClipboardCheck,
  Activity,
  FileBarChart,
  ShieldCheck,
  UserCog,
  Settings,
} from "lucide-react";
import type { Role } from "@/types/api";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: Role[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

const ADMIN: Role[] = ["ROLE_ADMIN"];
const ADMIN_MODERATOR: Role[] = ["ROLE_ADMIN", "ROLE_MODERATOR"];
const ALL_STAFF: Role[] = ["ROLE_ADMIN", "ROLE_MODERATOR", "ROLE_LANGUAGE_REVIEWER"];

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    items: [
      { label: "Overview", to: "/dashboard", icon: LayoutDashboard, roles: ADMIN },
      { label: "Leaderboard", to: "/leaderboard", icon: Trophy, roles: ADMIN_MODERATOR },
      { label: "Analytics", to: "/analytics", icon: LineChart, roles: ADMIN },
    ],
  },
  {
    label: "Users",
    items: [{ label: "All Users", to: "/users", icon: Users, roles: ADMIN }],
  },
  {
    label: "Content",
    items: [
      { label: "Languages", to: "/content/languages", icon: Languages, roles: ADMIN_MODERATOR },
      { label: "Categories", to: "/content/categories", icon: FolderTree, roles: ADMIN },
      { label: "Concepts", to: "/content/concepts", icon: BookOpen, roles: ADMIN_MODERATOR },
      { label: "Translations", to: "/content/translations", icon: Type, roles: ADMIN_MODERATOR },
    ],
  },
  {
    label: "Moderation",
    items: [
      { label: "Submission Queue", to: "/submissions", icon: ClipboardCheck, roles: ALL_STAFF },
      { label: "My Activity", to: "/activity", icon: Activity, roles: ALL_STAFF },
    ],
  },
  {
    label: "Reports",
    items: [{ label: "Platform Reports", to: "/reports", icon: FileBarChart, roles: ADMIN }],
  },
  {
    label: "Administration",
    items: [
      { label: "Admin Users", to: "/administration/admin-users", icon: UserCog, roles: ADMIN },
      { label: "Roles & Permissions", to: "/administration/roles-permissions", icon: ShieldCheck, roles: ADMIN },
      { label: "Settings", to: "/administration/settings", icon: Settings, roles: ADMIN },
    ],
  },
];
