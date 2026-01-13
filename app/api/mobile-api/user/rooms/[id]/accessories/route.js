// ============================================
// FILE: mobile-api/user/rooms/[id]/accessories/route.js
// Room Accessories - List and Create
// ============================================

import { db } from "@/lib/db/drizzle";
import { roomAccessories, apartmentRooms, rentSessions, apartmentOwnerships, apartments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/mobile-api/middleware/auth";

// ============================================
// GET - List Accessories for Room
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
    const roomId = parseInt(params.id);

    // Fetch room and check access
    const [room] = await db
      .select({
        id: apartmentRooms.id,
        apartmentId: apartmentRooms.apartmentId,
        sessionId: apartmentRooms.sessionId,
        roomName: apartmentRooms.roomName,
        roomType: apartmentRooms.roomType,
      })
      .from(apartmentRooms)
      .where(eq(apartmentRooms.id, roomId))
      .limit(1);

    if (!room) {
      return NextResponse.json(
        { success: false, error: "Room not found" },
        { status: 404 }
      );
    }

    // Check ownership
    const ownership = await db
      .select()
      .from(apartmentOwnerships)
      .where(
        and(
          eq(apartmentOwnerships.userId, userId),
          eq(apartmentOwnerships.apartmentId, room.apartmentId),
          eq(apartmentOwnerships.isAdminApproved, true)
        )
      )
      .limit(1);

    if (ownership.length === 0) {
      // Check if tenant in active session
      if (room.sessionId) {
        const [session] = await db
          .select()
          .from(rentSessions)
          .where(
            and(
              eq(rentSessions.id, room.sessionId),
              eq(rentSessions.tenantId, userId)
            )
          )
          .limit(1);

        if (!session) {
          return NextResponse.json(
            { success: false, error: "You do not have access to this room" },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: "You do not have access to this room" },
          { status: 403 }
        );
      }
    }

    // Fetch accessories
    const accessories = await db
      .select()
      .from(roomAccessories)
      .where(eq(roomAccessories.roomId, roomId));

    return NextResponse.json({
      success: true,
      accessories,
      room,
    });
  } catch (error) {
    console.error("❌ List accessories error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch accessories" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Add Accessory
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
    const roomId = parseInt(params.id);
    const body = await request.json();
    const { accessoryName, brandName, quantity } = body;

    if (!accessoryName) {
      return NextResponse.json(
        { success: false, error: "Accessory name is required" },
        { status: 400 }
      );
    }

    // Fetch room
    const [room] = await db
      .select()
      .from(apartmentRooms)
      .where(eq(apartmentRooms.id, roomId))
      .limit(1);

    if (!room) {
      return NextResponse.json(
        { success: false, error: "Room not found" },
        { status: 404 }
      );
    }

    // Determine user role
    let userRole = null;
    let requiresApproval = false;

    // Check if owner
    const ownership = await db
      .select()
      .from(apartmentOwnerships)
      .where(
        and(
          eq(apartmentOwnerships.userId, userId),
          eq(apartmentOwnerships.apartmentId, room.apartmentId),
          eq(apartmentOwnerships.ownershipType, "owner"),
          eq(apartmentOwnerships.isAdminApproved, true)
        )
      )
      .limit(1);

    if (ownership.length > 0) {
      userRole = "owner";
      requiresApproval = false; // Owner doesn't need approval
    } else if (room.sessionId) {
      // Check if tenant
      const [session] = await db
        .select()
        .from(rentSessions)
        .where(
          and(
            eq(rentSessions.id, room.sessionId),
            eq(rentSessions.tenantId, userId)
          )
        )
        .limit(1);

      if (session) {
        userRole = "tenant";
        requiresApproval = true; // Tenant needs owner approval
      }
    }

    if (!userRole) {
      return NextResponse.json(
        { success: false, error: "You do not have permission to add accessories" },
        { status: 403 }
      );
    }

    // Insert accessory
    const [newAccessory] = await db
      .insert(roomAccessories)
      .values({
        roomId,
        accessoryName: accessoryName.trim(),
        brandName: brandName?.trim() || null,
        quantity: quantity || 1,
        createdBy: userId,
        createdByRole: userRole,
        approvalStatus: requiresApproval ? "pending" : "approved",
        approvedBy: requiresApproval ? null : userId,
        approvedAt: requiresApproval ? null : new Date(),
      })
      .$returningId();

    // TODO: Send notification if requires approval

    return NextResponse.json({
      success: true,
      message: requiresApproval
        ? "Accessory added, pending owner approval"
        : "Accessory added successfully",
      accessoryId: newAccessory.id,
      requiresApproval,
    });
  } catch (error) {
    console.error("❌ Add accessory error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add accessory" },
      { status: 500 }
    );
  }
}
