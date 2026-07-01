"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { showToast } from "@/components/Toast";

export default function PanicButton() {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSOSOverlay, setIsSOSOverlay] = useState(false);
  
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const intervalTimer = useRef<NodeJS.Timeout | null>(null);
  const sirenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { setPanicMode, user, location } = useAppStore();

  const playVoiceAlert = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance("Alerta S.O.S activada. Transmitiendo geolocalización a la central.");
      msg.lang = "es-ES";
      msg.rate = 1.05;
      window.speechSynthesis.speak(msg);
    }
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.35);
      setTimeout(() => {
        try {
          osc.stop();
          ctx.close();
        } catch {}
      }, 400);
    } catch {}
  };

  const startAudioAlerts = () => {
    playVoiceAlert();
    playBeep();
    sirenTimerRef.current = setInterval(playBeep, 800);
    voiceTimerRef.current = setInterval(playVoiceAlert, 5000);
  };

  const stopAudioAlerts = () => {
    if (sirenTimerRef.current) clearInterval(sirenTimerRef.current);
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    return () => {
      stopAudioAlerts();
    };
  }, []);

  const startPanic = async () => {
    setPanicMode(true);
    setIsSOSOverlay(true);
    startAudioAlerts();

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    if (!user) {
      showToast("Modo S.O.S local activado. Inicia sesión para enviar reporte.", "info");
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            await addDoc(collection(db, "incidentes"), {
              tipo: "sospechoso",
              descripcion: "⚠️ ALERTA S.O.S — Pánico activado por ciudadano en Arequipa",
              ubicacion: {
                latitude,
                longitude,
                geohash: `${latitude.toFixed(3)}_${longitude.toFixed(3)}`,
              },
              evidencia: {
                fotoUrl: null,
                audioUrl: null,
              },
              estado: "revision_ia",
              prioridad: 1,
              timestamp: serverTimestamp(),
              usuarioId: user.uid,
            });
            showToast("Alerta S.O.S enviada a la central", "success");
          } catch (error) {
            console.error("Error al enviar SOS:", error);
            showToast("Error al enviar la alerta", "error");
          }
        },
        () => {
          showToast("Permite el acceso a la ubicación para registrar coordenadas", "error");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const cancelPanic = () => {
    stopAudioAlerts();
    setIsSOSOverlay(false);
    setPanicMode(false);
    showToast("Alerta SOS desactivada", "info");
  };

  const handlePointerDown = () => {
    setIsPressing(true);
    setProgress(0);

    intervalTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 100 / 30;
      });
    }, 100);

    pressTimer.current = setTimeout(() => {
      clearInterval(intervalTimer.current as NodeJS.Timeout);
      startPanic();
      setIsPressing(false);
      setProgress(100);
    }, 3000);
  };

  const handlePointerUp = () => {
    setIsPressing(false);
    setProgress(0);
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (intervalTimer.current) clearInterval(intervalTimer.current);
  };

  const circumference = 2 * Math.PI * 62;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      {/* Dynamic full-screen SOS overlay */}
      {isSOSOverlay && (
        <div className="fixed inset-0 z-[9999] bg-[#030000]/95 flex flex-col items-center justify-center p-6 animate-fade-in pointer-events-auto">
          {/* Pulsing red alarm glow */}
          <div className="absolute inset-0 bg-red-600/[0.08] animate-pulse pointer-events-none" style={{ animationDuration: "1s" }} />

          <div className="relative z-10 flex flex-col items-center max-w-xs text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/35 flex items-center justify-center animate-pulse">
              <span className="text-red-500 text-5xl font-extrabold font-[family-name:var(--font-outfit)]">🚨</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-red-500 tracking-[0.2em] font-[family-name:var(--font-outfit)] uppercase animate-pulse">S.O.S ENVIADO</h2>
              <p className="text-xs text-white/60 leading-relaxed font-semibold">
                Transmitiendo geolocalización a la Central 105 y patrullas de Serenazgo Arequipa.
              </p>
            </div>

            <div className="bg-[#111116] border border-white/[0.08] px-5 py-3 rounded-2xl w-full">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Coordenadas en Vivo</p>
              <p className="text-xs font-mono text-emerald-400 font-bold mt-1">
                {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : "Obteniendo coordenadas GPS..."}
              </p>
            </div>

            <button
              onClick={cancelPanic}
              className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white font-bold text-[10px] uppercase tracking-widest cursor-pointer active:scale-95 transition-all"
            >
              Cancelar Alerta S.O.S
            </button>
          </div>
        </div>
      )}

      {/* Animated pulse rings */}
      {isPressing && (
        <>
          <div
            className="absolute w-52 h-52 rounded-full border border-red-500/20"
            style={{ animation: "pulseRing 1.5s ease-out infinite" }}
          />
          <div
            className="absolute w-52 h-52 rounded-full border border-red-500/10"
            style={{
              animation: "pulseRing 1.5s ease-out infinite",
              animationDelay: "0.5s",
            }}
          />
        </>
      )}

      {/* Progress ring */}
      <svg
        className="absolute w-52 h-52 pointer-events-none"
        viewBox="0 0 140 140"
      >
        <circle
          cx="70"
          cy="70"
          r="62"
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="3"
        />
        <circle
          cx="70"
          cy="70"
          r="62"
          fill="none"
          stroke="#dc2626"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-100 ease-linear origin-center -rotate-90"
          style={{ transformOrigin: "50% 50%" }}
        />
      </svg>

      {/* Main Button */}
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`
          relative w-40 h-40 rounded-full flex flex-col items-center justify-center overflow-hidden
          transition-all duration-200 select-none cursor-pointer
          ${
            isPressing
              ? "scale-95 bg-red-600 glow-danger"
              : "bg-gradient-to-b from-red-600 to-red-700 shadow-[0_0_60px_rgba(220,38,38,0.25)]"
          }
        `}
        aria-label="Botón de Pánico Inteligente. Mantener presionado 3 segundos."
        id="btn-sos"
      >
        <div
          className={`absolute inset-2 rounded-full bg-red-500/30 transition-all duration-300 ${
            isPressing ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
        />
        <span className="relative z-10 text-white font-bold text-2xl tracking-[0.3em] font-[family-name:var(--font-outfit)]">
          S.O.S
        </span>
        <span className="relative z-10 text-white/50 text-[10px] mt-1.5 uppercase font-semibold tracking-widest">
          Mantén pulsado
        </span>
      </button>
    </div>
  );
}
