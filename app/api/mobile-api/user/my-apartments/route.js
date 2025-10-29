// ============================================
// FILE: app/api/mobile-api/user/my-apartments/route.js
// Get user's apartments (owned and rented)
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  apartmentOwnerships,
  apartments,
  communities,
} from "@/lib/db/schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized - Please login",
        },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user || user.type !== "user") {
      return NextResponse.json(
        {
          success: false,
          error: "Only users can view their apartments",
        },
        { status: 403 }
      );
    }

    // Get user's apartment ownerships with apartment and community details
    const userApartments = await db
      .select({
        ownershipId: apartmentOwnerships.id,
        ownershipType: apartmentOwnerships.ownershipType,
        rulesAccepted: apartmentOwnerships.rulesAccepted,
        isAdminApproved: apartmentOwnerships.isAdminApproved,
        createdAt: apartmentOwnerships.createdAt,
        apartmentId: apartments.id,
        towerName: apartments.towerName,
        floorNumber: apartments.floorNumber,
        apartmentNumber: apartments.apartmentNumber,
        communityId: communities.id,
        communityName: communities.name,
        communityImage: communities.imageUrl,
        communityAddress: communities.fullAddress,
        district: communities.district,
        state: communities.state,
      })
      .from(apartmentOwnerships)
      .innerJoin(
        apartments,
        eq(apartmentOwnerships.apartmentId, apartments.id)
      )
      .innerJoin(communities, eq(apartments.communityId, communities.id))
      .where(eq(apartmentOwnerships.userId, user.id));

    // Separate owned and rented
    const ownedApartments = userApartments.filter(
      (apt) => apt.ownershipType === "owner"
    );
    const rentedApartments = userApartments.filter(
      (apt) => apt.ownershipType === "tenant"
    );

    return NextResponse.json({
      success: true,
      data: {
        owned: ownedApartments,
        rented: rentedApartments,
        total: userApartments.length,
      },
    });
  } catch (error) {
    console.error("❌ Fetch user apartments error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch apartments",
      },
      { status: 500 }
    );
  }
}