import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communityAdmins } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

// ============================
// PUT - Update admin
// ============================
export async function PUT(req, context) {
  const { id } = await context.params; // ✅ unwrap the promise
  const body = await req.json();
  const { name, email, mobileNumber, password, communityId, role } = body;

  try {
    const updateData = {
      name,
      email,
      mobileNumber,
      communityId: Number(communityId),
      role,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await db
      .update(communityAdmins)
      .set(updateData)
      .where(eq(communityAdmins.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating admin:', error);
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 });
  }
}

// ============================
// DELETE - Delete admin
// ============================
export async function DELETE(req, context) {
  const { id } = await context.params; // ✅ await here too

  try {
    await db
      .delete(communityAdmins)
      .where(eq(communityAdmins.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return NextResponse.json({ error: 'Failed to delete admin' }, { status: 500 });
  }
}
