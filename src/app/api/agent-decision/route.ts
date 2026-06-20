import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const VALID = ['shoot', 'pass', 'dribble'] as const;
type Decision = typeof VALID[number];

export async function POST(req: Request) {
  try {
    const {
      playerName, trait, position,
      speed, shooting, passing, stamina,
      distToGoal, nearestOppDist, score, timeLeft,
      openTeammates, currentStamina,
    } = await req.json();

    const staminaPct = Math.round(currentStamina);
    const teammateStr = openTeammates?.length
      ? `Open teammates: ${openTeammates.map((t: any) => `${t.name} (${Math.round(t.dist)}px)`).join(', ')}.`
      : 'No open teammates.';

    const prompt = `You control ${playerName}, a ${position} with trait "${trait}".
Stats: speed ${speed}, shooting ${shooting}, passing ${passing}, stamina ${stamina}.
Current stamina: ${staminaPct}%. Dist to goal: ${Math.round(distToGoal)}px. Nearest opponent: ${Math.round(nearestOppDist)}px.
Score: ${score}. Time left: ${timeLeft}s. ${teammateStr}

Trait rules:
- Arrogant: shoot or dribble, rarely pass
- Calculative: shoot only if close/open, else pass
- Maverick: dribble or shoot, unpredictable
- Team-First: almost always pass
- Panic-Prone: panics under pressure (<40px opponent), random decision

Respond with ONLY one word: shoot, pass, or dribble`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim().toLowerCase().split(/\s/)[0];
    const decision: Decision = VALID.includes(raw as Decision) ? (raw as Decision) : 'dribble';
    return Response.json({ decision });
  } catch {
    return Response.json({ decision: 'dribble' });
  }
}
