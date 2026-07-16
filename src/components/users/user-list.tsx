"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  UserCog, Plus, Pencil, Trash2, Search,
  Shield, ShieldAlert, GraduationCap, Wallet, BookOpen, Users,
} from "lucide-react";
import { useAppStore } from "@/store/index";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Role definitions ───
const ROLE_OPTIONS = [
  {
    value: "ADMIN",
    label: "Admin",
    description: "Full system access, manage users & settings",
    icon: Shield,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  {
    value: "BURSAR",
    label: "Bursar",
    description: "Manage fees, payments, and finances",
    icon: Wallet,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    value: "TEACHER",
    label: "Teacher",
    description: "General teacher access (portal, results view)",
    icon: Users,
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  {
    value: "CLASS_TEACHER",
    label: "Class Teacher",
    description: "Manage assigned class students & attendance",
    icon: GraduationCap,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    value: "SUBJECT_TEACHER",
    label: "Subject Teacher",
    description: "Manage subjects, assignments & scores",
    icon: BookOpen,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  BURSAR: "Bursar",
  TEACHER: "Teacher",
  CLASS_TEACHER: "Class Teacher",
  SUBJECT_TEACHER: "Subject Teacher",
  STAFF: "Staff",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  BURSAR: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  TEACHER: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  CLASS_TEACHER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SUBJECT_TEACHER: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  STAFF: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

interface UserRecord {
  id: string;
  email: string;
  username: string;
  role: string;
  roles: string[];
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export default function UserListView() {
  const { user } = useAppStore();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRoles, setFormRoles] = useState<RoleValue[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "Admin") {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [fetchUsers, user?.role]);

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Toggle a role in the checkbox group
  const toggleRole = (roleValue: RoleValue) => {
    setFormRoles((prev) =>
      prev.includes(roleValue)
        ? prev.filter((r) => r !== roleValue)
        : [...prev, roleValue]
    );
  };

  const openAdd = () => {
    setEditingUser(null);
    setFormUsername("");
    setFormEmail("");
    setFormPassword("");
    setFormRoles([]);
    setDialogOpen(true);
  };

  const openEdit = (u: UserRecord) => {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormEmail(u.email);
    setFormPassword("");
    // Map old single-role users to the new system
    const oldRoleMap: Record<string, string[]> = {
      Admin: ["ADMIN"],
      Bursar: ["BURSAR"],
      Teacher: ["TEACHER"],
      ClassTeacher: ["CLASS_TEACHER"],
      "Class Teacher": ["CLASS_TEACHER"],
      SubjectTeacher: ["SUBJECT_TEACHER"],
      "Subject Teacher": ["SUBJECT_TEACHER"],
      Staff: [],
    };
    setFormRoles(
      (u.roles && u.roles.length > 0
        ? u.roles
        : oldRoleMap[u.role] || []
      ) as RoleValue[]
    );
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const trimmedUsername = formUsername.trim();
    const trimmedEmail = formEmail.trim();
    if (!trimmedUsername) {
      toast.error("Username is required");
      return;
    }
    if (!trimmedEmail) {
      toast.error("Email is required");
      return;
    }
    if (!editingUser && !formPassword.trim()) {
      toast.error("Password is required for new users");
      return;
    }

    try {
      setSubmitting(true);
      const method = editingUser ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        username: trimmedUsername,
        email: trimmedEmail,
        roles: formRoles,
      };

      if (editingUser) {
        body.id = editingUser.id;
      } else {
        body.password = formPassword.trim();
      }

      const res = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || "Operation failed");
      }

      toast.success(
        editingUser
          ? "User updated successfully"
          : "User added successfully"
      );
      setDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save user"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.id === user?.id) {
      toast.error("You cannot delete your own account");
      setDeleteTarget(null);
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || "Delete failed");
      }
      toast.success("User deleted successfully");
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete user"
      );
    } finally {
      setDeleting(false);
    }
  };

  // Access denied — check both old role and new roles array
  const hasAdminAccess =
    user?.role === "Admin" ||
    user?.roles?.includes("ADMIN") ||
    user?.roles?.includes("Admin");

  if (user && !hasAdminAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground max-w-sm">
            User management is restricted to administrators only. Contact your
            admin if you need access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UserCog className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage system users and assign multiple roles
            </p>
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  {debouncedSearch
                    ? "No users match your search."
                    : "No users found. Click 'Add User' to create one."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u, idx) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(u.roles && u.roles.length > 0
                        ? u.roles
                        : u.role === "Admin"
                          ? ["ADMIN"]
                          : u.role === "Teacher"
                            ? ["TEACHER"]
                            : u.role === "Bursar"
                              ? ["BURSAR"]
                              : u.role === "ClassTeacher" || u.role === "Class Teacher"
                                ? ["CLASS_TEACHER"]
                                : u.role === "SubjectTeacher" || u.role === "Subject Teacher"
                                  ? ["SUBJECT_TEACHER"]
                                  : []
                      ).map((r) => (
                        <Badge
                          key={r}
                          variant="secondary"
                          className={ROLE_COLORS[r] || ROLE_COLORS["STAFF"]}
                        >
                          {ROLE_LABELS[r] || r}
                        </Badge>
                      ))}
                      {(!u.roles || u.roles.length === 0) &&
                        u.role !== "Admin" &&
                        u.role !== "Teacher" &&
                        u.role !== "Bursar" &&
                        u.role !== "ClassTeacher" &&
                        u.role !== "Class Teacher" &&
                        u.role !== "SubjectTeacher" &&
                        u.role !== "Subject Teacher" && (
                          <Badge
                            variant="secondary"
                            className={ROLE_COLORS[u.role] || ROLE_COLORS["STAFF"]}
                          >
                            {ROLE_LABELS[u.role] || u.role}
                          </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(u)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.id === user?.id}
                        title={
                          u.id === user?.id
                            ? "Cannot delete yourself"
                            : "Delete"
                        }
                      >
                        <Trash2
                          className={`h-4 w-4 ${u.id === user?.id
                              ? "text-muted-foreground"
                              : "text-destructive"
                            }`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog with Checkbox Roles */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update the user details and role assignments below."
                : "Enter the details for the new user account. You can assign multiple roles."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="user-username">Username</Label>
              <Input
                id="user-username"
                placeholder="Enter username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="Enter email address"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="user-password">
                Password{" "}
                {!editingUser && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <Input
                id="user-password"
                type="password"
                placeholder={
                  editingUser
                    ? "Leave blank to keep current password"
                    : "Enter password"
                }
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
              {editingUser && (
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep the existing password unchanged.
                </p>
              )}
            </div>

            {/* Role Checkboxes */}
            <div className="space-y-3">
              <Label>Assign Roles</Label>
              <p className="text-xs text-muted-foreground">
                Select one or more roles for this user. Each role grants
                access to different features.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {ROLE_OPTIONS.map((roleOption) => {
                  const Icon = roleOption.icon;
                  const isChecked = formRoles.includes(roleOption.value);
                  return (
                    <label
                      key={roleOption.value}
                      className={`
                        flex items-start gap-3 rounded-lg border p-3 cursor-pointer
                        transition-all duration-200
                        ${isChecked
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                        }
                      `}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleRole(roleOption.value)}
                        className="mt-0.5"
                      />
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="space-y-0.5">
                          <span className="text-sm font-medium leading-none">
                            {roleOption.label}
                          </span>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            {roleOption.description}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {formRoles.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No roles assigned — the user will have Staff-level access only.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingUser
                  ? "Update User"
                  : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.id === user?.id ? (
                "You cannot delete your own account. This action is not allowed."
              ) : (
                <>
                  Are you sure you want to delete user{" "}
                  <span className="font-semibold text-foreground">
                    &quot;{deleteTarget?.username}&quot;
                  </span>
                  ? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && deleteTarget.id !== user?.id && (
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}