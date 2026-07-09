'use client';
// ============================================================
// VIGÍA 54 — Zustand Global Store
// ============================================================
import { create } from 'zustand';
import type { AppUser, Report, FilterState } from '@/types';

export interface EtlProgressState {
  status: 'idle' | 'parsing' | 'uploading' | 'done' | 'error';
  total: number;
  loaded: number;
  errors: string[];
  fileName: string;
}

interface AppStore {
  // Auth state
  user:        AppUser | null;
  authLoading: boolean;
  setUser:     (user: AppUser | null) => void;
  setAuthLoading: (v: boolean) => void;

  // Reports
  reports:     Report[];
  setReports:  (reports: Report[]) => void;

  // Filters (RF4)
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;

  // UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Notifications
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  clearNotification: () => void;

  // ETL global progress
  etlProgress: EtlProgressState | null;
  setEtlProgress: (updater: Partial<EtlProgressState> | ((prev: EtlProgressState | null) => Partial<EtlProgressState>)) => void;
  clearEtlProgress: () => void;
}

const DEFAULT_FILTERS: FilterState = {
  district:  '',
  type:      '',
  status:    '',
  startHour: 0,
  endHour:   23,
  dateFrom:  '',
  dateTo:    '',
};

export const useAppStore = create<AppStore>((set) => ({
  // Auth
  user:        null,
  authLoading: true,
  setUser:     (user)        => set({ user }),
  setAuthLoading: (authLoading) => set({ authLoading }),

  // Reports
  reports:    [],
  setReports: (reports) => set({ reports }),

  // Filters
  filters:     DEFAULT_FILTERS,
  setFilter:   (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  // UI
  sidebarOpen:   true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Notifications
  notification: null,
  showNotification: (type, message) => {
    set({ notification: { type, message } });
    setTimeout(() => set({ notification: null }), 4000);
  },
  clearNotification: () => set({ notification: null }),

  // ETL global progress
  etlProgress: null,
  setEtlProgress: (updater) => set((state) => {
    const next = typeof updater === 'function' ? updater(state.etlProgress) : updater;
    return {
      etlProgress: state.etlProgress 
        ? { ...state.etlProgress, ...next } 
        : { status: 'idle', total: 0, loaded: 0, errors: [], fileName: '', ...next }
    };
  }),
  clearEtlProgress: () => set({ etlProgress: null }),
}));
