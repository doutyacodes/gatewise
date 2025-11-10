// ============================================
// FILE: app/api/mobile-api/user/rooms/route.js
// Room Management API - Get & Create Rooms
// ============================================

import { db } from "@/lib/db";
import {
  apartmentRooms,
  apartmentOwnerships,
  rentSessions,
  apartments,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const encoder = new TextEncoder();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Token verification
async function verifyMobileToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload;
  } catch (error) {
    return null;
  }
}

// Helper to get user role in apartment
async function getUserRoleInApartment(userId, apartmentId) {
  const [ownership] = await db
    .select()
    .from(apartmentOwnerships)
    .where(
      and(
        eq(apartmentOwnerships.userId, userId),
        eq(apartmentOwnerships.apartmentId, apartmentId),
        eq(apartmentOwnerships.isAdminApproved, true)
      )
    )
    .limit(1);

  return ownership?.ownershipType || null;
}

// Helper to check if active rent session exists
async function hasActiveRentSession(apartmentId) {
  const [session] = await db
    .select()
    .from(rentSessions)
    .where(
      and(
        eq(rentSessions.apartmentId, apartmentId),
        eq(rentSessions.status, 'active')
      )
    )
    .limit(1);

  return session ? true : false;
}

// Helper to get active session details
async function getActiveRentSession(apartmentId) {
  const [session] = await db
    .select()
    .from(rentSessions)
    .where(
      and(
        eq(rentSessions.apartmentId, apartmentId),
        eq(rentSessions.status, 'active')
      )
    )
    .limit(1);

  return session || null;
}

// ============================================
// GET - Fetch all rooms for current apartment
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
        { success: false, message: "Only users can access rooms" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const apartmentId = searchParams.get("apartmentId");

    if (!apartmentId) {
      return NextResponse.json(
        { success: false, message: "Apartment ID required" },
        { status: 400 }
      );
    }

    const userId = user.id;

    // Verify user has access to this apartment
    const userRole = await getUserRoleInApartment(userId, parseInt(apartmentId));
    if (!userRole) {
      return NextResponse.json(
        { success: false, message: "No access to this apartment" },
        { status: 403 }
      );
    }

    // Check if active rent session exists
    const activeSession = await getActiveRentSession(parseInt(apartmentId));
    const hasActiveSession = !!activeSession;

    // Fetch all rooms for this apartment
    const rooms = await db
      .select({
        id: apartmentRooms.id,
        roomName: apartmentRooms.roomName,
        roomType: apartmentRooms.roomType,
        createdBy: apartmentRooms.createdBy,
        createdByRole: apartmentRooms.createdByRole,
        approvalStatus: apartmentRooms.approvalStatus,
        approvedBy: apartmentRooms.approvedBy,
        approvedAt: apartmentRooms.approvedAt,
        createdAt: apartmentRooms.createdAt,
        sessionId: apartmentRooms.sessionId,
      })
      .from(apartmentRooms)
      .where(eq(apartmentRooms.apartmentId, parseInt(apartmentId)))
      .orderBy(apartmentRooms.createdAt);

    // Get accessories count for each room (if you have accessories table)
    // For now, returning 0 as placeholder
    const roomsWithAccessories = rooms.map(room => ({
      ...room,
      accessoriesCount: 0, // TODO: Fetch from roomAccessories table
    }));

    return NextResponse.json({
      success: true,
      rooms: roomsWithAccessories,
      userRole,
      hasActiveSession,
      activeSessionId: activeSession?.id || null,
    });

  } catch (error) {
    console.error("❌ Get rooms error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create new room
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
        { success: false, message: "Only users can create rooms" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { apartmentId, roomName, roomType } = body;

    // Validation
    if (!apartmentId || !roomName || !roomType) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = user.id;

    // Verify user has access to this apartment
    const userRole = await getUserRoleInApartment(userId, apartmentId);
    if (!userRole) {
      return NextResponse.json(
        { success: false, message: "No access to this apartment" },
        { status: 403 }
      );
    }

    // Check if active rent session exists
    const activeSession = await getActiveRentSession(apartmentId);
    const hasActiveSession = !!activeSession;

    // Determine approval status based on role and session
    let approvalStatus = 'approved';
    let sessionId = null;

    if (hasActiveSession) {
      sessionId = activeSession.id;
      
      if (userRole === 'tenant') {
        // Tenant creating room during active session -> needs owner approval
        approvalStatus = 'pending';
      } else if (userRole === 'owner') {
        // Owner creating room during active session -> needs tenant approval
        approvalStatus = 'pending';
      }
    } else {
      // No active session
      if (userRole === 'owner') {
        // Owner creating room, no session -> auto approved
        approvalStatus = 'approved';
      } else {
        // Tenant trying to create room without session (shouldn't happen)
        return NextResponse.json(
          { success: false, message: "No active rental session found" },
          { status: 400 }
        );
      }
    }

    // Insert new room
    const [newRoom] = await db
      .insert(apartmentRooms)
      .values({
        apartmentId,
        roomName: roomName.trim(),
        roomType,
        sessionId,
        createdBy: userId,
        createdByRole: userRole,
        approvalStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    // Fetch the created room with full details
    const [createdRoom] = await db
      .select()
      .from(apartmentRooms)
      .where(eq(apartmentRooms.id, newRoom.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: approvalStatus === 'pending' 
        ? "Room created and sent for approval"
        : "Room created successfully",
      room: {
        ...createdRoom,
        accessoriesCount: 0,
      },
      requiresApproval: approvalStatus === 'pending',
    });

  } catch (error) {
    console.error("❌ Create room error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}