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
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
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
