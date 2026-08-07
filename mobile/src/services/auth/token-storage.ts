import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'biddr.auth-token';
let webFallback: string | null = null;

export const tokenStorage = {
  async get() {
    if (Platform.OS === 'web') return webFallback;
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async set(token: string) {
    if (Platform.OS === 'web') {
      webFallback = token;
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async clear() {
    if (Platform.OS === 'web') {
      webFallback = null;
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
