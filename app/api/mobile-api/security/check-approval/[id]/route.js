// ============================================
// FILE: app/api/mobile-api/security/check-approval/[id]/route.js
// Check Guest Approval Status API
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guests, visitorApprovals } from "@/lib/db/schema";
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

export async function GET(request, { params }) {
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

    const { id } = await params;
    const guestId = parseInt(id);

    // Get current guest status
    const [guest] = await db
      .select({
        id: guests.id,
        status: guests.status,
        communityId: guests.communityId,
      })
      .from(guests)
      .where(eq(guests.id, guestId))
      .limit(1);

    if (!guest) {
      return NextResponse.json(
        { success: false, error: 'Guest not found' },
        { status: 404 }
      );
    }

    // Verify guest belongs to security's community
    if (guest.communityId !== security.communityId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Check for approval record
    const [approval] = await db
      .select({
        id: visitorApprovals.id,
        approvalStatus: visitorApprovals.approvalStatus,
        approvedAt: visitorApprovals.approvedAt,
      })
      .from(visitorApprovals)
      .where(eq(visitorApprovals.guestId, guestId))
      .orderBy(desc(visitorApprovals.approvedAt))
      .limit(1);

    // Determine final status
    let finalStatus = guest.status;
    
    if (approval) {
      if (approval.approvalStatus === 'approved') {
        finalStatus = 'approved';
      } else if (approval.approvalStatus === 'denied') {
        finalStatus = 'denied';
      }

      // Update guest status if changed
      if (finalStatus !== guest.status) {
        await db
          .update(guests)
          .set({ status: finalStatus })
          .where(eq(guests.id, guestId));
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        guestId: guest.id,
        status: finalStatus,
        hasApproval: !!approval,
        approvalTime: approval?.approvedAt || null,
      },
    });

  } catch (error) {
    console.error('Check approval error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}