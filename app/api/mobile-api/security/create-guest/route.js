// ============================================
// FILE: app/api/mobile-api/security/create-guest/route.js
// Create Guest Entry - Updated with New Fields
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, apartmentOwnerships } from "@/lib/db/schema";
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

// Generate unique QR code
function generateQRCode() {
  return `GW-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// Find resident user ID from apartment ID
async function findResidentByApartmentId(apartmentId, communityId) {
  try {
    const [ownership] = await db
      .select({
        userId: apartmentOwnerships.userId,
        isApproved: apartmentOwnerships.isAdminApproved,
      })
      .from(apartmentOwnerships)
      .where(
        and(
          eq(apartmentOwnerships.apartmentId, apartmentId),
          eq(apartmentOwnerships.isAdminApproved, true)
        )
      )
      .limit(1);

    return ownership?.userId || null;
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

    // Find resident user ID
    const residentUserId = await findResidentByApartmentId(apartmentId, security.communityId);
    
    if (!residentUserId) {
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
      createdByUserId: residentUserId,
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

    // TODO: Send notification to resident
    // notifyResident(residentUserId, guestName, apartmentNumber);

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Guest entry created successfully',
      data: {
        guestId: guestId,
        qrCode: qrCode,
        status: 'pending',
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