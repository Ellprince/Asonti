-- ============================================
-- ASONTI DATABASE SCHEMA
-- ============================================
-- This script sets up all tables, relationships, and security policies
-- for the Asonti MVP application
--
-- Run this in Supabase SQL Editor:
-- 1. Go to SQL Editor in Supabase Dashboard
-- 2. Create New Query
-- 3. Paste this entire file
-- 4. Run

-- ============================================
-- CLEANUP (Optional - remove if keeping existing data)
-- ============================================
-- Uncomment these lines if you want to start fresh:
-- DROP TABLE IF EXISTS chat_messages CASCADE;
-- DROP TABLE IF EXISTS chat_conversations CASCADE;
-- DROP TABLE IF EXISTS future_self_profiles CASCADE;
-- DROP TABLE IF EXISTS user_profiles CASCADE;
-- DROP TABLE IF EXISTS user_settings CASCADE;

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for AI embeddings (future use)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- USER PROFILES TABLE
-- ============================================
-- Extends Supabase Auth with additional user data
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUTURE SELF PROFILES TABLE
-- ============================================
-- Stores the future self wizard data
CREATE TABLE IF NOT EXISTS future_self_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Photo/Avatar
    photo_url TEXT,
    photo_type TEXT, -- 'upload', 'simulated', 'default'
    
    -- Attributes (JSON object with trait mappings)
    attributes JSONB DEFAULT '{}',
    
    -- Hopes and Fears
    hope TEXT,
    fear TEXT,
    
    -- Values
    current_values TEXT[] DEFAULT '{}',
    future_values TEXT[] DEFAULT '{}',
    
    -- Feelings and Day in Life
    feelings TEXT,
    day_in_life TEXT,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Ensure one active profile per user
    CONSTRAINT one_active_profile_per_user UNIQUE (user_id, is_active)
);

-- Index for faster queries
CREATE INDEX idx_future_self_profiles_user_id ON future_self_profiles(user_id);
CREATE INDEX idx_future_self_profiles_active ON future_self_profiles(user_id, is_active) WHERE is_active = TRUE;

-- ============================================
-- CHAT CONVERSATIONS TABLE
-- ============================================
-- Groups chat messages into conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    future_self_profile_id UUID REFERENCES future_self_profiles(id) ON DELETE SET NULL,
    title TEXT,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    message_count INTEGER DEFAULT 0
);

-- Index for faster queries
CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_last_message ON chat_conversations(user_id, last_message_at DESC);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
-- Stores individual chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT NOT NULL,
    is_user BOOLEAN NOT NULL, -- true = user message, false = AI response
    
    -- AI-specific fields
    model_used TEXT, -- 'gpt-4', 'claude', etc.
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- Indexes for faster queries
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);

-- ============================================
-- USER SETTINGS TABLE
-- ============================================
-- Stores user preferences and settings
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- App Settings
    dark_mode BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    
    -- Privacy Settings
    data_sharing BOOLEAN DEFAULT FALSE,
    analytics_enabled BOOLEAN DEFAULT TRUE,
    
    -- AI Settings
    ai_model_preference TEXT DEFAULT 'gpt-4',
    response_style TEXT DEFAULT 'balanced', -- 'concise', 'balanced', 'detailed'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_self_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY POLICIES
-- ============================================

-- User Profiles Policies
CREATE POLICY "Users can view own profile" 
    ON user_profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON user_profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Future Self Profiles Policies
CREATE POLICY "Users can view own future self profiles" 
    ON future_self_profiles FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create future self profiles" 
    ON future_self_profiles FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own future self profiles" 
    ON future_self_profiles FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own future self profiles" 
    ON future_self_profiles FOR DELETE 
    USING (auth.uid() = user_id);

-- Chat Conversations Policies
CREATE POLICY "Users can view own conversations" 
    ON chat_conversations FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" 
    ON chat_conversations FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" 
    ON chat_conversations FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" 
    ON chat_conversations FOR DELETE 
    USING (auth.uid() = user_id);

-- Chat Messages Policies
CREATE POLICY "Users can view own messages" 
    ON chat_messages FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages" 
    ON chat_messages FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages" 
    ON chat_messages FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete own messages" 
    ON chat_messages FOR UPDATE 
    USING (auth.uid() = user_id AND deleted_at IS NULL);

-- User Settings Policies
CREATE POLICY "Users can view own settings" 
    ON user_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
    ON user_settings FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings" 
    ON user_settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_future_self_profiles_updated_at BEFORE UPDATE ON future_self_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );
    
    -- Also create default settings
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update conversation message count and last message time
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_conversations
        SET message_count = message_count + 1,
            last_message_at = NEW.created_at
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update conversation stats
CREATE TRIGGER update_conversation_stats_trigger
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();

-- ============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- ============================================
-- Note: Storage buckets need to be created via Supabase Dashboard or API
-- Go to Storage section and create:
-- 1. Bucket name: 'avatars' (public)
-- 2. Bucket name: 'future-self-photos' (public)

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment to add test data after creating a test user:
/*
-- Sample future self profile
INSERT INTO future_self_profiles (user_id, attributes, hope, fear, current_values, future_values)
VALUES (
    auth.uid(),
    '{"confident": "want_to_develop", "creative": "have_now", "organized": "want_to_develop"}',
    'To become a successful entrepreneur',
    'Not reaching my full potential',
    ARRAY['Security', 'Comfort', 'Stability'],
    ARRAY['Growth', 'Impact', 'Freedom']
);

-- Sample conversation
INSERT INTO chat_conversations (user_id, title)
VALUES (auth.uid(), 'First conversation with my future self');
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify everything was created:
/*
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

SELECT * FROM pg_policies WHERE tablename IN (
    'user_profiles', 
    'future_self_profiles', 
    'chat_conversations', 
    'chat_messages', 
    'user_settings'
);
*/