import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getTenantId(request: NextRequest): string {
  return request.headers.get("x-tenant-id") || "";
}

// GET all users (no passwords)
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
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST create user
export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { email, password, username, role, imageUrl } = body;

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

    const user = await db.user.create({
      data: {
        tenantId,
        email,
        password,
        username,
        role: role || "Staff",
        imageUrl: imageUrl || "",
      },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create user" },
      { status: 500 }
    );
  }
}

// PUT update user
export async function PUT(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, email, password, username, role, imageUrl } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, string> = {};
    if (email !== undefined) updateData.email = email;
    if (username !== undefined) updateData.username = username;
    if (role !== undefined) updateData.role = role;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (password !== undefined && password.trim() !== "") updateData.password = password;

    const existing = await db.user.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
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
