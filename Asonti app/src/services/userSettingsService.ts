import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { retrySupabaseOperation } from '@/utils/retryWithBackoff';

export interface UserSettings {
  id?: string;
  user_id?: string;
  dark_mode: boolean;
  notifications_enabled: boolean;
  email_notifications?: boolean;
  data_sharing?: boolean;
  analytics_enabled?: boolean;
  ai_model_preference?: string;
  response_style?: string;
  created_at?: string;
  updated_at?: string;
}

export class UserSettingsService {
  /**
   * Ensures user is authenticated and returns session
   */
  async ensureSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Authentication error:', error.message);
      return null;
    }
    
    return session;
  }

  /**
   * Gets or creates user settings
   */
  async getOrCreateSettings(): Promise<UserSettings | null> {
    const session = await this.ensureSession();
    if (!session) {
      console.log('No active session for settings');
      return null;
    }

    try {
      // Try to get existing settings with retry
      try {
        const settings = await retrySupabaseOperation(
          () => supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', session.user.id)
            .single(),
          { 
            maxRetries: 3,
            onRetry: (attempt) => {
              console.log(`Retrying getSettings (attempt ${attempt})`);
            }
          }
        );
        
        return settings;
      } catch (error: any) {
        if (error?.code === 'PGRST116' || error?.message?.includes('No rows')) {
          // No settings found, create default settings
          const defaultSettings: Partial<UserSettings> = {
            user_id: session.user.id,
            dark_mode: false,
            notifications_enabled: true,
            email_notifications: true,
            analytics_enabled: true,
            data_sharing: false,
            ai_model_preference: 'gpt-4o',
            response_style: 'balanced'
          };

          const newSettings = await retrySupabaseOperation(
            () => supabase
              .from('user_settings')
              .insert(defaultSettings)
              .select()
              .single(),
            { 
              maxRetries: 2,
              onRetry: (attempt) => {
                console.log(`Retrying createSettings (attempt ${attempt})`);
              }
            }
          );

          return newSettings;
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Settings service error after retries:', error);
      return null;
    }
  }

  /**
   * Updates user settings
   */
  async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings | null> {
    const session = await this.ensureSession();
    if (!session) {
      console.log('No active session for updating settings');
      return null;
    }

    try {
      const { data: settings, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating settings:', error);
        return null;
      }

      return settings;
    } catch (error) {
      console.error('Settings update error:', error);
      return null;
    }
  }

  /**
   * Deletes all user data (for clear all data functionality)
   */
  async clearAllUserData(): Promise<boolean> {
    const session = await this.ensureSession();
    if (!session) {
      console.log('No active session for clearing data');
      return false;
    }

    try {
      // Delete in order due to foreign key constraints
      // 1. Delete chat messages
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', session.user.id);

      // 2. Delete chat conversations
      await supabase
        .from('chat_conversations')
        .delete()
        .eq('user_id', session.user.id);

      // 3. Delete future self profiles
      await supabase
        .from('future_self_profiles')
        .delete()
        .eq('user_id', session.user.id);

      // 4. Reset user settings to defaults
      await this.updateSettings({
        dark_mode: false,
        notifications_enabled: true,
        email_notifications: true,
        analytics_enabled: true,
        data_sharing: false,
        ai_model_preference: 'gpt-4o',
        response_style: 'balanced'
      });

      return true;
    } catch (error) {
      console.error('Error clearing user data:', error);
      return false;
    }
  }

  /**
   * Clears only chat messages
   */
  async clearChatMessages(): Promise<boolean> {
    const session = await this.ensureSession();
    if (!session) {
      console.log('No active session for clearing messages');
      return false;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error clearing chat messages:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error clearing messages:', error);
      return false;
    }
  }

  /**
   * Clears future self data
   */
  async clearFutureSelfData(): Promise<boolean> {
    const session = await this.ensureSession();
    if (!session) {
      console.log('No active session for clearing future self data');
      return false;
    }

    try {
      const { error } = await supabase
        .from('future_self_profiles')
        .delete()
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error clearing future self data:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error clearing future self data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const userSettingsService = new UserSettingsService();