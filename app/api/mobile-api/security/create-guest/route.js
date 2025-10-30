// ============================================
// FILE: app/api/mobile-api/security/create-guest/route.js
// Create Guest Entry - Updated with New Fields & FCM Notifications
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, apartmentOwnerships, users, apartments } from "@/lib/db/schema";
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

// Generate unique QR code
function generateQRCode() {
  return `GW-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// Find resident user data and apartment info from apartment ID
async function findResidentByApartmentId(apartmentId, communityId) {
  try {
    const result = await db
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

    return result[0] || null;
  } catch (error) {
    console.error('Error finding resident:', error);
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
      guestName,
      guestPhone,
      apartmentId,
      vehicleNumber,
      purpose,
      photoFilename, // filename from PHP upload
    } = body;

    // Validate required fields
    if (!guestName || !apartmentId || !photoFilename) {
      return NextResponse.json(
        { success: false, error: 'Guest name, apartment, and photo are required' },
        { status: 400 }
      );
    }

    // Find resident user data
    const residentData = await findResidentByApartmentId(apartmentId, security.communityId);

    if (!residentData || !residentData.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No approved resident found for this apartment'
        },
        { status: 404 }
      );
    }

    // Generate QR code
    const qrCode = generateQRCode();

    // Get current date and time
    const now = new Date();
    const startDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const startTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Insert guest entry
    const result = await db.insert(guests).values({
      createdByUserId: residentData.userId,
      communityId: security.communityId,
      guestName: guestName.trim(),
      guestPhone: guestPhone?.trim() || null,
      guestType: 'one_time', // Always one_time as per requirement
      approvalType: 'needs_approval',
      startDate: startDate,
      startTime: startTime,
      qrCode: qrCode,
      purpose: purpose?.trim() || null,
      vehicleNumber: vehicleNumber?.trim().toUpperCase() || null,
      photoFilename: photoFilename,
      status: 'pending',
      createdAt: now,
    });

    const guestId = result[0].insertId;

    console.log('✅ Guest entry created:', guestId);

    // Send FCM notification to resident
    try {
      console.log('📤 Sending notification to resident...');

      const apartmentDisplay = residentData.towerName
        ? `${residentData.towerName} - ${residentData.apartmentNumber}`
        : residentData.apartmentNumber;

      // Build notification payload
      const notificationTitle = '🔔 New Guest Arrival';
      const notificationBody = `${guestName} is waiting at the gate for ${apartmentDisplay}`;

      // Notification data for deep linking
      const notificationData = {
        type: 'guest_arrival',
        screen: 'user/guest-approval',
        guestId: guestId.toString(),
        guestName: guestName,
        apartmentId: apartmentId.toString(),
        apartmentNumber: residentData.apartmentNumber,
        qrCode: qrCode,
        vehicleNumber: vehicleNumber || '',
        photoFilename: photoFilename,
        timestamp: now.toISOString(),
      };

      // Try sending via FCM token (if available)
      if (residentData.userFcmToken) {
        console.log('📱 Sending via FCM token...');

        const fcmResult = await sendFCMNotification({
          fcmToken: residentData.userFcmToken,
          title: notificationTitle,
          body: notificationBody,
          data: notificationData,
          channelId: 'guest-arrival',
        });

        if (fcmResult.success) {
          console.log('✅ FCM notification sent successfully');
        } else {
          console.error('❌ FCM notification failed:', fcmResult.error);
        }
      }

      // Try sending via Expo Push Token (fallback or alternative)
      if (residentData.userExpoPushToken) {
        console.log('📱 Sending via Expo Push Token...');

        try {
          const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: residentData.userExpoPushToken,
              title: notificationTitle,
              body: notificationBody,
              data: notificationData,
              sound: 'notification.wav',
              priority: 'high',
              channelId: 'guest-arrival',
            }),
          });

          const expoResult = await expoResponse.json();
          console.log('✅ Expo notification sent:', expoResult);

        } catch (expoError) {
          console.error('❌ Expo notification failed:', expoError);
        }
      }

      if (!residentData.userFcmToken && !residentData.userExpoPushToken) {
        console.log('⚠️ No FCM or Expo token found for user. Notification not sent.');
      }

    } catch (notificationError) {
      console.error('❌ Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Guest entry created successfully',
      data: {
        guestId: guestId,
        qrCode: qrCode,
        status: 'pending',
        notificationSent: !!(residentData.userFcmToken || residentData.userExpoPushToken),
      },
    });

  } catch (error) {
    console.error('Create guest error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}