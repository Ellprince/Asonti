import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { supabase } from '@/lib/supabase';
import { personalitySchema, type PersonalityAnalysis, type WizardData } from '@/types/personality';

export class PersonalityService {
  private readonly model = 'gpt-4o';
  
  async analyzeProfile(wizardData: WizardData): Promise<PersonalityAnalysis> {
    const prompt = this.constructPrompt(wizardData);
    
    try {
      const { object } = await generateObject({
        model: openai(this.model),
        schema: personalitySchema,
        system: `You are an expert psychologist specializing in personality assessment 
                 using the Big Five (OCEAN) model. Analyze the provided user data and 
                 generate a comprehensive personality profile.`,
        prompt,
        temperature: 0.3,
        maxTokens: 2000,
      });
      
      await this.saveAnalysis(wizardData.userId, object);
      
      return object;
    } catch (error) {
      console.error('Personality analysis failed:', error);
      return this.getFallbackAnalysis(wizardData);
    }
  }
  
  private constructPrompt(data: WizardData): string {
    return `
    Analyze this person's personality based on their Future Self profile:
    
    CHARACTER ATTRIBUTES:
    - Strengths (have now): ${this.formatAttributes(data.attributes, 'have_now')}
    - Want to develop: ${this.formatAttributes(data.attributes, 'want_to_develop')}
    - Not aligned with: ${this.formatAttributes(data.attributes, 'not_me')}
    
    VALUES:
    - Current values: ${data.currentValues.join(', ')}
    - Future values: ${data.futureValues.join(', ')}
    
    ASPIRATIONS & CONCERNS:
    - Greatest hope: "${data.hope}"
    - Greatest fear: "${data.fear}"
    
    EMOTIONAL STATE:
    - How they want to feel: "${data.feelings}"
    
    FUTURE VISION:
    - A day in their future life: "${data.dayInLife}"
    
    Based on this information, provide:
    1. Big Five personality scores (1-10 scale)
    2. Confidence levels for each prediction
    3. Core motivations driving this person
    4. Preferred communication style
    5. Growth areas with strategies
    6. Key psychological insights
    7. Response guidelines for AI interactions
    
    Consider patterns in their responses, contradictions, and what they 
    emphasize versus what they avoid discussing.
    `;
  }
  
  private formatAttributes(
    attributes: Record<string, string>, 
    filter: string
  ): string {
    return Object.entries(attributes)
      .filter(([_, value]) => value === filter)
      .map(([key]) => this.humanizeAttribute(key))
      .join(', ') || 'None specified';
  }
  
  private humanizeAttribute(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  private async saveAnalysis(
    userId: string, 
    analysis: PersonalityAnalysis
  ): Promise<void> {
    const { error } = await supabase
      .from('future_self_profiles')
      .update({ 
        personality_analysis: analysis,
        analyzed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (error) {
      console.error('Failed to save personality analysis:', error);
      throw error;
    }
  }
  
  async getPersonality(userId: string): Promise<PersonalityAnalysis | null> {
    const { data, error } = await supabase
      .from('future_self_profiles')
      .select('personality_analysis')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error || !data?.personality_analysis) {
      console.error('Failed to fetch personality:', error);
      return null;
    }
    
    return data.personality_analysis as PersonalityAnalysis;
  }
  
  private getFallbackAnalysis(data: WizardData): PersonalityAnalysis {
    const hasCreativity = data.attributes?.creativity === 'have_now';
    const wantLeadership = data.attributes?.leadership === 'want_to_develop';
    
    return {
      bigFive: {
        openness: hasCreativity ? 7 : 5,
        conscientiousness: 6,
        extraversion: wantLeadership ? 6 : 5,
        agreeableness: 6,
        neuroticism: 4,
      },
      confidence: {
        overall: 0.6,
        perTrait: {
          openness: 0.7,
          conscientiousness: 0.5,
          extraversion: 0.6,
          agreeableness: 0.5,
          neuroticism: 0.5,
        },
      },
      motivations: ['Personal growth', 'Self-improvement'],
      communicationStyle: {
        preferred: 'empathetic',
        tone: 'friendly',
        detailLevel: 'balanced',
      },
      growthAreas: [],
      insights: 'Analysis based on limited data. Complete profile for better insights.',
      responseGuidelines: {
        contentFocus: ['Personal development', 'Goal achievement'],
        avoidTopics: [],
        encouragementStyle: 'Supportive and understanding',
        exampleTypes: ['Personal experiences', 'Practical advice'],
      },
    };
  }
}