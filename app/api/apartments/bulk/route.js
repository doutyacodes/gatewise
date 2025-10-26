// ============================================
// FILE: app/api/apartments/bulk/route.js
// ============================================
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apartments } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// POST - Create multiple apartments
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Only community admins can create apartments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { apartments: apartmentsData } = body;

    if (!apartmentsData || apartmentsData.length === 0) {
      return NextResponse.json(
        { error: 'At least one apartment is required' },
        { status: 400 }
      );
    }

    // Prepare bulk insert data
    const insertData = apartmentsData.map((apt) => ({
      communityId: user.communityId,
      towerName: apt.towerName,
      floorNumber: parseInt(apt.floorNumber),
      apartmentNumber: apt.apartmentNumber,
      status: apt.status || 'active',
    }));

    // Bulk insert
    await db.insert(apartments).values(insertData);

    return NextResponse.json({
      success: true,
      message: `${apartmentsData.length} apartment(s) created successfully`,
    });
  } catch (error) {
    console.error('Bulk create apartments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}