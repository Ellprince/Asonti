# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Install dependencies
cd "Asonti app" && npm i

# Start frontend dev server (port 3001)
npm run dev

# Start backend Express server (port 3002)  
npm run server

# Start both servers concurrently
npm run dev:all

# Build for production (outputs to build/)
npm run build

# Run tests with Vitest
npm run test

# Run tests with coverage
npm run test:coverage

# Run test UI interface
npm run test:ui
```

## Application Architecture

### Core Stack
- **React 18.3** with TypeScript and Vite
- **Tailwind CSS v4.1.3** for styling with custom design system
- **Radix UI** primitives wrapped in shadcn/ui components
- **Framer Motion** (imported as "motion") for animations
- **Supabase** for authentication, database, and file storage
- **OpenAI GPT-5** for AI chat functionality
- **Express.js** backend server for AI endpoints

### Project Structure
```
Asonti app/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components (51 files)
│   │   ├── wizard/       # Future self creation flow (9 steps)
│   │   └── *Screen.tsx   # Main screen components
│   ├── services/         # Business logic (12 services)
│   ├── contexts/         # React contexts (AuthContext)
│   ├── lib/             # Supabase client setup
│   └── test/            # Test setup with comprehensive mocks
├── supabase/            # Database migrations (20 files)
├── api/                 # Vercel Edge Functions
└── server.js            # Express backend for AI
```

### Key Architectural Patterns

#### Component Organization
1. **Screen Components** (`src/components/*Screen.tsx`)
   - ChatScreen: AI conversation with future self
   - ProfileScreen: Future self profile management  
   - SettingsScreen: User preferences
   - LandingScreen: Auth and onboarding
   - FormerSelfScreen: Past profiles view

2. **Service Layer** (`src/services/`)
   - `aiChatService.ts`: OpenAI integration via Express backend
   - `futureSelfService.ts`: Profile CRUD operations
   - `chatService.ts`: Message persistence
   - `photoUploadService.ts`: Supabase storage integration
   - `replicateService.ts`: Photo aging API
   - `personalityService.ts`: AI personality analysis
   - `profileGuard.ts`: Profile completion enforcement

3. **Data Persistence**
   - **Supabase Database Tables**:
     - `user_profiles`: User account data
     - `future_self_profiles`: Future self configurations
     - `chat_conversations`: Conversation threads
     - `chat_messages`: Individual messages
     - `user_settings`: App preferences
   - **Row Level Security**: All tables have RLS policies
   - **Auto-refresh tokens**: Handled by Supabase client

#### Responsive Design
- **Mobile** (<768px): Bottom navigation bar
- **Tablet** (768px-1024px): Header navigation
- **Desktop** (>1024px): Left sidebar
- Controlled via Tailwind classes: `md:hidden`, `lg:block`, etc.

### Future Self Wizard Flow
The wizard (`src/components/wizard/FutureSelfWizard.tsx`) has 7 steps:
1. **PhotoUploadStep**: Avatar upload or selection
2. **AttributesStep**: Personal trait categorization
3. **HopesFearsStep**: Aspirations and concerns
4. **ValuesStep**: Current vs future values ranking
5. **FeelingsStep**: Emotional state description
6. **DayInLifeStep**: Future daily routine vision
7. **CompletionStep**: Profile generation with AI analysis

### Testing Setup
- **Framework**: Vitest with jsdom environment
- **Test Files**: `*.test.tsx` files throughout codebase
- **Setup**: `src/test/setup.ts` with mocked Supabase client
- **Coverage**: Text, JSON, and HTML reporting configured

### Environment Variables
Required in `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
REPLICATE_API_TOKEN=your_replicate_token
```

### Brand Guidelines
- **Brand Name**: Always "ASONTI AI" (uppercase)
- **Tagline**: "Meet your future self. Become who you're meant to be"
- **Primary Color**: `#3B82F6` (blue-600)
- **Accent Color**: `#FB923C` (orange-400)

### Important Implementation Notes
- **Authentication**: Supabase Auth with email/password
- **File Uploads**: Use Supabase Storage buckets
- **AI Responses**: GPT-5 via Express server endpoint `/api/chat`
- **Photo Aging**: Replicate API for 2-year transformation
- **Error Handling**: All services return typed error responses
- **Data Migration**: Completed from localStorage to Supabase (see `/plans/completed/`)