import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import { promises as fs } from "fs";

// Helper function to get users database path
function getUsersDbPath() {
  return path.join(process.cwd(), "private", "users.json");
}

// Helper function to load users from file
async function loadUsers() {
  try {
    const usersPath = getUsersDbPath();
    const usersData = await fs.readFile(usersPath, "utf8");
    return JSON.parse(usersData);
  } catch (error) {
    // If file doesn't exist, return empty users object
    return {};
  }
}

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("fiszki_session");

    if (!sessionCookie) {
      return NextResponse.json({
        success: false,
        user: null,
        message: "No active session",
      });
    }

    const sessionData = JSON.parse(sessionCookie.value);
    const { userId } = sessionData;

    if (!userId) {
      return NextResponse.json({
        success: false,
        user: null,
        message: "Invalid session data",
      });
    }

    // Load user from database
    const users = await loadUsers();
    const user = users[userId];

    if (!user) {
      // User no longer exists, clear the session
      const response = NextResponse.json({
        success: false,
        user: null,
        message: "User not found",
      });

      response.cookies.set("fiszki_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      });

      return response;
    }

    // Return user data (without password)
    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: "Session valid",
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json({
      success: false,
      user: null,
      message: "Session validation failed",
    });
  }
}
