// ============================================
// FILE: app/api/mobile-api/auth/user-signup/route.js
// Mobile User Signup API Endpoint
// ============================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const encoder = new TextEncoder();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Generate JWT token for mobile app
async function generateMobileToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encoder.encode(JWT_SECRET));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, mobileNumber, password } = body;

    // Validate required fields
    if (!name || !email || !mobileNumber || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: "All fields are required (name, email, mobile number, password)" 
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

    // Validate mobile number format (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return NextResponse.json(
        { 
          success: false,
          error: "Mobile number must be 10 digits" 
        },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { 
          success: false,
          error: "Password must be at least 6 characters long" 
        },
        { status: 400 }
      );
    }

    // Check if user already exists with email or mobile
    const existingUsers = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, email.toLowerCase()),
          eq(users.mobileNumber, mobileNumber)
        )
      )
      .limit(1);

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json(
          { 
            success: false,
            error: "An account with this email already exists" 
          },
          { status: 409 }
        );
      }
      if (existingUser.mobileNumber === mobileNumber) {
        return NextResponse.json(
          { 
            success: false,
            error: "An account with this mobile number already exists" 
          },
          { status: 409 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    // For now, automatically verify email and mobile
    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        mobileNumber: mobileNumber.trim(),
        password: hashedPassword,
        mobileVerified: true,  // ✅ Auto-verify for now
        emailVerified: true,   // ✅ Auto-verify for now
        createdAt: new Date(),
      })
      .$returningId();

    console.log('✅ New user created:', email);

    // Prepare user data
    const userData = {
      id: newUser.id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      mobileVerified: true,
      emailVerified: true,
      userType: 'user',
    };

    // Generate JWT token
    const token = await generateMobileToken({
      id: newUser.id,
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      type: 'user',
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      data: {
        token,
        user: userData,
      },
    }, { status: 201 });

  } catch (error) {
    console.error("❌ User signup error:", error);
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { 
          success: false,
          error: "An account with this email or mobile number already exists" 
        },
        { status: 409 }
      );
    }

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