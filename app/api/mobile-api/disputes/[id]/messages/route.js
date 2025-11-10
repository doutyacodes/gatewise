// ============================================
// POST /api/mobile-api/disputes/[id]/messages
// Send new message (text or image)
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { disputeChatMessages } from "@/lib/db/schema";
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

export async function POST(req, { params }) {
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
    const { messageText, imageFilename } = await req.json();

    if (!messageText?.trim() && !imageFilename) {
      return NextResponse.json({ success: false, error: "Message is empty" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(disputeChatMessages)
      .values({
        disputeId,
        senderId: user.id,
        senderRole: user.role || "tenant",
        messageText: messageText?.trim() || null,
        imageFilename: imageFilename || null,
        sentAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: inserted,
    });
  } catch (err) {
    console.error("❌ Message send error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
