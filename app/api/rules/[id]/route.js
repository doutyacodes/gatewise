// ============================================
// FILE: app/api/rules/[id]/route.js
// ============================================
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rules } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// PUT - Update rule
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
        { error: 'Only community admins can update rules' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { ruleName, description, isMandatory, proofType } = body;

    if (!ruleName || !proofType) {
      return NextResponse.json(
        { error: 'Rule name and proof type are required' },
        { status: 400 }
      );
    }

    await db
      .update(rules)
      .set({
        ruleName,
        description: description || null,
        isMandatory: isMandatory ?? true,
        proofType,
      })
      .where(eq(rules.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: 'Rule updated successfully',
    });
  } catch (error) {
    console.error('Update rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete rule
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
        { error: 'Only community admins can delete rules' },
        { status: 403 }
      );
    }

    const { id } = await params;

    await db.delete(rules).where(eq(rules.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    console.error('Delete rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}