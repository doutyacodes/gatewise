// ============================================
// POST /api/mobile-api/disputes/[id]/resolve
// Approve resolution for a dispute
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  disputeReports,
  disputeChatMessages,
  disputeResolutionApprovals,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

const encoder = new TextEncoder();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

async function verifyMobileToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload;
  } catch (error) {
    return null;
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    let user = null;
    const authHeader = req.headers.get("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      user = await verifyMobileToken(token);
    } else {
      const cookieStore = await cookies();
      const adminToken = cookieStore.get('auth-token')?.value;
      if (adminToken) {
        user = await verifyToken(adminToken);
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const disputeId = parseInt(id);

    // 1. Fetch dispute and context
    const [dispute] = await db
      .select()
      .from(disputeReports)
      .where(eq(disputeReports.id, disputeId));

    if (!dispute) {
      return NextResponse.json({ success: false, error: "Dispute not found" }, { status: 404 });
    }

    if (dispute.status === 'resolved') {
      return NextResponse.json({ success: false, error: "Dispute already resolved" }, { status: 400 });
    }

    // 2. Determine user's role in this dispute context
    // We'll trust the mobile app's role determination for now or fetch it from context
    const { role } = await req.json(); // Role passed from frontend
    
    if (!role) {
      return NextResponse.json({ success: false, error: "User role is required" }, { status: 400 });
    }

    // 3. Check if already approved by this role
    const [existingApproval] = await db
      .select()
      .from(disputeResolutionApprovals)
      .where(
        and(
          eq(disputeResolutionApprovals.disputeId, disputeId),
          eq(disputeResolutionApprovals.approvedByRole, role)
        )
      );

    if (existingApproval) {
      return NextResponse.json({ success: false, error: "Already approved by this role" }, { status: 400 });
    }

    // 4. Record approval
    await db.insert(disputeResolutionApprovals).values({
      disputeId,
      approvedBy: user.id,
      approvedByRole: role,
      approvedAt: new Date(),
    });

    // 5. Add a system message
    await db.insert(disputeChatMessages).values({
      disputeId,
      senderId: user.id,
      senderRole: role,
      messageText: `✅ ${role.charAt(0).toUpperCase() + role.slice(1)} has approved the resolution.`,
      sentAt: new Date(),
    });

    // 6. Check if all parties have approved
    const approvals = await db
      .select()
      .from(disputeResolutionApprovals)
      .where(eq(disputeResolutionApprovals.disputeId, disputeId));

    const rolesApproved = approvals.map(a => a.approvedByRole);
    
    // If escalated, needs owner, tenant, and admin. Otherwise just owner and tenant.
    const requiredRoles = dispute.escalatedToAdmin ? ['owner', 'tenant', 'admin'] : ['owner', 'tenant'];
    const allApproved = requiredRoles.every(r => rolesApproved.includes(r));

    if (allApproved) {
      await db
        .update(disputeReports)
        .set({
          status: "resolved",
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(disputeReports.id, disputeId));

      await db.insert(disputeChatMessages).values({
        disputeId,
        senderId: user.id,
        senderRole: "system",
        messageText: "🎊 Dispute has been successfully resolved and closed.",
        sentAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Approval recorded successfully",
      isResolved: allApproved,
    });
  } catch (err) {
    console.error("❌ Resolve dispute error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
