import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Static Database for Fallback or offline developer mode
const REAL_PLAYERS_MAPPING: Record<string, {
  name: string;
  trait: string;
  speed: number;
  passing: number;
  shooting: number;
  defense: number;
  stamina: number;
  reasoning: string;
}> = {
  'messi': {
    name: "Lionel Messi",
    trait: "Calculative",
    speed: 84,
    passing: 96,
    shooting: 92,
    defense: 38,
    stamina: 82,
    reasoning: "Conserves stamina to walk the field, mapping out precise corridors and scoring with surgical probability."
  },
  'haaland': {
    name: "Erling Haaland",
    trait: "Maverick",
    speed: 89,
    passing: 65,
    shooting: 94,
    defense: 45,
    stamina: 88,
    reasoning: "A physical anomaly who relies on direct long runs, brute power, and sudden goals from impossible positions."
  },
  'bellingham': {
    name: "Jude Bellingham",
    trait: "Team-First",
    speed: 83,
    passing: 86,
    shooting: 85,
    defense: 80,
    stamina: 92,
    reasoning: "A tireless engine running from box to box, prioritizing team positioning and support overlays."
  },
  'mbappe': {
    name: "Kylian Mbappé",
    trait: "Arrogant",
    speed: 97,
    passing: 82,
    shooting: 90,
    defense: 36,
    stamina: 89,
    reasoning: "Demands the ball to burn defenders with rapid speed and solo drives, showing absolute confidence in 1v1s."
  },
  'debruyne': {
    name: "Kevin De Bruyne",
    trait: "Calculative",
    speed: 74,
    passing: 98,
    shooting: 86,
    defense: 68,
    stamina: 88,
    reasoning: "Master of curves and geometries; computes pass corridors into the box that others fail to perceive."
  },
  'ronaldo': {
    name: "Cristiano Ronaldo",
    trait: "Arrogant",
    speed: 82,
    passing: 76,
    shooting: 93,
    defense: 34,
    stamina: 86,
    reasoning: "Demands high-volume shots, trusts only his own striking ability, and operates as an apex solo finisher."
  },
  'vandijk': {
    name: "Virgil van Dijk",
    trait: "Team-First",
    speed: 78,
    passing: 78,
    shooting: 60,
    defense: 94,
    stamina: 89,
    reasoning: "Commanding presence who coordinates the backline and shuts down dribblers with supreme positioning."
  },
  'saka': {
    name: "Bukayo Saka",
    trait: "Panic-Prone",
    speed: 86,
    passing: 84,
    shooting: 82,
    defense: 65,
    stamina: 90,
    reasoning: "Extremely skilled but under high pressure or fatigue, tends to overthink options or clear ball hastily."
  },
  'neymar': {
    name: "Neymar Jr.",
    trait: "Maverick",
    speed: 91,
    passing: 86,
    shooting: 87,
    defense: 30,
    stamina: 78,
    reasoning: "A chaos agent who thrives on unpredictable dribbles, rainbow flicks, and spectacular solo plays."
  },
  'modric': {
    name: "Luka Modrić",
    trait: "Calculative",
    speed: 74,
    passing: 96,
    shooting: 76,
    defense: 72,
    stamina: 88,
    reasoning: "Orchestrates tempo with metronomic precision, always selecting the highest-value pass or movement."
  },
  'sergio': {
    name: "Sergio Ramos",
    trait: "Arrogant",
    speed: 72,
    passing: 74,
    shooting: 68,
    defense: 93,
    stamina: 84,
    reasoning: "Commands the backline with aggression and dominance, believing no attacker can beat him one-on-one."
  }
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const searchName = searchParams.get('name')?.toLowerCase() || '';

    // If query match in offline mapping database
    if (searchName && REAL_PLAYERS_MAPPING[searchName]) {
      return NextResponse.json(REAL_PLAYERS_MAPPING[searchName]);
    }

    // Pick random key if no searchName provided
    const keys = Object.keys(REAL_PLAYERS_MAPPING);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const chosenPlayerName = searchName || REAL_PLAYERS_MAPPING[randomKey].name;

    // Use Gemini if client is ready
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are a sports data scientist for the anime football game "Manga-Mon".
Analyze the real-world football player: "${chosenPlayerName}".
Generate their stats and attributes mapped to our game mechanics.

Output ONLY a JSON block conforming exactly to this structure (no markdown formatting, no comments):
{
  "name": "Full Player Name",
  "trait": "One of: Arrogant, Calculative, Panic-Prone, Maverick, Team-First",
  "speed": integer between 40 and 99,
  "passing": integer between 40 and 99,
  "shooting": integer between 40 and 99,
  "defense": integer between 40 and 99,
  "stamina": integer between 40 and 99,
  "reasoning": "A 1-sentence explanation of why they were assigned that trait based on their real playstyle"
}`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          }
        });

        const text = result.response.text().trim();
        const parsed = JSON.parse(text);
        
        // Validate fields
        const validTraits = ['Arrogant', 'Calculative', 'Panic-Prone', 'Maverick', 'Team-First'];
        if (
          parsed.name &&
          validTraits.includes(parsed.trait) &&
          typeof parsed.speed === 'number' &&
          typeof parsed.passing === 'number' &&
          typeof parsed.shooting === 'number' &&
          typeof parsed.defense === 'number' &&
          typeof parsed.stamina === 'number' &&
          parsed.reasoning
        ) {
          return NextResponse.json(parsed);
        }
      } catch (geminiError) {
        console.error("Gemini Player Generation error, falling back:", geminiError);
      }
    }

    // Default to mapped dataset
    const playerRecord = REAL_PLAYERS_MAPPING[searchName] || REAL_PLAYERS_MAPPING[randomKey];
    return NextResponse.json(playerRecord);

  } catch (err: any) {
    console.error("API Players Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
