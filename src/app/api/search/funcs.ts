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
    return data.find(player => player.name === name)?.aid ?? null;
  } catch (error) {
    console.error(`Error fetching ID for ${name}:`, error);
    return null;
  }
}
