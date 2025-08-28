-- Create the future_self_profiles table
CREATE TABLE IF NOT EXISTS future_self_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  version_number INTEGER DEFAULT 1,
  
  -- Photo fields
  photo_url TEXT,
  aged_photo_url TEXT,
  
  -- Wizard step data
  attributes JSONB DEFAULT '{}'::jsonb,
  hope TEXT,
  fear TEXT,
  current_values TEXT[] DEFAULT ARRAY[]::TEXT[],
  future_values TEXT[] DEFAULT ARRAY[]::TEXT[],
  feelings TEXT,
  day_in_life TEXT,
  
  -- Ensure only one active profile per user
  CONSTRAINT unique_active_profile UNIQUE(user_id, is_active) 
);

-- Create indexes for better query performance
CREATE INDEX idx_future_self_profiles_user_id ON future_self_profiles(user_id);
CREATE INDEX idx_future_self_profiles_active ON future_self_profiles(user_id, is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE future_self_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own profiles
CREATE POLICY "Users can view own profiles" ON future_self_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profiles
CREATE POLICY "Users can create own profiles" ON future_self_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profiles
CREATE POLICY "Users can update own profiles" ON future_self_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own profiles
CREATE POLICY "Users can delete own profiles" ON future_self_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Create the chat_conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  future_self_profile_id UUID REFERENCES future_self_profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chat_conversations
CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_profile_id ON chat_conversations(future_self_profile_id);

-- Enable RLS for chat_conversations
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_conversations
CREATE POLICY "Users can view own conversations" ON chat_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON chat_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON chat_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Create the chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chat_messages
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable RLS for chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_messages
CREATE POLICY "Users can view own messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_future_self_profiles_updated_at BEFORE UPDATE
  ON future_self_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE
  ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();