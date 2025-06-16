import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";

// Helper function to hash passwords (simple implementation - use bcrypt in production)
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

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
    console.error("Failed to load users.json:", error);
    return {};
  }
}

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 },
      );
    }

    const users = await loadUsers();
    const user = Object.values(users).find((u) => u.username === username);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 },
      );
    }

    // Check password (compare hash if stored as hash, or plain text for simplicity)
    const isValidPassword =
      user.password === password ||
      (user.passwordHash && user.passwordHash === hashPassword(password));

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 },
      );
    }

    // Create session data
    const sessionData = {
      userId: user.id,
      username: user.username,
      loginTime: new Date().toISOString(),
    };

    // Set secure session cookie
    const cookieStore = await cookies();
    cookieStore.set("fiszki_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    // Return user data (without password)
    const { password: _, passwordHash: __, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
