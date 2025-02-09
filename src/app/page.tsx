"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { heroNames } from "@/data/hero-mappings";
import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PlayerData } from "./api/player/[id]/route";

interface PlayerMapping {
  [username: string]: string | null;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function calculateKDA(kills: number, deaths: number, assists: number): string {
  const kda = ((kills + assists) / Math.max(deaths, 1)).toFixed(1);
  return `${kda} KDA`;
}

function calculateWinRate(wins: number, matches: number): number {
  return +((wins / matches) * 100).toFixed(1);
}

function getHeroName(heroId: string): string {
  return heroNames[heroId] || `Unknown (${heroId})`;
}

function WinRateProgress({ wins, matches, className = "" }: { wins: number; matches: number; className?: string }) {
  const winRate = calculateWinRate(wins, matches);
  const color = winRate >= 60 ? "bg-green-500" : winRate >= 50 ? "bg-blue-500" : "bg-red-500";

  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className='flex justify-between text-xs'>
          <span>{Math.round(winRate * 10) / 10}%</span>
          ({matches})
      </div>
      <div className='relative w-full h-1.5 bg-secondary rounded-full overflow-hidden'>
        <div className={`h-full transition-all ${color}`} style={{ width: `${Math.min(Math.round(winRate * 10) / 10, 100)}%` }} />
      </div>
    </div>
  );
}

