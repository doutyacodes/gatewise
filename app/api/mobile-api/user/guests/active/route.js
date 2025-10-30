// ============================================
// API: Active Guests
// GET /api/mobile-api/user/guests/active
// Returns only frequent guests for management (active/inactive toggle)
// ============================================

import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { guests, apartments, communities, users, qrScans } from '@/lib/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

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

    // Get frequent guests only
    // Show both active and inactive so user can toggle them
    const activeGuests = await db
      .select({
        id: guests.id,
        guestName: guests.guestName,
        guestPhone: guests.guestPhone,
        guestType: guests.guestType,
        approvalType: guests.approvalType,
        totalMembers: guests.totalMembers,
        vehicleNumber: guests.vehicleNumber,
        purpose: guests.purpose,
        status: guests.status,
        isActive: guests.isActive,
        startDate: guests.startDate,
        endDate: guests.endDate,
        startTime: guests.startTime,
        endTime: guests.endTime,
        qrCode: guests.qrCode,
        qrEncryptedData: guests.qrEncryptedData,
        photoFilename: guests.photoFilename,
        createdAt: guests.createdAt,
        apartmentNumber: apartments.apartmentNumber,
        towerName: apartments.towerName,
        floorNumber: apartments.floorNumber,
        communityName: communities.name,
        createdByName: users.name,
        // Count visits
        visitCount: sql<number>`(
          SELECT COUNT(*)
          FROM qr_scans
          WHERE qr_scans.guest_id = ${guests.id}
        )`,
        lastScannedAt: sql<Date>`(
          SELECT MAX(scanned_at)
          FROM qr_scans
          WHERE qr_scans.guest_id = ${guests.id}
        )`,
      })
      .from(guests)
      .leftJoin(apartments, eq(guests.apartmentId, apartments.id))
      .leftJoin(communities, eq(guests.communityId, communities.id))
      .leftJoin(users, eq(guests.createdByUserId, users.id))
      .where(
        and(
          eq(guests.guestType, 'frequent'),
          // Hide private guests from other users
          or(
            eq(guests.createdByUserId, userId),
            sql`${guests.approvalType} != 'private'`
          )
        )
      )
      .orderBy(desc(guests.isActive), desc(guests.createdAt));

    return NextResponse.json({
      success: true,
      guests: activeGuests,
      total: activeGuests.length,
      activeCount: activeGuests.filter((g) => g.isActive).length,
      inactiveCount: activeGuests.filter((g) => !g.isActive).length,
    });
  } catch (error) {
    console.error('Active guests error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
