'use client';
// ============================================================
// VIGÍA 54 — useAuth Hook (RF6)
// ============================================================
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/lib/auth';
import { useAppStore } from '@/store/useAppStore';

export function useAuth() {
  const { user, authLoading, setUser, setAuthLoading } = useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching user profile in useAuth:', err);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    });
    return unsubscribe;
  }, [setUser, setAuthLoading]);

  return { user, authLoading };
}
