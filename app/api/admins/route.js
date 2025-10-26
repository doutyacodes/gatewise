import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // your drizzle instance
import { communityAdmins } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// GET all admins
export async function GET() {
  try {
    const admins = await db.select().from(communityAdmins);
    return NextResponse.json({ admins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 }
    );
  }
}

// POST create new admin
export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, mobileNumber, password, communityId, role } = body;

    if (!name || !email || !password || !communityId)
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(communityAdmins).values({
      name,
      email,
      mobileNumber,
      password: hashedPassword,
      communityId: Number(communityId),
      role: role || "admin",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { error: "Failed to create admin" },
      { status: 500 }
    );
  }
}
