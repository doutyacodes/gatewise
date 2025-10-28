// ============================================
// FILE: app/api/mobile-api/security/guest/[id]/route.js
// Get Guest Details API
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, users, apartmentOwnerships, apartments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";

const encoder = new TextEncoder();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

async function verifyMobileToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload;
  } catch (error) {
    return null;
  }
}

export async function GET(request, { params }) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const security = await verifyMobileToken(token);

    if (!security || security.type !== 'security') {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const guestId = parseInt(id);

    // Fetch guest with related data
    const [guest] = await db
      .select({
        id: guests.id,
        guestName: guests.guestName,
        guestType: guests.guestType,
        approvalType: guests.approvalType,
        startDate: guests.startDate,
        startTime: guests.startTime,
        purpose: guests.purpose,
        status: guests.status,
        qrCode: guests.qrCode,
        communityId: guests.communityId,
        createdByUserId: guests.createdByUserId,
        createdAt: guests.createdAt,
      })
      .from(guests)
      .where(
        and(
          eq(guests.id, guestId),
          eq(guests.communityId, security.communityId)
        )
      )
      .limit(1);

    if (!guest) {
      return NextResponse.json(
        { success: false, error: 'Guest not found' },
        { status: 404 }
      );
    }

    // Get resident (user) details
    const [resident] = await db
      .select({
        name: users.name,
        mobileNumber: users.mobileNumber,
      })
      .from(users)
      .where(eq(users.id, guest.createdByUserId))
      .limit(1);

    // Get apartment/flat number
    const [ownership] = await db
      .select({
        apartmentId: apartmentOwnerships.apartmentId,
      })
      .from(apartmentOwnerships)
      .where(eq(apartmentOwnerships.userId, guest.createdByUserId))
      .limit(1);

    let flatNumber = null;
    if (ownership) {
      const [apartment] = await db
        .select({
          apartmentNumber: apartments.apartmentNumber,
          towerName: apartments.towerName,
        })
        .from(apartments)
        .where(eq(apartments.id, ownership.apartmentId))
        .limit(1);

      if (apartment) {
        flatNumber = apartment.towerName 
          ? `${apartment.towerName}-${apartment.apartmentNumber}`
          : apartment.apartmentNumber;
      }
    }

    // Return guest data
    return NextResponse.json({
      success: true,
      data: {
        id: guest.id,
        guestName: guest.guestName,
        guestType: guest.guestType,
        approvalType: guest.approvalType,
        startDate: guest.startDate,
        startTime: guest.startTime,
        purpose: guest.purpose,
        status: guest.status,
        qrCode: guest.qrCode,
        flatNumber: flatNumber,
        residentName: resident?.name || null,
        residentPhone: resident?.mobileNumber || null,
        createdAt: guest.createdAt,
      },
    });

  } catch (error) {
    console.error('Get guest error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}