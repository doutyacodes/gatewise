// ============================================
// API: Get Current Apartment
// GET /api/mobile-api/user/current-apartment
// Returns user's currently selected apartment with all apartments they have access to
// ============================================

import { db } from '@/lib/db';
import { apartmentOwnerships, apartments, communities, userApartmentContext } from '@/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

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
        message: 'No approved apartments found',
        apartment: null,
        allApartments: [],
      });
    }

    // Determine current apartment
    let currentApartment;
    if (context) {
      // User has a saved context
      currentApartment = userApartments.find(
        (apt) => apt.apartmentId === context.currentApartmentId
      );
    }

    // If no context or context apartment not found, use first apartment
    if (!currentApartment) {
      currentApartment = userApartments[0];

      // Save this as current context
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
    console.error('Get current apartment error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
