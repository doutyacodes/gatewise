// ============================================
// FILE: app/api/admin/rent-sessions/route.js
// Admin: View All Rent Sessions
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rentSessions, apartments, communities, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { alias } from "drizzle-orm/mysql-core";

const ownerUsers = alias(users, "ownerUsers");
const tenantUsers = alias(users, "tenantUsers");

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const admin = await verifyToken(token);
    if (!admin || admin.type !== "admin") {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    // Get all rent sessions for admin's community
    const sessions = await db
      .select({
        id: rentSessions.id,
        status: rentSessions.status,
        rentAmount: rentSessions.rentAmount,
        maintenanceCost: rentSessions.maintenanceCost,
        startDate: rentSessions.startDate,
        endDate: rentSessions.endDate,
        createdAt: rentSessions.createdAt,
        ownerId: rentSessions.ownerId,
        tenantId: rentSessions.tenantId,
        apartmentId: rentSessions.apartmentId,
        durationMonths: rentSessions.durationMonths,
        apartmentNumber: apartments.apartmentNumber,
        towerName: apartments.towerName,
        communityName: communities.name,
        ownerName: ownerUsers.name,
        ownerPhone: ownerUsers.mobileNumber,
        tenantName: tenantUsers.name,
        tenantPhone: tenantUsers.mobileNumber,
      })
      .from(rentSessions)
      .innerJoin(apartments, eq(rentSessions.apartmentId, apartments.id))
      .innerJoin(communities, eq(apartments.communityId, communities.id))
      .leftJoin(ownerUsers, eq(rentSessions.ownerId, ownerUsers.id))
      .leftJoin(tenantUsers, eq(rentSessions.tenantId, tenantUsers.id))
      .where(eq(apartments.communityId, admin.communityId));

    return NextResponse.json({
      success: true,
      sessions,
    });

  } catch (error) {
    console.error("Get rent sessions error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
