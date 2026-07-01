"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/lib/AuthContext";
import { Loader, ShieldOff, Lock } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  /** Rol(es) permitidos. Si no se especifica, cualquier usuario autenticado puede acceder. */
  requiredRole?: UserRole | UserRole[];
  /** Ruta de login a la que redirigir si no hay sesión */
  loginPath?: string;
}

export default function AuthGuard({
  children,
  requiredRole,
  loginPath = "/login",
}: AuthGuardProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const allowedRoles: UserRole[] | null = requiredRole
    ? Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole]
    : null;

  useEffect(() => {
    if (!loading && !user) {
      router.replace(loginPath);
    }
  }, [loading, user, router, loginPath]);

  // Pantalla de carga mientras Firebase verifica la sesión
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <Loader
            size={22}
            className="animate-spin text-white/20"
            strokeWidth={1.5}
          />
          <p className="text-[11px] text-white/20 tracking-widest uppercase">
            Verificando acceso...
          </p>
        </div>
      </div>
    );
  }

  // Sin sesión → redirigiendo (ya se hizo en el useEffect)
  if (!user) return null;

  // Sesión activa pero rol incorrecto
  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-black gap-5 px-6">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-600/[0.04] rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5">
            <ShieldOff size={32} className="text-red-500/50" strokeWidth={1} />
          </div>
          <div className="text-center">
            <h2 className="text-white/70 text-sm font-bold tracking-wide">
              Acceso Denegado
            </h2>
            <p className="text-white/30 text-xs mt-2 leading-relaxed max-w-[240px]">
              No tienes permisos para acceder a esta sección. Contacta al
              administrador si crees que es un error.
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-xs text-white/35 hover:text-white/60 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Lock size={11} strokeWidth={2} /> Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
