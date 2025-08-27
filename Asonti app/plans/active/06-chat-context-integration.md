# Plan 6: Chat Context Integration with OpenAI

## Overview
Integrate OpenAI API to create an AI-powered future self that maintains conversation memory across sessions, adapts seamlessly to profile updates, and provides personalized responses based on the user's complete profile data.

## Current State Analysis

### What Exists
- ✅ ChatScreen component with message display and input
- ✅ localStorage for message persistence
- ✅ Basic profile data loading (photo only)
- ✅ Complete profile data structure in ProfileScreen
- ✅ Mock AI responses with placeholder text

### What's Missing
- ❌ OpenAI API integration
- ❌ Full profile context loading in chat
- ❌ Conversation memory system
- ❌ Profile-aware prompt engineering
- ❌ Secure API key management
- ❌ Token usage optimization
- ❌ Error handling for API failures
- ❌ Response streaming for better UX

## Technical Architecture

### 1. Context Management System

```typescript
interface ChatContext {
  // User Profile Context
  profile: {
    attributes: Record<string, 'have_now' | 'want_to_develop' | 'not_me'>;
    currentValues: string[];
    futureValues: string[];
    hope: string;
    fear: string;
    feelings: string;
    dayInLife: string;
    createdAt: string;
    lastUpdated: string;
  };
  
  // Conversation Memory
  memory: {
    recentMessages: Message[]; // Last 20 messages
    conversationSummary: string; // AI-generated summary of older messages
    keyTopics: string[]; // Important topics discussed
    emotionalTone: 'positive' | 'neutral' | 'concerned' | 'excited';
    lastInteraction: Date;
  };
  
  // Session Metadata
  session: {
    userId: string;
    sessionId: string;
    startTime: Date;
    messageCount: number;
  };
}
```

### 2. Conversation Memory Implementation

```typescript
class ConversationMemory {
  private maxRecentMessages = 20;
  private summaryThreshold = 50; // Summarize after 50 messages
  
  async updateMemory(messages: Message[]): Promise<void> {
    // Keep recent messages in full
    const recent = messages.slice(-this.maxRecentMessages);
    
    // Summarize older messages if needed
    if (messages.length > this.summaryThreshold) {
      const older = messages.slice(0, -this.maxRecentMessages);
      const summary = await this.generateSummary(older);
      // Store summary separately
    }
  }
  
  async generateSummary(messages: Message[]): Promise<string> {
    // Use OpenAI to create concise summary
    // Focus on key decisions, emotions, and progress
  }
}
```

### 3. OpenAI Integration Layer

```typescript
interface AIService {
  async generateResponse(
    message: string,
    context: ChatContext
  ): Promise<{
    response: string;
    tokensUsed: number;
    emotionalTone: string;
  }>;
  
  async streamResponse(
    message: string,
    context: ChatContext,
    onChunk: (chunk: string) => void
  ): Promise<void>;
}
```

## Implementation Plan

### Phase 1: Backend API Setup (Week 1)

#### 1.1 Create API Endpoints
```typescript
// /api/chat/message
POST /api/chat/message
Body: {
  message: string;
  userId: string;
  sessionId: string;
}
Response: {
  response: string;
  tokensUsed: number;
  conversationId: string;
}

// /api/chat/history
GET /api/chat/history/:userId
Response: {
  messages: Message[];
  summary: string;
  lastInteraction: Date;
}
```

#### 1.2 OpenAI Service Configuration
```typescript
// server/services/openai.service.ts
class OpenAIService {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  async generateFutureSelfResponse(
    userMessage: string,
    profile: UserProfile,
    conversationHistory: Message[]
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(profile);
    const messages = this.formatMessages(conversationHistory, userMessage);
    
    const completion = await this.client.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: false
    });
    
    return completion.choices[0].message.content;
  }
}
```

### Phase 2: Prompt Engineering (Week 1-2)

#### 2.1 System Prompt Template
```typescript
function buildSystemPrompt(profile: UserProfile): string {
  return `You are the future version of the user, 10 years from now. You have successfully developed and embodied their aspirational values and overcome their fears. Your personality reflects their achieved growth.

CURRENT SELF PROFILE:
- Current Values: ${profile.currentValues.join(', ')}
- Aspirational Values: ${profile.futureValues.join(', ')}
- Current Strengths: ${formatStrengths(profile.attributes, 'have_now')}
- Developing Strengths: ${formatStrengths(profile.attributes, 'want_to_develop')}
- Hope: ${profile.hope}
- Fear to Overcome: ${profile.fear}
- Current Feelings: ${profile.feelings}
- Vision of Future Life: ${profile.dayInLife}

