-- ============================================
-- PROFILE HISTORY TRACKING SYSTEM
-- ============================================
-- This migration adds automatic history tracking for profile changes
-- Every INSERT, UPDATE, or DELETE on future_self_profiles is captured
-- Users can view and delete their own history
--
-- Author: Development Team
-- Date: 2025-08-31
-- ============================================

-- Create profile history table with JSONB storage
CREATE TABLE IF NOT EXISTS profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES future_self_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_data JSONB,
  new_data JSONB,
  -- Store changed fields as regular column (populated by trigger)
  changed_fields TEXT[]
);

-- Create indexes for performance
-- BRIN index for timestamp (100x smaller than BTREE for append-only)
CREATE INDEX idx_profile_history_changed_at 
  ON profile_history USING BRIN (changed_at);

-- Regular index for profile lookups
CREATE INDEX idx_profile_history_profile 
  ON profile_history(profile_id, version_number DESC);

-- Index for user's history (for deletion)
CREATE INDEX idx_profile_history_user 
  ON profile_history(user_id);

-- Enable RLS
ALTER TABLE profile_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own history
CREATE POLICY "Users can view own history" ON profile_history
  FOR SELECT USING (auth.uid() = user_id);

-- Users can delete their own history
CREATE POLICY "Users can delete own history" ON profile_history
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- AUDIT TRIGGER FUNCTION
-- ============================================

-- Create trigger function to capture changes
CREATE OR REPLACE FUNCTION capture_profile_changes() 
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_operation TEXT;
  v_changed_fields TEXT[];
BEGIN
  -- Determine operation type
  v_operation := TG_OP;
  
  -- Capture data based on operation
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_changed_fields := ARRAY[]::TEXT[];
  ELSIF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_changed_fields := ARRAY[]::TEXT[];
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    
    -- Skip if no actual changes (important for performance)
    IF v_old_data = v_new_data THEN
      RETURN NEW;
    END IF;
    
    -- Calculate changed fields
    SELECT ARRAY_AGG(key) INTO v_changed_fields
    FROM (
      SELECT jsonb_object_keys(v_old_data) AS key
      UNION
      SELECT jsonb_object_keys(v_new_data) AS key
    ) keys
    WHERE v_old_data->key IS DISTINCT FROM v_new_data->key;
  END IF;
  
  -- Insert history record
  INSERT INTO profile_history (
    profile_id,
    user_id,
    version_number,
    operation,
    old_data,
    new_data,
    changed_fields
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(NEW.version_number, OLD.version_number, 1),
    v_operation,
    v_old_data,
    v_new_data,
    v_changed_fields
  );
  
  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS profile_audit_trigger ON future_self_profiles;
CREATE TRIGGER profile_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON future_self_profiles
FOR EACH ROW EXECUTE FUNCTION capture_profile_changes();

-- Enable real-time for history table (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE profile_history;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the setup:
-- SELECT 
--   table_name,
--   trigger_name,
--   event_manipulation,
--   action_timing
-- FROM information_schema.triggers
-- WHERE trigger_name = 'profile_audit_trigger';