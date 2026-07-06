import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SystemRole } from "@prisma/client";

function getTenantId(request: NextRequest): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET all users with their roles
export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);

    const users = await db.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map userRoles to a simple string array
    const usersWithRoles = users.map((u) => ({
      ...u,
      roles: u.userRoles.map((ur) => ur.role),
    }));

    return NextResponse.json(usersWithRoles);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST create user with multiple roles
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { email, password, username, role, roles, imageUrl } = body;

    if (!email || !password || !username) {
      return NextResponse.json(
        { success: false, message: "Email, password, and username are required" },
        { status: 400 }
      );
    }

    // Check for duplicate email within the same tenant
    const existingUser = await db.user.findFirst({
      where: { tenantId, email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Check plan limit for users
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) {
      const userCount = await db.user.count({ where: { tenantId } });
      if (userCount >= tenant.maxUsers) {
        return NextResponse.json(
          {
            success: false,
            message: `User limit reached (${tenant.maxUsers}). Upgrade your plan to add more users.`,
            code: "PLAN_LIMIT",
          },
          { status: 403 }
        );
      }
    }

    // Determine primary role (for backward compat) from the roles array
    const resolvedRoles: string[] = Array.isArray(roles) && roles.length > 0
      ? roles
      : role
        ? [role]
        : ["Staff"];

    // If "Admin" is in roles, use it as primary; otherwise use first role
    const primaryRole = resolvedRoles.includes("Admin")
      ? "Admin"
      : resolvedRoles[0] || "Staff";

    // Validate all roles
    const validRoles = Object.values(SystemRole);
    const invalidRoles = resolvedRoles.filter(
      (r) => !validRoles.includes(r as SystemRole)
    );
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { success: false, message: `Invalid roles: ${invalidRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const user = await db.user.create({
      data: {
        tenantId,
        email,
        password,
        username,
        role: primaryRole,
        imageUrl: imageUrl || "",
        userRoles: {
          create: resolvedRoles.map((r) => ({
            tenantId,
            role: r as SystemRole,
          })),
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: { role: true },
        },
      },
    });

    const userWithRoles = {
      ...user,
      roles: user.userRoles.map((ur) => ur.role),
    };

    return NextResponse.json(userWithRoles, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create user" },
      { status: 500 }
    );
  }
}

// PUT update user (including roles)
export async function PUT(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, email, password, username, role, roles, imageUrl } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.user.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, string> = {};
    if (email !== undefined) updateData.email = email;
    if (username !== undefined) updateData.username = username;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (password !== undefined && password.trim() !== "") updateData.password = password;

    // Handle role updates
    if (roles !== undefined) {
      const validRoles = Object.values(SystemRole);
      const invalidRoles = roles.filter(
        (r: string) => !validRoles.includes(r as SystemRole)
      );
      if (invalidRoles.length > 0) {
        return NextResponse.json(
          { success: false, message: `Invalid roles: ${invalidRoles.join(", ")}` },
          { status: 400 }
        );
      }

      // Determine primary role
      const primaryRole = roles.includes("Admin")
        ? "Admin"
        : roles[0] || "Staff";
      updateData.role = primaryRole;

      // Delete existing roles and create new ones
      await db.userRole.deleteMany({ where: { userId: id } });
      await db.userRole.createMany({
        data: roles.map((r: string) => ({
          userId: id,
          tenantId,
          role: r as SystemRole,
        })),
      });
    } else if (role !== undefined) {
      // Backward compat: single role string
      updateData.role = role;
      const validRoles = Object.values(SystemRole);
      if (validRoles.includes(role as SystemRole)) {
        await db.userRole.deleteMany({ where: { userId: id } });
        await db.userRole.create({
          data: { userId: id, tenantId, role: role as SystemRole },
        });
      }
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: { role: true },
        },
      },
    });

    const userWithRoles = {
      ...user,
      roles: user.userRoles.map((ur) => ur.role),
    };

    return NextResponse.json(userWithRoles);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE user by id
export async function DELETE(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const existing = await db.user.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete user" },
      { status: 500 }
    );
  }
}