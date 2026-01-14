// ============================================
// FILE: mobile-api/middleware/auth.js
// Authentication Middleware for API Routes
// ============================================

import { jwtVerify } from "jose";

const encoder = new TextEncoder();
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Promise<object|null>} - Decoded payload or null if invalid
 */
async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return payload;
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    return null;
  }
}

/**
 * Require authentication middleware
 * @param {Request} request - Next.js request object
 * @param {string[]} allowedTypes - Array of allowed user types (e.g., ['user', 'security', 'admin'])
 * @returns {Promise<object>} - Object with { authorized: boolean, userId?: number, userType?: string, error?: string }
 */
export async function requireAuth(request, allowedTypes = []) {
  try {
    // Extract Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return {
        authorized: false,
        error: "Missing Authorization header",
      };
    }

    if (!authHeader.startsWith("Bearer ")) {
      return {
        authorized: false,
        error: "Invalid Authorization header format",
      };
    }

    // Extract token
    const token = authHeader.substring(7);

    if (!token) {
      return {
        authorized: false,
        error: "Missing token",
      };
    }

    // Verify token
    const payload = await verifyToken(token);

    if (!payload) {
      return {
        authorized: false,
        error: "Invalid or expired token",
      };
    }

    // Check if user type is allowed
    if (allowedTypes.length > 0 && !allowedTypes.includes(payload.type)) {
      return {
        authorized: false,
        error: `Access denied. Required user type: ${allowedTypes.join(" or ")}`,
      };
    }

    // Success - return user info
    return {
      authorized: true,
      userId: payload.id,
      userType: payload.type,
      communityId: payload.communityId, // May be undefined for some user types
    };
  } catch (error) {
    console.error("❌ Authentication error:", error);
    return {
      authorized: false,
      error: "Authentication failed",
    };
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 * @param {Request} request - Next.js request object
 * @returns {Promise<object>} - Object with { authenticated: boolean, userId?: number, userType?: string }
 */
export async function optionalAuth(request) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        authenticated: false,
      };
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload) {
      return {
        authenticated: false,
      };
    }

    return {
      authenticated: true,
      userId: payload.id,
      userType: payload.type,
      communityId: payload.communityId,
    };
  } catch (error) {
    console.error("❌ Optional auth error:", error);
    return {
      authenticated: false,
    };
  }
}
