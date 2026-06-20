import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client (failsafe if key is missing)
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Fallback Dialogue database for local offline mode
const FALLBACK_DIALOGUES: Record<string, Record<string, string[]>> = {
  Arrogant: {
    clutch_shot: [
      "Out of my way. You aren't even worth my time.",
      "Watch this, peasants. This is how a king plays.",
      "Just sit back and watch me score. You're welcome."
    ],
    setup: [
      "You actually made a decent pass. Don't waste my time.",
      "Hmph, I'll take it from here. Try not to trip.",
      "A pass worthy of my presence. Now, watch me finish it."
    ],
    breakdown: [
      "Get lost! No one gets past me!",
      "How did I miss that?! Inconceivable!",
      "Tch... absolute trash. This is unacceptable."
    ]
  },
  Calculative: {
    clutch_shot: [
      "Target verified. Probability of scoring is 94.6%. Executing.",
      "Angle calculated. Shot vector clear. Fire.",
      "Defensive gap detected. Commencing optimal shot sequence."
    ],
    setup: [
      "Setup optimal. Passing lane clear at 87 degrees.",
      "Expected value of this pass is maximized. Deliver.",
      "Calculating coordinate. Execute pass to target now."
    ],
    breakdown: [
      "Defensive alignment failure. Recalculating positioning.",
      "Stamina at critical thresholds. Interception rate dropping.",
      "Calculated error: tackle window missed by 0.12 seconds."
    ]
  },
  'Panic-Prone': {
    clutch_shot: [
      "I have to shoot! I hope this goes in!",
      "Ah! The goal is so small! Just kick it!",
      "Please... just let this fly true!"
    ],
    setup: [
      "Too much pressure! Just take the ball!",
      "Please catch this! Don't let them intercept!",
      "Aaaah! Just pass it away!"
    ],
    breakdown: [
      "My lungs are burning... I can't keep up!",
      "Wait, no! They're too fast! Help!",
      "I fumbled... Oh no, it's all my fault!"
    ]
  },
  Maverick: {
    clutch_shot: [
      "Let's make this interesting! Direct shot!",
      "They think I'll pass? Wrong! Let's fly!",
      "A shot from here? Hell yeah, watch this!"
    ],
    setup: [
      "No-look pass! Try stopping this!",
      "Catch! Let's spice up the play!",
      "Curving it right into the lane. Do something crazy!"
    ],
    breakdown: [
      "Whoops! Missed him. Guess I'll chase him down!",
      "Hahaha, nice move! But I'm not done!",
      "A stumble? Just part of the show!"
    ]
  },
  'Team-First': {
    clutch_shot: [
      "I'll take this chance for the team! Let's go!",
      "Trusting our training. For the win!",
      "We built this path together. I'll finish it!"
    ],
    setup: [
      "Go, Isagi! Finish this play!",
      "I believe in you! Take the shot!",
      "Perfect run! The ball is yours!"
    ],
    breakdown: [
      "I'll cover for you! Fall back!",
      "My fault, team! I'll win it back next time!",
      "Hold the line! Don't let them through!"
    ]
  }
};

export async function POST(req: Request) {
  try {
    const { playerName, personaTrait, eventType, currentScore, matchTime } = await req.json();

    if (!playerName || !personaTrait || !eventType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Try using Gemini if client is initialized
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Structure a highly detailed manga-style system prompt
        const prompt = `You are writing dialogue for a Web3 football game styled after the intense manga "Blue Lock".
Character Name: ${playerName}
Personality Trait: ${personaTrait}
Match Time: ${Math.floor(matchTime / 60)} minutes remaining
Current Score: ${currentScore} (Red vs Blue)
Critical Event: ${eventType} (Options are clutch_shot, setup, or breakdown)

Write a short, highly dramatic internal monologue or verbal shout (MAXIMUM 15 words) reflecting the character's personality trait under this high-stakes situation.
Rules:
- Keep it under 15 words.
- Make it intense, stylish, and in character.
- Do NOT use quotation marks.
- Do NOT add explanation or introduction, output ONLY the dialogue.`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 30,
            temperature: 0.85,
          }
        });

        const text = result.response.text().trim();
        if (text) {
          return NextResponse.json({ dialogue: text });
        }
      } catch (geminiError) {
        console.error("Gemini Generation Error, falling back to database:", geminiError);
      }
    }

    // Fallback: Pick a random predefined string from database
    const traitSet = FALLBACK_DIALOGUES[personaTrait] || FALLBACK_DIALOGUES['Calculative'];
    const eventDialogues = traitSet[eventType] || traitSet['clutch_shot'];
    const randomIndex = Math.floor(Math.random() * eventDialogues.length);
    const fallbackText = eventDialogues[randomIndex];

    return NextResponse.json({ dialogue: fallbackText });

  } catch (err: any) {
    console.error("Server API Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
