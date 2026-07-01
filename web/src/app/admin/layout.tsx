import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Panel Admin — Vigía 54",
  description: "DevSecOps y Monitoreo de IA",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole={["admin_sistema", "admin_respuestas"]} loginPath="/login/admin">
      <div className="min-h-dvh flex flex-col bg-black">
        <header className="dash-header animate-fade-in-down">
          <div className="flex items-center gap-3">
            <Link href="/" className="back-btn" title="Volver">←</Link>
            <Image src="/logo.jpg" alt="Vigía 54" width={26} height={26} className="rounded-lg opacity-75" priority style={{ width:"auto", height:"auto" }} />
            <div>
              <h1 className="text-[13px] font-bold text-white tracking-wide font-[family-name:var(--font-outfit)] leading-none">Panel del Arquitecto</h1>
              <p className="text-[9px] text-white/25 tracking-widest uppercase mt-0.5 hidden sm:block">Vigía 54 · Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="status-badge info hidden md:inline-flex font-mono">
              <span className="text-emerald-400 font-bold">PROD</span>
            </div>
            <div className="status-badge online">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>WAF Activo</span>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
