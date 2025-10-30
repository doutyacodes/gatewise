// ============================================
// FILE: app/api/admin/apartment-requests/route.js
// Admin: View All Pending Apartment Requests
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apartmentRequests, apartmentRequestRuleResponses, apartmentRequestMembers, apartments, communities, users, rules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET() {
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

    // Get all requests for admin's community
    const requests = await db
      .select({
        requestId: apartmentRequests.id,
        status: apartmentRequests.status,
        ownershipType: apartmentRequests.ownershipType,
        submittedAt: apartmentRequests.submittedAt,
        reviewedAt: apartmentRequests.reviewedAt,
        rejectionReason: apartmentRequests.rejectionReason,
        adminComments: apartmentRequests.adminComments,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userMobile: users.mobileNumber,
        apartmentId: apartments.id,
        apartmentNumber: apartments.apartmentNumber,
        towerName: apartments.towerName,
        floorNumber: apartments.floorNumber,
        communityId: communities.id,
        communityName: communities.name,
      })
      .from(apartmentRequests)
      .innerJoin(users, eq(apartmentRequests.userId, users.id))
      .innerJoin(apartments, eq(apartmentRequests.apartmentId, apartments.id))
      .innerJoin(communities, eq(apartmentRequests.communityId, communities.id))
      .where(eq(apartmentRequests.communityId, admin.communityId));

    // Get rule responses and members for each request
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const ruleResponses = await db
          .select({
            ruleId: rules.id,
            ruleName: rules.ruleName,
            proofType: rules.proofType,
            isMandatory: rules.isMandatory,
            textResponse: apartmentRequestRuleResponses.textResponse,
            imageFilename: apartmentRequestRuleResponses.imageFilename,
          })
          .from(apartmentRequestRuleResponses)
          .innerJoin(rules, eq(apartmentRequestRuleResponses.ruleId, rules.id))
          .where(eq(apartmentRequestRuleResponses.requestId, request.requestId));

        const members = await db
          .select()
          .from(apartmentRequestMembers)
          .where(eq(apartmentRequestMembers.requestId, request.requestId));

        return {
          ...request,
          ruleResponses,
          members,
        };
      })
    );

    return NextResponse.json({
      success: true,
      requests: requestsWithDetails,
    });

  } catch (error) {
    console.error("Get apartment requests error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}