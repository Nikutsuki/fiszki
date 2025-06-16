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

export async function GET() {
  try {
    const userId = await getCurrentUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const studySetsDirectory = path.join(
      process.cwd(),
      "private",
      "study_sets",
    );
    const files = await fs.readdir(studySetsDirectory);
    const csvFiles = files.filter((file) => file.endsWith(".csv"));
    return NextResponse.json(csvFiles);
  } catch (error) {
    console.error("Failed to read study sets directory:", error);
    return NextResponse.json(
      { error: "Failed to load study sets" },
      { status: 500 },
    );
  }
}
