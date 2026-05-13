// ============================================
// FILE: app/api/mobile-api/user/rent-sessions/[id]/tenant-action/route.js
// API for Tenant to approve or reject a rent session
// ============================================

import { db } from "@/lib/db";
import { rentSessions, apartmentOwnerships, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/mobile-api/middleware/auth";
import { sendFCMNotification } from "@/app/api/mobile-api/helpers/fcmHelper";

export async function PUT(request, context) {
  try {
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const sessionId = parseInt(id);

    const body = await request.json();
    const { action } = body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const userId = authResult.userId;

    // Verify session exists and user is the tenant
    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Rent session not found" },
        { status: 404 }
      );
    }

    if (session.tenantId !== userId) {
      return NextResponse.json(
        { success: false, message: "You are not authorized to perform this action" },
        { status: 403 }
      );
    }

    if (session.status !== "pending_tenant_approval") {
      return NextResponse.json(
        { success: false, message: "Session is not pending approval" },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'active' : 'rejected'; // or 'terminated' depending on schema, let's use 'terminated'
    const finalStatus = action === 'approve' ? 'active' : 'terminated';

    // Update session status
    await db
      .update(rentSessions)
      .set({
        status: finalStatus,
        updatedAt: new Date(),
      })
      .where(eq(rentSessions.id, sessionId));

    if (action === 'approve') {
      // Update apartment ownership to reflect rules accepted
      await db
        .update(apartmentOwnerships)
        .set({
          rulesAccepted: true,
        })
        .where(
          and(
            eq(apartmentOwnerships.userId, userId),
            eq(apartmentOwnerships.apartmentId, session.apartmentId)
          )
        );
    } else {
      // If rejected, maybe remove the ownership record? Or just leave it as not accepted.
      await db
        .delete(apartmentOwnerships)
        .where(
          and(
            eq(apartmentOwnerships.userId, userId),
            eq(apartmentOwnerships.apartmentId, session.apartmentId),
            eq(apartmentOwnerships.rulesAccepted, false)
          )
        );
    }

    // Send notification to the owner about the tenant's decision
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.ownerId))
      .limit(1);

    if (owner && owner.fcmToken) {
      await sendFCMNotification({
        fcmToken: owner.fcmToken,
        title: action === 'approve' ? "Rent Session Accepted" : "Rent Session Declined",
        body: `The tenant has ${action}d the rent session for your apartment.`,
        data: {
          type: "rent_session_action",
          sessionId: sessionId,
          apartmentId: session.apartmentId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Rent session ${action}d successfully`,
      status: finalStatus
    });
  } catch (error) {
    console.error("❌ Tenant action error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
