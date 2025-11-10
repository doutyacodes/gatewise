const IMAGE_BASE_URL = "https://wowfy.in/gatewise/guest_images/";

// ============================================
// FILE: app/api/mobile-api/user/community-posts/route.js
// Community Posts API - List & Create
// ============================================

import { db } from "@/lib/db";
import {
  communityPosts,
  communityPostImages,
  communityPostComments,
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

// ============================================
// GET - List community posts
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
        { success: false, message: "Only users can view posts" },
        { status: 403 }
      );
    }

    const userId = user.id;

    // Get user's community
    const apartmentInfo = await getUserApartmentInfo(userId);
    if (!apartmentInfo) {
      return NextResponse.json(
        {
          success: false,
          message: "No apartment found. Please join a community first.",
        },
        { status: 404 }
      );
    }

    const communityId = apartmentInfo.communityId;

    // Get posts with user info and apartment details
    const postsQuery = await db
      .select({
        post: communityPosts,
        userName: users.name,
        userProfileImage: users.profileImage,
        apartmentNumber: apartments.apartmentNumber,
        towerName: apartments.towerName,
      })
      .from(communityPosts)
      .innerJoin(users, eq(communityPosts.createdByUserId, users.id))
      .leftJoin(apartmentOwnerships, eq(users.id, apartmentOwnerships.userId))
      .leftJoin(apartments, eq(apartmentOwnerships.apartmentId, apartments.id))
      .where(
        and(
          eq(communityPosts.communityId, communityId),
          eq(communityPosts.isDeleted, false)
        )
      )
      .orderBy(desc(communityPosts.createdAt));

    // Get images and comment counts for each post
    const postsWithDetails = await Promise.all(
      postsQuery.map(async (item) => {
        const postId = item.post.id;

        // Get images
        const images = await db
          .select()
          .from(communityPostImages)
          .where(eq(communityPostImages.postId, postId))
          .orderBy(communityPostImages.imageOrder);

        // Get comment count (including replies)
        const [commentCountResult] = await db
          .select({ count: sql  `count(*)` })
          .from(communityPostComments)
          .where(
            and(
              eq(communityPostComments.postId, postId),
              eq(communityPostComments.isDeleted, false)
            )
          );

        return {
          id: item.post.id,
          userId: item.post.createdByUserId,
          userName: item.userName,
          userProfileImage: item.userProfileImage,
          userApartment: `${item.apartmentNumber}${
            item.towerName ? `, ${item.towerName}` : ""
          }`,
          postText: item.post.description,
          images: images.map((img) => `${IMAGE_BASE_URL}${img.imageFilename}`),
          commentCount: commentCountResult.count,
          createdAt: item.post.createdAt,
          isLiked: false, // TODO: Implement likes table
          likeCount: 0, // TODO: Implement likes table
        };
      })
    );

    return NextResponse.json({
      success: true,
      posts: postsWithDetails,
      communityId,
    });
  } catch (error) {
    console.error("❌ Get posts error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create new community post
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
        { success: false, message: "Only users can create posts" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { description, imageFilenames } = body;

    // Validation: Either text or images must exist
    if (
      (!description || !description.trim()) &&
      (!imageFilenames || imageFilenames.length === 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide post text or at least one image",
        },
        { status: 400 }
      );
    }

    // Validation
    if (!description || !description.trim()) {
      return NextResponse.json(
        { success: false, message: "Post description is required" },
        { status: 400 }
      );
    }

    const userId = user.id;

    // Get user's community
    const apartmentInfo = await getUserApartmentInfo(userId);
    if (!apartmentInfo) {
      return NextResponse.json(
        {
          success: false,
          message: "No apartment found. Please join a community first.",
        },
        { status: 404 }
      );
    }

    const communityId = apartmentInfo.communityId;

    // Create post
    const [newPost] = await db
      .insert(communityPosts)
      .values({
        communityId,
        createdByUserId: userId,
        description: description.trim(),
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    const postId = newPost.id;

    // Add images if any
    if (imageFilenames && imageFilenames.length > 0) {
      const imageValues = imageFilenames.map((filename, index) => ({
        postId,
        imageFilename: filename,
        imageOrder: index,
        createdAt: new Date(),
      }));

      await db.insert(communityPostImages).values(imageValues);
    }

    return NextResponse.json({
      success: true,
      message: "Post created successfully",
      postId,
    });
  } catch (error) {
    console.error("❌ Create post error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete a post
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
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { success: false, message: "Post ID required" },
        { status: 400 }
      );
    }

    const userId = user.id;

    // Get post
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

    // Check ownership
    if (post.createdByUserId !== userId) {
      return NextResponse.json(
        { success: false, message: "You can only delete your own posts" },
        { status: 403 }
      );
    }

    // Soft delete
    await db
      .update(communityPosts)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(communityPosts.id, parseInt(postId)));

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete post error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
