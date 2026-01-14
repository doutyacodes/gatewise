// ============================================
// FILE: mobile-api/user/classifieds/[id]/route.js
// Get and Update Classified Details
// ============================================

import { db } from "@/lib/db/drizzle";
import {
  classifieds,
  classifiedImages,
  classifiedComments,
  users,
  apartments,
  apartmentOwnerships,
} from "@/lib/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "../../../middleware/auth";

// ============================================
// GET - Get Classified Details
// ============================================
export async function GET(request, { params }) {
  try {
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const classifiedId = parseInt(params.id);

    // Fetch classified with creator info
    const [classified] = await db
      .select({
        id: classifieds.id,
        title: classifieds.title,
        description: classifieds.description,
        price: classifieds.price,
        category: classifieds.category,
        createdByUserId: classifieds.createdByUserId,
        createdAt: classifieds.createdAt,
        updatedAt: classifieds.updatedAt,
        userName: users.name,
        userProfileImage: users.profileImage,
        userPhone: users.mobileNumber,
      })
      .from(classifieds)
      .innerJoin(users, eq(classifieds.createdByUserId, users.id))
      .where(
        and(eq(classifieds.id, classifiedId), eq(classifieds.isDeleted, false))
      )
      .limit(1);

    if (!classified) {
      return NextResponse.json(
        { success: false, error: "Classified not found" },
        { status: 404 }
      );
    }

    // Fetch images
    const images = await db
      .select()
      .from(classifiedImages)
      .where(eq(classifiedImages.classifiedId, classifiedId))
      .orderBy(classifiedImages.imageOrder);

    const imageUrls = images.map(
      (img) => `https://wowfy.in/gatewise/guest_images/${img.imageFilename}`
    );

    // Fetch top-level comments count
    const comments = await db
      .select()
      .from(classifiedComments)
      .where(
        and(
          eq(classifiedComments.classifiedId, classifiedId),
          eq(classifiedComments.isDeleted, false),
          isNull(classifiedComments.parentCommentId)
        )
      );

    return NextResponse.json({
      success: true,
      classified: {
        ...classified,
        images: imageUrls,
        commentCount: comments.length,
        isMine: classified.createdByUserId === userId,
      },
    });
  } catch (error) {
    console.error("❌ Get classified error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch classified" },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - Update Classified
// ============================================
export async function PUT(request, { params }) {
  try {
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const classifiedId = parseInt(params.id);
    const body = await request.json();
    const { title, description, price, category, imageFilenames } = body;

    // Check ownership
    const [existing] = await db
      .select()
      .from(classifieds)
      .where(eq(classifieds.id, classifiedId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Classified not found" },
        { status: 404 }
      );
    }

    if (existing.createdByUserId !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only edit your own classifieds" },
        { status: 403 }
      );
    }

    // Update classified
    await db
      .update(classifieds)
      .set({
        title: title?.trim() || existing.title,
        description: description?.trim() || existing.description,
        price: price !== undefined ? parseFloat(price) : existing.price,
        category: category?.trim() || existing.category,
        updatedAt: new Date(),
      })
      .where(eq(classifieds.id, classifiedId));

    // Update images if provided
    if (imageFilenames && Array.isArray(imageFilenames)) {
      // Delete old images
      await db
        .delete(classifiedImages)
        .where(eq(classifiedImages.classifiedId, classifiedId));

      // Insert new images
      if (imageFilenames.length > 0) {
        const imageValues = imageFilenames.slice(0, 10).map((filename, index) => ({
          classifiedId,
          imageFilename: filename,
          imageOrder: index,
        }));

        await db.insert(classifiedImages).values(imageValues);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Classified updated successfully",
    });
  } catch (error) {
    console.error("❌ Update classified error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update classified" },
      { status: 500 }
    );
  }
}
