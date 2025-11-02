// ============================================
// FILE: mobile-api/user/members/route.js
// Members Management API - Get, Add, Update, Delete Members
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, apartmentOwnerships, apartments, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

// ============================================
// GET /api/mobile-api/user/members
// Get all members for user's current apartment
// ============================================
export async function GET(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyMobileToken(token);

    if (!user || user.type !== 'user') {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const apartmentId = searchParams.get('apartmentId');

    if (!apartmentId) {
      return NextResponse.json(
        { success: false, error: 'Apartment ID is required' },
        { status: 400 }
      );
    }

    // Verify user owns/rents this apartment
    const ownership = await db
      .select()
      .from(apartmentOwnerships)
      .where(
        and(
          eq(apartmentOwnerships.userId, user.userId),
          eq(apartmentOwnerships.apartmentId, parseInt(apartmentId)),
          eq(apartmentOwnerships.isAdminApproved, true)
        )
      )
      .limit(1);

    if (ownership.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view members for this apartment' },
        { status: 403 }
      );
    }

    // Get all members for this apartment
    const membersList = await db
      .select({
        id: members.id,
        name: members.name,
        mobileNumber: members.mobileNumber,
        relation: members.relation,
        isVerified: members.isVerified,
        createdAt: members.createdAt,
      })
      .from(members)
      .where(eq(members.apartmentId, parseInt(apartmentId)))
      .orderBy(members.createdAt);

    return NextResponse.json({
      success: true,
      data: membersList,
      count: membersList.length,
    });

  } catch (error) {
    console.error('❌ Error fetching members:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/mobile-api/user/members
// Add a new member to apartment
// ============================================
export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyMobileToken(token);

    if (!user || user.type !== 'user') {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { apartmentId, name, mobileNumber, relation } = body;

    // Validate input
    if (!apartmentId || !name || !relation) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (apartmentId, name, relation)' },
        { status: 400 }
      );
    }

    // Verify user owns/rents this apartment
    const ownership = await db
      .select({
        id: apartmentOwnerships.id,
        communityId: apartments.communityId,
      })
      .from(apartmentOwnerships)
      .leftJoin(apartments, eq(apartmentOwnerships.apartmentId, apartments.id))
      .where(
        and(
          eq(apartmentOwnerships.userId, user.userId),
          eq(apartmentOwnerships.apartmentId, parseInt(apartmentId)),
          eq(apartmentOwnerships.isAdminApproved, true)
        )
      )
      .limit(1);

    if (ownership.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to add members to this apartment' },
        { status: 403 }
      );
    }

    const communityId = ownership[0].communityId;

    // Check if member with same mobile number already exists in this apartment
    if (mobileNumber) {
      const existingMember = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.apartmentId, parseInt(apartmentId)),
            eq(members.mobileNumber, mobileNumber)
          )
        )
        .limit(1);

      if (existingMember.length > 0) {
        return NextResponse.json(
          { success: false, error: 'A member with this mobile number already exists in this apartment' },
          { status: 400 }
        );
      }
    }

    // Create new member
    const [newMember] = await db
      .insert(members)
      .values({
        userId: user.userId,
        communityId: communityId,
        apartmentId: parseInt(apartmentId),
        name: name.trim(),
        mobileNumber: mobileNumber?.trim() || null,
        relation: relation.trim(),
        isVerified: false, // By default, members need verification
        createdAt: new Date(),
      });

    console.log(`✅ Member added to apartment ${apartmentId} by user ${user.userId}`);

    return NextResponse.json({
      success: true,
      message: 'Member added successfully',
      data: {
        id: newMember.insertId,
        name,
        mobileNumber,
        relation,
        isVerified: false,
      },
    });

  } catch (error) {
    console.error('❌ Error adding member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/mobile-api/user/members/:id
// Update member details
// ============================================
export async function PUT(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyMobileToken(token);

    if (!user || user.type !== 'user') {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { memberId, name, mobileNumber, relation } = body;

    // Validate input
    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Get existing member
    const existingMember = await db
      .select()
      .from(members)
      .where(eq(members.id, parseInt(memberId)))
      .limit(1);

    if (existingMember.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    // Verify user owns this member's apartment
    const ownership = await db
      .select()
      .from(apartmentOwnerships)
      .where(
        and(
          eq(apartmentOwnerships.userId, user.userId),
          eq(apartmentOwnerships.apartmentId, existingMember[0].apartmentId),
          eq(apartmentOwnerships.isAdminApproved, true)
        )
      )
      .limit(1);

    if (ownership.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to update this member' },
        { status: 403 }
      );
    }

    // Update member
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber?.trim() || null;
    if (relation) updateData.relation = relation.trim();

    await db
      .update(members)
      .set(updateData)
      .where(eq(members.id, parseInt(memberId)));

    console.log(`✅ Member ${memberId} updated by user ${user.userId}`);

    return NextResponse.json({
      success: true,
      message: 'Member updated successfully',
    });

  } catch (error) {
    console.error('❌ Error updating member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/mobile-api/user/members/:id
// Delete a member
// ============================================
export async function DELETE(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyMobileToken(token);

    if (!user || user.type !== 'user') {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get memberId from query params
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Get existing member
    const existingMember = await db
      .select()
      .from(members)
      .where(eq(members.id, parseInt(memberId)))
      .limit(1);

    if (existingMember.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    // Verify user owns this member's apartment
    const ownership = await db
      .select()
      .from(apartmentOwnerships)
      .where(
        and(
          eq(apartmentOwnerships.userId, user.userId),
          eq(apartmentOwnerships.apartmentId, existingMember[0].apartmentId),
          eq(apartmentOwnerships.isAdminApproved, true)
        )
      )
      .limit(1);

    if (ownership.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this member' },
        { status: 403 }
      );
    }

    // Delete member
    await db
      .delete(members)
      .where(eq(members.id, parseInt(memberId)));

    console.log(`✅ Member ${memberId} deleted by user ${user.userId}`);

    return NextResponse.json({
      success: true,
      message: 'Member deleted successfully',
    });

  } catch (error) {
    console.error('❌ Error deleting member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
