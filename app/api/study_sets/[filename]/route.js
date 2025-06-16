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

export async function GET(request, { params }) {
  try {
    const userId = await getCurrentUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { filename } = await params;

    if (!filename || !filename.endsWith(".csv")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const studySetsDir = path.join(process.cwd(), "private", "study_sets");
    const filePath = path.join(studySetsDir, sanitizedFilename);

    try {
      // Check if file exists and is within study sets directory
      const resolvedPath = path.resolve(filePath);
      const resolvedStudySetsDir = path.resolve(studySetsDir);

      if (!resolvedPath.startsWith(resolvedStudySetsDir)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const content = await fs.readFile(filePath, "utf8");

      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    } catch (fileError) {
      return NextResponse.json(
        { error: "Study set not found" },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("Failed to serve study set:", error);
    return NextResponse.json(
      { error: "Failed to load study set" },
      { status: 500 },
    );
  }
}
