import { NextResponse } from "next/server";

export async function searchPlayer(name: string) {
  try {
    const response = await fetch(`https://rivalsmeta.com/api/find-player`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ID for ${name}`);
    }
    const data = (await response.json()) as {
      aid: string;
      name: string;
      cur_head_icon_id: string;
    }[];
    return data.find((player) => player.name === name)?.aid ?? null;
  } catch (error) {
    console.error(`Error fetching ID for ${name}:`, error);
    return null;
  }
}

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
