// ============================================
// FILE: app/api/mobile-api/security/create-delivery/route.js
// Create Delivery Log Entry with PHP Photo
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveryLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { jwtVerify } from "jose";

const encoder = new TextEncoder();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Verify JWT token
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
      purpose,
      photoPath, // filename from PHP upload (e.g., "guest_12345.jpg")
    } = body;

    // Validate required fields
    if (!deliveryPersonName || !companyName || !photoPath) {
      return NextResponse.json(
        { success: false, error: 'Delivery person name, company name, and photo are required' },
        { status: 400 }
      );
    }

    // Build full photo URL
    const photoUrl = `https://wowfy.in/gatewise/guest_images/${photoPath}`;

    // Get current timestamp
    const now = new Date();

    // Insert delivery log
    const result = await db.insert(deliveryLogs).values({
      communityId: security.communityId,
      securityId: security.id,
      deliveryPersonName: deliveryPersonName.trim(),
      companyName: companyName.trim(),
      photoUrl: photoUrl,
      purpose: purpose?.trim() || null,
      entryTime: now,
      exitTime: null, // Will be updated when delivery person exits
      createdAt: now,
    });

    const deliveryId = result[0].insertId;

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Delivery entry created successfully',
      data: {
        deliveryId: deliveryId,
        entryTime: now.toISOString(),
        photoUrl: photoUrl,
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

    // Get query parameters for pagination
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch delivery logs
    const logs = await db
      .select()
      .from(deliveryLogs)
      .where(eq(deliveryLogs.communityId, security.communityId))
      .orderBy(desc(deliveryLogs.entryTime))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: {
        logs: logs,
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