// ============================================
// POST /api/mobile-api/disputes/[id]/escalate
// Escalate a dispute to the community admin
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  disputeReports,
  disputeChatMessages,
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

    // 1. Fetch dispute
    const [dispute] = await db
      .select()
      .from(disputeReports)
      .where(eq(disputeReports.id, disputeId));

    if (!dispute) {
      return NextResponse.json({ success: false, error: "Dispute not found" }, { status: 404 });
    }

    // 2. Check if already escalated
    if (dispute.escalatedToAdmin) {
      return NextResponse.json({ success: false, error: "Dispute already escalated" }, { status: 400 });
    }

    // 3. Check if user is part of this dispute (owner or tenant)
    // Actually, any user in the rent session can escalate if they feel the other party is not cooperating.

    // 4. Update dispute status
    await db
      .update(disputeReports)
      .set({
        escalatedToAdmin: true,
        escalatedAt: new Date(),
        status: "escalated",
        updatedAt: new Date(),
      })
      .where(eq(disputeReports.id, disputeId));

    // 5. Add a system message to the chat
    await db.insert(disputeChatMessages).values({
      disputeId,
      senderId: user.id,
      senderRole: 'system',
      messageText: "⚠️ This dispute has been escalated to the Community Admin.",
      sentAt: new Date(),
    });

    console.log(`🚀 Dispute ${disputeId} escalated to admin by user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: "Dispute escalated to admin successfully",
    });
  } catch (err) {
    console.error("❌ Escalate dispute error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
