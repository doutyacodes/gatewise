// ============================================
// FILE: mobile-api/user/classifieds/comments/route.js
// Classified Comments Management
// ============================================

import { db } from "@/lib/db/drizzle";
import { classifiedComments, users, apartments, apartmentOwnerships } from "@/lib/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/mobile-api/middleware/auth";

// ============================================
// GET - Get Comments for Classified
// ============================================
export async function GET(request) {
  try {
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const classifiedId = parseInt(searchParams.get("classifiedId"));

    if (!classifiedId) {
      return NextResponse.json(
        { success: false, error: "Classified ID is required" },
        { status: 400 }
      );
    }

    // Fetch top-level comments
    const topComments = await db
      .select({
        id: classifiedComments.id,
        userId: classifiedComments.userId,
        commentText: classifiedComments.commentText,
        parentCommentId: classifiedComments.parentCommentId,
        createdAt: classifiedComments.createdAt,
        userName: users.name,
        userProfileImage: users.profileImage,
      })
      .from(classifiedComments)
      .innerJoin(users, eq(classifiedComments.userId, users.id))
      .where(
        and(
          eq(classifiedComments.classifiedId, classifiedId),
          eq(classifiedComments.isDeleted, false),
          isNull(classifiedComments.parentCommentId)
        )
      )
      .orderBy(desc(classifiedComments.createdAt));

    // Fetch replies for each comment
    const commentIds = topComments.map((c) => c.id);
    const replies = commentIds.length > 0
      ? await db
          .select({
            id: classifiedComments.id,
            userId: classifiedComments.userId,
            commentText: classifiedComments.commentText,
            parentCommentId: classifiedComments.parentCommentId,
            createdAt: classifiedComments.createdAt,
            userName: users.name,
            userProfileImage: users.profileImage,
          })
          .from(classifiedComments)
          .innerJoin(users, eq(classifiedComments.userId, users.id))
          .where(
            and(
              eq(classifiedComments.classifiedId, classifiedId),
              eq(classifiedComments.isDeleted, false)
            )
          )
          .orderBy(classifiedComments.createdAt)
      : [];

    // Group replies by parent
    const repliesByParent = replies.reduce((acc, reply) => {
      if (reply.parentCommentId) {
        if (!acc[reply.parentCommentId]) acc[reply.parentCommentId] = [];
        acc[reply.parentCommentId].push(reply);
      }
      return acc;
    }, {});

    // Attach replies to comments
    const commentsWithReplies = topComments.map((comment) => ({
      ...comment,
      replies: repliesByParent[comment.id] || [],
    }));

    return NextResponse.json({
      success: true,
      comments: commentsWithReplies,
      totalComments: topComments.length,
    });
  } catch (error) {
    console.error("❌ Get comments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Add Comment or Reply
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
    const { classifiedId, commentText, parentCommentId } = body;

    if (!classifiedId || !commentText) {
      return NextResponse.json(
        { success: false, error: "Classified ID and comment text are required" },
        { status: 400 }
      );
    }

    // Insert comment
    const [newComment] = await db
      .insert(classifiedComments)
      .values({
        classifiedId,
        userId,
        commentText: commentText.trim(),
        parentCommentId: parentCommentId || null,
        isDeleted: false,
      })
      .$returningId();

    // Fetch comment with user info
    const [comment] = await db
      .select({
        id: classifiedComments.id,
        userId: classifiedComments.userId,
        commentText: classifiedComments.commentText,
        parentCommentId: classifiedComments.parentCommentId,
        createdAt: classifiedComments.createdAt,
        userName: users.name,
        userProfileImage: users.profileImage,
      })
      .from(classifiedComments)
      .innerJoin(users, eq(classifiedComments.userId, users.id))
      .where(eq(classifiedComments.id, newComment.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: "Comment added successfully",
      comment,
    });
  } catch (error) {
    console.error("❌ Add comment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - Edit Comment
// ============================================
export async function PUT(request) {
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
    const { commentId, commentText } = body;

    if (!commentId || !commentText) {
      return NextResponse.json(
        { success: false, error: "Comment ID and text are required" },
        { status: 400 }
      );
    }

    // Check ownership
    const [existing] = await db
      .select()
      .from(classifiedComments)
      .where(eq(classifiedComments.id, commentId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Comment not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only edit your own comments" },
        { status: 403 }
      );
    }

    // Update comment
    await db
      .update(classifiedComments)
      .set({
        commentText: commentText.trim(),
        updatedAt: new Date(),
      })
      .where(eq(classifiedComments.id, commentId));

    return NextResponse.json({
      success: true,
      message: "Comment updated successfully",
    });
  } catch (error) {
    console.error("❌ Update comment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete Comment (Soft Delete)
// ============================================
export async function DELETE(request) {
  try {
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const { searchParams } = new URL(request.url);
    const commentId = parseInt(searchParams.get("commentId"));

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: "Comment ID is required" },
        { status: 400 }
      );
    }

    // Check ownership
    const [existing] = await db
      .select()
      .from(classifiedComments)
      .where(eq(classifiedComments.id, commentId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Comment not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    // Soft delete
    await db
      .update(classifiedComments)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
      })
      .where(eq(classifiedComments.id, commentId));

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete comment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
