// ============================================
// FILE: app/api/mobile-api/user/rent-sessions/documents/route.js
// Upload documents for rent session
// ============================================

import { db } from "@/lib/db";
import {
  rentSessions,
  rentSessionDocuments,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

// ============================================
// POST - Upload document for rent session
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
        { success: false, message: "Only users can upload documents" },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const sessionId = formData.get("sessionId");
    const documentType = formData.get("documentType");
    const file = formData.get("file");

    if (!sessionId || !documentType || !file) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = user.id;

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
        { success: false, message: "Only users can view documents" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "Session ID required" },
        { status: 400 }
      );
    }

    const userId = user.id;

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

    // Get all documents for this session
    const documents = await db
      .select()
      .from(rentSessionDocuments)
      .where(eq(rentSessionDocuments.sessionId, parseInt(sessionId)))
      .orderBy(rentSessionDocuments.uploadedAt);

    return NextResponse.json({
      success: true,
      documents,
      userRole: session.ownerId === userId ? 'owner' : 'tenant',
    });

  } catch (error) {
    console.error("❌ Get documents error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}