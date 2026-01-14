// ============================================
// FILE: mobile-api/user/community-posts/like/route.js
// Like/Unlike Community Posts
// ============================================

import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/mobile-api/middleware/auth";
import { mysqlTable, bigint, timestamp } from "drizzle-orm/mysql-core";
import { db } from "@/lib/db";

// Create likes table schema inline
const communityPostLikes = mysqlTable("community_post_likes", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  postId: bigint("post_id", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// POST - Like/Unlike Post
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
    const { postId } = body;

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "Post ID is required" },
        { status: 400 }
      );
    }

    // Check if already liked
    const [existingLike] = await db
      .select()
      .from(communityPostLikes)
      .where(
        and(
          eq(communityPostLikes.postId, postId),
          eq(communityPostLikes.userId, userId)
        )
      )
      .limit(1);

    if (existingLike) {
      // Unlike
      await db
        .delete(communityPostLikes)
        .where(
          and(
            eq(communityPostLikes.postId, postId),
            eq(communityPostLikes.userId, userId)
          )
        );

      return NextResponse.json({
        success: true,
        action: "unliked",
        message: "Post unliked",
      });
    } else {
      // Like
      await db.insert(communityPostLikes).values({
        postId,
        userId,
      });

      return NextResponse.json({
        success: true,
        action: "liked",
        message: "Post liked",
      });
    }
  } catch (error) {
    console.error("❌ Like post error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to like/unlike post" },
      { status: 500 }
    );
  }
}
