import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { api, TOKEN_KEY } from '../lib/api';

interface AuthState {
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  setToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isLoading: true,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ token, isLoading: false });
  },

  login: async (email, password) => {
    const { data } = await api.post<{ access_token: string }>('/auth/login', { email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    set({ token: data.access_token });
  },

  register: async (name, email, phone, password) => {
    const { data } = await api.post<{ access_token: string }>('/auth/register', {
      name,
      email,
      phone,
      password,
    });
    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    set({ token: data.access_token });
  },

  setToken: async (token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null });
  },
}));
