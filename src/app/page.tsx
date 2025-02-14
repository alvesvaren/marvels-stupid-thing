"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { heroNames, heroClasses, rankNames } from "@/data/mappings";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { PlayerData } from "./api/player/[id]/route";
import { Pencil } from "lucide-react";
import duelistImg from './role-img/duelist.png';
import vanguardImg from './role-img/vanguard.png';
import strategistImg from './role-img/strategist.png';

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
  return +((wins / (matches || 1)) * 100).toFixed(1);
}

function getHeroName(heroId: string): string {
  return heroNames[heroId] || `Unknown (${heroId})`;
}

function getHeroClass(heroId: string): string {
  return heroClasses[heroId] || 'Unknown';
}

function WinRateProgress({ wins, matches, className = "", inverted = false }: { wins: number; matches: number; className?: string; inverted?: boolean }) {
  const winRate = calculateWinRate(inverted ? matches - wins : wins, matches);
  const color = winRate >= 60 ? "bg-green-500" : winRate >= 50 ? "bg-blue-500" : "bg-red-500";

  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className='flex justify-between text-xs'>
        <span>{Math.round(winRate * 10) / 10}%</span>({matches})
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
  inverted = false,
  heroId,
}: {
  name: string;
  stats: { matches: number; win: number; kills?: number; deaths?: number; assists?: number };
  showKDA?: boolean;
  inverted?: boolean;
  heroId: string;
}) {
  return (
    <div className='flex gap-1 flex-col justify-between'>
      <div className='font-medium text-xs'>
        <span>{name}</span>
      </div>
      <WinRateProgress wins={stats.win} matches={stats.matches} inverted={inverted} />
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

function PlayerCardErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <Card>
      <CardContent className='p-6'>
        <div className='flex flex-col items-center gap-4'>
          <div className='text-destructive'>Something went wrong loading the player card</div>
          <div className='text-sm text-muted-foreground'>{error.message}</div>
          <Button onClick={resetErrorBoundary}>Try again</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleDistribution({ heroes_ranked }: { heroes_ranked: PlayerData['heroes_ranked'] }) {
  const roleStats = Object.entries(heroes_ranked).reduce((acc, [heroId, stats]) => {
    const role = getHeroClass(heroId).toLowerCase();
    if (!acc[role]) {
      acc[role] = { matches: 0, wins: 0 };
    }
    acc[role].matches += stats.matches;
    acc[role].wins += stats.win;
    return acc;
  }, {} as Record<string, { matches: number, wins: number }>);

  const totalMatches = Object.values(roleStats).reduce((sum, { matches }) => sum + matches, 0);

  const roleImages = {
    duelist: duelistImg,
    vanguard: vanguardImg,
    strategist: strategistImg,
  };

  const roleColors = {
    duelist: '#000',
    vanguard: '#666',
    strategist: '#999',
  };

  const roleOrder = ['vanguard', 'duelist', 'strategist'];
  
  const sortedRoles = roleOrder.map(role => ({
    role,
    percentage: (roleStats[role]?.matches || 0) / totalMatches * 100,
    matches: roleStats[role]?.matches || 0,
    winRate: roleStats[role]?.wins ? (roleStats[role].wins / roleStats[role].matches) * 100 : 0
  }));

  return (
    <Section title='Role Distribution'>
      <div className='col-span-3 space-y-2'>
        <div className='flex items-center gap-2 justify-between'>
          {sortedRoles.map(({ role, matches, percentage, winRate }) => (
            <div key={role} className='flex items-center gap-1.5 text-xs'>
              <img 
                src={roleImages[role as keyof typeof roleImages]?.src} 
                alt={role}
                className="w-4 h-4" 
              />
              <div className='text-muted-foreground'>
                {Math.round(percentage)}% ({matches})
              </div>
            </div>
          ))}
        </div>
        <div className='relative h-2 bg-secondary rounded-full overflow-hidden flex'>
          {sortedRoles.map(({ role, percentage }) => (
            <div
              key={role}
              className='h-full transition-all'
              style={{
                width: `${percentage}%`,
                backgroundColor: roleColors[role as keyof typeof roleColors]
              }}
            />
          ))}
        </div>
        <div className='flex items-center justify-between gap-2'>
          {sortedRoles.map(({ role, winRate }) => (
            <div key={role} className='flex-1'>
              <div className='relative h-1.5 bg-secondary rounded-full overflow-hidden'>
                <div 
                  className={`h-full transition-all ${
                    winRate >= 60 ? "bg-green-500" : 
                    winRate >= 50 ? "bg-blue-500" : 
                    "bg-red-500"
                  }`} 
                  style={{ width: `${Math.min(Math.round(winRate), 100)}%` }} 
                />
              </div>
              <div className='text-[10px] text-muted-foreground mt-0.5 text-center'>
                {Math.round(winRate)}% WR
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function PlayerCard({ username, playerId: initialPlayerId }: { username: string; playerId: string | null }) {
  const [playerId, setPlayerId] = useState<string | null>(initialPlayerId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const queryClient = useQueryClient();

  const { data: currentPlayers = {} } = useQuery<PlayerMapping>({
    queryKey: ["currentPlayers"]
  });

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
      return { id: data.playerId as string | null, username };
    },
    onSuccess: ({ id, username }) => {
      queryClient.setQueryData(["currentPlayers"], {
        ...currentPlayers,
        [username]: id,
      });
      queryClient.invalidateQueries({ queryKey: ["currentPlayers"] });
      setPlayerId(id);
      setNewUsername(username);
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

  const UsernameDialog = () => (
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Username</DialogTitle>
          <DialogDescription>Enter the correct username to search for the player.</DialogDescription>
        </DialogHeader>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const username = formData.get('username') as string;
            if (username) {
              searchMutation.mutate(username);
            }
          }}
        >
          <div className='py-4'>
            <Label htmlFor='username'>Username</Label>
            <Input 
              id='username' 
              name='username'
              defaultValue={newUsername}
              className='mt-2' 
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={searchMutation.isPending}>
              {searchMutation.isPending ? "Searching..." : "Search"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (searchMutation.isPending) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='flex flex-col items-center gap-4'>
            <div className='w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full'></div>
            <div>Searching for player...</div>
          </div>
          <UsernameDialog />
        </CardContent>
      </Card>
    );
  }

  if (!playerId) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='flex flex-col items-center gap-4'>
            <div className='text-destructive'>Failed to find player: {newUsername}</div>
            <Button onClick={() => setIsEditOpen(true)}>Update Username</Button>
          </div>
          <UsernameDialog />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='flex flex-col items-center gap-4'>
            <div className='w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full'></div>
            <div>Loading player data...</div>
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
    teammates,
  } = playerDetails;

  const topHeroes = Object.entries(heroes_ranked)
    .sort((a, b) => b[1].matches - a[1].matches)
    .slice(0, 3);

  const bestHeroes = Object.entries(heroes_ranked)
    .filter(([_, stats]) => stats.matches > 1)
    .sort((a, b) => calculateWinRate(b[1].win, b[1].matches) - calculateWinRate(a[1].win, a[1].matches))
    .slice(0, 3);

  const bottomMatchups = [...matchups].sort((a, b) => calculateWinRate(b.wins, b.matches) - calculateWinRate(a.wins, a.matches)).slice(0, 6);
  const topMatchups = [...matchups].sort((a, b) => calculateWinRate(a.wins, a.matches) - calculateWinRate(b.wins, b.matches)).slice(0, 3);

  const frequentTeammates = teammates
    .filter(teammate => {
      // Check if this teammate is in the current players list
      return Object.entries(currentPlayers).some(([playerUsername, playerId]) => 
        playerId === teammate.info.player_uid.toString()
      );
    })
    .sort((a, b) => b.matches - a.matches);

  return (
    <a href={`https://rivalsmeta.com/player/${playerId}`} target="_blank" rel="noopener noreferrer" className="block h-full transition-transform hover:scale-[1.02]">
      <Card className="h-full">
        <CardHeader className='pb-2'>
          <CardTitle className='text-lg flex items-center justify-between'>
            <div className="flex items-center gap-2">
              {newUsername}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                e.preventDefault();
                setIsEditOpen(true);
              }}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <span className='text-sm font-normal'>{rankNames[lastRank?.rank.new_level ?? 0] ?? lastRank?.rank.new_level}</span>
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

          <RoleDistribution heroes_ranked={heroes_ranked} />

          {frequentTeammates.length > 0 && (
            <Section title='Premade Teammates'>
              <div className='col-span-3 grid grid-cols-2 gap-2'>
                {frequentTeammates.map(teammate => (
                  <div key={teammate.info.player_uid} className='flex items-center justify-between bg-secondary/50 rounded p-2'>
                    <span className='text-xs font-medium'>{teammate.info.nick_name}</span>
                    <span className='text-xs text-muted-foreground'>({teammate.matches})</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title='Most Played Heroes (ban if good)'>
            {topHeroes.map(([heroId, heroStats]) => (
              <HeroStats key={heroId} name={getHeroName(heroId)} stats={heroStats} showKDA={true} heroId={heroId} />
            ))}
          </Section>

          <Section title='Best Heroes (ban)'>
            {bestHeroes.map(([heroId, heroStats]) => (
              <HeroStats key={heroId} name={getHeroName(heroId)} stats={heroStats} heroId={heroId} />
            ))}
          </Section>

          <Section title='Best Matchups (avoid)'>
            {topMatchups.map(matchup => (
              <HeroStats inverted key={matchup.hero_id} name={getHeroName(matchup.hero_id.toString())} stats={{ matches: matchup.matches, win: matchup.wins }} heroId={matchup.hero_id.toString()} />
            ))}
          </Section>

          <Section title='Worst Matchups (play)'>
            {bottomMatchups.map(matchup => (
              <HeroStats inverted key={matchup.hero_id} name={getHeroName(matchup.hero_id.toString())} stats={{ matches: matchup.matches, win: matchup.wins }} heroId={matchup.hero_id.toString()} />
            ))}
          </Section>
        </CardContent>
        <UsernameDialog />
      </Card>
    </a>
  );
}

function AppContent() {
  const [apiKey, setApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  const [players, setPlayers] = useState<PlayerMapping>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const savedKey = localStorage.getItem("openai_api_key");
    if (savedKey) {
      setApiKey(savedKey);
      setTempApiKey(savedKey);
    }
  }, []);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!apiKey) {
        setIsDialogOpen(true);
        return;
      }

      const items = e.clipboardData?.items;
      const imageItem = items && Array.from(items).find(item => item.type.startsWith('image'));

      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          processImageMutation.mutate(file);
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [apiKey]);

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
    onSuccess: data => {
      setPlayers(data);
      // Update the currentPlayers query data when we get new players
      queryClient.setQueryData(["currentPlayers"], data);
    },
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

  const playerGroups = Object.entries(players).reduce<Array<[string, string | null][]>>((acc, entry, i) => {
    const groupIndex = Math.floor(i / 6);
    if (!acc[groupIndex]) {
      acc[groupIndex] = [];
    }
    acc[groupIndex].push(entry);
    return acc;
  }, []);

  return (
    <div className='min-h-screen p-8'>
      <main className='max-w-7xl mx-auto space-y-8'>
        <Card>
          <CardHeader>
            <CardTitle>Marvel Rivals Player Lookup</CardTitle>
            <CardDescription>Upload a screenshot or paste (Ctrl+V) anywhere on the page to find player details</CardDescription>
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
              <div 
                className='relative border rounded-md' 
              >
                <Input 
                  type='file' 
                  id='image' 
                  accept='image/*' 
                  onChange={handleImageUpload}
                  className='relative z-10'
                />
                {!processImageMutation.isPending && (
                  <div className='absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none'>
                    <span>Drop image here or click to upload</span>
                  </div>
                )}
              </div>
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
            <CardContent className='flex flex-col gap-8'>
              {playerGroups.map((group, groupIndex) => (
                <div key={groupIndex} className={`grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch ${groupIndex > 0 ? "pt-8 border-t" : ""}`}>
                  {group.map(([username, playerId]) => (
                    <ErrorBoundary
                      key={username}
                      FallbackComponent={PlayerCardErrorFallback}
                      onReset={() => {
                        queryClient.invalidateQueries({ queryKey: ["player", playerId] });
                      }}
                    >
                      <PlayerCard username={username} playerId={playerId} />
                    </ErrorBoundary>
                  ))}
                </div>
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
