// ============================================
// FILE: mobile-api/user/classifieds/like/route.js
// Like/Unlike Classifieds
// ============================================

import { db } from "@/lib/db/drizzle";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// Create likes table schema inline
import { mysqlTable, bigint, timestamp } from "drizzle-orm/mysql-core";
import { requireAuth } from "../../../middleware/auth";

const classifiedLikes = mysqlTable("classified_likes", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  classifiedId: bigint("classified_id", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// POST - Like/Unlike Classified
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
    const { classifiedId } = body;

    if (!classifiedId) {
      return NextResponse.json(
        { success: false, error: "Classified ID is required" },
        { status: 400 }
      );
    }

    // Check if already liked
    const [existingLike] = await db
      .select()
      .from(classifiedLikes)
      .where(
        and(
          eq(classifiedLikes.classifiedId, classifiedId),
          eq(classifiedLikes.userId, userId)
        )
      )
      .limit(1);

    if (existingLike) {
      // Unlike
      await db
        .delete(classifiedLikes)
        .where(
          and(
            eq(classifiedLikes.classifiedId, classifiedId),
            eq(classifiedLikes.userId, userId)
          )
        );

      return NextResponse.json({
        success: true,
        action: "unliked",
        message: "Classified unliked",
      });
    } else {
      // Like
      await db.insert(classifiedLikes).values({
        classifiedId,
        userId,
      });

      return NextResponse.json({
        success: true,
        action: "liked",
        message: "Classified liked",
      });
    }
  } catch (error) {
    console.error("❌ Like classified error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to like/unlike classified" },
      { status: 500 }
    );
  }
}
