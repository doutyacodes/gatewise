// ============================================
// FILE: mobile-api/user/rent-sessions/documents/[documentId]/route.js
// Approve, Reject, and Delete Document
// ============================================

import { db } from "@/lib/db";
import { rentSessions, rentSessionDocuments, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/mobile-api/middleware/auth";
import { sendFCMNotification } from "@/app/api/mobile-api/helpers/fcmHelper";

// ============================================
// POST - Approve Document
// ============================================
export async function POST(request, { params }) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const documentId = parseInt(params.documentId);

    // Get document details
    const [document] = await db
      .select()
      .from(rentSessionDocuments)
      .where(eq(rentSessionDocuments.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Get session details
    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, document.sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if user is owner or tenant
    if (session.ownerId !== userId && session.tenantId !== userId) {
      return NextResponse.json(
        { success: false, error: "No access to this session" },
        { status: 403 }
      );
    }

    // Only owner can approve documents
    if (session.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the owner can approve documents" },
        { status: 403 }
      );
    }

    // Check if already approved
    if (document.approvalStatus === "approved") {
      return NextResponse.json(
        { success: false, error: "Document is already approved" },
        { status: 400 }
      );
    }

    // Approve document
    await db
      .update(rentSessionDocuments)
      .set({
        approvalStatus: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        rejectionReason: null,
      })
      .where(eq(rentSessionDocuments.id, documentId));

    // Send notification to uploader
    const [uploader] = await db
      .select()
      .from(users)
      .where(eq(users.id, document.uploadedBy))
      .limit(1);

    if (uploader && uploader.fcmToken && uploader.id !== userId) {
      await sendFCMNotification({
        fcmToken: uploader.fcmToken,
        title: "Document Approved",
        body: `Your document (${document.documentType}) has been approved.`,
        data: {
          type: "document_approved",
          documentId: document.id,
          sessionId: document.sessionId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Document approved successfully",
    });
  } catch (error) {
    console.error("❌ Approve document error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - Reject Document
// ============================================
export async function PUT(request, { params }) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const documentId = parseInt(params.documentId);

    const body = await request.json();
    const { rejectionReason } = body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Get document details
    const [document] = await db
      .select()
      .from(rentSessionDocuments)
      .where(eq(rentSessionDocuments.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Get session details
    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, document.sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if user is owner or tenant
    if (session.ownerId !== userId && session.tenantId !== userId) {
      return NextResponse.json(
        { success: false, error: "No access to this session" },
        { status: 403 }
      );
    }

    // Only owner can reject documents
    if (session.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the owner can reject documents" },
        { status: 403 }
      );
    }

    // Reject document
    await db
      .update(rentSessionDocuments)
      .set({
        approvalStatus: "rejected",
        rejectionReason: rejectionReason.trim(),
        approvedBy: null,
        approvedAt: null,
      })
      .where(eq(rentSessionDocuments.id, documentId));

    // Send notification to uploader
    const [uploader] = await db
      .select()
      .from(users)
      .where(eq(users.id, document.uploadedBy))
      .limit(1);

    if (uploader && uploader.fcmToken && uploader.id !== userId) {
      await sendFCMNotification({
        fcmToken: uploader.fcmToken,
        title: "Document Rejected",
        body: `Your document (${document.documentType}) has been rejected. Reason: ${rejectionReason.trim()}`,
        data: {
          type: "document_rejected",
          documentId: document.id,
          sessionId: document.sessionId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Document rejected",
    });
  } catch (error) {
    console.error("❌ Reject document error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete Document
// ============================================
export async function DELETE(request, { params }) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request, ["user"]);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const documentId = parseInt(params.documentId);

    // Get document details
    const [document] = await db
      .select()
      .from(rentSessionDocuments)
      .where(eq(rentSessionDocuments.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Get session details
    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, document.sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if user is owner or tenant
    if (session.ownerId !== userId && session.tenantId !== userId) {
      return NextResponse.json(
        { success: false, error: "No access to this session" },
        { status: 403 }
      );
    }

    // Only the uploader can delete their own documents
    if (document.uploadedBy !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only delete your own documents" },
        { status: 403 }
      );
    }

    // Cannot delete approved documents
    if (document.approvalStatus === "approved") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete approved documents. Contact the other party.",
        },
        { status: 400 }
      );
    }

    // Delete document from database
    await db
      .delete(rentSessionDocuments)
      .where(eq(rentSessionDocuments.id, documentId));

    // Attempt to delete the actual file from storage (wowfy)
    try {
      if (document.documentFilename) {
        const formData = new FormData();
        formData.append("filename", document.documentFilename);
        
        // This relies on wowfy having a delete.php endpoint.
        // It will gracefully fail if not supported.
        await fetch("https://wowfy.in/gatewise/delete.php", {
          method: "POST",
          body: formData,
        }).catch(err => console.log("Wowfy deletion skipped or failed:", err));
      }
    } catch (err) {
      console.log("Storage deletion failed:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete document error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
