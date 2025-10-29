// ============================================
// FILE: app/api/mobile-api/user/communities/[communityId]/rules/route.js
// Fetch rules for a specific community
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request, { params }) {
  try {
    const { communityId } = await params;

    if (!communityId) {
      return NextResponse.json(
        {
          success: false,
          error: "Community ID is required",
        },
        { status: 400 }
      );
    }

    const communityRules = await db
      .select({
        id: rules.id,
        ruleName: rules.ruleName,
        description: rules.description,
        isMandatory: rules.isMandatory,
        proofType: rules.proofType,
      })
      .from(rules)
      .where(eq(rules.communityId, Number(communityId)))
      .orderBy(rules.isMandatory, rules.ruleName);

    return NextResponse.json({
      success: true,
      data: {
        rules: communityRules,
      },
    });
  } catch (error) {
    console.error("❌ Fetch rules error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch rules",
      },
      { status: 500 }
    );
  }
}