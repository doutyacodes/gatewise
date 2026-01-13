// ============================================
// FILE: app/api/mobile-api/user/current-apartment/route.js
// Get user's current apartment
// ============================================

import { db } from "@/lib/db";
import {
  apartmentOwnerships,
  apartments,
  communities,
  userApartmentContext,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/mobile-api/middleware/auth";

export async function POST(request) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request, ['user']);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;

    // Get user's current apartment context
    const [context] = await db
      .select()
      .from(userApartmentContext)
      .where(eq(userApartmentContext.userId, userId))
      .limit(1);

    // Get all apartments user has access to
    const userApartments = await db
      .select({
        apartmentId: apartmentOwnerships.apartmentId,
        ownershipType: apartmentOwnerships.ownershipType,
        apartmentNumber: apartments.apartmentNumber,
        towerName: apartments.towerName,
        floorNumber: apartments.floorNumber,
        communityId: apartments.communityId,
        communityName: communities.name,
        isAdminApproved: apartmentOwnerships.isAdminApproved,
      })
      .from(apartmentOwnerships)
      .innerJoin(apartments, eq(apartmentOwnerships.apartmentId, apartments.id))
      .innerJoin(communities, eq(apartments.communityId, communities.id))
      .where(
        and(
          eq(apartmentOwnerships.userId, userId),
          eq(apartmentOwnerships.isAdminApproved, true)
        )
      );

    if (userApartments.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No approved apartments found",
        apartment: null,
        allApartments: [],
      });
    }

    // Determine current apartment
    let currentApartment;
    if (context) {
      currentApartment = userApartments.find(
        (apt) => apt.apartmentId === context.currentApartmentId
      );
    }

    // If no context or invalid context, pick the first apartment
    if (!currentApartment) {
      currentApartment = userApartments[0];

      if (context) {
        await db
          .update(userApartmentContext)
          .set({
            currentApartmentId: currentApartment.apartmentId,
            lastSwitchedAt: new Date(),
          })
          .where(eq(userApartmentContext.userId, userId));
      } else {
        await db.insert(userApartmentContext).values({
          userId,
          currentApartmentId: currentApartment.apartmentId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      apartment: currentApartment,
      allApartments: userApartments,
    });
  } catch (error) {
    console.error("❌ Get current apartment error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
