import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    // Clear the session cookie
    const response = NextResponse.json({
      success: true,
      message: "Logout successful",
    });

    response.cookies.set("fiszki_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
