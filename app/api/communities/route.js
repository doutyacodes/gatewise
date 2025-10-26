// ============================================
// FILE: app/api/communities/route.js
// ============================================
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communities } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { desc } from 'drizzle-orm';

// GET - Fetch all communities
export async function GET() {
  try {
    const cookieStore = await cookies(); // ✅ Await added
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch communities
    const allCommunities = await db
      .select()
      .from(communities)
      .orderBy(desc(communities.createdAt));

    return NextResponse.json({
      success: true,
      communities: allCommunities,
    });
  } catch (error) {
    console.error('Fetch communities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new community
export async function POST(request) {
  try {
    const cookieStore = await cookies(); // ✅ Await added
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.type !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only super admins can create communities' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      fullAddress,
      district,
      state,
      country,
      pincode,
      latitude,
      longitude,
      imageUrl,
    } = body;

    // Validation
    if (!name || !fullAddress) {
      return NextResponse.json(
        { error: 'Name and full address are required' },
        { status: 400 }
      );
    }

    // Insert community
    const [newCommunity] = await db.insert(communities).values({
      name,
      fullAddress,
      district: district || null,
      state: state || null,
      country: country || 'India',
      pincode: pincode || null,
      latitude: latitude || null,
      longitude: longitude || null,
      imageUrl: imageUrl || null,
      createdBySuperAdminId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Community created successfully',
      communityId: newCommunity.insertId,
    });
  } catch (error) {
    console.error('Create community error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
