import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securities } from "@/lib/db/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ======================================================
// GET - Fetch all securities for this admin's community
// ======================================================
export async function GET() {
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

    const staff = await db
      .select()
      .from(securities)
      .where(eq(securities.communityId, user.communityId));

    // ✅ Remove password from response
    const sanitizedStaff = staff.map(({ password, ...rest }) => rest);

    return NextResponse.json({ securities: sanitizedStaff });
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
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    const body = await request.json();
    const { name, mobileNumber, username, password, shiftTiming, photoUrl } = body;

    // ✅ Validate required fields
    if (!name || !mobileNumber || !username || !password) {
      return NextResponse.json(
        { error: "Name, mobile number, username, and password are required" },
        { status: 400 }
      );
    }

    // ✅ Validate username format (alphanumeric and underscore only)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters (letters, numbers, underscore only)" },
        { status: 400 }
      );
    }

    // ✅ Check if username already exists
    const [existingUser] = await db
      .select()
      .from(securities)
      .where(eq(securities.username, username))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Insert new security staff
    await db.insert(securities).values({
      name,
      mobileNumber,
      username,
      password: hashedPassword,
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