function HeroStats({
  name,
  stats,
  showKDA = false,
}: {
  name: string;
  stats: { matches: number; win: number; kills?: number; deaths?: number; assists?: number };
  showKDA?: boolean;
}) {
  return (
    <div className='flex gap-1 flex-col justify-between'>
      <div className='font-medium text-xs'>{name}</div>
      <WinRateProgress wins={stats.win} matches={stats.matches} />
      {showKDA && stats.kills !== undefined && stats.deaths !== undefined && stats.assists !== undefined && (
        <div className='text-xs text-muted-foreground'>{calculateKDA(stats.kills, stats.deaths, stats.assists)}</div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className='text-xs font-semibold mb-2'>{title}</div>
      <div className='grid grid-cols-3 gap-2'>{children}</div>
    </div>
  );
}

function ApiKeyDialog({
  apiKey,
  tempApiKey,
  setTempApiKey,
  isDialogOpen,
  setIsDialogOpen,
  handleSaveApiKey,
}: {
  apiKey: string;
  tempApiKey: string;
  setTempApiKey: (key: string) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  handleSaveApiKey: () => void;
}) {
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant='outline'>Update API Key</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>OpenAI API Key</DialogTitle>
          <DialogDescription>Enter your OpenAI API key. It will be stored securely in your browser.</DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <Label htmlFor='apiKey'>API Key</Label>
          <Input id='apiKey' type='password' value={tempApiKey} onChange={e => setTempApiKey(e.target.value)} placeholder='sk-...' className='mt-2' />
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveApiKey}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlayerCard({ username, playerId: initialPlayerId }: { username: string; playerId: string | null }) {
  const [playerId, setPlayerId] = useState<string | null>(initialPlayerId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const [isSearching, setIsSearching] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!response.ok) {
        throw new Error("Failed to search player");
      }
      const data = await response.json();
      return data.playerId as string | null;
    },
    onSuccess: newId => {
      setPlayerId(newId);
      setIsEditOpen(false);
    },
  });

  const {
    data: playerDetails,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      if (!playerId) throw new Error("No player ID");
      const response = await fetch(`/api/player/${playerId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch player data");
      }
      return response.json() as Promise<PlayerData>;
    },
    enabled: !!playerId,
  });

  if (!playerId) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='flex flex-col items-center gap-4'>
            <div className='text-destructive'>Failed to find player: {username}</div>
            <Button onClick={() => setIsEditOpen(true)}>Update Username</Button>
          </div>
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Username</DialogTitle>
                <DialogDescription>Enter the correct username to search for the player.</DialogDescription>
              </DialogHeader>
              <div className='py-4'>
                <Label htmlFor='username'>Username</Label>
                <Input id='username' value={newUsername} onChange={e => setNewUsername(e.target.value)} className='mt-2' />
              </div>
              <DialogFooter>
                <Button variant='outline' onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => searchMutation.mutate(newUsername)} disabled={searchMutation.isPending}>
                  {searchMutation.isPending ? "Searching..." : "Search"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='flex items-center justify-center'>
            <div className='w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full'></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !playerDetails) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='text-destructive'>Failed to load player data</div>
        </CardContent>
      </Card>
    );
  }

  const {
    stats,
    rank_history: [lastRank],
    heroes_ranked,
    matchups,
  } = playerDetails;

  const topHeroes = Object.entries(heroes_ranked)
    .sort((a, b) => b[1].matches - a[1].matches)
    .slice(0, 3);

  const bestHeroes = Object.entries(heroes_ranked)
    .filter(([_, stats]) => stats.matches > 1)
    .sort((a, b) => calculateWinRate(b[1].win, b[1].matches) - calculateWinRate(a[1].win, a[1].matches))
    .slice(0, 3);

  const topMatchups = [...matchups].sort((a, b) => calculateWinRate(b.wins, b.matches) - calculateWinRate(a.wins, a.matches)).slice(0, 3);

  const bottomMatchups = [...matchups].sort((a, b) => calculateWinRate(a.wins, a.matches) - calculateWinRate(b.wins, b.matches)).slice(0, 3);

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-lg flex items-center justify-between'>
          {username}
          <span className='text-sm font-normal'>Rank {lastRank.rank.new_level}</span>
        </CardTitle>
        <CardDescription className='text-xs'>ID: {playerId}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='gap-2 flex'>
          <div className='flex-1'>
            <div className='text-xs font-medium mb-1'>Overall WR</div>
            <WinRateProgress wins={stats.total_wins} matches={stats.total_matches} />
          </div>
          <div className='flex-1'>
            <div className='text-xs font-medium mb-1'>Ranked WR</div>
            <WinRateProgress wins={stats.ranked_matches_wins} matches={stats.ranked_matches} />
          </div>
        </div>

        <Section title='Most Played Heroes (ban if good)'>
          {topHeroes.map(([heroId, heroStats]) => (
            <HeroStats key={heroId} name={getHeroName(heroId)} stats={heroStats} showKDA={true} />
          ))}
        </Section>

        <Section title='Best Heroes (ban)'>
          {bestHeroes.map(([heroId, heroStats]) => (
            <HeroStats key={heroId} name={getHeroName(heroId)} stats={heroStats} />
          ))}
        </Section>

        <Section title='Best Matchups (avoid)'>
          {topMatchups.map(matchup => (
            <HeroStats key={matchup.hero_id} name={getHeroName(matchup.hero_id.toString())} stats={{ matches: matchup.matches, win: matchup.wins }} />
          ))}
        </Section>

        <Section title='Worst Matchups (play)'>
          {bottomMatchups.map(matchup => (
            <HeroStats key={matchup.hero_id} name={getHeroName(matchup.hero_id.toString())} stats={{ matches: matchup.matches, win: matchup.wins }} />
          ))}
        </Section>
      </CardContent>
    </Card>
  );
}

function AppContent() {
  const [apiKey, setApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  const [players, setPlayers] = useState<PlayerMapping>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem("openai_api_key");
    if (savedKey) {
      setApiKey(savedKey);
      setTempApiKey(savedKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem("openai_api_key", tempApiKey);
    setApiKey(tempApiKey);
    setIsDialogOpen(false);
  };

  const processImageMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!apiKey) {
        throw new Error("Please enter your OpenAI API key first");
      }
      const reader = new FileReader();
      const base64Promise = new Promise<string>(resolve => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64Image = await base64Promise;

      const response = await fetch("/api/process-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image, apiKey }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process image");
      }
      return data.players as PlayerMapping;
    },
    onSuccess: data => setPlayers(data),
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!apiKey) {
      setIsDialogOpen(true);
      return;
    }
    processImageMutation.mutate(file);
  };

  return (
    <div className='min-h-screen p-8'>
      <main className='max-w-7xl mx-auto space-y-8'>
        <Card>
          <CardHeader>
            <CardTitle>Marvel Rivals Player Lookup</CardTitle>
            <CardDescription>Upload a screenshot to find player details</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex justify-between items-center'>
              <div className='text-sm text-muted-foreground'>{apiKey ? "API Key: ••••••••" : "No API Key set"}</div>
              <ApiKeyDialog
                apiKey={apiKey}
                tempApiKey={tempApiKey}
                setTempApiKey={setTempApiKey}
                isDialogOpen={isDialogOpen}
                setIsDialogOpen={setIsDialogOpen}
                handleSaveApiKey={handleSaveApiKey}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='image'>Upload Screenshot</Label>
              <Input type='file' id='image' accept='image/*' onChange={handleImageUpload} />
            </div>
            {processImageMutation.isPending && (
              <div className='p-4 bg-secondary/50 text-secondary-foreground rounded-md flex items-center justify-center gap-2'>
                <div className='w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full'></div>
                Processing image...
              </div>
            )}
            {processImageMutation.isError && <div className='p-4 bg-destructive/10 text-destructive rounded-md'>{processImageMutation.error.message}</div>}
          </CardContent>
        </Card>

        {Object.keys(players).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Player Results</CardTitle>
              <CardDescription>Found {Object.keys(players).length} players in the screenshot</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
              {Object.entries(players).map(([username, playerId]) => (
                <PlayerCard key={username} username={username} playerId={playerId} />
              ))}
            </CardContent>
          </Card>
        )}
      </main>
      <ReactQueryDevtools />
    </div>
  );
}

const queryClient = new QueryClient();

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
