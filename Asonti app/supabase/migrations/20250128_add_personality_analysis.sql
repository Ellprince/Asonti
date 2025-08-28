-- Add personality analysis columns to future_self_profiles table
ALTER TABLE future_self_profiles
ADD COLUMN IF NOT EXISTS personality_analysis JSONB,
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;

-- Create index for performance on personality analysis
CREATE INDEX IF NOT EXISTS idx_personality_analysis 
ON future_self_profiles((personality_analysis->>'confidence')) 
WHERE personality_analysis IS NOT NULL;

-- Create table for chat messages if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Create index for chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id 
ON chat_messages(user_id, created_at DESC);

-- Add RLS policies for chat messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat messages
CREATE POLICY "Users can view own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own chat messages
CREATE POLICY "Users can insert own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete chat messages (immutable history)
-- No UPDATE or DELETE policies means these operations are not allowed