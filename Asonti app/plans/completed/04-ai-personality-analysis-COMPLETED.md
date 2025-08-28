# Plan 04: AI Personality Analysis

## Overview
**Status:** Active  
**Priority:** High  
**Duration:** 2 days (16 hours)  
**Dependencies:** Plan 1 (Database Migration)  
**Created:** 2025-01-27  
**Updated:** 2025-01-28 - Research findings and user requirements

## Objective
Automatically analyze user responses from the Future Self Wizard using GPT-4o to determine personality traits based on the Big Five (OCEAN) model, creating a hidden personality profile that shapes all AI future self interactions.

## Context
Users provide rich data through the wizard (attributes, values, hopes, fears, feelings). This data is automatically analyzed upon wizard completion to:
- Determine Big Five personality traits (OCEAN) - **HIDDEN from users**
- Shape what the AI future self says (content/advice)
- Shape how the AI communicates (tone/style)
- Ensure personality consistency across all sessions
- Create a truly personalized AI experience

The personality analysis is stored in the database and automatically applied to all AI interactions without user awareness.

## User Requirements (Updated 2025-01-28)
1. **LLM Choice:** Use OpenAI GPT-4o based on research
2. **Automatic Analysis:** Triggers immediately after wizard completion
3. **Hidden Scores:** Users never see personality metrics
4. **Affects Content & Style:** Both what and how AI communicates
5. **Database Storage:** Persistent across all login sessions
6. **Quality First:** Optimize for accuracy over cost
7. **Target:** 100 initial users
8. **Timeline:** MVP by September 1st

## Research Findings (2025-01-28)

### LLM Comparison for Personality Analysis
Based on 2024-2025 research:

#### Best Models for Personality Analysis:
1. **GPT-4o (OpenAI)** - RECOMMENDED
   - Most studied for personality analysis
   - 80% accuracy in personality trait detection
   - Strong consistency with temperature 0.3
   - Better cost efficiency due to tokenization
   - $5/M input, $15/M output tokens

2. **Claude 3.5 Sonnet (Anthropic)**
   - More human-like responses
   - 20-30% higher actual costs due to tokenization overhead
   - $3/M input, $15/M output tokens (but uses more tokens)

3. **Llama 3 (Meta)**
   - Open source option
   - Good performance but requires self-hosting
   - Higher social desirability bias

#### Key Research Insights:
- **Accuracy:** Human evaluators detect personality traits with up to 80% accuracy
- **Consistency:** Larger, instruction-tuned models show more reliable results
- **Temperature:** Use 0.3 for consistent personality analysis
- **Prompting:** Role-playing and structured outputs improve accuracy

### Vercel AI SDK (Version 5)
- **Latest Version:** AI SDK 5 with type-safe chat and agentic control
- **Streaming:** Built-in support for streaming responses
- **OpenAI Support:** Native integration with structured outputs
- **Edge Functions:** Compatible with Vercel Edge Functions
- **Middleware:** Language model middleware for guardrails and logging

### Big Five (OCEAN) Model
- **O - Openness:** Creativity, curiosity, willingness to entertain new ideas
- **C - Conscientiousness:** Self-control, diligence, attention to detail
- **E - Extraversion:** Boldness, energy, social interactivity
- **A - Agreeableness:** Cooperation, trust, altruism
- **N - Neuroticism:** Emotional stability, anxiety, mood

## Success Criteria
- [ ] Automatic analysis triggers after wizard completion
- [ ] Generate hidden Big Five scores (1-10 scale)
- [ ] Personality affects AI response content
- [ ] Personality affects AI communication style
- [ ] Store analysis in Supabase database
- [ ] Complete analysis within 10 seconds
- [ ] Personality persists across all user sessions
- [ ] No personality data visible to users

## Test-Driven Development Plan

### Phase 1: Write Service Tests (1.5 hours)

#### 1.1 Personality Analysis Service Tests
**File:** `src/services/__tests__/personalityService.test.ts`

