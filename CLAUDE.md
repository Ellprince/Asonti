# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Install dependencies
cd "Asonti app" && npm i

# Start development server (opens on port 3000)
npm run dev

# Build for production (outputs to build/ directory)
npm run build
```

## Application Architecture

### Core Stack
- **React 18.3** with TypeScript and Vite
- **Tailwind CSS** for styling with custom design system
- **Radix UI** primitives wrapped in shadcn/ui components
- **Framer Motion** for animations
- **Local Storage** for all data persistence (no backend)

### Key Architectural Patterns

#### Component Organization
The app follows a feature-based structure with three main component categories:

1. **Screen Components** (`src/components/*Screen.tsx`)
   - ChatScreen: AI conversation interface with future self
   - ProfileScreen: Manages future self profiles
   - SettingsScreen: App preferences and data management
   - LandingScreen: Authentication and onboarding

2. **UI Components** (`src/components/ui/`)
   - shadcn/ui components with Radix UI primitives
   - Styled with Tailwind classes and CSS variables
   - All components use compound patterns for flexibility

3. **Wizard Components** (`src/components/wizard/`)
   - Multi-step future self creation flow
   - Each step is a separate component with shared state management

#### State Management
- **Local Component State**: useState for UI state
- **LocalStorage Hook**: Custom `useLocalStorage` wrapper at `src/components/hooks/useLocalStorage.ts`
- **Storage Keys**:
  - `user-registration`: User authentication data
  - `future-self-data`: Future self profile
  - `future-self-wizard`: Wizard progress
  - `chat-messages`: Conversation history
  - `app-settings`: User preferences

#### Responsive Design Architecture
The app uses three distinct navigation patterns based on screen size:
- **Mobile** (<768px): Bottom navigation bar
- **Tablet** (768px-1024px): Header navigation
- **Desktop** (>1024px): Left sidebar

This is controlled in `App.tsx` using Tailwind breakpoint classes:
- `md:hidden` / `md:block` for tablet boundaries
- `lg:hidden` / `lg:block` for desktop boundaries

## Brand Guidelines

### ASONTI AI Brand Identity
- **Brand Name**: Always use "ASONTI AI" (uppercase)
- **Primary Tagline**: "Meet your future self. Become who you're meant to be"
- **Logo**: 12-dot circular pattern with gradient from navy (#1E3A8A) to light slate (#E2E8F0)

### Color System
```css
/* Primary */
--primary: #3B82F6 (blue-600)
--primary-hover: #2563EB (blue-700)

/* Secondary */
--accent: #FB923C (orange-400)
--gold: #E3AF64

