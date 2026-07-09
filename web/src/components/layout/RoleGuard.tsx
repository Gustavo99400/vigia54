'use client';
// ============================================================
// VIGÍA 54 — RoleGuard Component (RF6)
// Protects routes based on user role
// ============================================================
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallback?: string;
}

export function RoleGuard({ children, allowedRoles, fallback = '/login' }: RoleGuardProps) {
  const { user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace('/map');
    }
  }, [user, authLoading, allowedRoles, router, fallback]);

  if (authLoading) {
    return (
      <div className="loader-page">
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Verificando acceso...</p>
      </div>
    );
  }

  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
