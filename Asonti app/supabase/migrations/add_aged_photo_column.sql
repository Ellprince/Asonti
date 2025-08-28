-- Migration: Add aged_photo_url column to future_self_profiles
-- Date: 2025-01-27
-- Description: Adds support for storing aged photo URLs from Replicate API

-- Add aged_photo_url column if it doesn't exist
ALTER TABLE future_self_profiles 
ADD COLUMN IF NOT EXISTS aged_photo_url TEXT;

-- Add processing status for async aging
ALTER TABLE future_self_profiles
ADD COLUMN IF NOT EXISTS photo_aging_status TEXT DEFAULT 'pending' 
  CHECK (photo_aging_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add prediction ID for tracking Replicate jobs
ALTER TABLE future_self_profiles
ADD COLUMN IF NOT EXISTS replicate_prediction_id TEXT;

-- Add timestamp for when aging completed
ALTER TABLE future_self_profiles
ADD COLUMN IF NOT EXISTS photo_aged_at TIMESTAMPTZ;

-- Add index for faster queries on aging status
CREATE INDEX IF NOT EXISTS idx_future_self_photo_aging_status 
ON future_self_profiles(user_id, photo_aging_status) 
WHERE photo_aging_status = 'processing';

-- Update the updated_at trigger to handle these new columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS update_future_self_profiles_updated_at ON future_self_profiles;
CREATE TRIGGER update_future_self_profiles_updated_at
BEFORE UPDATE ON future_self_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON COLUMN future_self_profiles.aged_photo_url IS 'URL of the AI-aged photo (2 years older) from Replicate API';
COMMENT ON COLUMN future_self_profiles.photo_aging_status IS 'Status of async photo aging process';
COMMENT ON COLUMN future_self_profiles.replicate_prediction_id IS 'Replicate API prediction ID for tracking aging job';
COMMENT ON COLUMN future_self_profiles.photo_aged_at IS 'Timestamp when photo aging completed successfully';