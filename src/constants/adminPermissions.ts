/** Permission keys for admin RBAC (foodcity-admin only). */
export const ADMIN_PERMISSIONS = [
  "dashboard",
  "orders",
  "sales-ads",
  "jobs",
  "chat",
  "site-content",
  "admin-users",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ALL_ADMIN_PERMISSIONS: string[] = [...ADMIN_PERMISSIONS];

export function adminHasPermission(
  permissions: string[] | undefined,
  required: AdminPermission | "upload",
): boolean {
  const p = permissions ?? [];
  if (p.includes("*")) return true;
  if (required === "upload") {
    return (
      p.includes("sales-ads") ||
      p.includes("jobs") ||
      p.includes("site-content")
    );
  }
  return p.includes(required);
}

export function adminHasAnyPermission(
  permissions: string[] | undefined,
  options: readonly AdminPermission[],
): boolean {
  const p = permissions ?? [];
  if (p.includes("*")) return true;
  return options.some((x) => p.includes(x));
}
