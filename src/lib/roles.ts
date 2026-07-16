//src/lib/role.ts
/**
 * Role checking utility for the flexible multi-role system.
 * Works with both old single-role and new multi-role users.
 */

export type AppRole =
  | "ADMIN"
  | "BURSAR"
  | "TEACHER"
  | "CLASS_TEACHER"
  | "SUBJECT_TEACHER"
  | "STAFF";

/**
 * Check if a user has a specific role.
 * Works with both the old `role` string and new `roles` array.
 */
export function hasRole(
  user: { role?: string; roles?: string[] } | null,
  targetRole: AppRole
): boolean {
  if (!user) return false;

  // Check new multi-role system (exact enum match)
  if (user.roles?.includes(targetRole)) return true;

  // Check old single-role field (case-insensitive)
  const roleMap: Record<AppRole, string[]> = {
    ADMIN: ["Admin", "admin"],
    BURSAR: ["Bursar", "bursar"],
    TEACHER: ["Teacher", "teacher"],
    CLASS_TEACHER: ["ClassTeacher", "class_teacher", "Class Teacher"],
    SUBJECT_TEACHER: ["SubjectTeacher", "subject_teacher", "Subject Teacher"],
    STAFF: ["Staff", "staff"],
  };

  return roleMap[targetRole]?.includes(user.role ?? "") ?? false;
}

/**
 * Check if user has ANY of the given roles.
 */
export function hasAnyRole(
  user: { role?: string; roles?: string[] } | null,
  targetRoles: AppRole[]
): boolean {
  return targetRoles.some((r) => hasRole(user, r));
}

/**
 * Check if user is an admin (has ADMIN role).
 */
export function isAdmin(user: { role?: string; roles?: string[] } | null): boolean {
  return hasRole(user, "ADMIN");
}

/**
 * Get display-friendly label for a role value.
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: "Admin",
    BURSAR: "Bursar",
    TEACHER: "Teacher",
    CLASS_TEACHER: "Class Teacher",
    SUBJECT_TEACHER: "Subject Teacher",
    STAFF: "Staff",
  };
  return labels[role] || role;
}

/**
 * Get Tailwind classes for a role badge.
 */
export function getRoleBadgeClasses(role: string): string {
  const classes: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    BURSAR: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    TEACHER: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    CLASS_TEACHER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    SUBJECT_TEACHER: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    STAFF: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return classes[role] || classes["STAFF"];
}