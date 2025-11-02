// ============================================
// FILE: app/api/mobile-api/user/current-apartment/route.js
// Get user's current apartment (no Bearer token version)
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
import { jwtVerify } from "jose";

const encoder = new TextEncoder();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Token verification (no Bearer)
async function verifyMobileToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload;
  } catch (error) {
    return null;
  }
}

export async function POST(request) {
  try {
    // Read request body
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    // Verify token
    const user = await verifyMobileToken(token);

    if (!user || user.type !== "user") {
      return NextResponse.json(
        { success: false, message: "Only users can access apartments" },
        { status: 403 }
      );
    }

    const userId = await user.id;

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
