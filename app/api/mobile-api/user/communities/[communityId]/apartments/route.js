// ============================================
// FILE: app/api/mobile-api/user/communities/[communityId]/apartments/route.js
// Fetch apartments for a specific community
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apartments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request, { params }) {
  try {
    const { communityId } = await params;

    if (!communityId) {
      return NextResponse.json(
        {
          success: false,
          error: "Community ID is required",
        },
        { status: 400 }
      );
    }

    const communityApartments = await db
      .select({
        id: apartments.id,
        towerName: apartments.towerName,
        floorNumber: apartments.floorNumber,
        apartmentNumber: apartments.apartmentNumber,
        status: apartments.status,
      })
      .from(apartments)
      .where(
        and(
          eq(apartments.communityId, Number(communityId)),
          eq(apartments.status, "active")
        )
      )
      .orderBy(apartments.towerName, apartments.floorNumber);

    return NextResponse.json({
      success: true,
      data: {
        apartments: communityApartments,
      },
    });
  } catch (error) {
    console.error("❌ Fetch apartments error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch apartments",
      },
      { status: 500 }
    );
  }
}