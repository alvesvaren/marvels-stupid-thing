import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { searchPlayer } from '../search/route';

const UsernamesSchema = z.object({
  usernames: z.array(z.string()),
});

export async function POST(request: Request) {
  try {
    const { image, apiKey } = await request.json();

    if (!image || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Analyze image with GPT-4 Vision
    const response = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all player usernames from this Marvel Rivals screenshot. Return them as an array of strings. The usernames are listed on a slanted surface, first their level, followed by their username and an optional title (ignore the title), and there are always 6 usernames in each picture, so always return 6 usernames! Make sure to read their names closely, as they are not always spelled logically.',
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
      response_format: zodResponseFormat(UsernamesSchema, 'usernames'),
    });

    if (!response.choices[0]?.message?.parsed) {
      throw new Error('Failed to parse usernames from the image');
    }

    const usernames = response.choices[0].message.parsed.usernames;
    console.log("Found usernames: ", usernames);

    // Create username to ID mapping
    const playerMapping = Object.fromEntries(
      await Promise.all(
        usernames.map(async (username) => [username, await searchPlayer(username)])
      )
    );

    return NextResponse.json({ players: playerMapping });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
} 