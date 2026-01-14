// ============================================
// FILE: mobile-api/user/rent-sessions/[id]/payments/[paymentId]/route.js
// Payment Approval, Dispute, Edit
// ============================================

import { db } from "@/lib/db";
import { rentPayments, rentSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/mobile-api/middleware/auth";

// ============================================
// PUT - Update Payment (Edit amount or dispute)
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
    const sessionId = parseInt(params.id);
    const paymentId = parseInt(params.paymentId);
    const body = await request.json();
    const { action, disputeReason, editedAmount } = body;

    // Fetch payment and session
    const [payment] = await db
      .select()
      .from(rentPayments)
      .where(eq(rentPayments.id, paymentId))
      .limit(1);

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
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

    // Handle different actions
    if (action === "dispute") {
      // Only the opposite party can dispute
      if (payment.loggedByRole === userRole) {
        return NextResponse.json(
          { success: false, error: "You cannot dispute your own payment entry" },
          { status: 403 }
        );
      }

      await db
        .update(rentPayments)
        .set({
          approvalStatus: "disputed",
          disputeReason: disputeReason || null,
          editedAmount: editedAmount ? parseFloat(editedAmount) : null,
          updatedAt: new Date(),
        })
        .where(eq(rentPayments.id, paymentId));

      // TODO: Send notification

      return NextResponse.json({
        success: true,
        message: "Payment disputed successfully",
      });
    } else if (action === "edit") {
      // Only the logger can edit their own entry
      if (payment.loggedBy !== userId) {
        return NextResponse.json(
          { success: false, error: "You can only edit your own payment entries" },
          { status: 403 }
        );
      }

      await db
        .update(rentPayments)
        .set({
          paymentAmount: editedAmount ? parseFloat(editedAmount) : payment.paymentAmount,
          approvalStatus: "pending",
          disputeReason: null,
          editedAmount: null,
          updatedAt: new Date(),
        })
        .where(eq(rentPayments.id, paymentId));

      return NextResponse.json({
        success: true,
        message: "Payment updated successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("❌ Update payment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Approve Payment
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
    const paymentId = parseInt(params.paymentId);

    // Fetch payment and session
    const [payment] = await db
      .select()
      .from(rentPayments)
      .where(eq(rentPayments.id, paymentId))
      .limit(1);

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
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

    // Only the opposite party can approve
    if (payment.loggedByRole === userRole) {
      return NextResponse.json(
        { success: false, error: "You cannot approve your own payment entry" },
        { status: 403 }
      );
    }

    // Approve payment
    await db
      .update(rentPayments)
      .set({
        approvalStatus: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        finalAccepted: true,
        disputeReason: null,
        updatedAt: new Date(),
      })
      .where(eq(rentPayments.id, paymentId));

    // TODO: Send notification

    return NextResponse.json({
      success: true,
      message: "Payment approved successfully",
    });
  } catch (error) {
    console.error("❌ Approve payment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to approve payment" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete Payment
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
    const paymentId = parseInt(params.paymentId);

    // Fetch payment
    const [payment] = await db
      .select()
      .from(rentPayments)
      .where(eq(rentPayments.id, paymentId))
      .limit(1);

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    // Only logger can delete and only if not approved
    if (payment.loggedBy !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only delete your own payment entries" },
        { status: 403 }
      );
    }

    if (payment.approvalStatus === "approved") {
      return NextResponse.json(
        { success: false, error: "Cannot delete approved payments" },
        { status: 403 }
      );
    }

    // Delete payment
    await db.delete(rentPayments).where(eq(rentPayments.id, paymentId));

    return NextResponse.json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete payment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
