// ============================================
// FILE: app/api/rules/route.js
// ============================================
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rules } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { desc, eq } from 'drizzle-orm';

// GET - Fetch all rules
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    let allRules;

    if (user.type === 'superadmin') {
      // Super admin sees all rules from all communities
      allRules = await db
        .select()
        .from(rules)
        .orderBy(desc(rules.createdAt));
    } else {
      // Community admin sees only their community's rules
      allRules = await db
        .select()
        .from(rules)
        .where(eq(rules.communityId, user.communityId))
        .orderBy(desc(rules.createdAt));
    }

    return NextResponse.json({
      success: true,
      rules: allRules,
    });
  } catch (error) {
    console.error('Fetch rules error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new rule
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
        { error: 'Only community admins can create rules' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ruleName, description, isMandatory, proofType } = body;

    if (!ruleName || !proofType) {
      return NextResponse.json(
        { error: 'Rule name and proof type are required' },
        { status: 400 }
      );
    }

    await db.insert(rules).values({
      communityId: user.communityId,
      ruleName,
      description: description || null,
      isMandatory: isMandatory ?? true,
      proofType,
    });

    return NextResponse.json({
      success: true,
      message: 'Rule created successfully',
    });
  } catch (error) {
    console.error('Create rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}