// ============================================
// FILE: mobile-api/user/rent-sessions/[id]/route.js
// Rent Session Details
// ============================================

import { db } from "@/lib/db";
import {
  rentSessions,
  rentSessionAdditionalCharges,
  tenantPreferences,
  users,
  apartments,
  apartmentRooms,
} from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/mobile-api/middleware/auth";

// ============================================
// GET - Get Rent Session Details
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
    const sessionId = parseInt(params.id);

    // Fetch session with apartment info
    const [session] = await db
      .select({
        id: rentSessions.id,
        apartmentId: rentSessions.apartmentId,
        ownerId: rentSessions.ownerId,
        tenantId: rentSessions.tenantId,
        rentAmount: rentSessions.rentAmount,
        maintenanceCost: rentSessions.maintenanceCost,
        initialDeposit: rentSessions.initialDeposit,
        startDate: rentSessions.startDate,
        endDate: rentSessions.endDate,
        durationMonths: rentSessions.durationMonths,
        status: rentSessions.status,
        earlyTerminationRequestedBy: rentSessions.earlyTerminationRequestedBy,
        earlyTerminationApprovedBy: rentSessions.earlyTerminationApprovedBy,
        earlyTerminationReason: rentSessions.earlyTerminationReason,
        terminatedAt: rentSessions.terminatedAt,
        createdAt: rentSessions.createdAt,
        apartmentNumber: apartments.apartmentNumber,
        towerName: apartments.towerName,
        floorNumber: apartments.floorNumber,
      })
      .from(rentSessions)
      .innerJoin(apartments, eq(rentSessions.apartmentId, apartments.id))
      .where(eq(rentSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Rent session not found" },
        { status: 404 }
      );
    }

    // Check authorization
    if (session.ownerId !== userId && session.tenantId !== userId) {
      return NextResponse.json(
        { success: false, error: "You do not have access to this session" },
        { status: 403 }
      );
    }

    // Determine user role
    const userRole = session.ownerId === userId ? "owner" : "tenant";

    // Fetch owner info
    const [owner] = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.mobileNumber,
        email: users.email,
        profileImage: users.profileImage,
      })
      .from(users)
      .where(eq(users.id, session.ownerId))
      .limit(1);

    // Fetch tenant info
    const [tenant] = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.mobileNumber,
        email: users.email,
        profileImage: users.profileImage,
      })
      .from(users)
      .where(eq(users.id, session.tenantId))
      .limit(1);

    // Fetch additional charges
    const charges = await db
      .select()
      .from(rentSessionAdditionalCharges)
      .where(eq(rentSessionAdditionalCharges.sessionId, sessionId));

    // Fetch tenant preferences
    const [preferences] = await db
      .select()
      .from(tenantPreferences)
      .where(eq(tenantPreferences.sessionId, sessionId))
      .limit(1);

    // Fetch room count
    const roomCount = await db
      .select({ count: count() })
      .from(apartmentRooms)
      .where(
        and(
          eq(apartmentRooms.apartmentId, session.apartmentId),
          eq(apartmentRooms.sessionId, sessionId)
        )
      );

    // Calculate progress
    const today = new Date();
    const start = new Date(session.startDate);
    const end = session.endDate ? new Date(session.endDate) : null;

    let progressPercentage = 0;
    let monthsCompleted = 0;
    let monthsRemaining = session.durationMonths || 0;

    if (end) {
      const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      const daysPassed = Math.floor((today - start) / (1000 * 60 * 60 * 24));
      progressPercentage = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));

      monthsCompleted = Math.floor(daysPassed / 30);
      monthsRemaining = Math.max(0, session.durationMonths - monthsCompleted);
    }

    // Calculate total monthly payment
    const additionalTotal = charges.reduce(
      (sum, charge) => sum + parseFloat(charge.chargeAmount),
      0
    );
    const totalMonthly =
      parseFloat(session.rentAmount) +
      parseFloat(session.maintenanceCost) +
      additionalTotal;

    // Calculate next payment due date
    let nextPaymentDue = null;
    if (session.status === "active" && end) {
      const dayOfMonth = start.getDate();
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(dayOfMonth);
      nextPaymentDue = nextMonth.toISOString().split("T")[0];
    }

    return NextResponse.json({
      success: true,
      data: {
        session: {
          ...session,
          totalMonthlyPayment: totalMonthly.toFixed(2),
          progressPercentage: progressPercentage.toFixed(1),
          monthsCompleted,
          monthsRemaining,
          nextPaymentDue,
        },
        owner,
        tenant,
        additionalCharges: charges,
        preferences,
        roomCount: roomCount[0]?.count || 0,
        userRole,
      },
    });
  } catch (error) {
    console.error("❌ Get session details error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch session details" },
      { status: 500 }
    );
  }
}
