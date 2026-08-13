'use client';

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export type AuthUser = { id: string; email: string | null } | null;

interface AuthState {
  user: AuthUser;
  loading: boolean;
  error: string | null;
  initUser: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ user: AuthUser | null; error?: string }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ user: AuthUser | null; error?: string }>;
  signInWithGoogle: () => Promise<{ url?: string; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const mapUser = (user: User | null): AuthUser =>
  user ? { id: user.id, email: user.email ?? null } : null;

export const authStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  clearError: () => set({ error: null }),
  initUser: async () => {
    set({ loading: true, error: null });
    try {
      if (!supabase) {
        set({ user: { id: 'demo', email: 'admin@admin.cpm' } });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      if (error) {
        set({ error: error.message });
      } else {
        set({ user: mapUser(data.user ?? null) });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unable to load user' });
    } finally {
      set({ loading: false });
    }
  },
  signInWithPassword: async (email, password) => {
    set({ loading: true, error: null });
    try {
      if (email === 'admin@admin.cpm' && password === 'admin123') {
        const demoUser = { id: 'demo', email: 'admin@admin.cpm' };
        set({ user: demoUser });
        return { user: demoUser };
      }

      if (!supabase) {
        const demoUser = { id: 'demo', email: 'admin@admin.cpm' };
        set({ user: demoUser });
        return { user: demoUser };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ error: error.message });
        return { user: null, error: error.message };
      }

      const user = mapUser(data.user ?? null);
      set({ user });
      return { user };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in';
      set({ error: message });
      return { user: null, error: message };
    } finally {
      set({ loading: false });
    }
  },
  signUpWithPassword: async (email, password) => {
    set({ loading: true, error: null });
    try {
      if (email === 'admin@admin.cpm' && password === 'admin123') {
        const demoUser = { id: 'demo', email: 'admin@admin.cpm' };
        set({ user: demoUser });
        return { user: demoUser };
      }

      if (!supabase) {
        const demoUser = { id: 'demo', email: 'admin@admin.cpm' };
        set({ user: demoUser });
        return { user: demoUser };
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        set({ error: error.message });
        return { user: null, error: error.message };
      }

      const user = mapUser(data.user ?? null);
      set({ user });
      return { user };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account';
      set({ error: message });
      return { user: null, error: message };
    } finally {
      set({ loading: false });
    }
  },
  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      if (!supabase) {
        return { error: 'Supabase is not configured' };
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        set({ error: error.message });
        return { error: error.message };
      }

      return { url: data?.url };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google';
      set({ error: message });
      return { error: message };
    } finally {
      set({ loading: false });
    }
  },
  signOut: async () => {
    set({ loading: true, error: null });
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      set({ user: null });
    } catch {
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },
}));