```typescript
describe('PersonalityService - Analysis', () => {
  test('should analyze all wizard responses')
  test('should generate Big Five scores')
  test('should provide confidence levels')
  test('should identify core motivations')
  test('should suggest growth areas')
  test('should handle incomplete data gracefully')
  test('should cache analysis results')
})

describe('PersonalityService - Prompt Engineering', () => {
  test('should construct valid analysis prompt')
  test('should include all relevant user data')
  test('should request structured JSON output')
  test('should handle token limits')
  test('should sanitize user input')
})

describe('PersonalityService - Error Handling', () => {
  test('should retry on API failures')
  test('should handle rate limits')
  test('should provide fallback analysis')
  test('should log errors appropriately')
})
```

#### 1.2 AI Integration Tests
**File:** `src/services/__tests__/aiIntegration.test.ts`

```typescript
describe('AI Integration - Vercel AI SDK', () => {
  test('should initialize OpenAI client')
  test('should use correct model version')
  test('should stream responses')
  test('should parse structured outputs')
  test('should handle context limits')
  test('should implement safety checks')
})
```

### Phase 2: Implement Personality Service (3 hours)

#### 2.1 Core Service Implementation
**File:** `src/services/personalityService.ts`

```typescript
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

// Schema for personality analysis (INTERNAL USE ONLY - NOT EXPOSED TO UI)
const personalitySchema = z.object({
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
  insights: z.string(), // Internal notes, never shown to user
  // New field for shaping AI responses
  responseGuidelines: z.object({
    contentFocus: z.array(z.string()), // What topics to emphasize
    avoidTopics: z.array(z.string()), // What to avoid discussing
    encouragementStyle: z.string(), // How to motivate the user
    exampleTypes: z.array(z.string()), // Types of examples to use
  }),
})

type PersonalityAnalysis = z.infer<typeof personalitySchema>

export class PersonalityService {
  private readonly model = 'gpt-4o' // Using latest GPT-4o model
  
  async analyzeProfile(wizardData: WizardData): Promise<PersonalityAnalysis> {
    const prompt = this.constructPrompt(wizardData)
    
    try {
      const { object } = await generateObject({
        model: openai(this.model),
        schema: personalitySchema,
        system: `You are an expert psychologist specializing in personality assessment 
                 using the Big Five (OCEAN) model. Analyze the provided user data and 
                 generate a comprehensive personality profile.`,
        prompt,
        temperature: 0.3, // Lower temperature for consistency
        maxTokens: 2000,
      })
      
      // Store in database
      await this.saveAnalysis(wizardData.userId, object)
      
      return object
    } catch (error) {
      console.error('Personality analysis failed:', error)
      return this.getFallbackAnalysis(wizardData)
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
    
    Consider patterns in their responses, contradictions, and what they 
    emphasize versus what they avoid discussing.
    `
  }
  
  private formatAttributes(
    attributes: Record<string, string>, 
    filter: string
  ): string {
    return Object.entries(attributes)
      .filter(([_, value]) => value === filter)
      .map(([key]) => this.humanizeAttribute(key))
      .join(', ')
  }
  
  private humanizeAttribute(key: string): string {
    // Convert snake_case to human readable
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
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
      .eq('is_active', true)
    
    if (error) throw error
  }
  
  private getFallbackAnalysis(data: WizardData): PersonalityAnalysis {
    // Basic heuristic analysis as fallback
    const hasCreativity = data.attributes.creativity === 'have_now'
    const wantLeadership = data.attributes.leadership === 'want_to_develop'
    
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
        preferred: 'balanced',
        tone: 'friendly',
        detailLevel: 'balanced',
      },
      growthAreas: [],
      insights: 'Analysis based on limited data. Complete profile for better insights.',
    }
  }
}
```

### Phase 3: Edge Function Implementation (1.5 hours)

#### 3.1 Vercel Edge Function
**File:** `api/analyze-personality.ts`

```typescript
import { PersonalityService } from '@/services/personalityService'

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East for low latency
}

