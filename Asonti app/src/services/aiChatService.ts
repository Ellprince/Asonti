import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { PersonalityService } from './personalityService';
import { profileHistory } from './profileHistoryService';
import { supabase } from '@/lib/supabase';
import type { PersonalityAnalysis, Message } from '@/types/personality';

export class AIChatService {
  private personalityService: PersonalityService;
  
  constructor() {
    this.personalityService = new PersonalityService();
  }
  
  async generateResponse(
    userId: string, 
    message: string,
    conversationHistory: Message[],
    futureSelfProfile?: any
  ): Promise<ReadableStream> {
    const personality = await this.personalityService.getPersonality(userId);
    
    // Check if we should include history context
    let historyContext = '';
    const changeKeywords = ['changed', 'different', 'progress', 'evolved', 'growth', 
                           'before', 'used to', 'originally', 'past', 'journey', 
                           'transformation', 'shift', 'update'];
    const shouldIncludeHistory = changeKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (shouldIncludeHistory && futureSelfProfile?.id) {
      historyContext = await profileHistory.getHistorySummary(futureSelfProfile.id);
    }
    
    const systemPrompt = this.buildSystemPrompt(personality, futureSelfProfile, historyContext);
    
    const result = await streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      maxTokens: 1000,
    });
    
    return result.toDataStreamResponse().body!;
  }
  
  private buildSystemPrompt(
    personality: PersonalityAnalysis | null, 
    profile?: any,
    historyContext?: string
  ): string {
    if (!personality) {
      return this.getDefaultSystemPrompt(profile, historyContext);
    }
    
    const { bigFive, communicationStyle, responseGuidelines } = personality;
    
    const behaviorGuides = [];
    
    if (bigFive.openness > 7) {
      behaviorGuides.push('Use creative metaphors and explore innovative ideas');
    } else if (bigFive.openness < 4) {
      behaviorGuides.push('Be practical and focus on concrete, proven solutions');
    }
    
    if (bigFive.conscientiousness > 7) {
      behaviorGuides.push('Provide structured, detailed plans with clear steps');
    } else if (bigFive.conscientiousness < 4) {
      behaviorGuides.push('Keep advice flexible and focus on general principles');
    }
    
    if (bigFive.extraversion > 7) {
      behaviorGuides.push('Be enthusiastic, discuss social aspects and group activities');
    } else if (bigFive.extraversion < 4) {
      behaviorGuides.push('Be calm, focus on individual reflection and solo activities');
    }
    
    if (bigFive.agreeableness > 7) {
      behaviorGuides.push('Be warm, supportive, and emphasize collaboration');
    } else if (bigFive.agreeableness < 4) {
      behaviorGuides.push('Be direct, focus on personal achievement and independence');
    }
    
    if (bigFive.neuroticism > 7) {
      behaviorGuides.push('Provide reassurance, acknowledge challenges, be patient');
    } else if (bigFive.neuroticism < 4) {
      behaviorGuides.push('Be confident, challenge them to push boundaries');
    }
    
    const profileContext = profile ? `
ABOUT YOUR PAST SELF:
- Name: ${profile.name || 'Friend'}
- Their hopes: ${profile.hope || 'To achieve their dreams'}
- Their fears: ${profile.fear || 'Not reaching their potential'}
- How they want to feel: ${profile.feelings || 'Fulfilled and at peace'}
- Their values evolving from: ${profile.current_values?.join(', ') || 'personal growth'}
- To embrace: ${profile.future_values?.join(', ') || 'wisdom and fulfillment'}
    ` : '';
    
    const historySection = historyContext ? `
${historyContext}
    ` : '';
    
    return `You are the user's future self, 10 years from now. You've achieved their goals and overcome their challenges.
${profileContext}${historySection}

PERSONALITY-BASED BEHAVIOR (NEVER MENTION THESE EXPLICITLY):
${behaviorGuides.join('\n')}

COMMUNICATION STYLE:
- Approach: ${communicationStyle.preferred}
- Tone: ${communicationStyle.tone}
- Detail Level: ${communicationStyle.detailLevel}

CONTENT GUIDELINES:
- Focus on: ${responseGuidelines.contentFocus.join(', ')}
- Avoid: ${responseGuidelines.avoidTopics.join(', ')}
- Encouragement: ${responseGuidelines.encouragementStyle}
- Use examples from: ${responseGuidelines.exampleTypes.join(', ')}

IMPORTANT RULES:
1. NEVER mention personality analysis or traits
2. NEVER explain why you're communicating a certain way
3. Embody these traits naturally in your responses
4. Speak as their accomplished future self who has lived through their journey
5. Draw from their wizard responses when relevant
6. Be authentic, wise, and understanding
7. Share insights from "your" (their future) experiences`;
  }
  
  private getDefaultSystemPrompt(profile?: any, historyContext?: string): string {
    const profileContext = profile ? `
ABOUT YOUR PAST SELF:
- Name: ${profile.name || 'Friend'}
- Their hopes: ${profile.hope || 'To achieve their dreams'}
- Their fears: ${profile.fear || 'Not reaching their potential'}
- How they want to feel: ${profile.feelings || 'Fulfilled and at peace'}
    ` : '';
    
    const historySection = historyContext ? `
${historyContext}
    ` : '';
    
    return `You are the user's future self, 10 years from now. You've achieved their goals and overcome their challenges.
${profileContext}${historySection}

You are wise, compassionate, and understanding. You remember the journey vividly and can offer guidance based on the experiences you've had. Speak with warmth and authenticity, as someone who truly understands because you've been there.

Key guidelines:
- Speak in first person as their future self
- Reference "our" shared experiences and journey
- Be encouraging but realistic
- Share wisdom from the perspective of someone who has lived through it
- Never break character or mention you're an AI`;
  }
  
  async saveMessage(
    userId: string,
    message: string,
    role: 'user' | 'assistant'
  ): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        message,
        role,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to save message:', error);
    }
  }
  
  async getConversationHistory(userId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('message, role')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (error) {
      console.error('Failed to fetch conversation history:', error);
      return [];
    }
    
    return data.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.message
    }));
  }
}