// ============================================
// FILE: mobile-api/user/approve-delivery/route.js
// Approve or Deny Delivery
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveryLogs, deliveryApprovals } from "@/lib/db/schema";
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
    const { deliveryId, approvalStatus } = body;

    // Validate input
    if (!deliveryId || !approvalStatus) {
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

    // Get delivery details
    const deliveryQuery = await db
      .select({
        id: deliveryLogs.id,
        deliveryPersonName: deliveryLogs.deliveryPersonName,
        companyName: deliveryLogs.companyName,
        approvalStatus: deliveryLogs.approvalStatus,
        communityId: deliveryLogs.communityId,
      })
      .from(deliveryLogs)
      .where(eq(deliveryLogs.id, deliveryId))
      .limit(1);

    if (deliveryQuery.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Delivery not found' },
        { status: 404 }
      );
    }

    const delivery = deliveryQuery[0];

    // Update delivery approval status
    await db
      .update(deliveryLogs)
      .set({
        approvalStatus: approvalStatus,
        approvedByUserId: user.userId,
        approvedAt: new Date(),
      })
      .where(eq(deliveryLogs.id, deliveryId));

    // Create delivery approval record
    await db.insert(deliveryApprovals).values({
      deliveryId: deliveryId,
      approvedByUserId: user.userId,
      approvalStatus: approvalStatus,
      approvedAt: new Date(),
    });

    console.log(`✅ Delivery ${deliveryId} ${approvalStatus} by user ${user.userId}`);

    // Optional: Send notification to security about approval
    if (approvalStatus === 'approved') {
      console.log(`📱 Delivery approved - ID: ${deliveryId}`);
    }

    return NextResponse.json({
      success: true,
      message: `Delivery ${approvalStatus} successfully`,
      data: {
        deliveryId: deliveryId,
        companyName: delivery.companyName,
        deliveryPersonName: delivery.deliveryPersonName,
        approvalStatus: approvalStatus,
      },
    });

  } catch (error) {
    console.error('❌ Error in approve-delivery:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch delivery details
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

    // Get deliveryId from query params
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('deliveryId');

    if (!deliveryId) {
      return NextResponse.json(
        { success: false, error: 'Delivery ID required' },
        { status: 400 }
      );
    }

    // Fetch delivery details
    const deliveryQuery = await db
      .select({
        id: deliveryLogs.id,
        deliveryPersonName: deliveryLogs.deliveryPersonName,
        companyName: deliveryLogs.companyName,
        companyLogo: deliveryLogs.companyLogo,
        vehicleNumber: deliveryLogs.vehicleNumber,
        photoFilename: deliveryLogs.photoFilename,
        purpose: deliveryLogs.purpose,
        approvalStatus: deliveryLogs.approvalStatus,
        entryTime: deliveryLogs.entryTime,
        createdAt: deliveryLogs.createdAt,
      })
      .from(deliveryLogs)
      .where(eq(deliveryLogs.id, deliveryId))
      .limit(1);

    if (deliveryQuery.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Delivery not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deliveryQuery[0],
    });

  } catch (error) {
    console.error('❌ Error fetching delivery details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