export default async function handler(request: Request) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')
    const user = await verifyToken(token)
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    // Get wizard data
    const wizardData = await request.json()
    
    // Analyze personality
    const service = new PersonalityService()
    const analysis = await service.analyzeProfile({
      ...wizardData,
      userId: user.id,
    })
    
    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'private, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Personality analysis error:', error)
    return new Response(
      JSON.stringify({ error: 'Analysis failed' }), 
      { status: 500 }
    )
  }
}
```

### Phase 4: Chat AI Integration (2.5 hours)

#### 4.1 AI Chat Service with Personality
**File:** `src/services/aiChatService.ts`

```typescript
import { PersonalityService } from './personalityService'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export class AIChatService {
  private personalityService: PersonalityService
  
  constructor() {
    this.personalityService = new PersonalityService()
  }
  
  async generateResponse(
    userId: string, 
    message: string,
    conversationHistory: Message[]
  ): Promise<ReadableStream> {
    // Fetch user's hidden personality profile
    const personality = await this.getPersonality(userId)
    
    // Build system prompt based on personality
    const systemPrompt = this.buildPersonalityPrompt(personality)
    
    // Stream the response
    const result = await streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message }
      ],
      temperature: 0.7, // Slightly higher for natural conversation
      maxTokens: 1000,
    })
    
    return result.toAIStreamResponse()
  }
  
  private async getPersonality(userId: string) {
    // Fetch from Supabase - cached for performance
    const { data } = await supabase
      .from('future_self_profiles')
      .select('personality_analysis')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    
    return data?.personality_analysis
  }
  
  private buildPersonalityPrompt(personality: PersonalityAnalysis): string {
    const { bigFive, communicationStyle, responseGuidelines } = personality
    
    // Map personality traits to behavior
    const behaviorGuides = []
    
    // Openness affects creativity and abstract thinking
    if (bigFive.openness > 7) {
      behaviorGuides.push('Use creative metaphors and explore innovative ideas')
    } else if (bigFive.openness < 4) {
      behaviorGuides.push('Be practical and focus on concrete, proven solutions')
    }
    
    // Conscientiousness affects structure and detail
    if (bigFive.conscientiousness > 7) {
      behaviorGuides.push('Provide structured, detailed plans with clear steps')
    } else if (bigFive.conscientiousness < 4) {
      behaviorGuides.push('Keep advice flexible and focus on general principles')
    }
    
    // Extraversion affects energy and social focus
    if (bigFive.extraversion > 7) {
      behaviorGuides.push('Be enthusiastic, discuss social aspects and group activities')
    } else if (bigFive.extraversion < 4) {
      behaviorGuides.push('Be calm, focus on individual reflection and solo activities')
    }
    
    // Agreeableness affects warmth and directness
    if (bigFive.agreeableness > 7) {
      behaviorGuides.push('Be warm, supportive, and emphasize collaboration')
    } else if (bigFive.agreeableness < 4) {
      behaviorGuides.push('Be direct, focus on personal achievement and independence')
    }
    
    // Neuroticism affects emotional support needs
    if (bigFive.neuroticism > 7) {
      behaviorGuides.push('Provide reassurance, acknowledge challenges, be patient')
    } else if (bigFive.neuroticism < 4) {
      behaviorGuides.push('Be confident, challenge them to push boundaries')
    }
    
    return `You are the user's future self, 10 years from now. You've achieved their goals and overcome their challenges.

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
4. Speak as their accomplished future self
5. Draw from their wizard responses when relevant`
  }
}
```

#### 4.2 Wizard Completion Hook
**File:** `src/components/wizard/CompletionStep.tsx`

```typescript
// Automatic personality analysis on wizard completion
const handleWizardComplete = async () => {
  try {
    // Show loading state
    setIsAnalyzing(true)
    
    // Trigger personality analysis automatically
    const response = await fetch('/api/analyze-personality', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        attributes: wizardData.attributes,
        currentValues: wizardData.currentValues,
        futureValues: wizardData.futureValues,
        hope: wizardData.hope,
        fear: wizardData.fear,
        feelings: wizardData.feelings,
        dayInLife: wizardData.dayInLife,
      })
    })
    
    if (!response.ok) throw new Error('Analysis failed')
    
    // Don't show results - just confirm completion
    toast.success('Your future self profile is ready!')
    
    // Navigate to chat
    navigate('/chat')
    
  } catch (error) {
    console.error('Personality analysis error:', error)
    // Still allow user to continue even if analysis fails
    toast.info('Profile created! AI personalization will improve over time.')
    navigate('/chat')
  } finally {
    setIsAnalyzing(false)
  }
}
```

### Phase 5: Testing & Optimization (1.5 hours)

#### 5.1 Integration Tests
**File:** `src/services/__tests__/personalityAnalysis.integration.test.ts`

```typescript
describe('Personality Analysis Pipeline - Integration', () => {
  test('complete flow: wizard → analysis → storage → display')
  test('handles various personality types correctly')
  test('produces consistent results for same input')
  test('completes within performance targets')
  test('gracefully degrades without API access')
})
```

#### 5.2 Performance Optimization
```typescript
class PersonalityCache {
  private cache = new Map<string, PersonalityAnalysis>()
  private readonly TTL = 3600000 // 1 hour
  
