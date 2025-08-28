import { AIChatService } from '../src/services/aiChatService';
import { supabase } from '../src/lib/supabase';
import type { Message } from '../src/types/personality';

export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const { message, conversationHistory, futureSelfProfile } = await request.json();
    
    if (!message) {
      return new Response('Message is required', { status: 400 });
    }
    
    const chatService = new AIChatService();
    
    const history: Message[] = conversationHistory || [];
    
    const stream = await chatService.generateResponse(
      user.id,
      message,
      history,
      futureSelfProfile
    );
    
    await chatService.saveMessage(user.id, message, 'user');
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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
        },
      }
    );
  }
}