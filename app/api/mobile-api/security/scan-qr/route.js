// ============================================
// API: Security QR Scan
// POST /api/mobile-api/security/scan-qr
// Validates QR code and logs scan
// ============================================

import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { guests, qrScans, apartments, communities, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// QR Decryption (Server-side)
const SECRET_KEY = 'GateWise2025SecureQRCodeEncryptionKey!@#$%';

function decryptQRData(encryptedData) {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);

    // Split IV and encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt QR code');
  }
}

function validateQRSignature(qrData, expectedQRCode) {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(`${qrData.guestId}-${expectedQRCode}-${SECRET_KEY}`)
      .digest('hex');

    return qrData.signature === expectedSignature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    // Verify authentication (security must be logged in)
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

    const securityId = decoded.userId;

    // Parse request body
    const body = await request.json();
    const { encryptedQRData } = body;

    if (!encryptedQRData) {
      return NextResponse.json(
        { success: false, message: 'QR data is required' },
        { status: 400 }
      );
    }

    // Step 1: Decrypt QR data
    let qrData;
    try {
      qrData = decryptQRData(encryptedQRData);
    } catch (error) {
      return NextResponse.json({
        success: false,
        accessGranted: false,
        reason: 'Invalid or corrupted QR code',
        message: 'QR code could not be decrypted',
      });
    }

    // Step 2: Get guest from database
    const guestId = parseInt(qrData.guestId);
    if (isNaN(guestId)) {
      return NextResponse.json({
        success: false,
        accessGranted: false,
        reason: 'Invalid guest ID in QR code',
      });
    }

    const [guest] = await db
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
        apartmentId: guests.apartmentId,
        communityId: guests.communityId,
        createdByUserId: guests.createdByUserId,
        apartmentNumber: apartments.apartmentNumber,
        towerName: apartments.towerName,
        floorNumber: apartments.floorNumber,
        communityName: communities.name,
        createdByName: users.name,
      })
      .from(guests)
      .leftJoin(apartments, eq(guests.apartmentId, apartments.id))
      .leftJoin(communities, eq(guests.communityId, communities.id))
      .leftJoin(users, eq(guests.createdByUserId, users.id))
      .where(eq(guests.id, guestId))
      .limit(1);

    if (!guest) {
      // Log failed scan
      await logScan(securityId, guestId, qrData, false, 'Guest not found in database');

      return NextResponse.json({
        success: true,
        accessGranted: false,
        reason: 'Guest not found',
        message: 'This guest does not exist in our system',
      });
    }

    // Step 3: Validate signature
    const isValidSignature = validateQRSignature(qrData, guest.qrCode);
    if (!isValidSignature) {
      await logScan(securityId, guestId, qrData, false, 'Invalid signature - tampered QR code');

      return NextResponse.json({
        success: true,
        accessGranted: false,
        reason: 'Invalid QR code',
        message: 'This QR code has been tampered with',
        guestInfo: {
          guestName: guest.guestName,
          apartmentNumber: guest.apartmentNumber,
        },
      });
    }

    // Step 4: Check if guest is active (for frequent guests)
    if (guest.guestType === 'frequent' && !guest.isActive) {
      await logScan(securityId, guestId, qrData, false, 'Guest is inactive');

      return NextResponse.json({
        success: true,
        accessGranted: false,
        reason: 'Guest is inactive',
        message: 'This frequent guest has been deactivated',
        guestInfo: {
          guestName: guest.guestName,
          apartmentNumber: guest.apartmentNumber,
          towerName: guest.towerName,
        },
      });
    }

    // Step 5: Check guest status
    if (guest.status === 'denied') {
      await logScan(securityId, guestId, qrData, false, 'Guest access denied');

      return NextResponse.json({
        success: true,
        accessGranted: false,
        reason: 'Access denied',
        message: 'This guest has been denied access',
        guestInfo: {
          guestName: guest.guestName,
          apartmentNumber: guest.apartmentNumber,
          towerName: guest.towerName,
        },
      });
    }

    if (guest.status === 'expired') {
      await logScan(securityId, guestId, qrData, false, 'Guest pass has expired');

      return NextResponse.json({
        success: true,
        accessGranted: false,
        reason: 'Guest pass expired',
        message: 'This guest pass has expired',
        guestInfo: {
          guestName: guest.guestName,
          apartmentNumber: guest.apartmentNumber,
          towerName: guest.towerName,
        },
      });
    }

    // Step 6: Check date validity
    const now = new Date();

    if (guest.startDate) {
      const startDate = new Date(guest.startDate);
      startDate.setHours(0, 0, 0, 0);
      const nowDate = new Date(now);
      nowDate.setHours(0, 0, 0, 0);

      if (nowDate < startDate) {
        await logScan(securityId, guestId, qrData, false, 'Access period has not started yet');

        return NextResponse.json({
          success: true,
          accessGranted: false,
          reason: 'Access period not started',
          message: `Access starts from ${startDate.toLocaleDateString()}`,
          guestInfo: {
            guestName: guest.guestName,
            apartmentNumber: guest.apartmentNumber,
            towerName: guest.towerName,
            startDate: guest.startDate,
          },
        });
      }
    }

    if (guest.endDate) {
      const endDate = new Date(guest.endDate);
      endDate.setHours(23, 59, 59, 999);

      if (now > endDate) {
        await logScan(securityId, guestId, qrData, false, 'Access period has expired');

        return NextResponse.json({
          success: true,
          accessGranted: false,
          reason: 'Access period expired',
          message: `Access expired on ${endDate.toLocaleDateString()}`,
          guestInfo: {
            guestName: guest.guestName,
            apartmentNumber: guest.apartmentNumber,
            towerName: guest.towerName,
            endDate: guest.endDate,
          },
        });
      }
    }

    // Step 7: All checks passed - Grant access
    await logScan(securityId, guestId, qrData, true, 'Access granted');

    return NextResponse.json({
      success: true,
      accessGranted: true,
      reason: 'Access granted',
      message: 'Guest access approved',
      guestInfo: {
        id: guest.id,
        guestName: guest.guestName,
        guestPhone: guest.guestPhone,
        totalMembers: guest.totalMembers,
        vehicleNumber: guest.vehicleNumber,
        purpose: guest.purpose,
        apartmentNumber: guest.apartmentNumber,
        towerName: guest.towerName,
        floorNumber: guest.floorNumber,
        communityName: guest.communityName,
        createdByName: guest.createdByName,
        guestType: guest.guestType,
        approvalType: guest.approvalType,
        startDate: guest.startDate,
        endDate: guest.endDate,
      },
    });
  } catch (error) {
    console.error('QR scan error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to log scan
async function logScan(securityId, guestId, qrData, accessGranted, reason) {
  try {
    await db.insert(qrScans).values({
      guestId,
      securityId,
      apartmentId: parseInt(qrData.apartmentId),
      communityId: parseInt(qrData.communityId),
      scannedAt: new Date(),
      accessGranted,
      accessReason: reason,
      totalMembersPresent: qrData.totalMembers || 1,
      vehicleNumber: qrData.vehicleNumber || null,
      notes: null,
    });
  } catch (error) {
    console.error('Failed to log scan:', error);
    // Don't throw - we still want to return the access result
  }
}
