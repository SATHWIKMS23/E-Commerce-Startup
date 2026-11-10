import AsyncStorage from '@react-native-async-storage/async-storage';

// Memory cache for synchronous lookups in axios interceptors
const memoryStore: Record<string, string | null> = {};

export const appStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const val = await AsyncStorage.getItem(key);
      memoryStore[key] = val;
      return val;
    } catch {
      return memoryStore[key] || null;
    }
  },

  getItemSync(key: string): string | null {
    return memoryStore[key] ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStore[key] = value;
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed to persist to AsyncStorage:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    delete memoryStore[key];
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove from AsyncStorage:', e);
    }
  },

  async preload(): Promise<void> {
    try {
      const keys = ['seller_token', 'seller_refresh_token', 'seller_user'];
      const pairs = await AsyncStorage.multiGet(keys);
      pairs.forEach(([k, v]) => {
        if (v !== null) memoryStore[k] = v;
      });
    } catch (e) {
      console.warn('Failed to preload AsyncStorage:', e);
    }
  },
};
