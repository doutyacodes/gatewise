// ============================================
// FILE: app/api/mobile-api/user/rent-sessions/route.js
// Rent Session Management API - Create & List
// ============================================

import { db } from "@/lib/db";
import {
    apartmentOwnerships,
    apartments,
    rentSessionAdditionalCharges,
    rentSessionDocuments,
    rentSessions,
    rentPayments,
    tenantPreferences,
    adminTenantQuestions,
    tenantQuestionResponses,
    users
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { sendFCMNotification } from "../../helpers/fcmHelper";

const encoder = new TextEncoder();
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Token verification
async function verifyMobileToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload;
  } catch (error) {
    return null;
  }
}

// Helper to check if user is owner of apartment
async function isUserOwner(userId, apartmentId) {
  const [ownership] = await db
    .select()
    .from(apartmentOwnerships)
    .where(
      and(
        eq(apartmentOwnerships.userId, userId),
        eq(apartmentOwnerships.apartmentId, apartmentId),
        eq(apartmentOwnerships.ownershipType, "owner"),
        eq(apartmentOwnerships.isAdminApproved, true)
      )
    )
    .limit(1);

  return !!ownership;
}

// Helper to check if apartment already has active session
async function hasActiveSession(apartmentId) {
  const [session] = await db
    .select()
    .from(rentSessions)
    .where(
      and(
        eq(rentSessions.apartmentId, apartmentId),
        eq(rentSessions.status, "active")
      )
    )
    .limit(1);

  return !!session;
}

// Helper to find tenant by phone
async function findTenantByPhone(phoneNumber) {
  const cleanPhone = phoneNumber.replace(/\D/g, ""); // Remove non-digits

  const [tenant] = await db
    .select()
    .from(users)
    .where(eq(users.mobileNumber, cleanPhone))
    .limit(1);

  return tenant || null;
}

