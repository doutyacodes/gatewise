// ============================================
// FILE: mobile-api/user/classifieds/route.js
// List and Create Classifieds
// ============================================

import { db } from "@/lib/db/drizzle";
import {
  classifieds,
  classifiedImages,
  classifiedLikes,
  classifiedComments,
  users,
  apartments,
  apartmentOwnerships
} from "@/lib/db/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/mobile-api/middleware/auth";

// ============================================
// GET - List Classifieds
// ============================================
export async function GET(request) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const filter = searchParams.get("filter"); // all, my, sold

    // Get user's current apartment and community
    const ownership = await db
      .select({
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

    if (ownership.length === 0) {
      return NextResponse.json({
        success: true,
        classifieds: [],
        total: 0,
        message: "No approved apartment found",
      });
    }

    const communityId = ownership[0].communityId;

    // Build query conditions
    let conditions = [
      eq(classifieds.communityId, communityId),
      eq(classifieds.isDeleted, false),
    ];

    if (category && category !== "all") {
      conditions.push(eq(classifieds.category, category));
    }

    if (filter === "my") {
      conditions.push(eq(classifieds.createdByUserId, userId));
    }

    // Fetch classifieds with user info and apartment details
    const result = await db
      .select({
        id: classifieds.id,
        title: classifieds.title,
        description: classifieds.description,
        price: classifieds.price,
        category: classifieds.category,
        condition: classifieds.condition,
        isNegotiable: classifieds.isNegotiable,
        status: classifieds.status,
        contactPhone: classifieds.contactPhone,
        viewCount: classifieds.viewCount,
        createdByUserId: classifieds.createdByUserId,
        createdAt: classifieds.createdAt,
        updatedAt: classifieds.updatedAt,
        userName: users.name,
        userProfileImage: users.profileImage,
        apartmentNumber: apartments.apartmentNumber,
        towerName: apartments.towerName,
      })
      .from(classifieds)
      .innerJoin(users, eq(classifieds.createdByUserId, users.id))
      .leftJoin(
        apartmentOwnerships,
        eq(users.id, apartmentOwnerships.userId)
      )
      .leftJoin(apartments, eq(apartmentOwnerships.apartmentId, apartments.id))
      .where(and(...conditions))
      .orderBy(desc(classifieds.createdAt));

    // Fetch images for each classified
    const classifiedIds = result.map((c) => c.id);
    const images = classifiedIds.length > 0
      ? await db
          .select()
          .from(classifiedImages)
          .where(eq(classifiedImages.classifiedId, classifiedIds))
          .orderBy(classifiedImages.imageOrder)
      : [];

    // Group images by classified ID (return filenames, not full URLs)
    const imagesByClassified = images.reduce((acc, img) => {
      if (!acc[img.classifiedId]) acc[img.classifiedId] = [];
      acc[img.classifiedId].push(img.imageFilename);
      return acc;
    }, {});

    // Fetch likes for these classifieds
    const likes = classifiedIds.length > 0
      ? await db
          .select()
          .from(classifiedLikes)
          .where(
            and(
              inArray(classifiedLikes.classifiedId, classifiedIds),
              eq(classifiedLikes.userId, userId)
            )
          )
      : [];

    const likedClassifiedIds = new Set(likes.map(l => l.classifiedId));

    // Get like counts for all classifieds
    const likeCounts = classifiedIds.length > 0
      ? await db
          .select({
            classifiedId: classifiedLikes.classifiedId,
            count: sql`COUNT(*)`.as('count'),
          })
          .from(classifiedLikes)
          .where(inArray(classifiedLikes.classifiedId, classifiedIds))
          .groupBy(classifiedLikes.classifiedId)
      : [];

    const likeCountMap = likeCounts.reduce((acc, lc) => {
      acc[lc.classifiedId] = Number(lc.count);
      return acc;
    }, {});

    // Get comment counts
    const commentCounts = classifiedIds.length > 0
      ? await db
          .select({
            classifiedId: classifiedComments.classifiedId,
            count: sql`COUNT(*)`.as('count'),
          })
          .from(classifiedComments)
          .where(
            and(
              inArray(classifiedComments.classifiedId, classifiedIds),
              eq(classifiedComments.isDeleted, false)
            )
          )
          .groupBy(classifiedComments.classifiedId)
      : [];

    const commentCountMap = commentCounts.reduce((acc, cc) => {
      acc[cc.classifiedId] = Number(cc.count);
      return acc;
    }, {});

    // Format response
    const formattedClassifieds = result.map((c) => ({
      ...c,
      images: imagesByClassified[c.id] || [],
      likeCount: likeCountMap[c.id] || 0,
      isLiked: likedClassifiedIds.has(c.id),
      commentCount: commentCountMap[c.id] || 0,
      location: c.towerName ? `${c.towerName} - ${c.apartmentNumber}` : c.apartmentNumber,
      isMine: c.createdByUserId === userId,
    }));

    return NextResponse.json({
      success: true,
      classifieds: formattedClassifieds,
      total: formattedClassifieds.length,
    });
  } catch (error) {
    console.error("❌ List classifieds error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch classifieds" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create Classified
// ============================================
export async function POST(request) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body = await request.json();
    const { title, description, price, category, imageFilenames } = body;

    // Validate required fields
    if (!title || !description || !category) {
      return NextResponse.json(
        { success: false, error: "Title, description, and category are required" },
        { status: 400 }
      );
    }

    // Get user's community
    const ownership = await db
      .select({
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

    if (ownership.length === 0) {
      return NextResponse.json(
        { success: false, error: "No approved apartment found" },
        { status: 403 }
      );
    }

    const communityId = ownership[0].communityId;

    // Create classified
    const [newClassified] = await db
      .insert(classifieds)
      .values({
        communityId,
        createdByUserId: userId,
        title: title.trim(),
        description: description.trim(),
        price: price ? parseFloat(price) : null,
        category: category.trim(),
        isDeleted: false,
      })
      .$returningId();

    const classifiedId = newClassified.id;

    // Insert images if provided
    if (imageFilenames && Array.isArray(imageFilenames) && imageFilenames.length > 0) {
      const imageValues = imageFilenames.slice(0, 10).map((filename, index) => ({
        classifiedId,
        imageFilename: filename,
        imageOrder: index,
      }));

      await db.insert(classifiedImages).values(imageValues);
    }

    return NextResponse.json({
      success: true,
      message: "Classified created successfully",
      classifiedId,
    });
  } catch (error) {
    console.error("❌ Create classified error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create classified" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete Classified (Soft Delete)
// ============================================
export async function DELETE(request) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const { searchParams } = new URL(request.url);
    const classifiedId = parseInt(searchParams.get("classifiedId"));

    if (!classifiedId) {
      return NextResponse.json(
        { success: false, error: "Classified ID is required" },
        { status: 400 }
      );
    }

    // Check ownership
    const [classified] = await db
      .select()
      .from(classifieds)
      .where(eq(classifieds.id, classifiedId))
      .limit(1);

    if (!classified) {
      return NextResponse.json(
        { success: false, error: "Classified not found" },
        { status: 404 }
      );
    }

    if (classified.createdByUserId !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only delete your own classifieds" },
        { status: 403 }
      );
    }

    // Soft delete
    await db
      .update(classifieds)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
      })
      .where(eq(classifieds.id, classifiedId));

    return NextResponse.json({
      success: true,
      message: "Classified deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete classified error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete classified" },
      { status: 500 }
    );
  }
}
