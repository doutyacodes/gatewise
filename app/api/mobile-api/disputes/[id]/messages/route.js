// ============================================
// POST /api/mobile-api/disputes/[id]/messages
// Send new message (text or image)
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { disputeChatMessages } from "@/lib/db/schema";
import { jwtVerify } from "jose";
import { eq } from "drizzle-orm";
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
    const { messageText, imageFilename, senderRole } = await req.json();

    if (!messageText?.trim() && !imageFilename) {
      return NextResponse.json({ success: false, error: "Message is empty" }, { status: 400 });
    }

    const [insertedId] = await db
      .insert(disputeChatMessages)
      .values({
        disputeId,
        senderId: user.id,
        senderRole: senderRole || user.role || "tenant",
        messageText: messageText?.trim() || "",
        imageFilename: imageFilename || null,
        sentAt: new Date(),
      })
      .$returningId();

    // Fetch the inserted message since MySQL doesn't support returning full object
    const [inserted] = await db
      .select()
      .from(disputeChatMessages)
      .where(eq(disputeChatMessages.id, insertedId.id));

    return NextResponse.json({
      success: true,
      data: inserted,
    });
  } catch (err) {
    console.error("❌ Message send error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
