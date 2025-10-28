// FILE: app/api/securities/[id]/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securities } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ======================================================
// UPDATE SECURITY STAFF
// ======================================================
export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    const { id } = await params;
    const numericId = Number(id);

    // ✅ Fetch staff by ID
    const [staff] = await db
      .select()
      .from(securities)
      .where(eq(securities.id, numericId));

    if (!staff || staff.communityId !== user.communityId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ✅ Parse update data
    const body = await request.json();
    const { name, mobileNumber, username, password, shiftTiming, photoUrl } = body;

    // ✅ Prepare update object
    const updateData = {
      name,
      mobileNumber,
      shiftTiming,
      photoUrl,
    };

    // ✅ Only update username if provided and different
    if (username && username !== staff.username) {
      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          { error: "Username must be 3-20 characters (letters, numbers, underscore only)" },
          { status: 400 }
        );
      }

      // Check if new username already exists
      const [existingUser] = await db
        .select()
        .from(securities)
        .where(eq(securities.username, username))
        .limit(1);

      if (existingUser && existingUser.id !== numericId) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 400 }
        );
      }

      updateData.username = username;
    }

    // ✅ Only update password if provided
    if (password && password.trim() !== "") {
      // Validate password strength (optional)
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    // ✅ Update security staff
    await db
      .update(securities)
      .set(updateData)
      .where(eq(securities.id, numericId));

    return NextResponse.json({ 
      success: true,
      message: "Security staff updated successfully"
    });
  } catch (error) {
    console.error("PUT securities error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ======================================================
// DELETE SECURITY STAFF
// ======================================================
export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    const { id } = await params;
    const numericId = Number(id);

    // ✅ Only allow delete if staff belongs to admin's community
    const [staff] = await db
      .select()
      .from(securities)
      .where(eq(securities.id, numericId));

    if (!staff || staff.communityId !== user.communityId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(securities).where(eq(securities.id, numericId));

    return NextResponse.json({ 
      success: true,
      message: "Security staff deleted successfully"
    });
  } catch (error) {
    console.error("DELETE securities error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}