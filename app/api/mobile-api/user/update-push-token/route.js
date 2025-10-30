// ============================================
// FILE: app/api/mobile-api/user/update-push-token/route.js
// Update User FCM/Expo Push Token
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please login' },
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
    const { fcmToken, expoPushToken } = body;

    if (!fcmToken && !expoPushToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one token (FCM or Expo) is required',
        },
        { status: 400 }
      );
    }

    console.log(`📱 Updating push tokens for user ${user.id}`);

    // Update user tokens
    const updateData = {};
    if (fcmToken) updateData.fcmToken = fcmToken;
    if (expoPushToken) updateData.expoPushToken = expoPushToken;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id));

    console.log('✅ Push tokens updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Push tokens updated successfully',
      data: {
        fcmToken: !!fcmToken,
        expoPushToken: !!expoPushToken,
      },
    });

  } catch (error) {
    console.error('❌ Update push token error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update push tokens',
      },
      { status: 500 }
    );
  }
}

// Handle GET request (optional - to retrieve current tokens)
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyMobileToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const [userData] = await db
      .select({
        fcmToken: users.fcmToken,
        expoPushToken: users.expoPushToken,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        fcmToken: userData?.fcmToken || null,
        expoPushToken: userData?.expoPushToken || null,
      },
    });

  } catch (error) {
    console.error('❌ Get push token error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get push tokens',
      },
      { status: 500 }
    );
  }
}
