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

// Helper function to save users to file
async function saveUsers(users) {
  const usersPath = getUsersDbPath();
  const privateDir = path.dirname(usersPath);

  // Ensure private directory exists
  await fs.mkdir(privateDir, { recursive: true });

  await fs.writeFile(usersPath, JSON.stringify(users, null, 2), "utf8");
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("fiszki_session");

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const sessionData = JSON.parse(sessionCookie.value);
    const { userId } = sessionData;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 },
      );
    }

    const { studySetId, sessionStats } = await request.json();

    if (!studySetId || !sessionStats) {
      return NextResponse.json(
        {
          success: false,
          error: "Study set ID and session stats are required",
        },
        { status: 400 },
      );
    }

    // Load users and find current user
    const users = await loadUsers();
    const user = users[userId];

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Initialize progress structure if needed
    if (!user.progress) {
      user.progress = { studySets: [] };
    }
    if (!user.progress.studySets) {
      user.progress.studySets = [];
    }

    // Find or create study set progress
    let studySetProgress = user.progress.studySets.find(
      (progress) => progress.id === studySetId,
    );

    if (!studySetProgress) {
      studySetProgress = {
        id: studySetId,
        totalSessions: 0,
        bestScore: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        lastAttempt: null,
        stats: {
          totalSessions: 0,
          averageScore: 0,
          bestScore: 0,
          totalTimeSpent: 0,
        },
      };
      user.progress.studySets.push(studySetProgress);
    }

    // Update progress with new session stats
    const previousSessions = studySetProgress.totalSessions;
    const previousAverage = studySetProgress.averageScore;

    studySetProgress.totalSessions += 1;
    studySetProgress.lastScore = sessionStats.score;
    studySetProgress.bestScore = Math.max(
      studySetProgress.bestScore,
      sessionStats.score,
    );
    studySetProgress.averageScore = Math.round(
      (previousAverage * previousSessions + sessionStats.score) /
        studySetProgress.totalSessions,
    );
    studySetProgress.totalTimeSpent += sessionStats.totalTime || 0;
    studySetProgress.lastAttempt = new Date().toISOString();

    // Also update the stats object for consistency
    studySetProgress.stats = {
      totalSessions: studySetProgress.totalSessions,
      averageScore: studySetProgress.averageScore,
      bestScore: studySetProgress.bestScore,
      totalTimeSpent: studySetProgress.totalTimeSpent,
    };

    // Save updated user data
    await saveUsers(users);

    // Return updated user data (without password)
    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: "Progress updated successfully",
    });
  } catch (error) {
    console.error("Progress update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
