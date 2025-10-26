import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securities } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

// ======================================================
// GET - Fetch all securities for this admin's community
// ======================================================
export async function GET() {
  try {
    const cookieStore = await cookies(); // ✅ must await in Next.js 15
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    const staff = await db
      .select()
      .from(securities)
      .where(eq(securities.communityId, user.communityId));

    return NextResponse.json({ securities: staff });
  } catch (error) {
    console.error("GET securities error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ======================================================
// POST - Add new security staff
// ======================================================
export async function POST(request) {
  try {
    const cookieStore = await cookies(); // ✅ must await here too
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    const body = await request.json();
    const { name, mobileNumber, shiftTiming, photoUrl } = body;

    if (!name || !mobileNumber) {
      return NextResponse.json(
        { error: "Name and mobile number are required" },
        { status: 400 }
      );
    }

    await db.insert(securities).values({
      name,
      mobileNumber,
      shiftTiming: shiftTiming || null,
      photoUrl: photoUrl || null,
      communityId: user.communityId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Security staff added successfully",
    });
  } catch (error) {
    console.error("POST securities error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
