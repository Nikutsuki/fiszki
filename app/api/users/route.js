import { promises as fs } from "fs";
import path from "path";

const usersFilePath = path.join(process.cwd(), "data", "users.json");

export async function GET() {
  try {
    const fileContents = await fs.readFile(usersFilePath, "utf8");
    const data = JSON.parse(fileContents);

    // Keep the data structure as-is for login verification
    // The response is only used internally by the login function
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error reading users data:", error);
    return new Response(JSON.stringify({ users: [] }), {
      status: 200, // Return empty array if file doesn't exist or is empty
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

export async function POST(request) {
  try {
    const { users } = await request.json(); // Expecting { users: [...] } from the client

    // In a real app, you'd validate and sanitize `users` here

    await fs.writeFile(
      usersFilePath,
      JSON.stringify({ users }, null, 2),
      "utf8",
    );

    return new Response(
      JSON.stringify({ message: "Users updated successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error writing users data:", error);
    return new Response(JSON.stringify({ message: "Failed to update users" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
