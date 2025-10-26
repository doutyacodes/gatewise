// ============================================
// FILE: app/api/dashboard/route.js
// ============================================
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communities, communityAdmins, apartments, rules, securities } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { eq, count } from 'drizzle-orm';

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

    let stats = [];

    if (user.type === 'superadmin') {
      // Super Admin Stats
      const [communitiesCount] = await db
        .select({ count: count() })
        .from(communities);

      const [adminsCount] = await db
        .select({ count: count() })
        .from(communityAdmins);

      const [securityCount] = await db
        .select({ count: count() })
        .from(securities);

      const [apartmentsCount] = await db
        .select({ count: count() })
        .from(apartments);

      stats = [
        {
          icon: 'Building2',
          label: 'Total Communities',
          value: communitiesCount?.count || 0,
          change: '+12%',
          trend: 'up',
          color: 'blue'
        },
        {
          icon: 'Users',
          label: 'Total Admins',
          value: adminsCount?.count || 0,
          change: '+8%',
          trend: 'up',
          color: 'purple'
        },
        {
          icon: 'Shield',
          label: 'Security Staff',
          value: securityCount?.count || 0,
          change: '+5%',
          trend: 'up',
          color: 'green'
        },
        {
          icon: 'Home',
          label: 'Total Apartments',
          value: apartmentsCount?.count || 0,
          change: '+15%',
          trend: 'up',
          color: 'orange'
        },
      ];
    } else {
      // Community Admin Stats
      const [apartmentsCount] = await db
        .select({ count: count() })
        .from(apartments)
        .where(eq(apartments.communityId, user.communityId));

      const [rulesCount] = await db
        .select({ count: count() })
        .from(rules)
        .where(eq(rules.communityId, user.communityId));

      const [securityCount] = await db
        .select({ count: count() })
        .from(securities)
        .where(eq(securities.communityId, user.communityId));

      stats = [
        {
          icon: 'Home',
          label: 'Apartments',
          value: apartmentsCount?.count || 0,
          change: '+2%',
          trend: 'up',
          color: 'blue'
        },
        {
          icon: 'ClipboardList',
          label: 'Active Rules',
          value: rulesCount?.count || 0,
          change: '+4%',
          trend: 'up',
          color: 'purple'
        },
        {
          icon: 'Shield',
          label: 'Security Staff',
          value: securityCount?.count || 0,
          change: '0%',
          trend: 'neutral',
          color: 'green'
        },
        {
          icon: 'UserCheck',
          label: 'Today\'s Activity',
          value: 0,
          change: '0%',
          trend: 'neutral',
          color: 'orange'
        },
      ];
    }

    return NextResponse.json({
      success: true,
      user: user,
      stats: stats,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}