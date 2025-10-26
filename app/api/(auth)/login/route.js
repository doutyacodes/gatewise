import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { superAdmins, communityAdmins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(request) {
  try {
    const { email, password, userType } = await request.json();

    if (!email || !password || !userType) {
      return NextResponse.json(
        { error: "Email, password, and user type are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    let userData = null;

    if (userType === "superadmin") {
      // Super Admin Login
      const [superAdmin] = await db
        .select()
        .from(superAdmins)
        .where(eq(superAdmins.email, email))
        .limit(1);

      if (!superAdmin) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const isValidPassword = await bcrypt.compare(
        password,
        superAdmin.password
      );
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      userData = {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        type: "superadmin",
      };
    } else if (userType === "admin") {
      // Community Admin Login - NO LONGER NEEDS JOIN
      const [admin] = await db
        .select()
        .from(communityAdmins)
        .where(eq(communityAdmins.email, email))
        .limit(1);

      if (!admin) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      userData = {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        mobileNumber: admin.mobileNumber,
        communityId: admin.communityId,
        role: admin.role,
        type: "admin",
      };
    } else {
      return NextResponse.json(
        { error: 'Invalid user type. Must be "superadmin" or "admin"' },
        { status: 400 }
      );
    }

    const token = await signToken(userData);

    const response = NextResponse.json({
      success: true,
      user: userData,
      message: "Login successful",
    });

    response.cookies.set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    // Add user-role cookie
    response.cookies.set("user-role", userData.type, {
      httpOnly: false, // so client-side can use it (set true if you want it server-only)
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
