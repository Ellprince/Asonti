import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
  conversationId?: string;
  error?: string;
}

class ChatService {
  private static instance: ChatService;
  private conversationHistory: ChatMessage[] = [];
  
  private constructor() {}
  
  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }
  
  /**
   * Send a message to the future self AI
   */
  async sendMessage(message: string): Promise<ChatResponse> {
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in to chat with your future self');
      }
      
      // Call the Edge Function (using actual deployed name)
      const { data, error } = await supabase.functions.invoke('super-service', {
        body: {
          message,
          conversationHistory: this.conversationHistory.slice(-10) // Send last 10 messages for context
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      if (data?.error) {
        throw new Error(data.error);
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
        text: data.response,
        isUser: false,
        timestamp: new Date()
      });
      
      return {
        response: data.response,
        conversationId: data.conversationId
      };
    } catch (error: any) {
      console.error('Chat service error:', error);
      
      // Return a fallback response if the Edge Function isn't deployed yet
      if (error.message?.includes('Edge Function not found') || error.message?.includes('FunctionsHttpError')) {
        return {
          response: "I'm still being set up! The Edge Function needs to be deployed to Supabase. For now, here's a mock response. Once deployed, I'll be able to have real conversations with you as your future self.",
          error: 'Edge Function not deployed'
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Load conversation history from database
   */
  async loadConversationHistory(conversationId?: string): Promise<ChatMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId || '')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      this.conversationHistory = messages?.map(msg => ({
        id: msg.id,
        text: msg.content,
        isUser: msg.is_user,
        timestamp: new Date(msg.created_at)
      })) || [];
      
      return this.conversationHistory;
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  }
  
  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }
  
  /**
   * Get current conversation history
   */
  getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }
  
  /**
   * Set conversation history (for restoring from localStorage)
   */
  setHistory(messages: ChatMessage[]): void {
    this.conversationHistory = messages;
  }
}

// Export singleton instance
export const chatService = ChatService.getInstance();