import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Centro de Respuesta — Vigía 54",
  description: "Centro de Operaciones de Red en tiempo real",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole={["ciudadano", "admin_respuestas", "admin_sistema", "serenazgo", "pnp"]} loginPath="/login">
      <div className="h-dvh flex flex-col overflow-hidden bg-black">
        <header className="dash-header animate-fade-in-down">
          <div className="flex items-center gap-3">
            <Link href="/" className="back-btn" title="Volver">←</Link>
            <Image src="/logo.jpg" alt="Vigía 54" width={26} height={26} className="rounded-lg opacity-75" priority style={{ width:"auto", height:"auto" }} />
            <div>
              <h1 className="text-[13px] font-bold text-white tracking-wide font-[family-name:var(--font-outfit)] leading-none">Centro de Respuesta</h1>
              <p className="text-[9px] text-white/25 tracking-widest uppercase mt-0.5 hidden sm:block">Vigía 54</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="status-badge info hidden md:inline-flex">Patrulla H-04</div>
            <div className="status-badge online">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Operativo</span>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full relative flex overflow-hidden">{children}</main>
      </div>
    </AuthGuard>
  );
}