YOUR ROLE AS THEIR FUTURE SELF:
1. Embody the successful integration of their aspirational values naturally
2. Show wisdom gained from overcoming their stated fear
3. Reflect the strengths they wanted to develop as natural parts of your personality
4. Reference your "past" (their present) with compassion and understanding
5. Guide without preaching - you've been where they are
6. Share insights as lived experience, not advice
7. Maintain consistency with their vision of their future day-in-life

CONVERSATION STYLE:
- Speak as "I" when referring to yourself (their future)
- Use "you" when addressing them (your past self)
- Reference shared memories and experiences naturally
- Show emotional intelligence and growth
- Be encouraging but realistic
- Demonstrate the wisdom of hindsight

Remember: You ARE them, just further along the journey.`;
}
```

#### 2.2 Dynamic Context Injection
```typescript
function injectRecentContext(
  systemPrompt: string,
  memory: ConversationMemory
): string {
  const contextAddendum = `
RECENT CONVERSATION CONTEXT:
- Key topics discussed: ${memory.keyTopics.join(', ')}
- Current emotional tone: ${memory.emotionalTone}
- Conversation summary: ${memory.conversationSummary}

Continue building on these themes naturally.`;
  
  return systemPrompt + contextAddendum;
}
```

### Phase 3: Frontend Integration (Week 2)

#### 3.1 Update ChatScreen Component
```typescript
// src/components/ChatScreen.tsx
export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load full profile data
  useEffect(() => {
    const profile = storage.getItem('future-self-data');
    const chatHistory = storage.getItem('chat-messages');
    const memory = storage.getItem('chat-memory');
    
    if (profile) {
      setContext({
        profile: extractProfileData(profile),
        memory: memory || createNewMemory(),
        session: createSession()
      });
    }
  }, []);
  
  // Send message with context
  const sendMessage = async (text: string) => {
    if (!context) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: context,
          userId: getUserId(),
          sessionId: context.session.sessionId
        })
      });
      
      const data = await response.json();
      
      // Update messages and memory
      const aiMessage: Message = {
        id: Date.now().toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
        tokensUsed: data.tokensUsed
      };
      
      setMessages(prev => [...prev, aiMessage]);
      updateConversationMemory(messages, aiMessage);
      
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };
}
```

#### 3.2 Create Context Hook
```typescript
// src/hooks/useChatContext.ts
export function useChatContext() {
  const [context, setContext] = useState<ChatContext | null>(null);
  
  const loadContext = useCallback(async () => {
    const profile = await loadUserProfile();
    const memory = await loadConversationMemory();
    
    setContext({
      profile,
      memory,
      session: createNewSession()
    });
  }, []);
  
  const updateProfileContext = useCallback((newProfile: UserProfile) => {
    setContext(prev => ({
      ...prev,
      profile: newProfile
    }));
  }, []);
  
  return { context, loadContext, updateProfileContext };
}
```

### Phase 4: Memory & Persistence (Week 2-3)

#### 4.1 Conversation Memory Manager
```typescript
// src/services/conversationMemory.ts
class ConversationMemoryManager {
  private readonly MAX_STORED_MESSAGES = 100;
  private readonly SUMMARY_INTERVAL = 50;
  
  async saveConversation(
    userId: string,
    messages: Message[],
    summary?: string
  ): Promise<void> {
    // Store in database (when backend ready)
    // Fallback to localStorage for MVP
    const memoryData = {
      messages: messages.slice(-this.MAX_STORED_MESSAGES),
      summary: summary || await this.generateSummary(messages),
      lastUpdated: new Date().toISOString(),
      keyTopics: this.extractKeyTopics(messages)
    };
    
    storage.setItem(`chat-memory-${userId}`, memoryData);
  }
  
  private async generateSummary(messages: Message[]): Promise<string> {
    if (messages.length < this.SUMMARY_INTERVAL) {
      return '';
    }
    
    // Call OpenAI to summarize conversation
    const summaryPrompt = `Summarize this conversation between a person and their future self, focusing on key insights, progress, and emotional themes...`;
    
    return await this.callOpenAI(summaryPrompt, messages);
  }
  
  private extractKeyTopics(messages: Message[]): string[] {
    // Extract recurring themes, important decisions, etc.
    // Can use NLP or simple keyword extraction
    return [];
  }
}
```