/* Backgrounds */
--background: #DFE6FF
--card: #FFFFFF
```

### Component Conventions
- **Buttons**: 44px height (mobile-first), 12px radius, font-weight 500
- **Cards**: White background, gray-100 border, 12px radius, 24px padding
- **Icons**: 48px containers with 24px icons, colored backgrounds
- **Typography**: System font stack, 500 weight for headings, 1.6 line-height for body

## Important Implementation Details

### Future Self Wizard Flow
The wizard (`FutureSelfWizard.tsx`) manages a 7-step process:
1. PhotoUploadStep: Avatar selection/upload
2. AttributesStep: Personal traits categorization  
3. HopesFearsStep: Aspirations and concerns
4. ValuesStep: Current vs future values
5. FeelingsStep: Emotional state description
6. DayInLifeStep: Future daily routine vision
7. CompletionStep: Profile generation

State persists to localStorage at each step for recovery.

### Chat AI Integration
The `ChatScreen.tsx` component:
- Displays conversation with simulated future self
- Uses stored future self profile to contextualize responses
- Currently shows placeholder responses (ready for AI integration)
- Maintains full conversation history in localStorage

### Data Management
- **Clear All Data**: Keyboard shortcut Ctrl+Shift+Delete (or Cmd on Mac)
- **Logout**: Preserves profile/settings, only clears authentication
- **Storage Limits**: Monitor with `storage.checkStorageUsage()` utility

## Testing Approach
Currently no automated tests are configured. When implementing tests:
- Check for test scripts in package.json before assuming test framework
- Use the development server (`npm run dev`) for manual testing
- Build verification with `npm run build` ensures no TypeScript/build errors

## Deployment Assessment

### Current State
ASONTI is currently a frontend-only React application with simulated functionality. The application has a solid UI foundation but lacks all server-side components necessary for a functional SaaS product.

### Missing Backend Infrastructure

#### Required API Server
- Node.js/Express or Python/FastAPI server
- RESTful or GraphQL API endpoints
- Request validation and error handling
- Rate limiting and API security
- CORS configuration

#### Required Database System
- PostgreSQL or MongoDB database
- User data schema design
- Future self profiles storage
- Chat history persistence
- Database migrations system

#### Required Authentication System
- JWT or session-based authentication
- OAuth integration (Google, Apple, etc.)
- Password hashing (bcrypt/argon2)
- Email verification system
- Password reset functionality

### Missing AI Integration

#### LLM Service Options
1. **OpenAI API** (GPT-4/GPT-3.5): Best quality, ~$0.01-0.03 per 1K tokens
2. **Anthropic Claude API**: Strong safety features, similar pricing
3. **Open-source Models** (Llama, Mistral): Self-hosted, requires GPU infrastructure

#### Required AI Implementation
- Prompt engineering for future self persona
- Context management system
- Conversation memory/history
- Token usage optimization
- Response streaming
- Content moderation

### Deployment Requirements

#### Infrastructure Setup
- Environment variables management
- CI/CD pipeline (GitHub Actions)
- SSL certificates and domain configuration
- CDN setup for assets
- Monitoring & logging (Sentry, DataDog)
- Analytics (Google Analytics, Mixpanel)

#### Hosting Options for MVP
- **Frontend:** Vercel/Netlify ($20/month)
- **Backend:** Railway/Render ($25-50/month)
- **Database:** Supabase/Neon ($25/month)
- **Total:** ~$70-100/month

#### Additional Services
- Email service (SendGrid/Postmark): $10-30/month
- File storage (AWS S3/Cloudinary): $5-20/month
- Payment system (Stripe/Paddle): If monetizing

### Development Timeline

#### Phase 1: Backend Foundation (4-5 weeks)
- Set up API server and database
- Implement authentication system
- Build core API endpoints
- Set up development/staging environments

#### Phase 2: AI Integration (2-3 weeks)
- Integrate LLM service
- Implement prompt engineering
- Build conversation management
- Test and optimize responses

#### Phase 3: Production Preparation (2-3 weeks)
- Security audit and fixes
- Performance optimization
- Set up monitoring and analytics
- Deploy to production environment

### Recommended Technology Stack
```javascript
{
  "runtime": "Node.js 20 LTS",
  "framework": "Express.js or Fastify",
  "database": "PostgreSQL with Prisma ORM",
  "authentication": "Auth0 or Supabase Auth",
  "ai": "OpenAI API (start) → Self-hosted (scale)",
  "hosting": "Vercel (frontend) + Railway (backend)",
  "monitoring": "Sentry + PostHog"
}
```

### MVP Feature Prioritization

#### Essential for Launch
1. User registration/login
2. Future self wizard completion
3. AI-powered chat (basic)
4. Profile persistence
5. Basic settings

#### Defer to Version 2
1. Social features
2. Advanced analytics
3. Mobile apps
4. Voice interaction
5. Video avatars

### Cost Estimates

#### Development
- **Solo Developer:** 10-12 weeks full-time
- **Small Team (2-3 devs):** 4-6 weeks
- **Outsourced:** $15,000 - $40,000

#### Monthly Operations (Post-Launch)
- **Minimal (100 users):** $150-200/month
- **Growth (1,000 users):** $500-800/month
- **Scale (10,000 users):** $2,000-5,000/month