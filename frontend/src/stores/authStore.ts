import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: Error | null; requiresEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: 'google' | 'kakao') => Promise<{ error: Error | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });

    try {
      // 기존 세션 복원
      const {
        data: { session },
      } = await supabase.auth.getSession();

      set({
        session,
        user: session?.user ?? null,
        isInitialized: true,
      });

      // 인증 상태 변경 감지
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
      });
    } catch (error) {
      console.error('세션 초기화 실패:', error);
      set({ isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error, requiresEmailConfirmation: false };
      }

      const hasActiveSession = Boolean(data.session && data.user);

      set({
        session: hasActiveSession ? data.session : null,
        user: hasActiveSession ? data.user : null,
      });

      return {
        error: null,
        requiresEmailConfirmation: !hasActiveSession,
      };
    } catch (error) {
      return { error: error as Error, requiresEmailConfirmation: false };
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      set({
        session: data.session,
        user: data.user,
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithOAuth: async (provider: 'google' | 'kakao') => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      return { error: error ?? null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      set({ isLoading: false });
    }
  },

  sendPasswordReset: async (email: string) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error ?? null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      set({ isLoading: false });
    }
  },

  updatePassword: async (password: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (!error) {
        set((state) => ({
          user: data.user ?? state.user,
          session: state.session,
        }));
      }
      return { error: error ?? null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({
        session: null,
        user: null,
      });
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
