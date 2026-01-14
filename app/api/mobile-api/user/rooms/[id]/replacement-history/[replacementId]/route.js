// ============================================
// FILE: mobile-api/user/rooms/[id]/replacement-history/[replacementId]/route.js
// Replacement Update, Delete, Approve
// ============================================

import { db } from "@/lib/db";
import { accessoryReplacementHistory, rentSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/mobile-api/middleware/auth";

// ============================================
// PUT - Update Replacement
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
    const replacementId = parseInt(params.replacementId);
    const body = await request.json();
    const {
      newAccessoryName,
      replacementReason,
      cost,
      paidBy,
      includedInRent,
      replacementDate,
    } = body;

    // Fetch replacement
    const [replacement] = await db
      .select()
      .from(accessoryReplacementHistory)
      .where(eq(accessoryReplacementHistory.id, replacementId))
      .limit(1);

    if (!replacement) {
      return NextResponse.json(
        { success: false, error: "Replacement not found" },
        { status: 404 }
      );
    }

    // Only creator can edit (and only if pending)
    if (replacement.replacedBy !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only edit replacements you logged" },
        { status: 403 }
      );
    }

    if (replacement.approvalStatus === "approved") {
      return NextResponse.json(
        { success: false, error: "Cannot edit approved replacements" },
        { status: 400 }
      );
    }

    // Update
    await db
      .update(accessoryReplacementHistory)
      .set({
        newAccessoryName: newAccessoryName?.trim() || replacement.newAccessoryName,
        replacementReason: replacementReason?.trim() || replacement.replacementReason,
        cost: cost !== undefined ? parseFloat(cost) : replacement.cost,
        paidBy: paidBy || replacement.paidBy,
        includedInRent:
          includedInRent !== undefined ? includedInRent : replacement.includedInRent,
        replacementDate: replacementDate || replacement.replacementDate,
        updatedAt: new Date(),
      })
      .where(eq(accessoryReplacementHistory.id, replacementId));

    return NextResponse.json({
      success: true,
      message: "Replacement updated successfully",
    });
  } catch (error) {
    console.error("❌ Update replacement error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update replacement" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete Replacement
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
    const replacementId = parseInt(params.replacementId);

    // Fetch replacement
    const [replacement] = await db
      .select()
      .from(accessoryReplacementHistory)
      .where(eq(accessoryReplacementHistory.id, replacementId))
      .limit(1);

    if (!replacement) {
      return NextResponse.json(
        { success: false, error: "Replacement not found" },
        { status: 404 }
      );
    }

    // Only creator can delete (and only if not approved)
    if (replacement.replacedBy !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only delete replacements you logged" },
        { status: 403 }
      );
    }

    if (replacement.approvalStatus === "approved") {
      return NextResponse.json(
        { success: false, error: "Cannot delete approved replacements" },
        { status: 400 }
      );
    }

    // Delete
    await db
      .delete(accessoryReplacementHistory)
      .where(eq(accessoryReplacementHistory.id, replacementId));

    return NextResponse.json({
      success: true,
      message: "Replacement deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete replacement error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete replacement" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Approve/Reject Replacement
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
    const replacementId = parseInt(params.replacementId);
    const body = await request.json();
    const { action, rejectionReason } = body; // approve or reject

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    // Fetch replacement and session
    const [replacement] = await db
      .select()
      .from(accessoryReplacementHistory)
      .where(eq(accessoryReplacementHistory.id, replacementId))
      .limit(1);

    if (!replacement) {
      return NextResponse.json(
        { success: false, error: "Replacement not found" },
        { status: 404 }
      );
    }

    if (replacement.approvalStatus !== "pending") {
      return NextResponse.json(
        { success: false, error: "Replacement has already been reviewed" },
        { status: 400 }
      );
    }

    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, replacement.sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // Only owner can approve/reject
    if (session.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the owner can approve replacements" },
        { status: 403 }
      );
    }

    // Update approval status
    await db
      .update(accessoryReplacementHistory)
      .set({
        approvalStatus: action === "approve" ? "approved" : "rejected",
        approvedBy: userId,
        approvedAt: new Date(),
        rejectionReason: action === "reject" ? rejectionReason : null,
        updatedAt: new Date(),
      })
      .where(eq(accessoryReplacementHistory.id, replacementId));

    // TODO: Send notification to tenant

    return NextResponse.json({
      success: true,
      message: `Replacement ${action}d successfully`,
    });
  } catch (error) {
    console.error("❌ Approve replacement error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to approve replacement" },
      { status: 500 }
    );
  }
}
