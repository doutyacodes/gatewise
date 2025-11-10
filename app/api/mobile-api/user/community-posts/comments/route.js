// ============================================
// FILE: app/api/mobile-api/user/community-posts/comments/route.js
// Community Post Comments API - CRUD with nested replies
// ============================================

import { db } from "@/lib/db";
import {
  communityPostComments,
  communityPosts,
  users,
  apartmentOwnerships,
  apartments,
} from "@/lib/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
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

// Get user's apartment info
async function getUserApartmentInfo(userId) {
  const [ownership] = await db
    .select({
      apartmentId: apartmentOwnerships.apartmentId,
      apartmentNumber: apartments.apartmentNumber,
      towerName: apartments.towerName,
      communityId: apartments.communityId,
    })
    .from(apartmentOwnerships)
    .innerJoin(apartments, eq(apartmentOwnerships.apartmentId, apartments.id))
    .where(
      and(
        eq(apartmentOwnerships.userId, userId),
        eq(apartmentOwnerships.isAdminApproved, true)
      )
    )
    .limit(1);

  return ownership || null;
}

// Get comment with user details
async function getCommentWithUserDetails(commentId) {
  const [comment] = await db
    .select({
      comment: communityPostComments,
      userName: users.name,
      userProfileImage: users.profileImage,
      apartmentNumber: apartments.apartmentNumber,
      towerName: apartments.towerName,
    })
    .from(communityPostComments)
    .innerJoin(users, eq(communityPostComments.userId, users.id))
    .leftJoin(apartmentOwnerships, eq(users.id, apartmentOwnerships.userId))
    .leftJoin(apartments, eq(apartmentOwnerships.apartmentId, apartments.id))
    .where(eq(communityPostComments.id, commentId))
    .limit(1);

  return comment;
}

// Build nested comment tree
async function buildCommentTree(postId) {
  // Get all comments for this post
  const allComments = await db
    .select({
      comment: communityPostComments,
      userName: users.name,
      userProfileImage: users.profileImage,
      apartmentNumber: apartments.apartmentNumber,
      towerName: apartments.towerName,
    })
    .from(communityPostComments)
    .innerJoin(users, eq(communityPostComments.userId, users.id))
    .leftJoin(apartmentOwnerships, eq(users.id, apartmentOwnerships.userId))
    .leftJoin(apartments, eq(apartmentOwnerships.apartmentId, apartments.id))
    .where(
      and(
        eq(communityPostComments.postId, postId),
        eq(communityPostComments.isDeleted, false)
      )
    )
    .orderBy(communityPostComments.createdAt);

  // Separate parent comments and replies
  const parentComments = allComments.filter(
    (c) => c.comment.parentCommentId === null
  );
  const replyComments = allComments.filter(
    (c) => c.comment.parentCommentId !== null
  );

  // Build tree structure
  const commentsTree = parentComments.map((parent) => {
    const replies = replyComments
      .filter((reply) => reply.comment.parentCommentId === parent.comment.id)
      .map((reply) => ({
        id: reply.comment.id,
        userId: reply.comment.userId,
        userName: reply.userName,
        userProfileImage: reply.userProfileImage,
        userApartment: `${reply.apartmentNumber}${reply.towerName ? `, ${reply.towerName}` : ""}`,
        commentText: reply.comment.commentText,
        createdAt: reply.comment.createdAt,
        isLiked: false, // TODO: Implement likes
        likeCount: 0, // TODO: Implement likes
      }));

    return {
      id: parent.comment.id,
      userId: parent.comment.userId,
      userName: parent.userName,
      userProfileImage: parent.userProfileImage,
      userApartment: `${parent.apartmentNumber}${parent.towerName ? `, ${parent.towerName}` : ""}`,
      commentText: parent.comment.commentText,
      createdAt: parent.comment.createdAt,
      isLiked: false, // TODO: Implement likes
      likeCount: 0, // TODO: Implement likes
      replies,
    };
  });

  return commentsTree;
}