  async get(userId: string): Promise<PersonalityAnalysis | null> {
    const cached = this.cache.get(userId)
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data
    }
    return null
  }
  
  set(userId: string, analysis: PersonalityAnalysis): void {
    this.cache.set(userId, {
      data: analysis,
      timestamp: Date.now(),
    })
  }
}
```

### Phase 6: Analytics & Monitoring (1 hour)

#### 6.1 Analytics Events
```typescript
const trackPersonalityAnalysis = (analysis: PersonalityAnalysis) => {
  analytics.track('personality_analyzed', {
    bigFive: analysis.bigFive,
    confidence: analysis.confidence.overall,
    motivationsCount: analysis.motivations.length,
    growthAreasCount: analysis.growthAreas.length,
  })
}
```

## Implementation Order

### Day 1 (8 hours)
1. **Hour 1-2:** Set up OpenAI integration and environment
2. **Hour 3-4:** Implement PersonalityService core
3. **Hour 5-6:** Create automatic wizard completion trigger
4. **Hour 7-8:** Build AI chat service with personality integration

### Day 2 (8 hours)
5. **Hour 9-10:** Implement Edge Functions for analysis
6. **Hour 11-12:** Add Supabase storage and retrieval
7. **Hour 13-14:** Integration testing and debugging
8. **Hour 15-16:** Performance optimization and caching

## Technical Specifications

### Environment Variables
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
VERCEL_AI_SDK_VERSION=5.0.0
```

### Database Schema Update
```sql
ALTER TABLE future_self_profiles
ADD COLUMN personality_analysis JSONB,
ADD COLUMN analyzed_at TIMESTAMPTZ;

CREATE INDEX idx_personality_analysis 
ON future_self_profiles((personality_analysis->>'confidence')) 
WHERE personality_analysis IS NOT NULL;
```

### Cost Analysis for 100 Users

#### Personality Analysis Costs (One-time per user)
- **Input:** ~1,500 tokens per analysis × $5/1M = $0.0075
- **Output:** ~800 tokens per response × $15/1M = $0.012
- **Total per analysis:** ~$0.02
- **100 users:** $2.00 total

#### Ongoing Chat Costs (Monthly estimates)
- **Assumptions:** 20 messages/user/month, 500 tokens avg per exchange
- **Input costs:** 100 users × 20 msgs × 500 tokens × $5/1M = $0.50
- **Output costs:** 100 users × 20 msgs × 500 tokens × $15/1M = $1.50
- **Monthly chat costs:** ~$2.00

#### Total Monthly Costs for 100 Users
- **Initial month:** $4.00 (analysis + chat)
- **Subsequent months:** $2.00 (chat only)
- **Annual projection:** ~$26.00

