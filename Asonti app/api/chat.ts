import { createClient } from '@supabase/supabase-js';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

export default async function handler(request: Request) {
  // CORS headers for preflight and response
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const token = authHeader.substring(7);

    // Create an Edge-safe Supabase server client (no window access)
    const supabaseUrl = process.env.SUPABASE_URL as string;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase env vars' }),
        { status: 500, headers: { 'content-type': 'application/json', ...corsHeaders } }
      );
    }

    const serverSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify the user from the bearer token
    const { data: { user }, error: authError } = await serverSupabase.auth.getUser(token);
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { message, conversationHistory, futureSelfProfile } = await request.json();

    if (!message) {
      return new Response('Message is required', { status: 400, headers: corsHeaders });
    }

    // Build a system prompt based on provided profile (avoid server DB reads for Edge safety)
    const profile = futureSelfProfile || {};
    const profileContext = `\nABOUT YOUR PAST SELF:\n- Name: ${profile.name || 'Friend'}\n- Their hopes: ${profile.hope || 'To achieve their dreams'}\n- Their fears: ${profile.fear || 'Not reaching their potential'}\n- How they want to feel: ${profile.feelings || 'Fulfilled and at peace'}\n- Values (current): ${(profile.current_values || []).join(', ') || 'personal growth'}\n- Values (future): ${(profile.future_values || []).join(', ') || 'wisdom and fulfillment'}\n`;

    const systemPrompt = `You are the user's future self, 10 years from now. You've achieved their goals and overcome their challenges.\n${profileContext}\n\nSpeak with warmth and authenticity as someone who truly understands because you've been there. Never break character or mention you're an AI.\n\nIMPORTANT FORMATTING RULES:\n- Break your responses into clear paragraphs with line breaks between them\n- Keep paragraphs to 2-3 sentences maximum for readability\n- Use numbered lists (1. 2. 3.) when providing multiple points or steps\n- Use bullet points with "•" when listing items or concepts\n- Add an extra line break before and after lists\n- Start each major thought or topic in a new paragraph\n- Never write responses as one long block of text`;

    const history: Message[] = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-10)
      : [];

    // Choose model via env with a safe default
    const modelName = (process.env.OPENAI_MODEL || 'gpt-4o').trim();

    const result = await streamText({
      model: openai(modelName),
      system: systemPrompt,
      messages: [
        ...history,
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    });

    const stream = result.toDataStreamResponse();

    return new Response(stream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Chat failed', details: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

