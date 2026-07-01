"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { onAuthStateChanged } from "@firebase/auth";
import { auth } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";
import PanicButton from "@/components/PanicButton";
import ReportForm from "@/components/ReportForm";
import ToastContainer, { showToast } from "@/components/Toast";
import Image from "next/image";
import type { Incident } from "@/types";
import { useAuth } from "@/lib/AuthContext";
import {
  BarChart2, Settings, LogOut, KeyRound,
  Camera, Shield, ArrowRight, ArrowLeft,
} from "lucide-react";
import TimeAgo from "@/components/TimeAgo";

const AppMap = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [showReportForm, setShowReportForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isSafeRouteActive, setSafeRouteActive] = useState(false);
  const { setLocation, user, setUser, clearUser } = useAppStore();
  const { role: userRole } = useAuth(); // Obtener el rol del AuthContext

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, role: userRole });
      } else { clearUser(); }
    });
    return () => unsubscribe();
  }, [setUser, clearUser, userRole]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => { if (err.code === 1) showToast("Ubicación desactivada. Actívala para mejores resultados.", "info"); },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [setLocation]);

  const handleReportClick = () => {
    if (!user) { showToast("Inicia sesión para reportar un incidente", "info"); return; }
    setShowReportForm(true);
  };

  const handleLogout = async () => {
    await auth.signOut(); clearUser(); setShowMenu(false);
    showToast("Sesión cerrada", "info");
  };

  return (
    <div className="relative w-full h-dvh flex flex-col overflow-hidden">
      <ToastContainer />

      {/* Map background */}
      <div className="absolute inset-0 z-0 bg-black">
        <AppMap
          selectedId={selectedIncident?.id}
          onSelectIncident={setSelectedIncident}
          overlayClassName="top-[76px] left-3 right-3 md:left-4 md:right-auto md:w-80 z-10"
          showSafeRoute={isSafeRouteActive}
        />
      </div>

      {/* ── HEADER ── */}
      <header className="relative z-20 animate-fade-in-down">
        <div className="hud-bar mx-3 mt-3 rounded-2xl px-4 py-2.5 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center p-0.5 rounded-xl border border-white/8 bg-white/3">
              <Image src="/logo.jpg" alt="Vigía 54" width={32} height={32} className="rounded-lg" priority style={{ width: "auto", height: "auto" }} />
            </div>
            <div>
              <h1 className="text-[13px] font-bold tracking-widest font-[family-name:var(--font-outfit)] text-white leading-none">VIGÍA 54</h1>
              <p className="text-[9px] text-white/30 tracking-[0.2em] uppercase mt-0.5">Arequipa Segura</p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Badge */}
            {user ? (
              <div className="user-badge">
                {user.photoURL
                  ? <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full ring-1 ring-white/10" />
                  : <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">{user.displayName?.[0] || "U"}</span>
                }
                <span className="text-[10px] text-white/55 font-medium max-w-[72px] truncate hidden sm:inline">
                  {user.displayName?.split(" ")[0] || "Usuario"}
                </span>
              </div>
            ) : (
              <div className="live-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-bold tracking-widest">EN VIVO</span>
              </div>
            )}

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1.5">
              {user && user.role === "ciudadano" && (
                <Link href="/dashboard" className="nav-pill">
                  <BarChart2 size={12} strokeWidth={2} /> Usuario
                </Link>
              )}
              {user && (user.role === "admin_respuestas" || user.role === "admin_sistema") && (
                <Link href="/admin" className="nav-pill">
                  <Settings size={12} strokeWidth={2} /> Admin
                </Link>
              )}
              {user
                ? <button onClick={handleLogout} className="nav-pill danger"><LogOut size={12} strokeWidth={2} /> Salir</button>
                : <Link href="/login" className="nav-pill accent"><KeyRound size={12} strokeWidth={2} /> Ingresar</Link>
              }
            </nav>

            {/* Mobile hamburger */}
            <button onClick={() => setShowMenu(!showMenu)} className="md:hidden menu-btn" aria-label="Menú">
              <span className={`menu-icon ${showMenu ? "open" : ""}`}>
                <span /><span /><span />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {showMenu && (
          <div className="md:hidden hud-bar mx-3 mt-1.5 rounded-2xl overflow-hidden animate-scale-in">
            <div className="p-2 space-y-0.5">
              {user
                ? <button onClick={handleLogout} className="mobile-menu-item"><span className="menu-item-icon"><LogOut size={14} strokeWidth={2} /></span><span>Cerrar Sesión</span></button>
                : <Link href="/login" className="mobile-menu-item" onClick={() => setShowMenu(false)}><span className="menu-item-icon"><KeyRound size={14} strokeWidth={2} /></span><span>Iniciar Sesión</span></Link>
              }
              {user && user.role === "ciudadano" && (
                <Link href="/dashboard" className="mobile-menu-item" onClick={() => setShowMenu(false)}>
                  <span className="menu-item-icon"><BarChart2 size={14} strokeWidth={2} /></span><span>Centro de Usuario</span>
                </Link>
              )}
              {user && (user.role === "admin_respuestas" || user.role === "admin_sistema") && (
                <Link href="/admin" className="mobile-menu-item" onClick={() => setShowMenu(false)}>
                  <span className="menu-item-icon"><Settings size={14} strokeWidth={2} /></span><span>Panel Admin</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── DETAIL DRAWER (Homepage) ── */}
      {selectedIncident && (
        <div className="absolute bottom-[130px] left-4 right-4 md:left-6 md:max-w-md z-30 animate-scale-in pointer-events-auto">
          <div className="glass rounded-2xl p-4 shadow-2xl relative border border-white/10">
            {/* Close Button */}
            <button
              onClick={() => setSelectedIncident(null)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-white/50 hover:text-white/85 transition-colors cursor-pointer"
            >
              <ArrowLeft size={11} strokeWidth={2.5} />
            </button>

            {/* Content */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  selectedIncident.prioridad === 1
                    ? "bg-red-500/12 text-red-400 border-red-500/25"
                    : selectedIncident.prioridad === 2
                    ? "bg-amber-500/12 text-amber-400 border-amber-500/25"
                    : "bg-white/5 text-white/45 border-white/10"
                }`}>
                  {selectedIncident.prioridad === 1 ? "CRÍTICA" : selectedIncident.prioridad === 2 ? "ALTA" : "MEDIA"}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                  selectedIncident.estado === "verificado"
                    ? "bg-emerald-500/12 text-emerald-400"
                    : selectedIncident.estado === "falsa_alarma"
                    ? "bg-red-500/12 text-red-400"
                    : selectedIncident.estado === "atendido"
                    ? "bg-blue-500/12 text-blue-400"
                    : "bg-white/5 text-white/30"
                }`}>
                  {selectedIncident.estado.replace(/_/g, " ")}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold capitalize text-white leading-tight">
                  {selectedIncident.tipo.replace(/_/g, " ")}
                </h3>
                <p className="text-[10px] text-white/25 mt-0.5">
                  Reportado <TimeAgo date={selectedIncident.timestamp} />
                </p>
              </div>

              {selectedIncident.descripcion && (
                <p className="text-xs text-white/70 bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 leading-relaxed max-h-20 overflow-y-auto">
                  {selectedIncident.descripcion}
                </p>
              )}

              {selectedIncident.evidencia?.fotoUrl && (
                <div className="rounded-lg overflow-hidden border border-white/[0.06] h-28">
                  <img src={selectedIncident.evidencia.fotoUrl} alt="Evidencia" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                {selectedIncident.evidencia?.ia_score !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40">Certeza IA:</span>
                    <span className="text-[10px] text-emerald-400 font-bold">{(selectedIncident.evidencia.ia_score * 100).toFixed(0)}%</span>
                  </div>
                )}
                <Link
                  href="/dashboard"
                  className="text-[10px] font-bold text-white/60 hover:text-white transition-colors flex items-center gap-1 ml-auto"
                >
                  Ver en central de respuesta <ArrowRight size={10} strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM DOCK ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-end pointer-events-none pb-safe">
        <div className="pointer-events-auto flex flex-col items-center gap-4 mb-6 md:mb-8 w-full px-4 animate-fade-in-up">
          {/* Glass Dock */}
          <div className="glass px-6 py-4 rounded-3xl flex items-center gap-6 shadow-2xl relative border border-white/10">
            {/* Report Button */}
            <button
              onClick={handleReportClick}
              className="w-16 h-16 rounded-2xl glass-light flex flex-col items-center justify-center border border-white/10 hover:border-white/20 hover:bg-white/5 active:scale-95 transition-all cursor-pointer pointer-events-auto"
              id="btn-report"
              title="Reportar Incidente"
            >
              <Camera size={20} strokeWidth={1.5} className="text-white/70" />
              <span className="text-[9px] text-white/50 font-bold uppercase mt-1">Reportar</span>
            </button>

            {/* Panic SOS Button */}
            <div className="relative -mt-10 mx-2 pointer-events-auto shrink-0 w-40 h-40 flex items-center justify-center">
              <PanicButton />
            </div>

            {/* Safe Route Button */}
            <button
              onClick={() => {
                const active = !isSafeRouteActive;
                setSafeRouteActive(active);
                showToast(active ? "Calculando ruta segura evadiendo incidentes..." : "Radar restablecido", "info");
              }}
              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border active:scale-95 transition-all cursor-pointer pointer-events-auto ${
                isSafeRouteActive
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "glass-light border-white/10 hover:border-white/20 hover:bg-white/5"
              }`}
              id="btn-safe-route"
              title="Ruta Segura"
            >
              <Shield size={20} strokeWidth={1.5} className={isSafeRouteActive ? "text-emerald-400" : "text-white/70"} />
              <span className="text-[9px] text-white/50 font-bold uppercase mt-1">Rutas</span>
            </button>
          </div>
        </div>
      </div>

      {showReportForm && <ReportForm onClose={() => setShowReportForm(false)} />}
    </div>
  );
}