#### 4.2 Profile Change Adaptation
```typescript
// src/services/profileAdapter.ts
class ProfileAdapter {
  async handleProfileUpdate(
    oldProfile: UserProfile,
    newProfile: UserProfile,
    existingMemory: ConversationMemory
  ): Promise<ConversationMemory> {
    // Identify what changed
    const changes = this.detectChanges(oldProfile, newProfile);
    
    // Update memory context without losing history
    const updatedMemory = {
      ...existingMemory,
      profileVersion: newProfile.version,
      profileChanges: changes,
      adaptationNote: this.generateAdaptationNote(changes)
    };
    
    return updatedMemory;
  }
  
  private generateAdaptationNote(changes: ProfileChanges): string {
    // Create a note for the AI about profile changes
    return `Profile updated: ${changes.summary}. Adapt personality naturally while maintaining conversation continuity.`;
  }
}
```

### Phase 5: Security & Optimization (Week 3)

#### 5.1 Security Implementation
```typescript
// server/middleware/security.ts
class SecurityMiddleware {
  // Rate limiting per user
  rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each user to 50 requests per windowMs
    keyGenerator: (req) => req.userId
  });
  
  // Input sanitization
  sanitizeInput(message: string): string {
    // Remove potential injection attempts
    // Limit message length
    // Filter inappropriate content
    return sanitize(message);
  }
  
  // User isolation
  async validateUserContext(
    userId: string,
    sessionId: string,
    context: ChatContext
  ): boolean {
    // Ensure context belongs to user
    // Validate session
    // Check for cross-contamination
    return true;
  }
}
```

#### 5.2 Token Optimization
```typescript
// src/services/tokenOptimizer.ts
class TokenOptimizer {
  private readonly MAX_CONTEXT_TOKENS = 3000;
  private readonly MAX_RESPONSE_TOKENS = 500;
  
  optimizeContext(
    profile: UserProfile,
    messages: Message[]
  ): OptimizedContext {
    // Compress profile to essential elements
    const compressedProfile = this.compressProfile(profile);
    
    // Select most relevant recent messages
    const relevantMessages = this.selectRelevantMessages(messages);
    
    // Estimate token count
    const tokenCount = this.estimateTokens(compressedProfile, relevantMessages);
    
    if (tokenCount > this.MAX_CONTEXT_TOKENS) {
      // Further compression needed
      return this.aggressiveCompress(compressedProfile, relevantMessages);
    }
    
    return { profile: compressedProfile, messages: relevantMessages };
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
// tests/chatContext.test.ts
describe('ChatContext Integration', () => {
  test('should load full profile into context', async () => {
    const profile = mockProfile();
    const context = await loadChatContext(profile);
    
    expect(context.profile).toContainAllKeys([
      'attributes', 'currentValues', 'futureValues',
      'hope', 'fear', 'feelings', 'dayInLife'
    ]);
  });
  
  test('should maintain conversation memory across sessions', async () => {
    const messages = generateMockConversation(30);
    await saveConversationMemory(userId, messages);
    
    const restored = await loadConversationMemory(userId);
    expect(restored.messages).toHaveLength(20); // Recent messages
    expect(restored.summary).toBeDefined(); // Older messages summarized
  });
  
  test('should adapt to profile changes seamlessly', async () => {
    const oldProfile = mockProfile();
    const newProfile = { ...oldProfile, futureValues: ['growth', 'wisdom'] };
    
    const adapted = await adaptToProfileChange(oldProfile, newProfile);
    expect(adapted.profileVersion).toBe(newProfile.version);
    expect(adapted.adaptationNote).toContain('Profile updated');
  });
});
```

### Integration Tests
```typescript
describe('OpenAI Integration', () => {
  test('should generate contextual response', async () => {
    const message = "I'm struggling with my fear of failure";
    const profile = { fear: "Not achieving my potential" };
    
    const response = await generateAIResponse(message, profile);
    
    expect(response).toContain(['overcome', 'potential', 'growth']);
    expect(response.tokensUsed).toBeLessThan(600);
  });
});
```

## Environment Configuration

