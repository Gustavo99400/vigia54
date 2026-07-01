import { create } from "zustand";

import { UserRole } from "@/types";

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
}

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface AppState {
  // Auth
  user: UserData | null;
  setUser: (user: UserData) => void;
  clearUser: () => void;
  setRole: (role: UserRole) => void;

  // Location
  location: Location | null;
  setLocation: (location: Location) => void;

  // Panic
  isPanicMode: boolean;
  setPanicMode: (status: boolean) => void;

  // Trust
  trustScore: number;
  setTrustScore: (score: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  setRole: (role) => set(state => ({
    user: state.user ? { ...state.user, role } : null
  })),

  // Location
  location: null,
  setLocation: (location) => set({ location }),

  // Panic
  isPanicMode: false,
  setPanicMode: (status) => set({ isPanicMode: status }),

  // Trust
  trustScore: 100,
  setTrustScore: (score) => set({ trustScore: score }),
}));