### API Configuration
- **Model:** gpt-4o (latest version)
- **Temperature:** 0.3 for analysis, 0.7 for chat
- **Rate limits:** 10,000 requests/min (more than sufficient)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API costs exceed budget | High | Cache results, batch requests |
| Inconsistent analysis | Medium | Use temperature 0.3, structured outputs |
| Privacy concerns | High | Clear consent, data anonymization |
| API downtime | Medium | Fallback heuristic analysis |
| Token limits exceeded | Low | Truncate input, summarize |

## Monitoring & Metrics

### Key Metrics
- Analysis completion rate (target: >95%)
- Average analysis time (target: <10s)
- Confidence score average (target: >0.7)
- Cost per analysis (target: <$0.05)

### Analytics Events
- `personality_analysis_started`
- `personality_analysis_completed`
- `personality_analysis_failed`
- `personality_insights_viewed`
- `growth_area_engaged`

## Definition of Done

### Code Complete
- [ ] OpenAI GPT-4o integration working
- [ ] Automatic analysis triggers after wizard
- [ ] Personality stored in Supabase
- [ ] AI chat uses personality for responses
- [ ] No personality data visible in UI

### Quality Checks
- [ ] Analysis completes < 10 seconds
- [ ] Personality affects response content
- [ ] Personality affects communication style
- [ ] Consistent personality across sessions
- [ ] Graceful fallback if analysis fails

### Deployment Ready
- [ ] OPENAI_API_KEY configured
- [ ] Supabase schema updated
- [ ] Edge Functions deployed
- [ ] Cost tracking enabled
- [ ] Error logging implemented

## Dependencies
- Plan 1 (Database Migration) complete ✅
- OpenAI API account with GPT-4 access
- Vercel AI SDK installed
- Database schema supports JSONB

## Notes
- Consider A/B testing different analysis prompts
- Monitor which insights users find most valuable
- Consider periodic re-analysis as users evolve
- Explore fine-tuning for better accuracy

## Documentation Sources & References

### Official Documentation
1. **OpenAI GPT-4 Research**  
   https://openai.com/index/gpt-4-research/
   
2. **Vercel AI SDK Introduction**  
   https://ai-sdk.dev/docs/introduction
   
3. **AI SDK Version 5**  
   https://vercel.com/blog/ai-sdk-5
   
4. **Vercel AI SDK GitHub**  
   https://github.com/vercel/ai

### Research Papers
5. **GPT-4 Personality Estimation (2025)**  
   https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1484260/full
   
6. **Big Five Personality Traits**  
   https://en.wikipedia.org/wiki/Big_Five_personality_traits

### Integration Guides
7. **Vercel & OpenAI Integration**  
   https://vercel.com/docs/ai/openai
   
8. **AI SDK with Generative UI**  
   https://vercel.com/blog/ai-sdk-3-generative-ui
   
9. **AI SDK Streaming & Tools**  
   https://vercel.com/blog/ai-sdk-3-4

### Community Resources
10. **AI with Personality - Big Five Prompting**  
    https://medium.com/@damsa.andrei/ai-with-personality-prompting-chatgpt-using-big-five-values-def7f050462a
    
11. **Free Big Five Test Implementation**  
    https://bigfive-test.com/
    
12. **Customizing ChatGPT Personality**  
    https://help.openai.com/en/articles/11899719-customizing-your-chatgpt-personality

### Key Takeaways from Sources
- **GPT-4 Accuracy:** Can assess personality with correlations to self-assessments (Source 5)
- **Model Version:** Use gpt-4o-2024-05-13 for consistency (Source 5)
- **Temperature:** Use 0.3 for personality analysis consistency (Source 10)
- **Structured Outputs:** AI SDK 5 supports type-safe structured outputs (Source 3)
- **Edge Functions:** Vercel Edge runtime ideal for low-latency AI (Source 7)
- **Confidence Scores:** Request on 11-point scale per research (Source 5)

**Last Verified:** January 27, 2025