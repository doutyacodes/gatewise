// ============================================
// FILE: app/api/mobile-api/user/apartment-requests/route.js
// Create apartment request - UPDATED with Bearer token
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  apartmentRequests,
  apartmentRequestMembers,
  apartmentRequestRuleResponses,
} from "@/lib/db/schema";
import { jwtVerify } from "jose";

const encoder = new TextEncoder();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

async function verifyMobileToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload;
  } catch (error) {
    return null;
  }
}

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyMobileToken(token);

    if (!user || user.type !== 'user') {
      return NextResponse.json(
        {
          success: false,
          error: "Only users can create apartment requests",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      apartmentId,
      communityId,
      ownershipType,
      members: requestMembers,
      ruleResponses,
    } = body;

    // Validate required fields
    if (!apartmentId || !communityId || !ownershipType) {
      return NextResponse.json(
        {
          success: false,
          error: "Apartment, community, and ownership type are required",
        },
        { status: 400 }
      );
    }

    if (!["owner", "tenant"].includes(ownershipType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ownership type must be "owner" or "tenant"',
        },
        { status: 400 }
      );
    }

    // Validate rule responses if provided
    if (ruleResponses && Array.isArray(ruleResponses)) {
      for (const response of ruleResponses) {
        if (!response.ruleId) {
          return NextResponse.json(
            {
              success: false,
              error: "Each rule response must have a ruleId",
            },
            { status: 400 }
          );
        }
      }
    }

    // Create apartment request
    const [newRequest] = await db
      .insert(apartmentRequests)
      .values({
        userId: user.id,
        apartmentId: Number(apartmentId),
        communityId: Number(communityId),
        ownershipType,
        status: "pending",
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    console.log("✅ Apartment request created:", newRequest.id);

    // Insert members if provided
    if (requestMembers && Array.isArray(requestMembers) && requestMembers.length > 0) {
      const memberValues = requestMembers
        .filter((member) => member.name && member.name.trim())
        .map((member) => ({
          requestId: newRequest.id,
          name: member.name.trim(),
          mobileNumber: member.mobileNumber?.trim() || null,
          relation: member.relation?.trim() || null,
          createdAt: new Date(),
        }));

      if (memberValues.length > 0) {
        await db.insert(apartmentRequestMembers).values(memberValues);
        console.log(`✅ ${memberValues.length} members added to request`);
      }
    }

    // Insert rule responses if provided
    if (ruleResponses && Array.isArray(ruleResponses) && ruleResponses.length > 0) {
      const responseValues = ruleResponses
        .filter((response) => response.ruleId)
        .map((response) => ({
          requestId: newRequest.id,
          ruleId: Number(response.ruleId),
          textResponse: response.textResponse || null,
          imageFilename: response.imageFilename || null,
          submittedAt: new Date(),
          createdAt: new Date(),
        }));

      if (responseValues.length > 0) {
        await db.insert(apartmentRequestRuleResponses).values(responseValues);
        console.log(`✅ ${responseValues.length} rule responses added`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Apartment request submitted successfully",
        data: {
          requestId: newRequest.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Create apartment request error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create apartment request",
      },
      { status: 500 }
    );
  }
}