// ============================================
// POST - Create new rent session
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
        { success: false, message: "Only users can create rent sessions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      apartmentId,
      tenantPhone,
      tenantName,
      rentAmount,
      maintenanceCost,
      initialDeposit,
      startDate,
      endDate,
      durationMonths,
      additionalCharges,
      ownerRestrictions,
      numberOfCars,
      numberOfPets,
    } = body;

    // Validation
    if (
      !apartmentId ||
      !tenantPhone ||
      !rentAmount ||
      !startDate ||
      !durationMonths
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = user.id;

    // Check if user is owner of this apartment
    const isOwner = await isUserOwner(userId, apartmentId);
    if (!isOwner) {
      return NextResponse.json(
        {
          success: false,
          message: "Only apartment owners can create rent sessions",
          isOwner: false,
        },
        { status: 403 }
      );
    }

    // Check if apartment already has active session
    const existingSession = await hasActiveSession(apartmentId);
    if (existingSession) {
      return NextResponse.json(
        {
          success: false,
          message: "This apartment already has an active rent session",
        },
        { status: 400 }
      );
    }

    // Find tenant by phone number
    const tenant = await findTenantByPhone(tenantPhone);
    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tenant not found. Please ensure the tenant has registered on the app.",
          tenantNotFound: true,
        },
        { status: 404 }
      );
    }

    // Check if tenant is trying to create session (edge case)
    if (tenant.id === userId) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot create a rent session for yourself",
        },
        { status: 400 }
      );
    }

    // Create rent session
    const [newSession] = await db
      .insert(rentSessions)
      .values({
        apartmentId,
        ownerId: userId,
        tenantId: tenant.id,
        rentAmount: parseFloat(rentAmount),
        maintenanceCost: maintenanceCost ? parseFloat(maintenanceCost) : 0,
        initialDeposit: initialDeposit ? parseFloat(initialDeposit) : 0,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        durationMonths: parseInt(durationMonths),
        status: "pending_tenant_approval",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .$returningId();

    const sessionId = newSession.id;

    // Add additional charges if any
    if (additionalCharges && additionalCharges.length > 0) {
      const chargeValues = additionalCharges.map((charge) => ({
        sessionId,
        chargeTitle: charge.chargeTitle,
        chargeAmount: parseFloat(charge.chargeAmount),
        createdAt: new Date(),
      }));

      await db.insert(rentSessionAdditionalCharges).values(chargeValues);
    }

    // Add tenant preferences
    await db.insert(tenantPreferences).values({
      sessionId,
      numberOfCars: numberOfCars || 0,
      numberOfPets: numberOfPets || 0,
      ownerRestrictions: ownerRestrictions || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create apartment ownership for tenant
    // Check if tenant already has ownership entry
    const [existingOwnership] = await db
      .select()
      .from(apartmentOwnerships)
      .where(
        and(
          eq(apartmentOwnerships.userId, tenant.id),
          eq(apartmentOwnerships.apartmentId, apartmentId)
        )
      )
      .limit(1);

    if (!existingOwnership) {
      await db.insert(apartmentOwnerships).values({
        userId: tenant.id,
        apartmentId,
        ownershipType: "tenant",
        rulesAccepted: false,
        isAdminApproved: true, // Auto-approve since owner is adding
        createdAt: new Date(),
      });
    }

    // Send notification to tenant
    if (tenant.fcmToken) {
      await sendFCMNotification({
        fcmToken: tenant.fcmToken,
        title: "New Rent Session",
        body: "A new rent session has been created for you. Please review and approve it.",
        data: {
          type: "rent_session",
          sessionId: sessionId,
          apartmentId: apartmentId
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Rent session created successfully",
      sessionId,
      tenantInfo: {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.mobileNumber,
      },
    });
  } catch (error) {
    console.error("❌ Create rent session error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to hydrate session data with related entities
async function hydrateSession(sessionObj) {
  // 1. Fetch Apartment Info
  const [apt] = await db
    .select({
      towerName: apartments.towerName,
      apartmentNumber: apartments.apartmentNumber
    })
    .from(apartments)
    .where(eq(apartments.id, sessionObj.apartmentId))
    .limit(1);

  // 2. Fetch Users Info
  const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, sessionObj.ownerId)).limit(1);
  const [tenant] = await db.select({ name: users.name }).from(users).where(eq(users.id, sessionObj.tenantId)).limit(1);

  // 3. Fetch Tenant Preferences
  const [prefs] = await db
    .select()
    .from(tenantPreferences)
    .where(eq(tenantPreferences.sessionId, sessionObj.id))
    .limit(1);

  // 4. Fetch Documents
  const docs = await db
    .select()
    .from(rentSessionDocuments)
    .where(eq(rentSessionDocuments.sessionId, sessionObj.id));

  // 5. Fetch Additional Charges
  const charges = await db
    .select()
    .from(rentSessionAdditionalCharges)
    .where(eq(rentSessionAdditionalCharges.sessionId, sessionObj.id));

  // 6. Fetch Payments
  const paymentsList = await db
    .select()
    .from(rentPayments)
    .where(eq(rentPayments.sessionId, sessionObj.id));

  // 7. Fetch Tenant Questions
  const questions = await db
    .select({
      id: tenantQuestionResponses.id,
      questionText: adminTenantQuestions.questionText,
      responseText: tenantQuestionResponses.responseText
    })
    .from(tenantQuestionResponses)
    .innerJoin(adminTenantQuestions, eq(tenantQuestionResponses.questionId, adminTenantQuestions.id))
    .where(eq(tenantQuestionResponses.sessionId, sessionObj.id));

  return {
    ...sessionObj,
    towerName: apt?.towerName,
    apartmentNumber: apt?.apartmentNumber,
    ownerName: owner?.name,
    tenantName: tenant?.name,
    tenantPreferences: prefs || null,
    documents: docs || [],
    additionalCharges: charges || [],
    payments: paymentsList || [],
    tenantQuestions: questions || [],
  };
}

// ============================================
// GET - List rent sessions for user's apartments
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
        { success: false, message: "Only users can view rent sessions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const apartmentId = searchParams.get("apartmentId");

    const userId = user.id;

    // If apartmentId provided, get sessions for that apartment
    if (apartmentId) {
      // Verify user has access to this apartment
      const [ownership] = await db
        .select()
        .from(apartmentOwnerships)
        .where(
          and(
            eq(apartmentOwnerships.userId, userId),
            eq(apartmentOwnerships.apartmentId, parseInt(apartmentId)),
            eq(apartmentOwnerships.isAdminApproved, true)
          )
        )
        .limit(1);

      if (!ownership) {
        return NextResponse.json(
          { success: false, message: "No access to this apartment" },
          { status: 403 }
        );
      }

      // Get sessions for this apartment
      const rawSessions = await db
        .select()
        .from(rentSessions)
        .where(eq(rentSessions.apartmentId, parseInt(apartmentId)))
        .orderBy(rentSessions.createdAt);

      const sessions = await Promise.all(
        rawSessions.map(session => hydrateSession(session))
      );

      return NextResponse.json({
        success: true,
        sessions,
        userRole: ownership.ownershipType,
      });
    }

    // Otherwise, get all sessions where user is owner or tenant
    const rawOwnerSessions = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.ownerId, userId));

    const rawTenantSessions = await db
      .select()
      .from(rentSessions)
      .where(eq(rentSessions.tenantId, userId));

    // Hydrate all sessions with nested details
    const ownerSessions = await Promise.all(
      rawOwnerSessions.map(session => hydrateSession(session))
    );
    const tenantSessions = await Promise.all(
      rawTenantSessions.map(session => hydrateSession(session))
    );

    return NextResponse.json({
      success: true,
      asOwner: ownerSessions,
      asTenant: tenantSessions,
    });
  } catch (error) {
    console.error("❌ Get rent sessions error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
