"use client";

import { useState, useEffect, useCallback } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastData {
  id: number;
  message: string;
  variant: ToastVariant;
  exiting?: boolean;
}

let toastIdCounter = 0;
const listeners: Set<(toast: ToastData) => void> = new Set();

/** Call this from anywhere to show a toast */
export function showToast(message: string, variant: ToastVariant = "info") {
  const toast: ToastData = { id: ++toastIdCounter, message, variant };
  listeners.forEach((fn) => fn(toast));
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: {
    bg: "bg-[#09090b]/90",
    border: "border-emerald-500/20",
    icon: "✓",
  },
  error: {
    bg: "bg-[#09090b]/90",
    border: "border-red-500/20",
    icon: "✕",
  },
  info: {
    bg: "bg-[#09090b]/90",
    border: "border-white/10",
    icon: "ℹ",
  },
};

const iconColors: Record<ToastVariant, string> = {
  success: "text-emerald-400 bg-emerald-500/10",
  error: "text-red-400 bg-red-500/10",
  info: "text-white/80 bg-white/5",
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: ToastData) => {
    setToasts((prev) => [...prev, toast]);
    // Auto-dismiss after 3.5s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === toast.id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 200);
    }, 3500);
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => { listeners.delete(addToast); };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
      {toasts.map((toast) => {
        const styles = variantStyles[toast.variant];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full ${styles.bg} backdrop-blur-xl border ${styles.border} rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl ${toast.exiting ? "animate-toast-out" : "animate-toast-in"}`}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${iconColors[toast.variant]}`}>
              {styles.icon}
            </span>
            <p className="text-sm text-white/90 font-medium leading-snug">{toast.message}</p>
          </div>
        );
      })}
    </div>
  );
}
