// ============================================
// FILE: app/api/mobile-api/user/home/route.js
// Apartment Home API — Owner or Tenant view
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  users,
  apartments,
  apartmentOwnerships,
  communities,
  rentSessions,
  apartmentRooms,
  roomAccessories,
} from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { jwtVerify } from "jose";

const encoder = new TextEncoder();
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Verify JWT token
async function verifyMobileToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload;
  } catch (error) {
    return null;
  }
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = await verifyMobileToken(token);

    if (!user || user.type !== "user") {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    // Get user apartment context (current apartment)
    const [ownership] = await db
      .select({
        apartmentId: apartmentOwnerships.apartmentId,
        ownershipType: apartmentOwnerships.ownershipType,
        communityId: apartments.communityId,
        apartmentNumber: apartments.apartmentNumber,
        towerName: apartments.towerName,
        floorNumber: apartments.floorNumber,
        communityName: communities.name,
        communityImage: communities.imageUrl,
      })
      .from(apartmentOwnerships)
      .innerJoin(apartments, eq(apartmentOwnerships.apartmentId, apartments.id))
      .innerJoin(communities, eq(apartments.communityId, communities.id))
      .where(
        and(eq(apartmentOwnerships.userId, user.id), eq(apartmentOwnerships.isAdminApproved, true))
      )
      .limit(1);

    if (!ownership) {
      return NextResponse.json({
        success: false,
        error: "No approved apartment found",
      });
    }

    const { apartmentId, communityId, ownershipType } = ownership;

    // 🏠 Fetch apartment details
    const apartmentDetails = {
      id: apartmentId,
      number: ownership.apartmentNumber,
      tower: ownership.towerName,
      floor: ownership.floorNumber,
      community: {
        id: communityId,
        name: ownership.communityName,
        image: ownership.communityImage,
      },
      ownershipType,
    };

    // 👥 Fetch related members (other owners or tenants)
    const members = await db
      .select({
        id: apartmentOwnerships.id,
        userId: apartmentOwnerships.userId,
        ownershipType: apartmentOwnerships.ownershipType,
        userName: users.name,
        userImage: users.profileImage,
      })
      .from(apartmentOwnerships)
      .innerJoin(users, eq(apartmentOwnerships.userId, users.id))
      .where(
        and(
          eq(apartmentOwnerships.apartmentId, apartmentId),
          eq(apartmentOwnerships.isAdminApproved, true)
        )
      );

    // 💵 Rent Session (if exists)
    const [rentSession] = await db
      .select({
        id: rentSessions.id,
        rentAmount: rentSessions.rentAmount,
        maintenanceCost: rentSessions.maintenanceCost,
        initialDeposit: rentSessions.initialDeposit,
        startDate: rentSessions.startDate,
        endDate: rentSessions.endDate,
        status: rentSessions.status,
      })
      .from(rentSessions)
      .where(
        and(eq(rentSessions.apartmentId, apartmentId), eq(rentSessions.status, "active"))
      )
      .limit(1);

    // 🛏️ Apartment Rooms
    const rooms = await db
      .select({
        id: apartmentRooms.id,
        name: apartmentRooms.roomName,
        type: apartmentRooms.roomType,
      })
      .from(apartmentRooms)
      .where(eq(apartmentRooms.apartmentId, apartmentId));

    // 🪑 Room Accessories
    const roomIds = rooms.map((r) => r.id);
    let accessories = [];
    if (roomIds.length > 0) {
      accessories = await db
        .select({
          id: roomAccessories.id,
          roomId: roomAccessories.roomId,
          accessoryName: roomAccessories.accessoryName,
          brandName: roomAccessories.brandName,
          quantity: roomAccessories.quantity,
        })
        .from(roomAccessories)
        .where(or(...roomIds.map((id) => eq(roomAccessories.roomId, id))));
    }

    // 🧩 Merge accessories into rooms
    const roomsWithAccessories = rooms.map((room) => ({
      ...room,
      accessories: accessories.filter((a) => a.roomId === room.id),
    }));

    // Final response
    return NextResponse.json({
      success: true,
      data: {
        apartment: apartmentDetails,
        members,
        rentSession: rentSession || null,
        rooms: roomsWithAccessories,
      },
    });
  } catch (error) {
    console.error("❌ Home API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
