// ============================================
// FILE: app/api/admin/disputes/route.js
// Admin API for fetching escalated disputes
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  disputeReports,
  users,
  apartmentRooms,
} from "@/lib/db/schema";
import { eq, and, desc, or } from "drizzle-orm";

export async function GET(req) {
  try {
    // 1. Fetch all disputes that are either escalated or open
    // In a real app, you would check if the requesting user is an admin.
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
      .where(
        or(
          eq(disputeReports.escalatedToAdmin, true),
          eq(disputeReports.status, 'open')
        )
      )
      .orderBy(desc(disputeReports.createdAt));

    return NextResponse.json({
      success: true,
      data: disputes,
    });
  } catch (err) {
    console.error("❌ Admin fetch disputes error:", err);
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
