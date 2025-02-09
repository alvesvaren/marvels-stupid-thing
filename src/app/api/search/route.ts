import { NextResponse } from "next/server";
import { searchPlayer } from "./funcs";

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const playerId = await searchPlayer(username);
    return NextResponse.json({ playerId });
  } catch (error) {
    console.error("Error searching player:", error);
    return NextResponse.json({ error: "Failed to search player" }, { status: 500 });
  }
}
