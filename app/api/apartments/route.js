// ============================================
// FILE: app/api/apartments/route.js
// ============================================
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apartments } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { desc, eq } from 'drizzle-orm';

// GET - Fetch all apartments
export async function GET() {
  try {
     const cookieStore = await cookies(); // ✅ Await added
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    let allApartments;

    if (user.type === 'superadmin') {
      // Super admin sees all apartments
      allApartments = await db
        .select()
        .from(apartments)
        .orderBy(desc(apartments.createdAt));
    } else {
      // Community admin sees only their community's apartments
      allApartments = await db
        .select()
        .from(apartments)
        .where(eq(apartments.communityId, user.communityId))
        .orderBy(desc(apartments.createdAt));
    }

    return NextResponse.json({
      success: true,
      apartments: allApartments,
    });
  } catch (error) {
    console.error('Fetch apartments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
