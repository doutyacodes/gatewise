// ============================================
// FILE: app/api/mobile-api/security/apartments/route.js
// Fetch Apartments for Security Staff
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apartments } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
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

    // Fetch all active apartments for this community
    const apartmentsList = await db
      .select({
        id: apartments.id,
        towerName: apartments.towerName,
        floorNumber: apartments.floorNumber,
        apartmentNumber: apartments.apartmentNumber,
        status: apartments.status,
        createdAt: apartments.createdAt,
      })
      .from(apartments)
      .where(
        and(
          eq(apartments.communityId, security.communityId),
          eq(apartments.status, 'active')
        )
      )
      .orderBy(
        apartments.towerName,
        apartments.floorNumber,
        apartments.apartmentNumber
      );

    // Format apartments for display
    const formattedApartments = apartmentsList.map(apt => ({
      id: apt.id,
      towerName: apt.towerName || '',
      floorNumber: apt.floorNumber || 0,
      apartmentNumber: apt.apartmentNumber,
      // Display format: "Tower A - Floor 5 - Apt 501"
      displayName: [
        apt.towerName ? `${apt.towerName}` : '',
        apt.floorNumber ? `Floor ${apt.floorNumber}` : '',
        `Apt ${apt.apartmentNumber}`
      ].filter(Boolean).join(' - '),
      status: apt.status,
    }));

    return NextResponse.json({
      success: true,
      apartments: formattedApartments,
      count: formattedApartments.length,
    });

  } catch (error) {
    console.error('Fetch apartments error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}