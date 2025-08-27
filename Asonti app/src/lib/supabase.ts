import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: window.localStorage,
  },
});

// Database types (we'll generate these properly later)
export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          onboarding_completed: boolean;
          last_active: string;
        };
        Insert: Omit<UserProfile, 'created_at' | 'updated_at' | 'last_active'>;
        Update: Partial<UserProfile>;
      };
      future_self_profiles: {
        Row: {
          id: string;
          user_id: string;
          photo_url: string | null;
          photo_type: string | null;
          attributes: Record<string, string>;
          hope: string | null;
          fear: string | null;
          current_values: string[];
          future_values: string[];
          feelings: string | null;
          day_in_life: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: Omit<FutureSelfProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<FutureSelfProfile>;
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          future_self_profile_id: string | null;
          title: string | null;
          summary: string | null;
          created_at: string;
          updated_at: string;
          last_message_at: string;
          message_count: number;
        };
        Insert: Omit<ChatConversation, 'id' | 'created_at' | 'updated_at' | 'last_message_at' | 'message_count'>;
        Update: Partial<ChatConversation>;
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          content: string;
          is_user: boolean;
          model_used: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          total_tokens: number | null;
          created_at: string;
          edited_at: string | null;
          deleted_at: string | null;
        };
        Insert: Omit<ChatMessage, 'id' | 'created_at'>;
        Update: Partial<ChatMessage>;
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          dark_mode: boolean;
          notifications_enabled: boolean;
          email_notifications: boolean;
          data_sharing: boolean;
          analytics_enabled: boolean;
          ai_model_preference: string;
          response_style: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<UserSettings>;
      };
    };
  };
};

// Type exports for use in components
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type FutureSelfProfile = Database['public']['Tables']['future_self_profiles']['Row'];
export type ChatConversation = Database['public']['Tables']['chat_conversations']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];