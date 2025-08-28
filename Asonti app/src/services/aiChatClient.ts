import { supabase } from '@/lib/supabase';
import { storage } from '@/components/hooks/useLocalStorage';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
  error?: string;
  stream?: ReadableStream;
}

class AIChatClient {
  private static instance: AIChatClient;
  private conversationHistory: ChatMessage[] = [];
  
  private constructor() {}
  
  static getInstance(): AIChatClient {
    if (!AIChatClient.instance) {
      AIChatClient.instance = new AIChatClient();
    }
    return AIChatClient.instance;
  }
  
  async sendMessage(message: string): Promise<ChatResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in to chat with your future self');
      }
      
      // Get future self profile from localStorage
      const futureSelfData = storage.getItem('future-self-data');
      
      // Prepare conversation history for API
      const apiHistory = this.conversationHistory.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));
      
      // Call our API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message,
          conversationHistory: apiHistory.slice(-10), // Last 10 messages for context
          futureSelfProfile: futureSelfData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          fullResponse += chunk;
        }
      }
      
      // Add messages to history
      this.conversationHistory.push({
        id: Date.now().toString(),
        text: message,
        isUser: true,
        timestamp: new Date()
      });
      
      this.conversationHistory.push({
        id: (Date.now() + 1).toString(),
        text: fullResponse,
        isUser: false,
        timestamp: new Date()
      });
      
      return {
        response: fullResponse
      };
    } catch (error: any) {
      console.error('AI Chat error:', error);
      
      // Check if OpenAI key is not configured
      if (error.message?.includes('OPENAI_API_KEY')) {
        return {
          response: "I'm still being set up! The OpenAI API key needs to be configured. Once that's done, I'll be able to have real conversations with you as your future self.",
          error: 'OpenAI API not configured'
        };
      }
      
      // Fallback response
      return {
        response: "I'm having trouble connecting right now. Please try again in a moment.",
        error: error.message
      };
    }
  }
  
  clearHistory(): void {
    this.conversationHistory = [];
  }
  
  getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }
  
  setHistory(messages: ChatMessage[]): void {
    this.conversationHistory = messages;
  }
}

export const aiChatClient = AIChatClient.getInstance();