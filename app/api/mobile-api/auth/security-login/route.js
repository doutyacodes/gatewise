// ============================================
// FILE: app/api/mobile-api/auth/security-login/route.js
// Mobile Security Login API Endpoint
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { securities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const encoder = new TextEncoder();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Generate JWT token for mobile app
async function generateMobileToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // 30 days for mobile
    .sign(encoder.encode(JWT_SECRET));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: "Username and password are required" 
        },
        { status: 400 }
      );
    }

    // Find security staff by username
    const [security] = await db
      .select()
      .from(securities)
      .where(eq(securities.username, username))
      .limit(1);

    if (!security) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid username or password" 
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, security.password);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid username or password" 
        },
        { status: 401 }
      );
    }

    // Prepare user data (exclude sensitive info)
    const userData = {
      id: security.id,
      name: security.name,
      username: security.username,
      mobileNumber: security.mobileNumber,
      communityId: security.communityId,
      shiftTiming: security.shiftTiming,
      photoUrl: security.photoUrl,
      userType: 'security',
    };

    // Generate JWT token
    const token = await generateMobileToken({
      id: security.id,
      username: security.username,
      communityId: security.communityId,
      type: 'security',
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: userData,
      },
    });

  } catch (error) {
    console.error("Security mobile login error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error. Please try again later." 
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { 
      success: false,
      error: "Method not allowed" 
    },
    { status: 405 }
  );
}