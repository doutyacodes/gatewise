// ============================================
// FILE: app/api/mobile-api/user/profile/route.js
// User Profile API (Fetch and Update)
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/app/api/mobile-api/middleware/auth";

// GET - Fetch user profile
export async function GET(request) {
  try {
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        mobileNumber: users.mobileNumber,
        profileImage: users.profileImage,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, authResult.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("❌ Fetch profile error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// POST - Update user profile
export async function POST(request) {
  try {
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Update user
    await db
      .update(users)
      .set({
        name: name.trim(),
        email: email?.trim().toLowerCase() || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, authResult.userId));

    // Fetch updated user
    const [updatedUser] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        mobileNumber: users.mobileNumber,
        profileImage: users.profileImage,
      })
      .from(users)
      .where(eq(users.id, authResult.userId))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    console.error("❌ Update profile error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
