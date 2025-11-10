// ============================================
// FILE: app/api/mobile-api/user/switch-apartment/route.js
// Switch current apartment for logged-in user
// ============================================

import { db } from "@/lib/db";
import { userApartmentContext, apartmentOwnerships, apartments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

const encoder = new TextEncoder();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

async function verifyMobileToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload;
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const user = await verifyMobileToken(token);
    if (!user) return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });

    const { apartmentId } = await request.json();

    if (!apartmentId)
      return NextResponse.json({ success: false, message: "apartmentId is required" }, { status: 400 });

    // Validate apartment ownership
    const [ownership] = await db
      .select()
      .from(apartmentOwnerships)
      .where(eq(apartmentOwnerships.userId, user.id));

    if (!ownership)
      return NextResponse.json({ success: false, message: "Apartment not found or unauthorized" }, { status: 404 });

    // Check if context already exists
    const [existing] = await db
      .select()
      .from(userApartmentContext)
      .where(eq(userApartmentContext.userId, user.id));

    if (existing) {
      await db
        .update(userApartmentContext)
        .set({
          currentApartmentId: apartmentId,
          lastSwitchedAt: new Date(),
        })
        .where(eq(userApartmentContext.userId, user.id));
    } else {
      await db.insert(userApartmentContext).values({
        userId: user.id,
        currentApartmentId: apartmentId,
      });
    }

    // Get apartment info for confirmation
    const [apartmentInfo] = await db
      .select({
        id: apartments.id,
        apartmentNumber: apartments.apartmentNumber,
        towerName: apartments.towerName,
      })
      .from(apartments)
      .where(eq(apartments.id, apartmentId));

    return NextResponse.json({
      success: true,
      message: "Apartment switched successfully",
      apartment: apartmentInfo,
    });
  } catch (err) {
    console.error("❌ Switch apartment error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
