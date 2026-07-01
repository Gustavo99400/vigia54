"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";
import { UserRole } from "@/types";
import ToastContainer, { showToast } from "@/components/Toast";
import { ArrowLeft, ArrowRight, Loader, Lock, UserRoundCog, Mail, Key } from "lucide-react";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const fu = result.user;

      // Verificar el rol del usuario en Firestore
      const adminRef = doc(db, "administradores", fu.uid);
      const adminDoc = await getDoc(adminRef);

      if (adminDoc.exists() && adminDoc.data().activo !== false && (adminDoc.data().rol === "admin_respuestas" || adminDoc.data().rol === "admin_sistema")) {
        setUser({ uid: fu.uid, email: fu.email, displayName: fu.displayName, photoURL: fu.photoURL, role: adminDoc.data().rol as UserRole });
        showToast(`Bienvenido administrador, ${fu.displayName || fu.email}`, "success");
        router.push("/admin"); // Redirigir a la ruta de administración
      } else {
        await auth.signOut(); // Si no es administrador o está inactivo, cerrar sesión
        showToast("Acceso denegado: No tienes permisos de administrador.", "error");
      }

    } catch (error: unknown) {
      console.error("Error al iniciar sesión de administrador:", error);
      const err = error as { code?: string };
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        showToast("Credenciales incorrectas.", "error");
      } else if (err.code === "auth/invalid-email") {
        showToast("Correo electrónico inválido.", "error");
      } else {
        showToast("Error al iniciar sesión.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden bg-black px-5">
      <ToastContainer />

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.022]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.15) 1px,transparent 1px)`,
          backgroundSize: "52px 52px",
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] bg-red-600/[0.06] rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-white/[0.012] rounded-full blur-[80px]" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[360px] login-card animate-fade-in-up">

        {/* Logo + brand */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="p-1 rounded-2xl border border-white/10 bg-white/3">
            <Image src="/logo.jpg" alt="Vigía 54" width={68} height={68} className="rounded-xl" priority />
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-bold tracking-tight font-[family-name:var(--font-outfit)] text-white">Vigía 54</h1>
            <p className="text-[10px] text-white/30 mt-1.5 tracking-[0.22em] uppercase">Arequipa Segura</p>
          </div>
        </div>

        {/* Section label */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">Acceso Administrador</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* Email Input */}
        <div className="mb-3">
          <label htmlFor="email" className="sr-only">Correo Electrónico</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Mail size={16} className="text-white/40" />
            </div>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Correo Electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-10 pr-4 py-2"
              disabled={loading}
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="mb-4">
          <label htmlFor="password" className="sr-only">Contraseña</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Key size={16} className="text-white/40" />
            </div>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pl-10 pr-4 py-2"
              disabled={loading}
            />
          </div>
        </div>

        {/* Login Button */}
        <button onClick={handleAdminLogin} disabled={loading} className="btn-google mb-4" id="btn-admin-login">
          {loading ? (
            <Loader size={18} strokeWidth={2} className="animate-spin text-white/60 shrink-0" />
          ) : (
            <UserRoundCog size={20} strokeWidth={1.5} className="shrink-0" />
          )}
          <span className="font-semibold">{loading ? "Ingresando..." : "Ingresar como Administrador"}</span>
          {!loading && <ArrowRight size={15} strokeWidth={2} className="ml-auto text-zinc-400" />}
        </button>

        {/* Back link */}
        <div className="mt-5 text-center">
          <Link href="/login" className="text-[11px] text-white/20 hover:text-white/45 transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft size={12} strokeWidth={2} /> Volver a selección de perfil
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-7 text-[10px] text-white/15 animate-fade-in delay-500 flex items-center gap-1.5">
        <Lock size={10} strokeWidth={2} /> Cifrado AES-256 · Datos anonimizados · Acceso restringido
      </p>
    </div>
  );
}
