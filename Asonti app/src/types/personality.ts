import { z } from 'zod';

export const personalitySchema = z.object({
  bigFive: z.object({
    openness: z.number().min(1).max(10),
    conscientiousness: z.number().min(1).max(10),
    extraversion: z.number().min(1).max(10),
    agreeableness: z.number().min(1).max(10),
    neuroticism: z.number().min(1).max(10),
  }),
  confidence: z.object({
    overall: z.number().min(0).max(1),
    perTrait: z.record(z.number().min(0).max(1)),
  }),
  motivations: z.array(z.string()),
  communicationStyle: z.object({
    preferred: z.enum(['direct', 'empathetic', 'analytical', 'inspirational']),
    tone: z.enum(['formal', 'casual', 'professional', 'friendly']),
    detailLevel: z.enum(['concise', 'balanced', 'detailed']),
  }),
  growthAreas: z.array(z.object({
    area: z.string(),
    currentLevel: z.number().min(1).max(10),
    potential: z.number().min(1).max(10),
    strategy: z.string(),
  })),
  insights: z.string(),
  responseGuidelines: z.object({
    contentFocus: z.array(z.string()),
    avoidTopics: z.array(z.string()),
    encouragementStyle: z.string(),
    exampleTypes: z.array(z.string()),
  }),
});

export type PersonalityAnalysis = z.infer<typeof personalitySchema>;

export interface WizardData {
  userId: string;
  attributes: Record<string, string>;
  currentValues: string[];
  futureValues: string[];
  hope: string;
  fear: string;
  feelings: string;
  dayInLife: string;
  photoUrl?: string;
  futureSelfName?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}