import { supabase } from '@/lib/supabase';
import { futureSelfService } from '@/services/futureSelfService';
// Updated to use Supabase for profile data

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
  
  async sendMessage(message: string, userName?: string): Promise<ChatResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in to chat with your future self');
      }
      
      // Get future self profile from Supabase
      const futureSelfData = await futureSelfService.getActiveProfile();
      
      // Prefer the Vercel Edge route; allow optional local dev fallback
      const apiHistory = this.conversationHistory.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));

      const useLocal = import.meta.env.VITE_USE_LOCAL_AI === '1';

      const endpoint = useLocal
        ? 'http://localhost:3002/api/chat'
        : '/api/chat';

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Always send auth; local server ignores it, Edge requires it
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message,
            conversationHistory: apiHistory.slice(-10),
            futureSelfProfile: futureSelfData,
            userName: userName
          })
        });

        // If the Edge route streams SSE, try to parse as text first; otherwise expect JSON
        const contentType = response.headers.get('content-type') || '';

        if (response.ok) {
          // Minimal handling: if JSON, parse; if stream/text, accumulate to string
          let aiText = '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            aiText = data.response || '';
          } else {
            // Read the stream and combine chunks (simple approach)
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                aiText += decoder.decode(value, { stream: true });
              }
              aiText += decoder.decode();
            }
            // Try to extract final message if server formatted; else use raw
            aiText = aiText.trim() || "I'm here.";
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
            text: aiText,
            isUser: false,
            timestamp: new Date()
          });

          return { response: aiText };
        }
      } catch (serverError) {
        console.log('Edge/local AI server not available, using fallback responses');
      }
      
      // Fallback to simulated responses if server isn't reachable
      const response = this.generateLocalResponse(message, futureSelfData, userName);
      
      // Add messages to history
      this.conversationHistory.push({
        id: Date.now().toString(),
        text: message,
        isUser: true,
        timestamp: new Date()
      });
      
      this.conversationHistory.push({
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date()
      });
      
      return {
        response
      };
    } catch (error: any) {
      console.error('AI Chat error:', error);
      
      // Fallback response
      return {
        response: "I'm having trouble connecting right now. Please try again in a moment.",
        error: error.message
      };
    }
  }
  
  private generateLocalResponse(message: string, profile: any, userName?: string): string {
    // Generate a contextual response based on the user's profile
    const lowerMessage = message.toLowerCase();
    const firstName = userName?.split(' ')[0] || '';
    
    // Base responses that adapt to profile
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      const greeting = firstName ? `Hello ${firstName}!` : 'Hello!';
      return profile?.name 
        ? `${greeting} It's wonderful to connect with you from 10 years in the future. I remember being where you are now, filled with ${profile.hope ? 'hope about ' + profile.hope : 'dreams and aspirations'}. How can I help guide you today?`
        : `${greeting} It's amazing to connect with you from 10 years in the future. I'm here to share the wisdom and insights I've gained on our journey. What would you like to know?`;
    }
    
    if (lowerMessage.includes('how are you') || lowerMessage.includes("how's life") || lowerMessage.includes('hows life')) {
      return profile?.dayInLife
        ? `Life is incredible! Let me tell you about a typical day: ${profile.dayInLife}. It took time and effort to get here, but every step was worth it.`
        : "Life is fulfilling in ways I couldn't have imagined 10 years ago. I've grown so much, learned to embrace challenges, and found deep satisfaction in the path we've walked. The journey had its ups and downs, but each experience shaped who we've become.";
    }
    
    if (lowerMessage.includes('advice') || lowerMessage.includes('should i')) {
      const values = profile?.future_values?.join(', ') || 'wisdom, growth, and authenticity';
      return `Looking back from where I am now, my advice is to stay true to the values that matter most: ${values}. ${profile?.fear ? `Don't let the fear of ${profile.fear} hold you back. ` : ''}Trust the process, embrace uncertainty, and remember that every challenge is an opportunity for growth.`;
    }
    
    if (lowerMessage.includes('fear') || lowerMessage.includes('worried') || lowerMessage.includes('anxious')) {
      return profile?.fear
        ? `I understand your concerns about ${profile.fear}. I felt the same way. But let me reassure you - we found ways to overcome this. The key was taking things one step at a time and remembering that fear often points to what matters most to us.`
        : "I remember those anxious moments well. What helped me most was understanding that fear is often a compass pointing toward growth. Every worry you have now contributed to the wisdom and strength I carry today.";
    }
    
    if (lowerMessage.includes('future') || lowerMessage.includes('will i')) {
      return profile?.hope
        ? `Yes, your hope of ${profile.hope} becomes reality, though perhaps in ways you don't expect right now. The path isn't always straight, but it leads to something even better than what you're imagining.`
        : "The future holds incredible opportunities for growth and fulfillment. You'll be amazed at how capable you become and the challenges you'll overcome. Trust in your ability to adapt and thrive.";
    }
    
    // Default response with profile awareness
    if (profile?.feelings) {
      return `That's a thoughtful question. ${profile.feelings} - these feelings you have about your future self are valid and important. They're guiding you toward who you're meant to become. What specific aspect would you like to explore further?`;
    }
    
    return "That's an insightful question. From my perspective 10 years ahead, I can see how every experience you're having now is shaping our journey. Each challenge becomes a strength, each doubt transforms into wisdom. What specific aspect of this would you like to explore?";
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
