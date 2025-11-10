// ============================================
// FILE: app/api/mobile-api/user/community-posts/report/route.js
// Community Post Report API
// ============================================

import { db } from "@/lib/db";
import {
  communityPostReports,
  communityPosts,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const encoder = new TextEncoder();
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Token verification
async function verifyMobileToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload;
  } catch (error) {
    return null;
  }
}

// ============================================
// POST - Report a post
// ============================================
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    const user = await verifyMobileToken(token);
    if (!user || user.type !== "user") {
      return NextResponse.json(
        { success: false, message: "Only users can report posts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { postId, reportType, reportReason } = body;

    // Validation
    if (!postId) {
      return NextResponse.json(
        { success: false, message: "Post ID required" },
        { status: 400 }
      );
    }

    if (!reportType) {
      return NextResponse.json(
        { success: false, message: "Report type required" },
        { status: 400 }
      );
    }

    const userId = user.id;

    // Verify post exists
    const [post] = await db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, parseInt(postId)))
      .limit(1);

    if (!post) {
      return NextResponse.json(
        { success: false, message: "Post not found" },
        { status: 404 }
      );
    }

    // Create report reason text
    const reportReasonText = reportReason
      ? `${reportType}: ${reportReason}`
      : reportType;

    // Create report
    await db.insert(communityPostReports).values({
      postId: parseInt(postId),
      reportedBy: userId,
      reportReason: reportReasonText,
      status: "pending",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Report submitted successfully. Our team will review it.",
    });
  } catch (error) {
    console.error("❌ Report post error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}