// ============================================
// GET - Get comments for a post
// ============================================
export async function GET(request) {
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
        { success: false, message: "Only users can view comments" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { success: false, message: "Post ID required" },
        { status: 400 }
      );
    }

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

    // Build comment tree
    const comments = await buildCommentTree(parseInt(postId));

    return NextResponse.json({
      success: true,
      comments,
      totalComments: comments.length,
    });
  } catch (error) {
    console.error("❌ Get comments error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Add a comment or reply
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
        { success: false, message: "Only users can comment" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { postId, commentText, parentCommentId } = body;

    // Validation
    if (!postId) {
      return NextResponse.json(
        { success: false, message: "Post ID required" },
        { status: 400 }
      );
    }

    if (!commentText || !commentText.trim()) {
      return NextResponse.json(
        { success: false, message: "Comment text required" },
        { status: 400 }
      );
    }

    if (commentText.trim().length > 500) {
      return NextResponse.json(
        { success: false, message: "Comment too long (max 500 characters)" },
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

    // If replying, verify parent comment exists
    if (parentCommentId) {
      const [parentComment] = await db
        .select()
        .from(communityPostComments)
        .where(eq(communityPostComments.id, parseInt(parentCommentId)))
        .limit(1);

      if (!parentComment) {
        return NextResponse.json(
          { success: false, message: "Parent comment not found" },
          { status: 404 }
        );
      }

      // Don't allow replies to replies (only 1 level deep)
      if (parentComment.parentCommentId !== null) {
        return NextResponse.json(
          {
            success: false,
            message: "Cannot reply to a reply. Reply to the parent comment.",
          },
          { status: 400 }
        );
      }
    }

    // Create comment
    const [newComment] = await db
      .insert(communityPostComments)
      .values({
        postId: parseInt(postId),
        userId,
        commentText: commentText.trim(),
        parentCommentId: parentCommentId ? parseInt(parentCommentId) : null,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    // Get the created comment with user details
    const commentWithDetails = await getCommentWithUserDetails(newComment.id);

    return NextResponse.json({
      success: true,
      message: parentCommentId ? "Reply added successfully" : "Comment added successfully",
      comment: {
        id: commentWithDetails.comment.id,
        userId: commentWithDetails.comment.userId,
        userName: commentWithDetails.userName,
        userProfileImage: commentWithDetails.userProfileImage,
        userApartment: `${commentWithDetails.apartmentNumber}${commentWithDetails.towerName ? `, ${commentWithDetails.towerName}` : ""}`,
        commentText: commentWithDetails.comment.commentText,
        createdAt: commentWithDetails.comment.createdAt,
        parentCommentId: commentWithDetails.comment.parentCommentId,
        isLiked: false,
        likeCount: 0,
      },
    });
  } catch (error) {
    console.error("❌ Add comment error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - Edit a comment
// ============================================
export async function PUT(request) {
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
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { commentId, commentText } = body;

    if (!commentId) {
      return NextResponse.json(
        { success: false, message: "Comment ID required" },
        { status: 400 }
      );
    }

    if (!commentText || !commentText.trim()) {
      return NextResponse.json(
        { success: false, message: "Comment text required" },
        { status: 400 }
      );
    }

    const userId = user.id;

    // Get comment
    const [comment] = await db
      .select()
      .from(communityPostComments)
      .where(eq(communityPostComments.id, parseInt(commentId)))
      .limit(1);

    if (!comment) {
      return NextResponse.json(
        { success: false, message: "Comment not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (comment.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "You can only edit your own comments" },
        { status: 403 }
      );
    }

    // Update comment
    await db
      .update(communityPostComments)
      .set({
        commentText: commentText.trim(),
        updatedAt: new Date(),
      })
      .where(eq(communityPostComments.id, parseInt(commentId)));

    return NextResponse.json({
      success: true,
      message: "Comment updated successfully",
    });
  } catch (error) {
    console.error("❌ Edit comment error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete a comment
// ============================================
export async function DELETE(request) {
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
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json(
        { success: false, message: "Comment ID required" },
        { status: 400 }
      );
    }

    const userId = user.id;

    // Get comment
    const [comment] = await db
      .select()
      .from(communityPostComments)
      .where(eq(communityPostComments.id, parseInt(commentId)))
      .limit(1);

    if (!comment) {
      return NextResponse.json(
        { success: false, message: "Comment not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (comment.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    // Soft delete comment and all replies
    await db
      .update(communityPostComments)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(communityPostComments.id, parseInt(commentId)));

    // Also soft delete all replies
    await db
      .update(communityPostComments)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(communityPostComments.parentCommentId, parseInt(commentId)));

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete comment error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}