### Development (.env.local)
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Memory Management
MAX_STORED_MESSAGES=100
SUMMARY_THRESHOLD=50
MAX_CONTEXT_TOKENS=3000
```

### Production Considerations
```env
# Use environment variables from hosting platform
# Implement key rotation
# Enable monitoring and alerting
# Set up fallback models
```

## Migration Strategy

### Phase 1: Local Development
1. Implement API integration with mocked responses
2. Test context loading and memory management
3. Validate security measures

### Phase 2: Staging Environment
1. Connect to OpenAI with test API key
2. Limited beta testing with controlled users
3. Monitor token usage and costs

### Phase 3: Production Release
1. Gradual rollout with feature flags
2. Monitor performance and user feedback
3. Optimize based on usage patterns

## Success Metrics

### Technical Metrics
- API response time < 2 seconds
- Token usage per conversation < 5000
- Memory retrieval time < 100ms
- Zero cross-user data contamination

### User Experience Metrics
- Conversation relevance score > 85%
- Profile reflection accuracy > 90%
- User satisfaction rating > 4.5/5
- Conversation continuity maintained across sessions

## Risk Mitigation

### API Failures
- Fallback to cached responses
- Graceful degradation to simpler responses
- User notification of temporary limitations

### Data Privacy
- Encrypt sensitive profile data
- Regular security audits
- GDPR compliance measures
- User data deletion capability

### Cost Management
- Token usage monitoring
- Daily/monthly limits per user
- Tiered usage plans
- Caching frequent responses

## Next Steps

1. **Immediate Actions**
   - Set up OpenAI API account
   - Create backend API structure
   - Implement basic context loading

2. **Week 1 Goals**
   - Complete API integration
   - Basic prompt engineering
   - Memory system foundation

3. **Week 2 Goals**
   - Frontend integration
   - Testing suite setup
   - Security implementation

4. **Week 3 Goals**
   - Performance optimization
   - Production preparation
   - Documentation completion

## Dependencies

### Required Before Starting
- ✅ Completed user profile (Plans 1-5)
- ✅ Authentication system
- ✅ Backend API server
- ⏳ Database for conversation storage
- ⏳ OpenAI API access

### External Services
- OpenAI API (GPT-4 Turbo)
- Redis for caching (optional)
- Monitoring service (Sentry/DataDog)

## Documentation Requirements

### API Documentation
- Endpoint specifications
- Authentication flow
- Error handling guide
- Rate limiting details

### Developer Guide
- Context management patterns
- Memory optimization techniques
- Security best practices
- Testing procedures

### User Documentation
- How conversation memory works
- Privacy and data handling
- Profile update impacts
- Troubleshooting guide

## External Documentation & Resources (2025)

### OpenAI API Documentation
- **Official API Reference**: https://platform.openai.com/docs/api-reference/chat
- **Chat Completions Guide**: https://platform.openai.com/docs/guides/chat-completions
- **GPT-4.1 Series** (2025): Supports up to 1M tokens context window
- **GPT-5 Series** (2025): Available in three sizes (gpt-5, gpt-5-mini, gpt-5-nano)
  - Pricing: $1.25/1M input, $10/1M output tokens (GPT-5)
  - Mini: $0.25/1M input, $2/1M output tokens
  - Nano: $0.05/1M input, $0.40/1M output tokens

### Conversation Memory Best Practices
- **Message Trimming**: https://www.vellum.ai/blog/how-should-i-manage-memory-for-my-llm-chatbot
- **LangChain Memory**: https://python.langchain.com/docs/how_to/chatbots_memory/
- **LangGraph Memory** (Recommended for 2025): https://langchain-ai.github.io/langgraph/concepts/memory/
- **Pinecone Conversational Memory**: https://www.pinecone.io/learn/series/langchain/langchain-conversational-memory/
- **Long-term Memory in LLMs**: https://langchain-ai.github.io/langmem/concepts/conceptual_guide/

### Security & Privacy Guidelines
- **Chatbot Security Guide 2025**: https://botpress.com/blog/chatbot-security
- **AI Chatbot Privacy Best Practices**: https://dialzara.com/blog/ai-chatbot-privacy-data-security-best-practices
- **CISA AI Security Guidelines**: https://www.cisa.gov/news-events/alerts/2025/05/22/new-best-practices-guide-securing-ai-data-released
- **Data Privacy in AI**: https://community.trustcloud.ai/docs/grc-launchpad/grc-101/governance/data-privacy-and-ai-ethical-considerations-and-best-practices/

### Key 2025 Updates & Considerations
1. **Extended Context Windows**: GPT-4.1 supports 1M tokens (up from 128K)
2. **Hybrid Memory Approaches**: Combine "hot path" and "subconscious" memory formation
3. **Security Focus**: Implement end-to-end encryption, RBAC, and 2FA
4. **Token Optimization**: Critical for managing costs with longer contexts
5. **Hallucination Mitigation**: Long contexts increase hallucination risk (GPT-3.5-turbo-16k: 2.1% accuracy on adversarial questions)
6. **Modern Frameworks**: Use LangGraph over older ConversationBufferMemory approaches
7. **RAG Integration**: Effective for managing extensive conversation histories