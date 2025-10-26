import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // ✅ Remove cookies at the HTTP (server) level
  response.cookies.set("auth-token", "", { path: "/", expires: new Date(0) });
  response.cookies.set("user-role", "", { path: "/", expires: new Date(0) });

  return response;
}
