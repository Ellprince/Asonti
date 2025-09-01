-- Enable realtime broadcasts for future_self_profiles updates
-- This ensures clients subscribed via supabase.realtime receive changes immediately

ALTER PUBLICATION supabase_realtime ADD TABLE future_self_profiles;

-- Optional: enable realtime for chat_messages as well (commented for now)
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Verification query (run in SQL editor to confirm):
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

