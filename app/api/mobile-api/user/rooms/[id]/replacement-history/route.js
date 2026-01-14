// ============================================
// FILE: mobile-api/user/rooms/[id]/replacement-history/route.js
// Accessory Replacement History - List and Create
// ============================================

import { db } from "@/lib/db";
import {
  accessoryReplacementHistory,
  apartmentRooms,
  roomAccessories,
  rentSessions,
  apartmentOwnerships,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/mobile-api/middleware/auth";

// ============================================
// GET - List Replacement History for Room
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

    // Check access
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

    if (ownership.length === 0 && room.sessionId) {
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
    }

    // Fetch replacement history
    const history = await db
      .select()
      .from(accessoryReplacementHistory)
      .where(eq(accessoryReplacementHistory.roomId, roomId))
      .orderBy(desc(accessoryReplacementHistory.replacementDate));

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("❌ List replacement history error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch replacement history" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Log Replacement
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
    const {
      accessoryId,
      oldAccessoryName,
      newAccessoryName,
      replacementReason,
      cost,
      paidBy,
      includedInRent,
      replacementDate,
    } = body;

    if (!newAccessoryName || !paidBy || !replacementDate) {
      return NextResponse.json(
        { success: false, error: "New accessory name, paid by, and date are required" },
        { status: 400 }
      );
    }

    // Fetch room
    const [room] = await db
      .select()
      .from(apartmentRooms)
      .where(eq(apartmentRooms.id, roomId))
      .limit(1);

    if (!room || !room.sessionId) {
      return NextResponse.json(
        { success: false, error: "Room not found or no active rent session" },
        { status: 404 }
      );
    }

    // Determine user role
    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, room.sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Rent session not found" },
        { status: 404 }
      );
    }

    let userRole = null;
    let requiresApproval = false;

    if (session.ownerId === userId) {
      userRole = "owner";
      requiresApproval = false;
    } else if (session.tenantId === userId) {
      userRole = "tenant";
      requiresApproval = true;
    } else {
      return NextResponse.json(
        { success: false, error: "You do not have access to this session" },
        { status: 403 }
      );
    }

    // Insert replacement record
    const [newReplacement] = await db
      .insert(accessoryReplacementHistory)
      .values({
        sessionId: session.id,
        roomId,
        accessoryId: accessoryId || null,
        oldAccessoryName: oldAccessoryName?.trim() || null,
        newAccessoryName: newAccessoryName.trim(),
        replacementReason: replacementReason?.trim() || null,
        replacedBy: userId,
        replacedByRole: userRole,
        cost: cost ? parseFloat(cost) : null,
        paidBy,
        includedInRent: includedInRent || false,
        replacementDate,
        approvalStatus: requiresApproval ? "pending" : "approved",
        approvedBy: requiresApproval ? null : userId,
        approvedAt: requiresApproval ? null : new Date(),
      })
      .$returningId();

    // TODO: Send notification if requires approval

    return NextResponse.json({
      success: true,
      message: requiresApproval
        ? "Replacement logged, pending owner approval"
        : "Replacement logged successfully",
      replacementId: newReplacement.id,
      requiresApproval,
    });
  } catch (error) {
    console.error("❌ Log replacement error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log replacement" },
      { status: 500 }
    );
  }
}
