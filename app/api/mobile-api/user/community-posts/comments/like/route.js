// ============================================
// FILE: mobile-api/user/community-posts/comments/like/route.js
// Like/Unlike Community Post Comments
// ============================================

import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { mysqlTable, bigint, timestamp } from "drizzle-orm/mysql-core";
import { requireAuth } from "@/app/api/mobile-api/middleware/auth";

// Create likes table schema inline
const communityPostCommentLikes = mysqlTable("community_post_comment_likes", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  commentId: bigint("comment_id", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// POST - Like/Unlike Comment
// ============================================
export async function POST(request) {
  try {
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body = await request.json();
    const { commentId } = body;

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: "Comment ID is required" },
        { status: 400 }
      );
    }

    // Check if already liked
    const [existingLike] = await db
      .select()
      .from(communityPostCommentLikes)
      .where(
        and(
          eq(communityPostCommentLikes.commentId, commentId),
          eq(communityPostCommentLikes.userId, userId)
        )
      )
      .limit(1);

    if (existingLike) {
      // Unlike
      await db
        .delete(communityPostCommentLikes)
        .where(
          and(
            eq(communityPostCommentLikes.commentId, commentId),
            eq(communityPostCommentLikes.userId, userId)
          )
        );

      return NextResponse.json({
        success: true,
        action: "unliked",
        message: "Comment unliked",
      });
    } else {
      // Like
      await db.insert(communityPostCommentLikes).values({
        commentId,
        userId,
      });

      return NextResponse.json({
        success: true,
        action: "liked",
        message: "Comment liked",
      });
    }
  } catch (error) {
    console.error("❌ Like comment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to like/unlike comment" },
      { status: 500 }
    );
  }
}
