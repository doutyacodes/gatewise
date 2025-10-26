// ============================================
// FILE: app/api/apartments/[id]/route.js
// ============================================
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apartments } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// PUT - Update apartment
export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Only community admins can update apartments' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { towerName, floorNumber, apartmentNumber, status } = body;

    if (!towerName || !floorNumber || !apartmentNumber) {
      return NextResponse.json(
        { error: 'Tower name, floor number, and apartment number are required' },
        { status: 400 }
      );
    }

    await db
      .update(apartments)
      .set({
        towerName,
        floorNumber: parseInt(floorNumber),
        apartmentNumber,
        status: status || 'active',
      })
      .where(eq(apartments.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: 'Apartment updated successfully',
    });
  } catch (error) {
    console.error('Update apartment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete apartment
export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Only community admins can delete apartments' },
        { status: 403 }
      );
    }

    const { id } = await params;

    await db.delete(apartments).where(eq(apartments.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: 'Apartment deleted successfully',
    });
  } catch (error) {
    console.error('Delete apartment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}