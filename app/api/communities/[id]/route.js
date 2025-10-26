// ============================================
// FILE: app/api/communities/[id]/route.js
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

// PUT - Update community
export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies(); // ✅ Await added
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== "superadmin") {
      return NextResponse.json(
        { error: "Only super admins can update communities" },
        { status: 403 }
      );
    }

    const { id } = await params; // ✅
    const body = await request.json();
    const {
      name,
      fullAddress,
      district,
      state,
      country,
      pincode,
      latitude,
      longitude,
      imageUrl,
    } = body;

    if (!name || !fullAddress) {
      return NextResponse.json(
        { error: "Name and full address are required" },
        { status: 400 }
      );
    }

    await db
      .update(communities)
      .set({
        name,
        fullAddress,
        district: district || null,
        state: state || null,
        country: country || "India",
        pincode: pincode || null,
        latitude: latitude || null,
        longitude: longitude || null,
        imageUrl: imageUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(communities.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: "Community updated successfully",
    });
  } catch (error) {
    console.error("Update community error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete community
export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies(); // ✅ Await added
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== "superadmin") {
      return NextResponse.json(
        { error: "Only super admins can delete communities" },
        { status: 403 }
      );
    }

    const { id } = await params; // ✅

    await db.delete(communities).where(eq(communities.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: "Community deleted successfully",
    });
  } catch (error) {
    console.error("Delete community error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
