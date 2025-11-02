// ============================================
// API: Switch Apartment
// POST /api/mobile-api/user/switch-apartment
// Updates user's current apartment context
// ============================================

import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { userApartmentContext, apartmentOwnerships, apartments, communities } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request) {
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

    const userId = await decoded.id;


    // Parse request body
    const body = await request.json();
    const { apartmentId } = body;

    if (!apartmentId) {
      return NextResponse.json(
        { success: false, message: 'Apartment ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this apartment
    const [ownership] = await db
      .select()
      .from(apartmentOwnerships)
      .where(
        and(
          eq(apartmentOwnerships.userId, userId),
          eq(apartmentOwnerships.apartmentId, apartmentId),
          eq(apartmentOwnerships.isAdminApproved, true)
        )
      )
      .limit(1);

    if (!ownership) {
      return NextResponse.json(
        { success: false, message: 'You do not have access to this apartment' },
        { status: 403 }
      );
    }

    // Get apartment details
    const [apartment] = await db
      .select({
        apartmentId: apartments.id,
        apartmentNumber: apartments.apartmentNumber,
        towerName: apartments.towerName,
        floorNumber: apartments.floorNumber,
        communityId: apartments.communityId,
        communityName: communities.name,
      })
      .from(apartments)
      .leftJoin(communities, eq(apartments.communityId, communities.id))
      .where(eq(apartments.id, apartmentId))
      .limit(1);

    if (!apartment) {
      return NextResponse.json(
        { success: false, message: 'Apartment not found' },
        { status: 404 }
      );
    }

    // Check if user has existing context
    const [existingContext] = await db
      .select()
      .from(userApartmentContext)
      .where(eq(userApartmentContext.userId, userId))
      .limit(1);

    if (existingContext) {
      // Update existing context
      await db
        .update(userApartmentContext)
        .set({
          currentApartmentId: apartmentId,
          lastSwitchedAt: new Date(),
        })
        .where(eq(userApartmentContext.userId, userId));
    } else {
      // Create new context
      await db.insert(userApartmentContext).values({
        userId,
        currentApartmentId: apartmentId,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Apartment switched successfully',
      apartment,
    });
  } catch (error) {
    console.error('Switch apartment error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
