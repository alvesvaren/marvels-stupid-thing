import { NextResponse } from "next/server";

export interface PlayerData {
  stats: {
    total_matches: number;
    total_wins: number;
    ranked_matches: number;
    ranked_matches_wins: number;
    ranked: {
      total_kills: number;
      total_assists: number;
      total_deaths: number;
      total_time_played: number;
    };
    unranked: {
      total_kills: number;
      total_assists: number;
      total_deaths: number;
      total_time_played: number;
    };
  };
  teammates: Array<{
    matches: number;
    win: number;
    info: {
      nick_name: string;
      player_icon: number;
      player_uid: number;
    };
  }>;
  rank_history: Array<{
    match_time_stamp: number;
    rank: {
      level: number;
      new_level: number;
      add_score: number;
      new_score: number;
    };
  }>;
  heroes_ranked: Record<
    string,
    {
      matches: number;
      win: number;
      mvp: number;
      svp: number;
      kills: number;
      deaths: number;
      assists: number;
    }
  >;
  matchups: Array<{
    matches: number;
    wins: number;
    hero_id: number;
  }>;
}

async function fetchPlayerData(playerId: string) {
  const response = await fetch(`https://rivalsmeta.com/api/player/${playerId}?season=2`);
  if (!response.ok) {
    throw new Error("Failed to fetch player data from RivalsTracker");
  }
  return response.json() as Promise<PlayerData>;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const playerData = await fetchPlayerData(id);
    return NextResponse.json(playerData);
  } catch (error) {
    console.error("Error fetching player data:", error);
    return NextResponse.json({ error: "Failed to fetch player data" }, { status: 500 });
  }
}
