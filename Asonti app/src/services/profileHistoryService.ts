import { supabase } from '@/lib/supabase';

export interface ProfileHistory {
  id: string;
  profile_id: string;
  version_number: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_at: string;
  old_data: any;
  new_data: any;
  changed_fields?: string[];
}

export class ProfileHistoryService {
  /**
   * Get profile history for AI context
   * Returns last 5 changes for contextual awareness
   */
  async getRecentHistory(profileId: string): Promise<ProfileHistory[]> {
    try {
      const { data, error } = await supabase
        .from('profile_history')
        .select('*')
        .eq('profile_id', profileId)
        .order('version_number', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching history:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to get profile history:', error);
      return [];
    }
  }

  /**
   * Get summarized changes for AI context
   * Returns human-readable change descriptions
   */
  async getHistorySummary(profileId: string): Promise<string> {
    const history = await this.getRecentHistory(profileId);
    
    if (history.length === 0) {
      return '';
    }
    
    const summaries = history
      .filter(h => h.operation === 'UPDATE')
      .slice(0, 3)
      .map(h => {
        const changes = this.describeChanges(h.old_data, h.new_data);
        const date = new Date(h.changed_at).toLocaleDateString();
        return `${date}: ${changes}`;
      });
    
    return summaries.length > 0 
      ? `Recent profile evolution:\n${summaries.join('\n')}`
      : '';
  }

  /**
   * Describe changes between two versions
   */
  private describeChanges(oldData: any, newData: any): string {
    if (!oldData || !newData) return 'Profile created';
    
    const changes: string[] = [];
    
    // Check key fields for changes
    if (oldData.hope !== newData.hope) {
      changes.push('updated hopes');
    }
    if (oldData.fear !== newData.fear) {
      changes.push('revised fears');
    }
    if (JSON.stringify(oldData.current_values) !== JSON.stringify(newData.current_values) ||
        JSON.stringify(oldData.future_values) !== JSON.stringify(newData.future_values)) {
      changes.push('adjusted values');
    }
    if (oldData.day_in_life !== newData.day_in_life) {
      changes.push('reimagined daily life');
    }
    if (oldData.feelings !== newData.feelings) {
      changes.push('updated feelings');
    }
    if (JSON.stringify(oldData.attributes) !== JSON.stringify(newData.attributes)) {
      changes.push('modified attributes');
    }
    
    return changes.length > 0 
      ? changes.join(', ')
      : 'minor updates';
  }

  /**
   * Delete all history for a user (for Settings)
   */
  async deleteUserHistory(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profile_history')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting history:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete user history:', error);
      return false;
    }
  }

  /**
   * Get history count for display
   */
  async getHistoryCount(profileId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('profile_history')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId);
      
      if (error) {
        console.error('Error getting history count:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Failed to get history count:', error);
      return 0;
    }
  }

  /**
   * Check if profile has been updated recently (for AI context)
   */
  async hasRecentChanges(profileId: string, daysAgo: number = 7): Promise<boolean> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      
      const { data, error } = await supabase
        .from('profile_history')
        .select('id')
        .eq('profile_id', profileId)
        .eq('operation', 'UPDATE')
        .gte('changed_at', cutoffDate.toISOString())
        .limit(1);
      
      if (error) {
        console.error('Error checking recent changes:', error);
        return false;
      }
      
      return (data && data.length > 0) || false;
    } catch (error) {
      console.error('Failed to check recent changes:', error);
      return false;
    }
  }
}

export const profileHistory = new ProfileHistoryService();