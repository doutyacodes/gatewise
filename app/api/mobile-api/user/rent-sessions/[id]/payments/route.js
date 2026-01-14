// ============================================
// FILE: mobile-api/user/rent-sessions/[id]/payments/route.js
// Rent Payments - List and Create
// ============================================

import { db } from "@/lib/db/drizzle";
import { rentPayments, rentSessions, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/mobile-api/middleware/auth";

// ============================================
// GET - List Payments for Session
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
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // all, approved, pending, disputed

    // Check session access
    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Rent session not found" },
        { status: 404 }
      );
    }

    if (session.ownerId !== userId && session.tenantId !== userId) {
      return NextResponse.json(
        { success: false, error: "You do not have access to this session" },
        { status: 403 }
      );
    }

    const userRole = session.ownerId === userId ? "owner" : "tenant";

    // Build query conditions
    let conditions = [eq(rentPayments.sessionId, sessionId)];

    if (filter && filter !== "all") {
      conditions.push(eq(rentPayments.approvalStatus, filter));
    }

    // Fetch payments with logger info
    const payments = await db
      .select({
        id: rentPayments.id,
        sessionId: rentPayments.sessionId,
        paymentAmount: rentPayments.paymentAmount,
        paymentDate: rentPayments.paymentDate,
        paymentMonth: rentPayments.paymentMonth,
        paymentYear: rentPayments.paymentYear,
        loggedBy: rentPayments.loggedBy,
        loggedByRole: rentPayments.loggedByRole,
        approvalStatus: rentPayments.approvalStatus,
        approvedBy: rentPayments.approvedBy,
        approvedAt: rentPayments.approvedAt,
        disputeReason: rentPayments.disputeReason,
        editedAmount: rentPayments.editedAmount,
        finalAccepted: rentPayments.finalAccepted,
        createdAt: rentPayments.createdAt,
        loggerName: users.name,
      })
      .from(rentPayments)
      .innerJoin(users, eq(rentPayments.loggedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(rentPayments.paymentDate));

    // Calculate summary
    const totalPaid = payments
      .filter((p) => p.approvalStatus === "approved")
      .reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0);

    const pendingAmount = payments
      .filter((p) => p.approvalStatus === "pending")
      .reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0);

    const disputedAmount = payments
      .filter((p) => p.approvalStatus === "disputed")
      .reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0);

    return NextResponse.json({
      success: true,
      payments,
      summary: {
        totalPaid: totalPaid.toFixed(2),
        pendingAmount: pendingAmount.toFixed(2),
        disputedAmount: disputedAmount.toFixed(2),
        totalPayments: payments.length,
      },
      userRole,
    });
  } catch (error) {
    console.error("❌ List payments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Log Payment
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
    const sessionId = parseInt(params.id);
    const body = await request.json();
    const { paymentAmount, paymentDate, paymentMonth, paymentYear } = body;

    // Validate
    if (!paymentAmount || !paymentDate) {
      return NextResponse.json(
        { success: false, error: "Payment amount and date are required" },
        { status: 400 }
      );
    }

    // Check session access
    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Rent session not found" },
        { status: 404 }
      );
    }

    if (session.ownerId !== userId && session.tenantId !== userId) {
      return NextResponse.json(
        { success: false, error: "You do not have access to this session" },
        { status: 403 }
      );
    }

    const loggedByRole = session.ownerId === userId ? "owner" : "tenant";

    // Insert payment
    const [newPayment] = await db
      .insert(rentPayments)
      .values({
        sessionId,
        paymentAmount: parseFloat(paymentAmount),
        paymentDate,
        paymentMonth: paymentMonth || null,
        paymentYear: paymentYear || null,
        loggedBy: userId,
        loggedByRole,
        approvalStatus: "pending",
        finalAccepted: false,
      })
      .$returningId();

    // TODO: Send notification to the other party

    return NextResponse.json({
      success: true,
      message: "Payment logged successfully",
      paymentId: newPayment.id,
    });
  } catch (error) {
    console.error("❌ Log payment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log payment" },
      { status: 500 }
    );
  }
}
