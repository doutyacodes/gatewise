// ============================================
// FILE: app/api/mobile-api/disputes/route.js
// FIXED Disputes API
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  disputeReports,
  apartmentOwnerships,
  rentSessions,
  apartmentRooms,
  users,
  userApartmentContext,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { jwtVerify } from "jose";

const encoder = new TextEncoder();
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// ------------------------------------------------
// Helper: Verify JWT Token
// ------------------------------------------------
async function verifyMobileToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload;
  } catch {
    return null;
  }
}

// ------------------------------------------------
// Helper: Get user's current apartment and role
// ------------------------------------------------
async function getUserApartmentInfo(userId) {
  // Get user's current apartment context
  let [context] = await db
    .select()
    .from(userApartmentContext)
    .where(eq(userApartmentContext.userId, userId))
    .limit(1);

  if (!context) {
    // No context set, try to find first approved apartment
    const [ownership] = await db
      .select()
      .from(apartmentOwnerships)
      .where(
        and(
          eq(apartmentOwnerships.userId, userId),
          eq(apartmentOwnerships.isAdminApproved, true)
        )
      )
      .limit(1);

    if (!ownership) {
      return { hasApartment: false };
    }

    // Create context for this apartment
    await db.insert(userApartmentContext).values({
      userId,
      currentApartmentId: ownership.apartmentId,
      lastSwitchedAt: new Date(),
    });

    // ✅ reassign safely since it's now declared with `let`
    context = {
      currentApartmentId: ownership.apartmentId,
    };
  }

  const apartmentId = context.currentApartmentId;

  // Check if user is tenant (has active rent session as tenant)
  const [tenantSession] = await db
    .select()
    .from(rentSessions)
    .where(
      and(
        eq(rentSessions.apartmentId, apartmentId),
        eq(rentSessions.tenantId, userId),
        eq(rentSessions.status, "active")
      )
    )
    .limit(1);

  // Check if user is owner (has active rent session as owner)
  const [ownerSession] = await db
    .select()
    .from(rentSessions)
    .where(
      and(
        eq(rentSessions.apartmentId, apartmentId),
        eq(rentSessions.ownerId, userId),
        eq(rentSessions.status, "active")
      )
    )
    .limit(1);

  // Determine role and active session
  let userRole = null;
  let activeSession = null;

  if (tenantSession) {
    userRole = "tenant";
    activeSession = tenantSession;
  } else if (ownerSession) {
    userRole = "owner";
    activeSession = ownerSession;
  }

  return {
    hasApartment: true,
    apartmentId,
    userRole,
    activeSession,
    hasActiveSession: !!activeSession,
  };
}

// ------------------------------------------------
// GET /api/mobile-api/disputes
// Fetch all disputes for user's active rent session
// ------------------------------------------------
export async function GET(req) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyMobileToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // Get user's apartment info
    const apartmentInfo = await getUserApartmentInfo(user.id);

    if (!apartmentInfo.hasApartment) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No apartment assigned to this user",
        hasApartment: false,
        hasActiveSession: false,
      });
    }

    if (!apartmentInfo.hasActiveSession) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No active rent session found",
        hasApartment: true,
        hasActiveSession: false,
      });
    }

    // FIX: Use table aliases to avoid conflict
    const reportedByUser = db.$with("reported_by").as(db.select().from(users));

    // Fetch all disputes for this session
    const disputes = await db
      .select({
        id: disputeReports.id,
        reportedBy: disputeReports.reportedBy,
        reportedByRole: disputeReports.reportedByRole,
        reportedByName: users.name,
        reportType: disputeReports.reportType,
        reason: disputeReports.reason,
        imageFilename: disputeReports.imageFilename,
        status: disputeReports.status,
        escalatedToAdmin: disputeReports.escalatedToAdmin,
        escalatedAt: disputeReports.escalatedAt,
        resolvedAt: disputeReports.resolvedAt,
        createdAt: disputeReports.createdAt,
        roomId: disputeReports.roomId,
        roomName: apartmentRooms.roomName,
      })
      .from(disputeReports)
      .leftJoin(users, eq(disputeReports.reportedBy, users.id))
      .leftJoin(apartmentRooms, eq(disputeReports.roomId, apartmentRooms.id))
      .where(eq(disputeReports.sessionId, apartmentInfo.activeSession.id))
      .orderBy(desc(disputeReports.createdAt));

    console.log(
      `📊 Found ${disputes.length} disputes for session ${apartmentInfo.activeSession.id}`
    );

    // Add unread count (placeholder)
    const disputesWithUnread = disputes.map((dispute) => ({
      ...dispute,
      unreadCount: 0, // TODO: Implement from disputeChatMessages
    }));

    return NextResponse.json({
      success: true,
      data: disputesWithUnread,
      userRole: apartmentInfo.userRole,
      sessionId: apartmentInfo.activeSession.id,
      apartmentId: apartmentInfo.apartmentId,
      hasApartment: true,
      hasActiveSession: true,
    });
  } catch (err) {
    console.error("❌ Error fetching disputes:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch disputes",
        details: err.message,
      },
      { status: 500 }
    );
  }
}

// ------------------------------------------------
// POST /api/mobile-api/disputes
// Create a new dispute for active rent session
// ------------------------------------------------
export async function POST(req) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyMobileToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { reportType, reason, roomId, imageFilename } = body;

    console.log("📥 Create dispute request:", {
      reportType,
      reason,
      roomId,
      hasImage: !!imageFilename,
    });

    // Validation
    if (!reportType || !["room_based", "common"].includes(reportType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid report type is required (room_based or common)",
        },
        { status: 400 }
      );
    }

    if (!reason?.trim()) {
      return NextResponse.json(
        { success: false, error: "Reason is required" },
        { status: 400 }
      );
    }

    if (reportType === "room_based" && !roomId) {
      return NextResponse.json(
        {
          success: false,
          error: "Room ID is required for room-based disputes",
        },
        { status: 400 }
      );
    }

    // Get user's apartment info
    const apartmentInfo = await getUserApartmentInfo(user.id);

    if (!apartmentInfo.hasApartment) {
      return NextResponse.json(
        {
          success: false,
          error: "No apartment found. You must have an approved apartment.",
          hasApartment: false,
        },
        { status: 400 }
      );
    }

    if (!apartmentInfo.hasActiveSession) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No active rent session found. You need an active rental agreement.",
          hasApartment: true,
          hasActiveSession: false,
        },
        { status: 400 }
      );
    }

    // Verify room belongs to this apartment (if room-based)
    if (reportType === "room_based") {
      const [room] = await db
        .select()
        .from(apartmentRooms)
        .where(
          and(
            eq(apartmentRooms.id, parseInt(roomId)),
            eq(apartmentRooms.apartmentId, apartmentInfo.apartmentId)
          )
        )
        .limit(1);

      if (!room) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid room. Room does not belong to your apartment.",
          },
          { status: 400 }
        );
      }
    }

    // Create new dispute
    const [newDispute] = await db
      .insert(disputeReports)
      .values({
        sessionId: apartmentInfo.activeSession.id,
        reportedBy: user.id,
        reportedByRole: apartmentInfo.userRole, // 'owner' or 'tenant'
        reportType,
        reason: reason.trim(),
        roomId: reportType === "room_based" ? parseInt(roomId) : null,
        imageFilename: imageFilename || null,
        status: "open",
        escalatedToAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    console.log("✅ Dispute created:", newDispute.id);

    return NextResponse.json({
      success: true,
      message: "Dispute created successfully",
      disputeId: newDispute.id,
    });
  } catch (err) {
    console.error("❌ Error creating dispute:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create dispute",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
