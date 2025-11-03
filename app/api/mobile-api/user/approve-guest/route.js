// ============================================
// FILE: mobile-api/user/approve-guest/route.js
// Approve or Deny Guest Entry
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, visitorApprovals, securities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";
import { sendFCMNotification } from "../../helpers/fcmHelper";

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

export async function POST(request) {
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
    const user = await verifyMobileToken(token);

    if (!user || user.type !== 'user') {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { guestId, approvalStatus } = body;

    // Validate input
    if (!guestId || !approvalStatus) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['approved', 'denied'].includes(approvalStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid approval status' },
        { status: 400 }
      );
    }

    // Get guest details
    const guestQuery = await db
      .select({
        id: guests.id,
        guestName: guests.guestName,
        status: guests.status,
        qrCode: guests.qrCode,
        createdByUserId: guests.createdByUserId,
      })
      .from(guests)
      .where(eq(guests.id, guestId))
      .limit(1);

    if (guestQuery.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Guest not found' },
        { status: 404 }
      );
    }

    const guest = guestQuery[0];

    // Check if user is authorized (is the apartment owner)
    // Note: JWT payload has 'id', not 'userId'
    if (guest.createdByUserId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to approve this guest' },
        { status: 403 }
      );
    }

    // Update guest status
    const newStatus = approvalStatus === 'approved' ? 'approved' : 'denied';
    await db
      .update(guests)
      .set({ status: newStatus })
      .where(eq(guests.id, guestId));

    // Create visitor approval record
    await db.insert(visitorApprovals).values({
      guestId: guestId,
      approvedByUserId: user.userId,
      approvalStatus: approvalStatus,
      approvedAt: new Date(),
    });

    console.log(`✅ Guest ${guestId} ${approvalStatus} by user ${user.userId}`);

    // Optional: Send notification to security about approval
    // This helps security know the guest has been approved
    if (approvalStatus === 'approved') {
      // You can implement security notification here if needed
      console.log(`📱 Guest approved - QR Code: ${guest.qrCode}`);
    }

    return NextResponse.json({
      success: true,
      message: `Guest ${approvalStatus} successfully`,
      data: {
        guestId: guestId,
        guestName: guest.guestName,
        status: newStatus,
        qrCode: guest.qrCode,
      },
    });

  } catch (error) {
    console.error('❌ Error in approve-guest:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch guest details
export async function GET(request) {
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
    const user = await verifyMobileToken(token);

    if (!user || user.type !== 'user') {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get guestId from query params
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');

    if (!guestId) {
      return NextResponse.json(
        { success: false, error: 'Guest ID required' },
        { status: 400 }
      );
    }

    // Fetch guest details
    const guestQuery = await db
      .select({
        id: guests.id,
        guestName: guests.guestName,
        guestPhone: guests.guestPhone,
        vehicleNumber: guests.vehicleNumber,
        photoFilename: guests.photoFilename,
        status: guests.status,
        qrCode: guests.qrCode,
        createdAt: guests.createdAt,
      })
      .from(guests)
      .where(eq(guests.id, guestId))
      .limit(1);

    if (guestQuery.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Guest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: guestQuery[0],
    });

  } catch (error) {
    console.error('❌ Error fetching guest details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
