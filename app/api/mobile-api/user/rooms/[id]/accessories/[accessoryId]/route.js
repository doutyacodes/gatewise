// ============================================
// FILE: mobile-api/user/rooms/[id]/accessories/[accessoryId]/route.js
// Accessory Update, Delete, Approve
// ============================================

import { db } from "@/lib/db/drizzle";
import { roomAccessories, apartmentRooms, rentSessions, apartmentOwnerships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/mobile-api/middleware/auth";

// ============================================
// PUT - Update Accessory
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
    const accessoryId = parseInt(params.accessoryId);
    const body = await request.json();
    const { accessoryName, brandName, quantity } = body;

    // Fetch accessory
    const [accessory] = await db
      .select()
      .from(roomAccessories)
      .where(eq(roomAccessories.id, accessoryId))
      .limit(1);

    if (!accessory) {
      return NextResponse.json(
        { success: false, error: "Accessory not found" },
        { status: 404 }
      );
    }

    // Only creator can edit
    if (accessory.createdBy !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only edit accessories you created" },
        { status: 403 }
      );
    }

    // Update
    await db
      .update(roomAccessories)
      .set({
        accessoryName: accessoryName?.trim() || accessory.accessoryName,
        brandName: brandName?.trim() || accessory.brandName,
        quantity: quantity || accessory.quantity,
        updatedAt: new Date(),
      })
      .where(eq(roomAccessories.id, accessoryId));

    return NextResponse.json({
      success: true,
      message: "Accessory updated successfully",
    });
  } catch (error) {
    console.error("❌ Update accessory error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update accessory" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete Accessory
// ============================================
export async function DELETE(request, { params }) {
  try {
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const accessoryId = parseInt(params.accessoryId);

    // Fetch accessory and room
    const [accessory] = await db
      .select()
      .from(roomAccessories)
      .where(eq(roomAccessories.id, accessoryId))
      .limit(1);

    if (!accessory) {
      return NextResponse.json(
        { success: false, error: "Accessory not found" },
        { status: 404 }
      );
    }

    // Check if user is owner of the apartment
    const [room] = await db
      .select()
      .from(apartmentRooms)
      .where(eq(apartmentRooms.id, accessory.roomId))
      .limit(1);

    const ownership = await db
      .select()
      .from(apartmentOwnerships)
      .where(
        and(
          eq(apartmentOwnerships.userId, userId),
          eq(apartmentOwnerships.apartmentId, room.apartmentId),
          eq(apartmentOwnerships.ownershipType, "owner")
        )
      )
      .limit(1);

    // Creator or owner can delete
    if (accessory.createdBy !== userId && ownership.length === 0) {
      return NextResponse.json(
        { success: false, error: "You do not have permission to delete this accessory" },
        { status: 403 }
      );
    }

    // Delete
    await db.delete(roomAccessories).where(eq(roomAccessories.id, accessoryId));

    return NextResponse.json({
      success: true,
      message: "Accessory deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete accessory error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete accessory" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Approve/Reject Accessory
// ============================================
export async function POST(request, { params }) {
  try {
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const accessoryId = parseInt(params.accessoryId);
    const body = await request.json();
    const { action } = body; // approve or reject

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    // Fetch accessory and room
    const [accessory] = await db
      .select()
      .from(roomAccessories)
      .where(eq(roomAccessories.id, accessoryId))
      .limit(1);

    if (!accessory) {
      return NextResponse.json(
        { success: false, error: "Accessory not found" },
        { status: 404 }
      );
    }

    if (accessory.approvalStatus !== "pending") {
      return NextResponse.json(
        { success: false, error: "Accessory has already been reviewed" },
        { status: 400 }
      );
    }

    const [room] = await db
      .select()
      .from(apartmentRooms)
      .where(eq(apartmentRooms.id, accessory.roomId))
      .limit(1);

    // Only owner can approve/reject
    const ownership = await db
      .select()
      .from(apartmentOwnerships)
      .where(
        and(
          eq(apartmentOwnerships.userId, userId),
          eq(apartmentOwnerships.apartmentId, room.apartmentId),
          eq(apartmentOwnerships.ownershipType, "owner")
        )
      )
      .limit(1);

    if (ownership.length === 0) {
      return NextResponse.json(
        { success: false, error: "Only the owner can approve accessories" },
        { status: 403 }
      );
    }

    // Update approval status
    await db
      .update(roomAccessories)
      .set({
        approvalStatus: action === "approve" ? "approved" : "rejected",
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(roomAccessories.id, accessoryId));

    // TODO: Send notification to tenant

    return NextResponse.json({
      success: true,
      message: `Accessory ${action}d successfully`,
    });
  } catch (error) {
    console.error("❌ Approve accessory error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to approve accessory" },
      { status: 500 }
    );
  }
}
