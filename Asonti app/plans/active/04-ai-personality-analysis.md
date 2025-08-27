# Plan 04: AI Personality Analysis

## Overview
**Status:** Active  
**Priority:** Medium  
**Duration:** 1 day (8 hours)  
**Dependencies:** Plan 1 (Database Migration)  
**Created:** 2025-01-27  

## Objective
Analyze user responses from the Future Self Wizard using GPT-4 to determine personality traits based on the Big Five (OCEAN) model, providing deep insights for personalized AI interactions.

## Context
Users provide rich data through the wizard (attributes, values, hopes, fears, feelings). By analyzing these responses with GPT-4, we can:
- Determine Big Five personality traits (OCEAN)
- Identify core motivations and drivers
- Understand communication preferences
- Suggest growth areas and strategies
- Create a more personalized AI future self

This analysis will be stored with the profile and used to contextualize all AI interactions.

## Documentation Research Findings (2024-2025)

### GPT-4 Personality Analysis Research
- **Recent Study:** February 2025 Frontiers in AI study shows GPT-4 can assess personality traits from written text
- **Model Used:** gpt-4o-2024-05-13 via OpenAI Python package
- **Approach:** Request numerical predictions on 11-point scales with confidence scores
- **Accuracy:** Correlations found between GPT-4 predictions and self-assessments

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
- [ ] Analyze wizard responses to determine Big Five traits
- [ ] Generate personality scores on 1-10 scale
- [ ] Provide confidence scores for predictions
- [ ] Store analysis in database with profile
- [ ] Complete analysis within 10 seconds
- [ ] 100% test coverage for analysis pipeline

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

### Phase 2: Implement Personality Service (2 hours)

#### 2.1 Core Service Implementation
**File:** `src/services/personalityService.ts`

```typescript
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

// Schema for personality analysis
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
  insights: z.string(),
})

type PersonalityAnalysis = z.infer<typeof personalitySchema>

class PersonalityService {
  private readonly model = 'gpt-4o-2024-05-13'
  
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

### Phase 4: UI Integration (1.5 hours)

#### 4.1 Profile Screen Enhancement
**File:** `src/components/ProfileScreen.tsx`

```typescript
const PersonalityInsights = ({ analysis }: { analysis: PersonalityAnalysis }) => {
  const radarData = [
    { trait: 'Openness', value: analysis.bigFive.openness },
    { trait: 'Conscientiousness', value: analysis.bigFive.conscientiousness },
    { trait: 'Extraversion', value: analysis.bigFive.extraversion },
    { trait: 'Agreeableness', value: analysis.bigFive.agreeableness },
    { trait: 'Neuroticism', value: analysis.bigFive.neuroticism },
  ]
  
  return (
    <Card>
      <CardHeader>
        <h3>Your Personality Profile</h3>
        <Badge variant="secondary">
          {Math.round(analysis.confidence.overall * 100)}% Confidence
        </Badge>
      </CardHeader>
      <CardContent>
        {/* Radar Chart for Big Five */}
        <RadarChart data={radarData} />
        
        {/* Core Motivations */}
        <div className="mt-6">
          <h4>Core Motivations</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {analysis.motivations.map(motivation => (
              <Badge key={motivation} variant="outline">
                {motivation}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Communication Style */}
        <div className="mt-6">
          <h4>Communication Preferences</h4>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div>
              <Label>Style</Label>
              <p className="text-sm">{analysis.communicationStyle.preferred}</p>
            </div>
            <div>
              <Label>Tone</Label>
              <p className="text-sm">{analysis.communicationStyle.tone}</p>
            </div>
            <div>
              <Label>Detail</Label>
              <p className="text-sm">{analysis.communicationStyle.detailLevel}</p>
            </div>
          </div>
        </div>
        
        {/* Growth Areas */}
        <div className="mt-6">
          <h4>Growth Opportunities</h4>
          {analysis.growthAreas.map(area => (
            <div key={area.area} className="mt-3 p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">{area.area}</span>
                <Progress value={area.currentLevel * 10} className="w-24" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {area.strategy}
              </p>
            </div>
          ))}
        </div>
        
        {/* Key Insights */}
        <Alert className="mt-6">
          <Brain className="h-4 w-4" />
          <AlertTitle>Key Insights</AlertTitle>
          <AlertDescription>{analysis.insights}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
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

1. **Hour 1-2:** Write all service tests
2. **Hour 3-4:** Implement PersonalityService
3. **Hour 5:** Create Edge Function
4. **Hour 6:** UI integration
5. **Hour 7:** Integration testing
6. **Hour 8:** Optimization and monitoring

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

### API Rate Limits
- OpenAI: 10,000 requests per minute (GPT-4)
- Cost: ~$0.03 per analysis (1000 tokens in, 500 out)
- Implement queuing for batch processing

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
- [ ] All service tests passing
- [ ] Edge Function deployed
- [ ] UI displays insights
- [ ] Integration tests passing
- [ ] Caching implemented

### Quality Checks
- [ ] Analysis under 10 seconds
- [ ] Structured outputs valid
- [ ] Error handling robust
- [ ] Costs within budget

### Deployment Ready
- [ ] API keys configured
- [ ] Database schema updated
- [ ] Monitoring in place
- [ ] Documentation complete

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