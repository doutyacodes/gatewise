// ============================================
// GET /api/mobile-api/disputes/[id]
// Fetch dispute details, chat messages, approvals
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  disputeReports,
  disputeChatMessages,
  disputeResolutionApprovals,
  users,
  apartmentRooms,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";

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

export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = await verifyMobileToken(token);

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const disputeId = parseInt(params.id);

    // Dispute details
    const [dispute] = await db
      .select({
        id: disputeReports.id,
        sessionId: disputeReports.sessionId,
        reportedBy: disputeReports.reportedBy,
        reportedByRole: disputeReports.reportedByRole,
        reportType: disputeReports.reportType,
        reason: disputeReports.reason,
        imageFilename: disputeReports.imageFilename,
        status: disputeReports.status,
        escalatedToAdmin: disputeReports.escalatedToAdmin,
        escalatedAt: disputeReports.escalatedAt,
        createdAt: disputeReports.createdAt,
        resolvedAt: disputeReports.resolvedAt,
        roomId: disputeReports.roomId,
      })
      .from(disputeReports)
      .where(eq(disputeReports.id, disputeId));

    if (!dispute) {
      return NextResponse.json({ success: false, error: "Dispute not found" }, { status: 404 });
    }

    // Room details (if any)
    let room = null;
    if (dispute.roomId) {
      [room] = await db
        .select({
          id: apartmentRooms.id,
          roomName: apartmentRooms.roomName,
          roomType: apartmentRooms.roomType,
        })
        .from(apartmentRooms)
        .where(eq(apartmentRooms.id, dispute.roomId));
    }

    // Chat messages
    const messages = await db
      .select({
        id: disputeChatMessages.id,
        disputeId: disputeChatMessages.disputeId,
        senderId: disputeChatMessages.senderId,
        senderRole: disputeChatMessages.senderRole,
        messageText: disputeChatMessages.messageText,
        imageFilename: disputeChatMessages.imageFilename,
        sentAt: disputeChatMessages.sentAt,
        senderName: users.name,
      })
      .from(disputeChatMessages)
      .leftJoin(users, eq(disputeChatMessages.senderId, users.id))
      .where(eq(disputeChatMessages.disputeId, disputeId))
      .orderBy(disputeChatMessages.sentAt);

    // Resolution approvals
    const approvals = await db
      .select({
        id: disputeResolutionApprovals.id,
        disputeId: disputeResolutionApprovals.disputeId,
        approvedBy: disputeResolutionApprovals.approvedBy,
        approvedByRole: disputeResolutionApprovals.approvedByRole,
        approvedAt: disputeResolutionApprovals.approvedAt,
      })
      .from(disputeResolutionApprovals)
      .where(eq(disputeResolutionApprovals.disputeId, disputeId));

    return NextResponse.json({
      success: true,
      data: {
        dispute,
        room,
        messages,
        approvals,
      },
    });
  } catch (err) {
    console.error("❌ Dispute fetch error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
