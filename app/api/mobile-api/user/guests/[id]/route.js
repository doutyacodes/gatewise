// ============================================
// API: Guest Management by ID
// DELETE /api/mobile-api/user/guests/:id - Delete guest
// PATCH /api/mobile-api/user/guests/:id - Update guest (toggle active)
// ============================================

import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { guests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// DELETE - Delete a guest
export async function DELETE(request, { params }) {
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

    const userId = await decoded.id;

    const guestId = parseInt(params.id);

    if (isNaN(guestId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid guest ID' },
        { status: 400 }
      );
    }

    // Verify ownership before deleting
    const [guest] = await db
      .select()
      .from(guests)
      .where(eq(guests.id, guestId))
      .limit(1);

    if (!guest) {
      return NextResponse.json(
        { success: false, message: 'Guest not found' },
        { status: 404 }
      );
    }

    // Only allow deletion if user created the guest
    if (guest.createdByUserId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to delete this guest' },
        { status: 403 }
      );
    }

    // Delete the guest
    await db.delete(guests).where(eq(guests.id, guestId));

    return NextResponse.json({
      success: true,
      message: 'Guest deleted successfully',
    });
  } catch (error) {
    console.error('Delete guest error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update guest (toggle active status)
export async function PATCH(request, { params }) {
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

    const userId = await decoded.id;

    const guestId = parseInt(params.id);

    if (isNaN(guestId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid guest ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // Verify ownership
    const [guest] = await db
      .select()
      .from(guests)
      .where(eq(guests.id, guestId))
      .limit(1);

    if (!guest) {
      return NextResponse.json(
        { success: false, message: 'Guest not found' },
        { status: 404 }
      );
    }

    // Only allow update if user created the guest
    if (guest.createdByUserId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to update this guest' },
        { status: 403 }
      );
    }

    // Only allow toggle for frequent guests
    if (guest.guestType !== 'frequent') {
      return NextResponse.json(
        { success: false, message: 'Can only toggle active status for frequent guests' },
        { status: 400 }
      );
    }

    // Update the guest
    await db
      .update(guests)
      .set({ isActive })
      .where(eq(guests.id, guestId));

    return NextResponse.json({
      success: true,
      message: `Guest ${isActive ? 'activated' : 'deactivated'} successfully`,
      isActive,
    });
  } catch (error) {
    console.error('Update guest error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
