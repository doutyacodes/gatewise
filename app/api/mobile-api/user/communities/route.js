// ============================================
// FILE: app/api/mobile-api/user/communities/route.js
// Fetch all communities for user selection
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communities } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allCommunities = await db
      .select({
        id: communities.id,
        name: communities.name,
        imageUrl: communities.imageUrl,
        fullAddress: communities.fullAddress,
        district: communities.district,
        state: communities.state,
        pincode: communities.pincode,
      })
      .from(communities)
      .orderBy(desc(communities.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        communities: allCommunities,
      },
    });
  } catch (error) {
    console.error("❌ Fetch communities error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch communities",
      },
      { status: 500 }
    );
  }
}