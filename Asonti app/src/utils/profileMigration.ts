import { futureSelfService } from '@/services/futureSelfService';
import { storage } from '@/components/hooks/useLocalStorage';
import type { FutureSelfProfile } from '@/lib/supabase';

interface LegacyFutureSelfData {
  hasProfile: boolean;
  createdAt?: string;
  photo?: string;
  attributes?: Record<string, 'have_now' | 'want_to_develop' | 'not_me'>;
  hope?: string;
  fear?: string;
  currentValues?: string[];
  futureValues?: string[];
  feelings?: string;
  dayInLife?: string;
}

interface LegacyWizardData {
  photo?: string;
  attributes: Record<string, 'have_now' | 'want_to_develop' | 'not_me'>;
  hope?: string;
  fear?: string;
  currentValues: string[];
  futureValues: string[];
  feelings?: string;
  dayInLife?: string;
  currentStep: number;
  completed: boolean;
}

export class ProfileMigration {
  /**
   * Migrates existing localStorage data to Supabase
   * @returns true if migration was successful or no data to migrate
   */
  async migrateLocalStorageToSupabase(): Promise<boolean> {
    try {
      // Check for existing profile in Supabase first
      const existingProfile = await futureSelfService.getActiveProfile();
      if (existingProfile) {
        console.log('Profile already exists in Supabase, skipping migration');
        return true;
      }

      // Try to get data from localStorage
      const legacyProfile = this.getLegacyProfileData();
      const legacyWizard = this.getLegacyWizardData();

      // If no legacy data exists, nothing to migrate
      if (!legacyProfile && !legacyWizard) {
        console.log('No legacy data found to migrate');
        return true;
      }

      // Merge data (wizard takes precedence as it's more recent)
      const dataToMigrate = this.mergeLegacyData(legacyProfile, legacyWizard);

      if (!dataToMigrate) {
        console.log('No valid data to migrate');
        return true;
      }

      // Validate data before migration
      if (!this.validateData(dataToMigrate)) {
        console.warn('Legacy data validation failed, skipping migration');
        return false;
      }

      // Transform to Supabase format
      const profileData = this.transformLegacyData(dataToMigrate);

      // Create profile in Supabase
      await futureSelfService.createProfile(profileData);
      
      console.log('Successfully migrated profile to Supabase');
      
      // Mark migration as complete (don't delete yet, keep as backup)
      storage.setItem('migration-completed', { 
        timestamp: new Date().toISOString(),
        success: true 
      });
      
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  /**
   * Gets legacy profile data from localStorage
   */
  private getLegacyProfileData(): LegacyFutureSelfData | null {
    try {
      return storage.getItem('future-self-data') as LegacyFutureSelfData | null;
    } catch {
      return null;
    }
  }

  /**
   * Gets legacy wizard data from localStorage
   */
  private getLegacyWizardData(): LegacyWizardData | null {
    try {
      return storage.getItem('future-self-wizard') as LegacyWizardData | null;
    } catch {
      return null;
    }
  }

  /**
   * Merges legacy profile and wizard data
   */
  private mergeLegacyData(
    profile: LegacyFutureSelfData | null,
    wizard: LegacyWizardData | null
  ): any {
    // If we have wizard data, prefer it as it's likely more recent
    if (wizard && wizard.attributes && Object.keys(wizard.attributes).length > 0) {
      return {
        ...profile,
        ...wizard,
        hasProfile: true,
      };
    }

    // Otherwise use profile data if it exists and has content
    if (profile && profile.hasProfile) {
      return profile;
    }

    return null;
  }

  /**
   * Validates that data has minimum required fields
   */
  validateData(data: any): boolean {
    // At minimum, we need attributes and values
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check for attributes
    if (!data.attributes || typeof data.attributes !== 'object') {
      return false;
    }

    // Check for values arrays
    const hasCurrentValues = Array.isArray(data.currentValues) || Array.isArray(data.current_values);
    const hasFutureValues = Array.isArray(data.futureValues) || Array.isArray(data.future_values);

    return hasCurrentValues && hasFutureValues;
  }

  /**
   * Transforms legacy data to Supabase format
   */
  transformLegacyData(data: any): Partial<FutureSelfProfile> {
    return {
      photo_url: data.photo,
      photo_type: this.determinePhotoType(data.photo),
      attributes: data.attributes || {},
      hope: data.hope,
      fear: data.fear,
      current_values: data.currentValues || data.current_values || [],
      future_values: data.futureValues || data.future_values || [],
      feelings: data.feelings,
      day_in_life: data.dayInLife || data.day_in_life,
      is_active: true,
      completed_at: data.completed ? new Date().toISOString() : undefined,
    };
  }

  /**
   * Determines photo type based on photo URL/data
   */
  private determinePhotoType(photo?: string): 'upload' | 'simulated' | 'default' | null {
    if (!photo) return 'default';
    
    if (photo.startsWith('simulated-avatar:')) {
      return 'simulated';
    }
    
    if (photo.startsWith('data:') || photo.startsWith('http')) {
      return 'upload';
    }
    
    return 'default';
  }

  /**
   * Checks if migration has already been completed
   */
  async isMigrationNeeded(): Promise<boolean> {
    // Check if migration was already done
    const migrationStatus = storage.getItem('migration-completed');
    if (migrationStatus?.success) {
      return false;
    }

    // Check if there's data to migrate
    const legacyProfile = this.getLegacyProfileData();
    const legacyWizard = this.getLegacyWizardData();

    return !!(legacyProfile || legacyWizard);
  }

  /**
   * Cleans up localStorage after successful migration
   * Call this only after confirming data is safely in Supabase
   */
  cleanupLocalStorage(): void {
    try {
      // Keep migration status
      const migrationStatus = storage.getItem('migration-completed');
      
      // Remove legacy data
      storage.removeItem('future-self-data');
      storage.removeItem('future-self-wizard');
      
      // Restore migration status
      if (migrationStatus) {
        storage.setItem('migration-completed', migrationStatus);
      }
      
      console.log('Legacy localStorage data cleaned up');
    } catch (error) {
      console.error('Error cleaning up localStorage:', error);
    }
  }
}

// Export singleton instance
export const profileMigration = new ProfileMigration();