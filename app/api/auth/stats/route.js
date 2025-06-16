import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import { promises as fs } from "fs";

// Helper function to get current user from session
async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const userSession = cookieStore.get("fiszki_session");

    if (!userSession) {
      return null;
    }

    const userData = JSON.parse(userSession.value);
    return userData.userId;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Helper function to load users from file
async function loadUsers() {
  try {
    const usersPath = path.join(process.cwd(), "private", "users.json");
    const usersData = await fs.readFile(usersPath, "utf8");
    return JSON.parse(usersData);
  } catch (error) {
    console.error("Error loading users:", error);
    return {};
  }
}

export async function GET() {
  try {
    const userId = await getCurrentUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const users = await loadUsers();
    const user = users[userId];

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return user progress without sensitive information
    const userProgress = {
      userId: user.id,
      username: user.username,
      createdAt: user.createdAt,
      progress: user.progress || { studySets: [] },
    };

    // Calculate overall statistics
    const studySets = userProgress.progress.studySets || [];
    const overallStats = {
      totalStudySets: studySets.length,
      totalSessions: studySets.reduce((sum, set) => sum + (set.totalSessions || 0), 0),
      averageScore: studySets.length > 0 
        ? Math.round(
            studySets.reduce((sum, set) => sum + (set.averageScore || 0), 0) / studySets.length
          )
        : 0,
      totalTimeSpent: studySets.reduce((sum, set) => sum + (set.totalTimeSpent || 0), 0),
      bestOverallScore: Math.max(0, ...studySets.map(set => set.bestScore || 0)),
    };

    return NextResponse.json({
      success: true,
      user: userProgress,
      overallStats,
    });
  } catch (error) {
    console.error("Failed to get user stats:", error);
    return NextResponse.json(
      { error: "Failed to get user statistics" },
      { status: 500 }
    );
  }
}
