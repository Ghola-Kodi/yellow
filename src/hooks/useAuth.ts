'use client';

import { authStore } from '@/stores/authStore';

export function useAuth() {
  return authStore((state) => ({
    user: state.user,
    loading: state.loading,
    error: state.error,
    initUser: state.initUser,
    signInWithPassword: state.signInWithPassword,
    signUpWithPassword: state.signUpWithPassword,
    signInWithGoogle: state.signInWithGoogle,
    signOut: state.signOut,
    clearError: state.clearError,
  }));
}
