// ============================================
// FILE: app/api/mobile-api/auth/user-login/route.js
// Mobile User Login API Endpoint
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
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
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: "Email and password are required" 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid email format" 
        },
        { status: 400 }
      );
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid email or password" 
        },
        { status: 401 }
      );
    }

    // Check if password field exists
    if (!user.password) {
      return NextResponse.json(
        { 
          success: false,
          error: "Account setup incomplete. Please contact support." 
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid email or password" 
        },
        { status: 401 }
      );
    }

    // Check if email is verified (optional - can be removed for now)
    if (!user.emailVerified) {
      console.log('⚠️ User email not verified:', user.email);
      // You can choose to block login or just log warning
      // For now, we'll allow login
    }

    // Prepare user data (exclude sensitive info)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      mobileVerified: user.mobileVerified,
      emailVerified: user.emailVerified,
      userType: 'user',
    };

    // Generate JWT token
    const token = await generateMobileToken({
      id: user.id,
      email: user.email,
      mobileNumber: user.mobileNumber,
      type: 'user',
    });

    console.log('✅ User login successful:', user.email);

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
    console.error("❌ User mobile login error:", error);
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