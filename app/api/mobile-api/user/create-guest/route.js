// ============================================
// API: Create Guest with QR Code
// POST /api/mobile-api/user/create-guest
// Creates a new guest and generates encrypted QR code
// ============================================

import { db } from '@/lib/db';
import { guests, userApartmentContext } from '@/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

// QR Encryption (Server-side - use same key as client)
const SECRET_KEY = 'GateWise2025SecureQRCodeEncryptionKey!@#$%';

function encryptQRData(data) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

function generateUniqueQRCode(guestId, apartmentId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `GW-${apartmentId}-${guestId}-${timestamp}-${random}`;
}

function generateSignature(guestId, qrCode) {
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${guestId}-${qrCode}-${SECRET_KEY}`)
    .digest('hex');
}

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

    const userId = decoded.userId;

    // Parse request body
    const body = await request.json();
    const {
      guestName,
      guestPhone,
      guestType,
      approvalType,
      totalMembers,
      vehicleNumber,
      purpose,
      startDate,
      endDate,
      startTime,
      endTime,
      apartmentId,
    } = body;

    // Validation
    if (!guestName || !apartmentId) {
      return NextResponse.json(
        { success: false, message: 'Guest name and apartment are required' },
        { status: 400 }
      );
    }

    // Get community ID from apartment
    const [aptInfo] = await db
      .select({ communityId: apartments.communityId })
      .from(apartments)
      .where(eq(apartments.id, apartmentId))
      .limit(1);

    if (!aptInfo) {
      return NextResponse.json(
        { success: false, message: 'Apartment not found' },
        { status: 404 }
      );
    }

    // Determine guest status based on approval type
    const guestStatus =
      approvalType === 'preapproved' ? 'approved' :
      approvalType === 'private' ? 'approved' :
      'pending';

    // Create guest record
    const [newGuest] = await db
      .insert(guests)
      .values({
        createdByUserId: userId,
        communityId: aptInfo.communityId,
        apartmentId,
        guestName,
        guestPhone: guestPhone || null,
        guestType,
        approvalType,
        totalMembers: parseInt(totalMembers) || 1,
        vehicleNumber: vehicleNumber || null,
        purpose: purpose || null,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        status: guestStatus,
        isActive: true,
        qrCode: 'TEMP', // Temporary, will update
        qrEncryptedData: 'TEMP', // Temporary, will update
      })
      .$returningId();

    const guestId = newGuest.id;

    // Generate QR code
    const qrCode = generateUniqueQRCode(guestId, apartmentId);

    // Generate QR data object
    const qrData = {
      guestId: guestId.toString(),
      apartmentId: apartmentId.toString(),
      communityId: aptInfo.communityId.toString(),
      guestName,
      guestPhone: guestPhone || '',
      totalMembers: parseInt(totalMembers) || 1,
      guestType,
      approvalType,
      validFrom: startDate ? new Date(startDate).toISOString() : null,
      validUntil: endDate ? new Date(endDate).toISOString() : null,
      vehicleNumber: vehicleNumber || '',
      purpose: purpose || '',
      createdAt: new Date().toISOString(),
      signature: generateSignature(guestId, qrCode),
    };

    // Encrypt QR data
    const encryptedQRData = encryptQRData(qrData);

    // Update guest with QR code
    await db
      .update(guests)
      .set({
        qrCode,
        qrEncryptedData: encryptedQRData,
      })
      .where(eq(guests.id, guestId));

    // Get full guest data to return
    const [createdGuest] = await db
      .select()
      .from(guests)
      .where(eq(guests.id, guestId))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: 'Guest created successfully',
      guest: createdGuest,
    });
  } catch (error) {
    console.error('Create guest error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
