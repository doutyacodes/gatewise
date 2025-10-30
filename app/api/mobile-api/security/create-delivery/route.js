// ============================================
// FILE: app/api/mobile-api/security/create-delivery/route.js
// Create Delivery Log - Updated with New Fields & Notifications
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveryLogs, apartmentOwnerships, users, apartments } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
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
    const security = await verifyMobileToken(token);

    if (!security || security.type !== 'security') {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      deliveryPersonName,
      companyName,
      companyLogo,
      vehicleNumber,
      purpose,
      photoFilename, // filename from PHP upload
      apartmentId, // NEW: apartment ID for notification
    } = body;

    // Validate required fields
    if (!deliveryPersonName || !companyName || !photoFilename) {
      return NextResponse.json(
        { success: false, error: 'Delivery person name, company, and photo are required' },
        { status: 400 }
      );
    }

    if (!apartmentId) {
      return NextResponse.json(
        { success: false, error: 'Apartment ID is required' },
        { status: 400 }
      );
    }

    // Get current timestamp
    const now = new Date();

    // Insert delivery log
    const result = await db.insert(deliveryLogs).values({
      communityId: security.communityId,
      securityId: security.id,
      deliveryPersonName: deliveryPersonName.trim(),
      companyName: companyName.trim(),
      companyLogo: companyLogo || 'courier.png', // Default to courier
      vehicleNumber: vehicleNumber?.trim().toUpperCase() || null,
      photoFilename: photoFilename,
      purpose: purpose?.trim() || null,
      entryTime: now,
      exitTime: null,
      createdAt: now,
      apartmentId: apartmentId, // Store apartment ID
      approvalStatus: 'pending', // Set initial status
    });

    const deliveryId = result[0].insertId;

    // ==============================
    // SEND NOTIFICATION TO RESIDENT
    // ==============================
    let notificationSent = false;

    try {
      // Find apartment owner
      const residentQuery = await db
        .select({
          userId: apartmentOwnerships.userId,
          isApproved: apartmentOwnerships.isAdminApproved,
          userName: users.name,
          userFcmToken: users.fcmToken,
          userExpoPushToken: users.expoPushToken,
          apartmentNumber: apartments.apartmentNumber,
          towerName: apartments.towerName,
        })
        .from(apartmentOwnerships)
        .leftJoin(users, eq(apartmentOwnerships.userId, users.id))
        .leftJoin(apartments, eq(apartmentOwnerships.apartmentId, apartments.id))
        .where(
          and(
            eq(apartmentOwnerships.apartmentId, apartmentId),
            eq(apartmentOwnerships.isAdminApproved, true)
          )
        )
        .limit(1);

      if (residentQuery.length > 0) {
        const residentData = residentQuery[0];
        const apartmentDisplay = residentData.towerName
          ? `${residentData.towerName} - ${residentData.apartmentNumber}`
          : residentData.apartmentNumber;

        console.log(`📱 Sending delivery notification to user: ${residentData.userName}`);

        // Prepare notification data
        const notificationTitle = '📦 New Delivery';
        const notificationBody = `Delivery from ${companyName} for ${apartmentDisplay}`;
        const notificationData = {
          type: 'delivery_arrival',
          screen: 'user/delivery-approval',
          deliveryId: deliveryId.toString(),
          companyName: companyName,
          deliveryPersonName: deliveryPersonName,
          apartmentNumber: residentData.apartmentNumber,
          apartmentId: apartmentId.toString(),
          vehicleNumber: vehicleNumber || '',
          photoFilename: photoFilename,
          companyLogo: companyLogo || 'courier.png',
          timestamp: now.toISOString(),
        };

        // Send notification
        if (residentData.userFcmToken || residentData.userExpoPushToken) {
          const notificationResult = await sendFCMNotification({
            fcmToken: residentData.userFcmToken,
            title: notificationTitle,
            body: notificationBody,
            data: notificationData,
            channelId: 'delivery',
          });

          if (notificationResult.success) {
            notificationSent = true;
            console.log('✅ Delivery notification sent successfully');
          } else {
            console.error('❌ Failed to send delivery notification:', notificationResult.error);
          }
        } else {
          console.log('⚠️ No FCM or Expo token found for resident');
        }
      } else {
        console.log('⚠️ No approved resident found for apartment ID:', apartmentId);
      }
    } catch (notifError) {
      console.error('❌ Error sending delivery notification:', notifError);
      // Continue execution even if notification fails
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Delivery entry created successfully',
      data: {
        deliveryId: deliveryId,
        entryTime: now.toISOString(),
        notificationSent: notificationSent,
      },
    });

  } catch (error) {
    console.error('Create delivery error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// GET - Fetch all delivery logs for security's community
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
    const security = await verifyMobileToken(token);

    if (!security || security.type !== 'security') {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch delivery logs with photo URLs
    const logs = await db
      .select()
      .from(deliveryLogs)
      .where(eq(deliveryLogs.communityId, security.communityId))
      .orderBy(desc(deliveryLogs.entryTime))
      .limit(limit)
      .offset(offset);

    // Add full photo URLs
    const PHOTO_BASE_URL = 'https://wowfy.in/gatewise/guest_images/';
    const logsWithUrls = logs.map(log => ({
      ...log,
      photoUrl: log.photoFilename ? `${PHOTO_BASE_URL}${log.photoFilename}` : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        logs: logsWithUrls,
        limit: limit,
        offset: offset,
      },
    });

  } catch (error) {
    console.error('Get delivery logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}