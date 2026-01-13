// ============================================
// FILE: app/api/mobile-api/user/rent-sessions/documents/route.js
// Upload documents for rent session
// ============================================

import { db } from "@/lib/db";
import {
  rentSessions,
  rentSessionDocuments,
  users,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/mobile-api/middleware/auth";

// ============================================
// POST - Upload document for rent session
// ============================================
export async function POST(request) {
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

    // Parse multipart form data
    const formData = await request.formData();
    const sessionId = formData.get("sessionId");
    const documentType = formData.get("documentType");
    const file = formData.get("file");

    if (!sessionId || !documentType || !file) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get session details
    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, parseInt(sessionId)))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Rent session not found" },
        { status: 404 }
      );
    }

    // Check if user is owner or tenant of this session
    if (session.ownerId !== userId && session.tenantId !== userId) {
      return NextResponse.json(
        { success: false, message: "No access to this rent session" },
        { status: 403 }
      );
    }

    // Upload file to storage (implement your file upload logic here)
    // For now, we'll assume the file is uploaded and we get a filename
    const filename = `rent_doc_${Date.now()}_${file.name}`;
    
    // TODO: Implement actual file upload to cloud storage
    // const uploadResult = await uploadToCloudStorage(file);
    // const filename = uploadResult.filename;

    // Determine approval status
    // If owner uploads, auto-approve
    // If tenant uploads, needs owner approval
    const approvalStatus = session.ownerId === userId ? 'approved' : 'pending';

    // Insert document record
    const [newDoc] = await db
      .insert(rentSessionDocuments)
      .values({
        sessionId: parseInt(sessionId),
        documentType,
        documentFilename: filename,
        uploadedBy: userId,
        approvalStatus,
        uploadedAt: new Date(),
        createdAt: new Date(),
      })
      .$returningId();

    return NextResponse.json({
      success: true,
      message: approvalStatus === 'pending' 
        ? "Document uploaded and sent for owner approval"
        : "Document uploaded successfully",
      documentId: newDoc.id,
      requiresApproval: approvalStatus === 'pending',
    });

  } catch (error) {
    console.error("❌ Upload document error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================
// GET - List documents for a rent session
// ============================================
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID required" },
        { status: 400 }
      );
    }

    // Get session details
    const [session] = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.id, parseInt(sessionId)))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Rent session not found" },
        { status: 404 }
      );
    }

    // Check if user is owner or tenant
    if (session.ownerId !== userId && session.tenantId !== userId) {
      return NextResponse.json(
        { success: false, message: "No access to this rent session" },
        { status: 403 }
      );
    }

    // Get all documents for this session with uploader details
    const documents = await db
      .select({
        id: rentSessionDocuments.id,
        sessionId: rentSessionDocuments.sessionId,
        documentType: rentSessionDocuments.documentType,
        documentFilename: rentSessionDocuments.documentFilename,
        uploadedBy: rentSessionDocuments.uploadedBy,
        uploaderName: users.name,
        approvalStatus: rentSessionDocuments.approvalStatus,
        rejectionReason: rentSessionDocuments.rejectionReason,
        uploadedAt: rentSessionDocuments.uploadedAt,
      })
      .from(rentSessionDocuments)
      .leftJoin(users, eq(rentSessionDocuments.uploadedBy, users.id))
      .where(eq(rentSessionDocuments.sessionId, parseInt(sessionId)))
      .orderBy(desc(rentSessionDocuments.uploadedAt));

    // Determine user role
    const userRole = session.ownerId === userId ? 'owner' : 'tenant';

    return NextResponse.json({
      success: true,
      documents,
      userRole,
    });

  } catch (error) {
    console.error("❌ Get documents error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}