// ============================================
// FILE: app/api/admin/apartment-requests/[requestId]/route.js
// Admin: Approve or Reject Apartment Request
// ============================================
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { apartmentOwnerships, apartmentRequestMembers, apartmentRequests, members, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const admin = await verifyToken(token);
    if (!admin || admin.type !== "admin") {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    // FIX: Await params in Next.js 15
    const { requestId } = await params;
   
    const body = await request.json();
    const { action, rejectionReason, adminComments } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Get the request
    const [apartmentRequest] = await db
      .select()
      .from(apartmentRequests)
      .where(eq(apartmentRequests.id, parseInt(requestId)))
      .limit(1);

    if (!apartmentRequest) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    if (apartmentRequest.communityId !== admin.communityId) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    if (action === 'approve') {
      // Create apartment ownership
      await db.insert(apartmentOwnerships).values({
        userId: apartmentRequest.userId,
        apartmentId: apartmentRequest.apartmentId,
        ownershipType: apartmentRequest.ownershipType,
        rulesAccepted: true,
        isAdminApproved: true,
        createdAt: new Date(),
      });

      // Get request members
      const requestMembers = await db
        .select()
        .from(apartmentRequestMembers)
        .where(eq(apartmentRequestMembers.requestId, parseInt(requestId)));

      // Create users and members for each member
      for (const member of requestMembers) {
        // Check if user exists by mobile number
        let userId;
        
        if (member.mobileNumber) {
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.mobileNumber, member.mobileNumber))
            .limit(1);

          if (existingUser) {
            userId = existingUser.id;
          } else {
            // Create new user without password
            const [newUser] = await db
              .insert(users)
              .values({
                name: member.name,
                mobileNumber: member.mobileNumber,
                email: null,
                password: null,
                mobileVerified: false,
                emailVerified: false,
                createdAt: new Date(),
              })
              .$returningId();

            userId = newUser.id;
          }
        } else {
          // Create user without mobile
          const [newUser] = await db
            .insert(users)
            .values({
              name: member.name,
              mobileNumber: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              email: null,
              password: null,
              mobileVerified: false,
              emailVerified: false,
              createdAt: new Date(),
            })
            .$returningId();

          userId = newUser.id;
        }

        // Create member entry with apartmentId
        await db.insert(members).values({
          userId: userId,
          communityId: apartmentRequest.communityId,
          apartmentId: apartmentRequest.apartmentId,
          name: member.name,
          mobileNumber: member.mobileNumber || null,
          relation: member.relation || null,
          isVerified: false,
          createdAt: new Date(),
        });
      }

      // Update request status
      await db
        .update(apartmentRequests)
        .set({
          status: 'approved',
          reviewedAt: new Date(),
          reviewedByAdminId: admin.id,
          adminComments: adminComments || null,
          updatedAt: new Date(),
        })
        .where(eq(apartmentRequests.id, parseInt(requestId)));

      return NextResponse.json({
        success: true,
        message: "Apartment request approved successfully",
      });

    } else {
      // Reject request
      await db
        .update(apartmentRequests)
        .set({
          status: 'rejected',
          reviewedAt: new Date(),
          reviewedByAdminId: admin.id,
          rejectionReason: rejectionReason || 'Not specified',
          adminComments: adminComments || null,
          updatedAt: new Date(),
        })
        .where(eq(apartmentRequests.id, parseInt(requestId)));

      return NextResponse.json({
        success: true,
        message: "Apartment request rejected",
      });
    }

  } catch (error) {
    console.error("Process apartment request error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}