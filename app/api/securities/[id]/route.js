// FILE: app/api/securities/[id]/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securities } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

// UPDATE SECURITY STAFF
export async function PUT(request, { params }) {
  try {
    // ✅ Await cookies() in Next.js 14.3+ / 15
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    // ✅ params should NOT be awaited
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
    const { name, mobileNumber, shiftTiming, photoUrl } = body;

    await db
      .update(securities)
      .set({ name, mobileNumber, shiftTiming, photoUrl })
      .where(eq(securities.id, numericId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT securities error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE SECURITY STAFF
export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies(); // ✅ Await cookies()
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE securities error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
