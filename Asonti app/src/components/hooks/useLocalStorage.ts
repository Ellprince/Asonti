// LocalStorage management utilities with quota handling

export interface StorageItem {
  key: string;
  priority: 'critical' | 'important' | 'normal' | 'low';
  maxAge?: number; // in milliseconds
  timestamp?: number;
}

// Define storage priorities
const STORAGE_PRIORITIES: Record<string, StorageItem['priority']> = {
  'user-registration': 'critical',         // Registration data
  'future-self-data': 'critical',          // Completed profile data
  'future-self-wizard': 'important',       // Wizard progress
  'app-settings': 'important',             // User settings
  'chat-messages': 'normal',               // Chat history
  'temp-data': 'low'                      // Temporary data
};

class StorageManager {
  private static instance: StorageManager;

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  // Get estimated localStorage usage
  getStorageInfo(): { used: number; available: number; quota: number } {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    // Estimate quota (varies by browser, usually 5-10MB)
    const quota = 10 * 1024 * 1024; // 10MB estimate
    const available = quota - used;
    
    return { used, available, quota };
  }

  // Check if we have enough space for data
  hasSpaceFor(dataSize: number): boolean {
    const { available } = this.getStorageInfo();
    return available > dataSize + 1024; // 1KB buffer
  }

  // Get priority of a key
  private getPriority(key: string): StorageItem['priority'] {
    // Check exact matches first
    if (STORAGE_PRIORITIES[key]) {
      return STORAGE_PRIORITIES[key];
    }
    
    // Check partial matches
    for (const [pattern, priority] of Object.entries(STORAGE_PRIORITIES)) {
      if (key.includes(pattern)) {
        return priority;
      }
    }
    
    return 'normal';
  }

  // Clear low priority items to make space
  clearLowPriorityItems(): number {
    const items: Array<{ key: string; size: number; priority: StorageItem['priority'] }> = [];
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage[key];
        items.push({
          key,
          size: value.length + key.length,
          priority: this.getPriority(key)
        });
      }
    }

    // Sort by priority (low priority first) then by size (largest first)
    items.sort((a, b) => {
      const priorityOrder = { low: 0, normal: 1, important: 2, critical: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.size - a.size;
    });

    let clearedSpace = 0;
    for (const item of items) {
      if (item.priority === 'low' || item.priority === 'normal') {
        try {
          localStorage.removeItem(item.key);
          clearedSpace += item.size;
          console.log(`Cleared ${item.key} (${item.size} bytes, priority: ${item.priority})`);
        } catch (error) {
          console.error('Error clearing item:', error);
        }
      }
    }

    return clearedSpace;
  }

  // Compress data by removing unnecessary whitespace and fields
  compressWizardData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const compressed = { ...data };
    
    // Remove empty or default values
    Object.keys(compressed).forEach(key => {
      const value = compressed[key];
      if (value === '' || value === undefined || 
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'object' && Object.keys(value).length === 0)) {
        delete compressed[key];
      }
    });

    // Compress photo data if it's too large
    if (compressed.photo && compressed.photo.length > 50000) { // > 50KB
      // Convert to simulated avatar if photo is too large
      const avatar = this.generateSimulatedAvatar('large-photo');
      compressed.photo = `simulated-avatar:${avatar.emoji}:${encodeURIComponent(avatar.background)}`;
    }

    return compressed;
  }

  private generateSimulatedAvatar(seed: string) {
    const avatars = ['🌟', '✨', '🚀', '💫', '🌈', '🎯', '💡', '🔥', '⭐', '🌺'];
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    ];
    
    const avatarIndex = seed.length % avatars.length;
    const colorIndex = seed.length % colors.length;
    
    return {
      emoji: avatars[avatarIndex],
      background: colors[colorIndex]
    };
  }

  // Safe set item with quota handling
  setItem(key: string, value: any): boolean {
    try {
      const serialized = JSON.stringify(value);
      const dataSize = serialized.length + key.length;

      // Check if we have space
      if (!this.hasSpaceFor(dataSize)) {
        console.warn('Not enough localStorage space, attempting to clear low priority items...');
        const clearedSpace = this.clearLowPriorityItems();
        
        if (clearedSpace > 0 && this.hasSpaceFor(dataSize)) {
          console.log(`Cleared ${clearedSpace} bytes, retrying storage...`);
        } else {
          console.warn('Still not enough space after clearing, compressing data...');
          const compressed = this.compressWizardData(value);
          const compressedSerialized = JSON.stringify(compressed);
          
          if (this.hasSpaceFor(compressedSerialized.length + key.length)) {
            localStorage.setItem(key, compressedSerialized);
            console.log(`Stored compressed data for ${key}`);
            return true;
          } else {
            console.error('Unable to store data even after compression');
            return false;
          }
        }
      }

      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('Quota exceeded, attempting recovery...');
        
        // Try to clear space and compress data
        this.clearLowPriorityItems();
        try {
          const compressed = this.compressWizardData(value);
          localStorage.setItem(key, JSON.stringify(compressed));
          console.log(`Stored compressed data for ${key} after quota error`);
          return true;
        } catch (secondError) {
          console.error('Failed to store even after compression:', secondError);
          return false;
        }
      } else {
        console.error('Error storing data:', error);
        return false;
      }
    }
  }

  // Safe get item
  getItem(key: string): any {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return null;
      return JSON.parse(item);
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  }

  // Remove item safely
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing item:', error);
      return false;
    }
  }
}

// Export singleton instance
export const storage = StorageManager.getInstance();

// Legacy function for compatibility
export function clearAllAppData(): boolean {
  try {
    // Clear all app-related data including user registration
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.startsWith('future-self-') || 
      key.startsWith('chat-') || 
      key.startsWith('app-') ||
      key === 'user-registration'
    );

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log(`Cleared ${keysToRemove.length} app data keys`);
    return true;
  } catch (error) {
    console.error('Error clearing app data:', error);
    return false;
  }
}

// Hook for using storage in components
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const getValue = (): T => {
    const stored = storage.getItem(key);
    return stored !== null ? stored : defaultValue;
  };

  const setValue = (value: T): boolean => {
    return storage.setItem(key, value);
  };

  return [getValue, setValue] as const;
}