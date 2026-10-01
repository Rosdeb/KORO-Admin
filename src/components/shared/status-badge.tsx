import { Badge } from "@/components/ui/badge";
import type { ContactMessageStatus, Role, SubmissionStatus, UserStatus } from "@/types/api";

const USER_STATUS_VARIANT: Record<UserStatus, "success" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  SUSPENDED: "destructive",
  INACTIVE: "secondary",
};

export function UserStatusBadge({ status }: { status: UserStatus | string }) {
  const variant = USER_STATUS_VARIANT[status as UserStatus] ?? "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

const SUBMISSION_STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus | string }) {
  const variant = SUBMISSION_STATUS_VARIANT[status] ?? "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

const CONTACT_MESSAGE_STATUS_VARIANT: Record<ContactMessageStatus, "warning" | "secondary" | "success" | "outline"> = {
  PENDING: "warning",
  READ: "secondary",
  REPLIED: "success",
  ARCHIVED: "outline",
};

export function ContactMessageStatusBadge({ status }: { status: ContactMessageStatus | string }) {
  const variant = CONTACT_MESSAGE_STATUS_VARIANT[status as ContactMessageStatus] ?? "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export const ROLE_LABEL: Record<Role, string> = {
  ROLE_ADMIN: "Admin",
  ROLE_LANGUAGE_REVIEWER: "Reviewer",
  ROLE_USER: "User",
  ROLE_MODERATOR: "Moderator",
};

const ROLE_VARIANT: Record<Role, "default" | "outline" | "secondary"> = {
  ROLE_ADMIN: "default",
  ROLE_LANGUAGE_REVIEWER: "outline",
  ROLE_USER: "secondary",
  ROLE_MODERATOR: "secondary",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={ROLE_VARIANT[role] ?? "secondary"}>{ROLE_LABEL[role] ?? role}</Badge>;
}
