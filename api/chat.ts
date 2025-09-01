export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

export default async function handler(request: Request) {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };

  if (request.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { message, conversationHistory, futureSelfProfile } = body || {};

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing OPENAI_API_KEY' }),
        { status: 500, headers: { 'content-type': 'application/json', ...corsHeaders } }
      );
    }

    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400, headers: corsHeaders });
    }

    // Build prompt from provided profile (no DB access needed)
    const profile = futureSelfProfile || {};
    const profileContext = `\nABOUT YOUR PAST SELF:\n- Name: ${profile.name || 'Friend'}\n- Their hopes: ${profile.hope || 'To achieve their dreams'}\n- Their fears: ${profile.fear || 'Not reaching their potential'}\n- How they want to feel: ${profile.feelings || 'Fulfilled and at peace'}\n- Values (current): ${(profile.current_values || []).join(', ') || 'personal growth'}\n- Values (future): ${(profile.future_values || []).join(', ') || 'wisdom and fulfillment'}\n`;

    const systemPrompt = `You are the user's future self, 10 years from now. You've achieved their goals and overcome their challenges.\n${profileContext}\n\nSpeak with warmth and authenticity as someone who truly understands because you've been there. Never break character or mention you're an AI.`;

    const history: Message[] = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-10)
      : [];

    const model = (process.env.OPENAI_MODEL || 'gpt-4o').trim();

    // Call OpenAI Chat Completions directly (no external deps)
    const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errText }),
        { status: 500, headers: { 'content-type': 'application/json', ...corsHeaders } }
      );
    }

    const data = await apiRes.json();
    const aiText = data.choices?.[0]?.message?.content || "I need a moment to reflect on that...";

    return new Response(
      JSON.stringify({ response: aiText, success: true }),
      { status: 200, headers: { 'content-type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error?.message || 'Unknown error' }),
      { status: 500, headers: { 'content-type': 'application/json', ...corsHeaders } }
    );
  }
}

