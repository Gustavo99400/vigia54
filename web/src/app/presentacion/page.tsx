"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Activity,
  Cpu,
  Layers,
  Award,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingUp,
  Settings,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Users,
  Play,
  Pause,
  Home as HomeIcon,
  Download,
  BookOpen
} from "lucide-react";
import { calculateTrustScore } from "@/utils/reputation";

// Slide configuration data
const SLIDES = [
  { id: "portada", title: "Inicio" },
  { id: "problematica", title: "Problemática" },
  { id: "pilares", title: "Tres Pilares" },
  { id: "calidad", title: "Calidad ISO 25010" },
  { id: "requisitos", title: "Requisitos" },
  { id: "arquitectura", title: "Arquitectura Cloud" },
  { id: "trustscore", title: "Algoritmo de Confianza" },
  { id: "planificacion", title: "Sprints y Scrum" },
  { id: "resultados", title: "Resultados QA" },
  { id: "cierre", title: "Cierre y Enlaces" },
];

export default function Presentacion() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [activeTab, setActiveTab] = useState<"high" | "medium" | "low">("high");
  const [activeSprint, setActiveSprint] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Trust Score Sandbox State
  const [verifiedReports, setVerifiedReports] = useState(10);
  const [falseReports, setFalseReports] = useState(1);
  const [totalReports, setTotalReports] = useState(12);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Compute Trust Score
  const computeTrustScore = () => {
    return calculateTrustScore(verifiedReports, falseReports, totalReports);
  };

  const trustScore = computeTrustScore();

  // Get status level based on Trust Score
  const getScoreStatus = (score: number) => {
    if (score >= 70) return { label: "CONFIABLE", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10", icon: CheckCircle };
    if (score >= 30) return { label: "ALERTA (Revisión manual)", color: "text-amber-400 border-amber-500/20 bg-amber-500/10", icon: AlertTriangle };
    return { label: "SUSPENDIDO (IA Desactivada)", color: "text-red-400 border-red-500/20 bg-red-500/10", icon: XCircle };
  };

  const status = getScoreStatus(trustScore);

  const scrollToSlide = (index: number) => {
    if (!containerRef.current) return;
    const slideHeight = containerRef.current.clientHeight;
    containerRef.current.scrollTo({
      top: index * slideHeight,
      behavior: "smooth",
    });
    setCurrentSlideIndex(index);
  };

  // Autoplay Logic
  useEffect(() => {
    if (autoplay) {
      autoplayTimerRef.current = setInterval(() => {
        setCurrentSlideIndex((prev) => {
          const next = (prev + 1) % SLIDES.length;
          scrollToSlide(next);
          return next;
        });
      }, 8000); // 8 seconds per slide
    } else {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    }

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [autoplay]);

  // Handle Scroll to update indicator
  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollPosition = containerRef.current.scrollTop;
    const slideHeight = containerRef.current.clientHeight;
    if (slideHeight === 0) return;
    const index = Math.round(scrollPosition / slideHeight);
    if (index !== currentSlideIndex && index >= 0 && index < SLIDES.length) {
      setCurrentSlideIndex(index);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) {
        e.preventDefault();
        const next = Math.min(currentSlideIndex + 1, SLIDES.length - 1);
        scrollToSlide(next);
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) {
        e.preventDefault();
        const prev = Math.max(currentSlideIndex - 1, 0);
        scrollToSlide(prev);
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToSlide(0);
      } else if (e.key === "End") {
        e.preventDefault();
        scrollToSlide(SLIDES.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlideIndex]);

  return (
    <div className="relative w-full h-screen bg-[#040407] text-[#eaeaea] overflow-hidden flex flex-col font-sans">
      {/* ── BACKGROUND CYBER GRID & NEON ORBS ── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Cyber grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), 
                              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
            backgroundSize: "45px 45px",
          }}
        />

        {/* Ambient Glowing Orbs */}
        <div
          className="absolute w-[45vw] h-[45vw] rounded-full bg-emerald-500/5 blur-[120px] transition-all duration-1000"
          style={{
            top: `${10 + (currentSlideIndex * 8) % 60}%`,
            left: `${15 + (currentSlideIndex * 12) % 50}%`,
          }}
        />
        <div
          className="absolute w-[35vw] h-[35vw] rounded-full bg-red-500/5 blur-[100px] transition-all duration-1000"
          style={{
            bottom: `${15 + (currentSlideIndex * 10) % 50}%`,
            right: `${10 + (currentSlideIndex * 15) % 65}%`,
          }}
        />
      </div>

      {/* ── TOP NAV BAR ── */}
      <header className="relative z-30 flex items-center justify-between px-4 py-3 bg-[#060609]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-lg border border-white/10 bg-white/5">
            <Image src="/logo.jpg" alt="Vigía 54" width={50} height={50} className="rounded" style={{ width: "50px", height: "50px" }} />
          </div>
          <div>
            <h1 className="text-[12px] font-bold tracking-widest font-[family-name:var(--font-outfit)] text-white leading-none">
              VIGÍA 54
            </h1>
            <p className="text-[8px] text-white/40 tracking-[0.2em] uppercase mt-0.5">
              Investigación Formativa
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Autoplay toggler */}
          <button
            onClick={() => setAutoplay(!autoplay)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
              autoplay
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10"
            }`}
            title={autoplay ? "Pausar reproducción automática" : "Iniciar reproducción automática (8s)"}
          >
            {autoplay ? <Pause size={10} /> : <Play size={10} />}
            <span className="hidden sm:inline">AUTOPLAY</span>
          </button>

          {/* Quick link to Home */}
          <Link
            href="/"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-[10px] text-white/70 font-bold"
          >
            <HomeIcon size={10} />
            <span className="hidden sm:inline">VER APP</span>
          </Link>
        </div>
      </header>

      {/* ── SCROLL PROGRESS BAR ── */}
      <div className="relative z-30 w-full h-[2px] bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-emerald-500 transition-all duration-300"
          style={{ width: `${((currentSlideIndex + 1) / SLIDES.length) * 100}%` }}
        />
      </div>

      {/* ── FLOATING CONTROLS (Right Side Index) ── */}
      <nav className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col gap-2.5 bg-black/35 backdrop-blur-md p-3 rounded-full border border-white/5">
        {SLIDES.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => scrollToSlide(idx)}
            className={`group relative w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              currentSlideIndex === idx ? "bg-emerald-500 scale-125" : "bg-white/10 hover:bg-white/30"
            }`}
            aria-label={`Ir a diapositiva ${slide.title}`}
          >
            {/* Tooltip */}
            <span className="absolute right-6 px-2 py-0.5 rounded bg-black/85 text-[9px] font-bold border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap text-white">
              {slide.title}
            </span>
          </button>
        ))}
      </nav>

      {/* ── BOTTOM DOCK CONTROLS (Mobile / Desktop) ── */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1 bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/5">
        <button
          onClick={() => scrollToSlide(Math.max(currentSlideIndex - 1, 0))}
          disabled={currentSlideIndex === 0}
          className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          aria-label="Diapositiva anterior"
        >
          <ChevronUp size={16} />
        </button>
        <span className="text-[10px] px-2 font-mono font-bold text-white/40">
          {String(currentSlideIndex + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
        <button
          onClick={() => scrollToSlide(Math.min(currentSlideIndex + 1, SLIDES.length - 1))}
          disabled={currentSlideIndex === SLIDES.length - 1}
          className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          aria-label="Diapositiva siguiente"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* ── SLIDES CONTAINER (SCROLL SNAP) ── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth relative z-10 scrollbar-none"
      >
        {/* ── DIAPOSITIVA 1: PORTADA ── */}
        <section className="w-full h-full snap-start flex flex-col justify-center px-6 md:px-20 lg:px-32 relative overflow-hidden">
          <div className="max-w-4xl space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] font-bold tracking-widest uppercase">
              <Shield size={10} className="animate-pulse" /> Proyecto Fin de Curso - Calidad de Software
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight font-[family-name:var(--font-outfit)] leading-tight text-white">
              Vigía 54: Sistema Inteligente de <br />
              <span className="bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 bg-clip-text text-transparent">
                Predicción y Reporte
              </span> de Criminalidad
            </h1>

            <p className="text-xs md:text-base text-white/60 max-w-2xl leading-relaxed">
              Plataforma SaaS web y móvil (PWA) orientada a la gestión, reporte ciudadano y analítica predictiva de incidencias delictivas en la región de Arequipa, basada en datos abiertos y en el estándar de calidad de software ISO/IEC 25010.
            </p>

            {/* Author box */}
            <div className="flex items-center gap-4 pt-4">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-sm text-white/80">
                GA
              </div>
              <div>
                <h3 className="text-xs font-bold text-white leading-none">Gustavo Alexander Flores Vera</h3>
                <p className="text-[10px] text-white/40 mt-1">gfloresv@ulasalle.edu.pe · Universidad La Salle</p>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => scrollToSlide(1)}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 font-bold text-xs text-white shadow-lg shadow-red-950/20 active:scale-95 transition-all cursor-pointer"
              >
                Comenzar Presentación
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="absolute right-10 bottom-10 text-[9px] text-white/20 font-mono tracking-wider hidden md:block">
            USA LAS FLECHAS DE DIRECCIÓN DEL TECLADO [↑] [↓] O LA BARRA ESPACIADORA
          </div>
        </section>

        {/* ── DIAPOSITIVA 2: LA PROBLEMÁTICA & DATOS ABIERTOS ── */}
        <section className="w-full h-full snap-start flex flex-col justify-center px-6 md:px-20 lg:px-32 relative">
          <div className="max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-4">
              <div className="text-[10px] font-bold tracking-widest text-red-400 uppercase">01. CONTEXTO & DESAFÍOS</div>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-outfit)] text-white">
                El Desafío de la <br />Seguridad en Arequipa
              </h2>
              <p className="text-xs md:text-sm text-white/60 leading-relaxed">
                Los sistemas de denuncia tradicionales en el Perú son mayoritariamente burocráticos, aislados del público general y carecen de mecanismos ágiles de visualización. Esto genera una desconfianza ciudadana que resulta en una cifra negra delictiva elevada.
              </p>
              <p className="text-xs md:text-sm text-white/60 leading-relaxed">
                Por otro lado, los gobiernos regionales y municipales no cuentan con herramientas de analítica predictiva efectivas que permitan estructurar planes preventivos en tiempo real.
              </p>
            </div>

            <div className="glass rounded-2xl border border-white/10 p-5 md:p-6 space-y-4 bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Aprovechando Datos Abiertos (Open Data)</h3>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                &ldquo;Vigía 54&rdquo; consume de manera directa el dataset oficial del Portal Nacional de Datos Abiertos del Estado Peruano:
              </p>
              <div className="text-xs font-semibold text-amber-400 italic bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
                &ldquo;Denuncias por Delitos y Faltas de la Policía Nacional del Perú - Región Arequipa&rdquo;
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                  <div className="text-base md:text-lg font-bold text-white">Variables Clave</div>
                  <div className="text-[9px] text-white/40 mt-1 uppercase font-semibold">Ubicación, Hora, Tipo Delito</div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                  <div className="text-base md:text-lg font-bold text-white">Finalidad</div>
                  <div className="text-[9px] text-white/40 mt-1 uppercase font-semibold">Mapas de Calor Predictivos</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── DIAPOSITIVA 3: SOLUCIÓN EN TRES PILARES ── */}
        <section className="w-full h-full snap-start flex flex-col justify-center px-6 md:px-20 lg:px-32 relative">
          <div className="max-w-5xl space-y-8">
            <div className="text-center space-y-2">
              <div className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">02. PROPUESTA DISRUPTIVA</div>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-outfit)] text-white">
                Los Tres Pilares de Vigía 54
              </h2>
              <p className="text-xs md:text-sm text-white/50 max-w-xl mx-auto">
                La convergencia tecnológica que permite mitigar las falsas alarmas, predecir incidencias y escalar el sistema de forma óptima en costes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Pillar 1 */}
              <div className="glass hover:border-emerald-500/35 group rounded-2xl border border-white/5 p-5 bg-white/[0.01] transition-all">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <Cpu size={18} />
                </div>
                <h3 className="text-sm font-bold text-white leading-tight">Triaje con IA</h3>
                <p className="text-xs text-white/50 mt-2 leading-relaxed">
                  Procesamiento asíncrono con la API de Google Gemini que analiza descripciones textuales y fotos adjuntadas por los ciudadanos para evaluar veracidad y descartar spam en tiempo real.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="glass hover:border-red-500/35 group rounded-2xl border border-white/5 p-5 bg-white/[0.01] transition-all">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <Activity size={18} />
                </div>
                <h3 className="text-sm font-bold text-white leading-tight">Predicción Geoespacial</h3>
                <p className="text-xs text-white/50 mt-2 leading-relaxed">
                  Algoritmo probabilístico de mapas de calor predictivos. Identifica hotspots de criminalidad mediante clustering y geohashes basados en la carga masiva de datos policiales históricos de Arequipa.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="glass hover:border-amber-500/35 group rounded-2xl border border-white/5 p-5 bg-white/[0.01] transition-all">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <Layers size={18} />
                </div>
                <h3 className="text-sm font-bold text-white leading-tight">Arquitectura Serverless</h3>
                <p className="text-xs text-white/50 mt-2 leading-relaxed">
                  Infraestructura alojada sobre Google Cloud Platform y Firebase. Despliegue elástico de microservicios con Cloud Functions y persistencia NoSQL distribuida con Cloud Firestore.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── DIAPOSITIVA 4: CALIDAD DE SOFTWARE (ISO/IEC 25010) ── */}
        <section className="w-full h-full snap-start flex flex-col justify-center px-6 md:px-20 lg:px-32 relative">
          <div className="max-w-5xl space-y-6">
            <div className="space-y-2">
              <div className="text-[10px] font-bold tracking-widest text-red-400 uppercase">03. ESTÁNDAR ISO/IEC 25010</div>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-outfit)] text-white">
                Mapeo de Calidad de Software
              </h2>
              <p className="text-xs md:text-sm text-white/50">
                Para garantizar que el ecosistema no sea solo una demostración conceptual, se midieron cuatro características clave del estándar de calidad en cada fase de desarrollo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Box 1 */}
              <div className="glass rounded-xl border border-white/5 p-4 bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">AF</div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Adecuación Funcional</h3>
                </div>
                <div className="mt-2.5 text-[11px] text-white/50 leading-relaxed">
                  Control estricto de criterios de aceptación para 8 Requisitos Funcionales mediante pruebas unitarias exhaustivas con Jest (más del 80% de cobertura de líneas).
                </div>
              </div>

              {/* Box 2 */}
              <div className="glass rounded-xl border border-white/5 p-4 bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">ED</div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Eficiencia de Desempeño</h3>
                </div>
                <div className="mt-2.5 text-[11px] text-white/50 leading-relaxed">
                  Tiempos de carga de consultas geoespaciales interactivos inferiores a 3.0s mediante geohashing indexado y lazy loading de componentes de mapas dinámicos.
                </div>
              </div>

              {/* Box 3 */}
              <div className="glass rounded-xl border border-white/5 p-4 bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">MT</div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Mantenibilidad</h3>
                </div>
                <div className="mt-2.5 text-[11px] text-white/50 leading-relaxed">
                  Escaneo estático automatizado con SonarQube. Cumplimiento de ESLint y tipados TypeScript que garantizan una baja deuda técnica (Grado A, 0.3%).
                </div>
              </div>

              {/* Box 4 */}
              <div className="glass rounded-xl border border-white/5 p-4 bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">SG</div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Seguridad</h3>
                </div>
                <div className="mt-2.5 text-[11px] text-white/50 leading-relaxed">
                  Comunicaciones HTTPS sobre TLS 1.3, anonimización de identidades en base de datos, autenticación robusta y reglas granulares de escritura/lectura en Cloud Firestore.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── DIAPOSITIVA 5: REQUISITOS DEL SISTEMA ── */}
        <section className="w-full h-full snap-start flex flex-col justify-center px-6 md:px-20 lg:px-32 relative">
          <div className="max-w-5xl space-y-6">
            <div className="space-y-2">
              <div className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">04. ESPECIFICACIÓN DE REQUISITOS</div>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-outfit)] text-white">
                Catálogo de Requisitos Funcionales
              </h2>
              <p className="text-xs md:text-sm text-white/50">
                Los 8 requisitos funcionales (RF) priorizados por su nivel de complejidad técnica y de abstracción algorítmica.
              </p>
            </div>

            {/* Interactive Tabs */}
            <div className="flex gap-2 p-1 border border-white/5 bg-white/[0.02] rounded-xl w-fit">
              <button
                onClick={() => setActiveTab("high")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                  activeTab === "high" ? "bg-red-500 text-white" : "text-white/50 hover:text-white/80"
                }`}
              >
                COMPLEJIDAD ALTA
              </button>
              <button
                onClick={() => setActiveTab("medium")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                  activeTab === "medium" ? "bg-amber-500 text-white" : "text-white/50 hover:text-white/80"
                }`}
              >
                COMPLEJIDAD MEDIA
              </button>
              <button
                onClick={() => setActiveTab("low")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                  activeTab === "low" ? "bg-blue-500 text-white" : "text-white/50 hover:text-white/80"
                }`}
              >
                COMPLEJIDAD BAJA
              </button>
            </div>

            {/* Tab Contents */}
            <div className="glass rounded-2xl border border-white/10 p-5 md:p-6 min-h-[160px] bg-white/[0.01]">
              {activeTab === "high" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono font-bold">ALTA</span>
                    <span className="text-xs text-white/40">Lógica predictiva y canal asíncrono con IA</span>
                  </div>
                  <ul className="space-y-3 text-xs md:text-sm text-white/80">
                    <li><strong className="text-white">RF1: Triaje Automatizado de Reportes (IA):</strong> Procesamiento de imágenes y descripciones con Google Gemini para evaluar veracidad del incidente y rechazar spam.</li>
                    <li><strong className="text-white">RF2: Motor Predictivo Geoespacial:</strong> Cálculo en tiempo real de cuadrantes de criminalidad basados en geohashes históricos y renderización en mapas.</li>
                    <li><strong className="text-white">RF3: Ingesta y ETL de Datos Abiertos:</strong> Limpieza y mapeo estructural de datasets oficiales CSV desde el Portal de Datos Abiertos del Perú.</li>
                  </ul>
                </div>
              )}

              {activeTab === "medium" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">MEDIA</span>
                    <span className="text-xs text-white/40">Consolas de usuario y filtrado interactivo</span>
                  </div>
                  <ul className="space-y-3 text-xs md:text-sm text-white/80">
                    <li><strong className="text-white">RF4: Consultas y Filtrado Avanzado:</strong> Segmentación visual de incidencias en mapa por delito, hora, distrito de Arequipa y estado de validación.</li>
                    <li><strong className="text-white">RF5: Dashboard Analítico Policial:</strong> Compilación estadística interactiva de criminalidad para autoridades con gráficos consolidados.</li>
                    <li><strong className="text-white">RF6: Control de Acceso y Roles:</strong> Autenticación por Firebase Auth con claims diferenciados para Ciudadano, Policía y Administrador.</li>
                  </ul>
                </div>
              )}

              {activeTab === "low" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">BAJA</span>
                    <span className="text-xs text-white/40">Funciones operativas básicas</span>
                  </div>
                  <ul className="space-y-3 text-xs md:text-sm text-white/80">
                    <li><strong className="text-white">RF7: Gestión de Perfil de Usuario:</strong> Configuración de datos de contacto y preferencias de notificación local para ciudadanos registrados.</li>
                    <li><strong className="text-white">RF8: Formulario de Reporte de Incidencias:</strong> Captura manual rápida de ubicación por coordenadas GPS, tipo de delito y descripción textual.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── DIAPOSITIVA 6: ARQUITECTURA CLOUD INTERACTIVA ── */}
        <section className="w-full h-full snap-start flex flex-col justify-center px-6 md:px-20 lg:px-32 relative">
          <div className="max-w-5xl space-y-6">
            <div className="space-y-2">
              <div className="text-[10px] font-bold tracking-widest text-red-400 uppercase">05. DISEÑO DE SISTEMAS</div>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-outfit)] text-white">
                Arquitectura Cloud Serverless
              </h2>
              <p className="text-xs md:text-sm text-white/50">
                Pasa el mouse sobre cada componente para ver su rol dentro del ecosistema de software:
              </p>
            </div>

            {/* Architecture Node Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4">
              {/* Node 1: PWA */}
              <div
                onMouseEnter={() => setHoveredNode("pwa")}
                onMouseLeave={() => setHoveredNode(null)}
                className={`glass p-4 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-2 ${
                  hoveredNode === "pwa" ? "border-red-400 bg-red-500/5 scale-105" : "border-white/5"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold">
                  P
                </div>
                <h3 className="text-xs font-bold text-white">Cliente PWA</h3>
                <p className="text-[9px] text-white/40">Next.js 16 + Zustand</p>
              </div>

              {/* Node 2: Firebase Auth */}
              <div
                onMouseEnter={() => setHoveredNode("auth")}
                onMouseLeave={() => setHoveredNode(null)}
                className={`glass p-4 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-2 ${
                  hoveredNode === "auth" ? "border-amber-400 bg-amber-500/5 scale-105" : "border-white/5"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  A
                </div>
                <h3 className="text-xs font-bold text-white">Firebase Auth</h3>
                <p className="text-[9px] text-white/40">Claims & JWT</p>
              </div>

              {/* Node 3: Cloud Firestore */}
              <div
                onMouseEnter={() => setHoveredNode("db")}
                onMouseLeave={() => setHoveredNode(null)}
                className={`glass p-4 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-2 ${
                  hoveredNode === "db" ? "border-emerald-400 bg-emerald-500/5 scale-105" : "border-white/5"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  F
                </div>
                <h3 className="text-xs font-bold text-white">Firestore DB</h3>
                <p className="text-[9px] text-white/40">NoSQL Geoespacial</p>
              </div>

              {/* Node 4: Cloud Functions */}
              <div
                onMouseEnter={() => setHoveredNode("functions")}
                onMouseLeave={() => setHoveredNode(null)}
                className={`glass p-4 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-2 ${
                  hoveredNode === "functions" ? "border-blue-400 bg-blue-500/5 scale-105" : "border-white/5"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  CF
                </div>
                <h3 className="text-xs font-bold text-white">Cloud Functions</h3>
                <p className="text-[9px] text-white/40">Backend Serverless</p>
              </div>

              {/* Node 5: Gemini AI */}
              <div
                onMouseEnter={() => setHoveredNode("gemini")}
                onMouseLeave={() => setHoveredNode(null)}
                className={`glass p-4 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-2 col-span-2 md:col-span-1 ${
                  hoveredNode === "gemini" ? "border-purple-400 bg-purple-500/5 scale-105" : "border-white/5"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  G
                </div>
                <h3 className="text-xs font-bold text-white">Google Gemini</h3>
                <p className="text-[9px] text-white/40">Triaje de IA</p>
              </div>
            </div>

            {/* Dynamic Architecture Node Description Box */}
            <div className="glass rounded-2xl border border-white/10 p-5 bg-white/[0.01] min-h-[90px]">
              {!hoveredNode && (
                <p className="text-xs text-white/50 italic flex items-center justify-center h-full">
                  Posa el cursor sobre cualquiera de los módulos superiores para visualizar su integración técnica y flujos de datos.
                </p>
              )}
              {hoveredNode === "pwa" && (
                <div>
                  <h4 className="text-xs font-bold text-red-400 uppercase">Cliente PWA (Next.js 16 + Zustand)</h4>
                  <p className="text-xs text-white/70 mt-1 leading-relaxed">
                    Aplicación web progresiva adaptada a dispositivos móviles. Gestiona el estado local del mapa Leaflet, almacena credenciales mediante Zustand y activa el botón de pánico SOS del ciudadano, enviando coordenadas geográficas en tiempo real.
                  </p>
                </div>
              )}
              {hoveredNode === "auth" && (
                <div>
                  <h4 className="text-xs font-bold text-amber-400 uppercase">Servicio de Autenticación (Firebase Auth)</h4>
                  <p className="text-xs text-white/70 mt-1 leading-relaxed">
                    Administra el registro y login seguro mediante tokens JWT y Google Sign-In. Inyecta Custom Claims de roles en el token de autenticación para separar los permisos de los ciudadanos frente a los analistas policiales.
                  </p>
                </div>
              )}
              {hoveredNode === "db" && (
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 uppercase">Persistencia de Datos (Cloud Firestore)</h4>
                  <p className="text-xs text-white/70 mt-1 leading-relaxed">
                    Base de datos documental NoSQL distribuida. Guarda colecciones estructuradas de usuarios y reportes delictivos con índices geográficos compuestos. Emite triggers directos hacia las Cloud Functions al registrarse una nueva incidencia.
                  </p>
                </div>
              )}
              {hoveredNode === "functions" && (
                <div>
                  <h4 className="text-xs font-bold text-blue-400 uppercase">Backend Serverless (Cloud Functions)</h4>
                  <p className="text-xs text-white/70 mt-1 leading-relaxed">
                    Lógica de negocio asíncrona desplegada en contenedores autogestionados. Captura los triggers de inserción de Firestore, invoca la API de Gemini para la verificación automatizada del reporte, y actualiza el estado del documento con el resultado final.
                  </p>
                </div>
              )}
              {hoveredNode === "gemini" && (
                <div>
                  <h4 className="text-xs font-bold text-purple-400 uppercase">Pipeline de Verificación con IA (Google Gemini API)</h4>
                  <p className="text-xs text-white/70 mt-1 leading-relaxed">
                    Modelo de lenguaje masivo multimodal. Analiza la descripción textual y el archivo multimedia de la incidencia para validar su verosimilitud física, clasifica el tipo de incidente bajo un esquema estructurado JSON y calcula un indicador de certeza predictiva.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── DIAPOSITIVA 7: ALGORITMO DE CONFIANZA (SANDBOX SIMULADOR) ── */}
        <section className="w-full h-full snap-start flex flex-col justify-center px-6 md:px-20 lg:px-32 relative">
          <div className="max-w-5xl space-y-6">
            <div className="space-y-2">
              <div className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">06. CONTROL DE SPAM & REPUTACIÓN</div>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-outfit)] text-white">
                Fórmula del Algoritmo de Confianza (Trust Score)
              </h2>
              <p className="text-xs md:text-sm text-white/50">
                Fórmula matemática para mitigar ataques de denegación de servicio (reportes falsos) evaluando la reputación ciudadana:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
              {/* Ecuación y Explicación */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 text-center shadow-lg shadow-black/35 font-mono">
                  <div className="text-[11px] text-white/40 mb-2 uppercase tracking-widest font-bold">Fórmula Científica</div>
                  <div className="text-base md:text-lg font-bold text-white tracking-wide">
                    TS = <span className="inline-block border-b border-white pb-1">(R_verif × 1.0) - (R_falsas × 5.0)</span>
                    <br />
                    <span className="block text-center mt-1">R_totales</span>
                  </div>
                  <div className="text-[13px] text-emerald-400 font-bold mt-2">× 100</div>
                </div>
                <div className="text-xs text-white/50 space-y-1.5 leading-relaxed">
                  <p>· <strong className="text-white">R_verificados (1.0):</strong> Reportes confirmados por autoridades.</p>
                  <p>· <strong className="text-white">R_falsas (-5.0):</strong> Penalización severa por falsas alarmas.</p>
                  <p>· <strong className="text-white">R_totales:</strong> Suma global de reportes emitidos.</p>
                  <p className="text-[10px] italic text-amber-400 mt-2">
                    Si el TS desciende por debajo de 30.0, el sistema suspende el triaje inmediato de IA para proteger costes.
                  </p>
                </div>
              </div>

              {/* Simulador Interactivo */}
              <div className="md:col-span-3 glass rounded-2xl border border-white/10 p-5 md:p-6 bg-white/[0.01] space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Simulador de Reputación Ciudadana</h3>
                  <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest">En Tiempo Real</div>
                </div>

                {/* Sliders */}
                <div className="space-y-3.5">
                  {/* Verified Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Reportes Verificados (R_verif)</span>
                      <span className="font-mono text-emerald-400 font-bold">{verifiedReports}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={verifiedReports}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setVerifiedReports(val);
                        setTotalReports((prev) => Math.max(prev, val + falseReports));
                      }}
                      className="w-full accent-emerald-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* False Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Reportes Falsos (R_falsas)</span>
                      <span className="font-mono text-red-400 font-bold">{falseReports}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={falseReports}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setFalseReports(val);
                        setTotalReports((prev) => Math.max(prev, verifiedReports + val));
                      }}
                      className="w-full accent-red-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Total Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Reportes Totales (R_totales)</span>
                      <span className="font-mono text-white font-bold">{totalReports}</span>
                    </div>
                    <input
                      type="range"
                      min={verifiedReports + falseReports}
                      max="100"
                      value={totalReports}
                      onChange={(e) => setTotalReports(Math.max(verifiedReports + falseReports, parseInt(e.target.value)))}
                      className="w-full accent-white h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Gauge Results */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] text-white/40 uppercase font-semibold">Score Resultante</div>
                    <div className={`text-2xl md:text-3xl font-extrabold font-mono tracking-tight mt-0.5 ${
                      trustScore >= 70 ? "text-emerald-400" : trustScore >= 30 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {trustScore}
                    </div>
                  </div>

                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-extrabold tracking-wider uppercase leading-none ${status.color}`}>
                    <status.icon size={11} />
                    {status.label}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── DIAPOSITIVA 8: METODOLOGÍA SCRUM & PLANIFICACIÓN ── */}
        <section className="w-full h-full snap-start flex flex-col justify-center px-6 md:px-20 lg:px-32 relative">
          <div className="max-w-5xl space-y-6">
            <div className="space-y-2">
              <div className="text-[10px] font-bold tracking-widest text-red-400 uppercase">07. PLANIFICACIÓN ÁGIL</div>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-outfit)] text-white">
                Cronograma de Sprints e Hitos de Control
              </h2>
              <p className="text-xs md:text-sm text-white/50">
                Planificación temporal estructurada para el desarrollo ágil y aseguramiento continuo de la calidad:
              </p>
            </div>

            {/* Timeline Tabs */}
            <div className="flex gap-1.5 border-b border-white/5 pb-2 overflow-x-auto">
              {[1, 2, 3, 4].map((sprint) => (
                <button
                  key={sprint}
                  onClick={() => setActiveSprint(sprint)}
                  className={`px-4 py-2 border-b-2 text-xs font-bold cursor-pointer whitespace-nowrap transition-all ${
                    activeSprint === sprint ? "border-red-500 text-white" : "border-transparent text-white/45 hover:text-white/70"
                  }`}
                >
                  SPRINT {sprint} (Semanas {sprint * 2 - 1}-{sprint * 2})
                </button>
              ))}
            </div>

            {/* Sprint Details */}
            <div className="glass rounded-2xl border border-white/10 p-5 md:p-6 bg-white/[0.01]">
              {activeSprint === 1 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Sprint 1: Configuración & Autenticación</h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-mono">100% COMPLETADO</span>
                  </div>
                  <p className="text-xs text-white/50">
                    Inicialización del repositorio, linters estáticos (ESLint), ganchos de pre-commit y configuración de CI/CD inicial.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase font-bold">Tareas Técnicas</div>
                      <div className="text-xs text-white/80 mt-1 leading-relaxed">
                        · Configuración inicial de ESLint & Prettier en monorepositorio.<br />
                        · Estructuración de colecciones en Cloud Firestore.
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase font-bold">Requisitos Entregables</div>
                      <div className="text-xs text-white/80 mt-1 leading-relaxed">
                        · <strong className="text-white">RF6:</strong> Autenticación Firebase Auth (roles).<br />
                        · <strong className="text-white">RF8:</strong> Formulario de Reporte Ciudadano (GPS).
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSprint === 2 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Sprint 2: Pipeline de Datos & Mapeo</h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-mono">100% COMPLETADO</span>
                  </div>
                  <p className="text-xs text-white/50">
                    Procesamiento de datos del Portal Nacional de Datos Abiertos e integración del visor cartográfico interactivo.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase font-bold">Tareas Técnicas</div>
                      <div className="text-xs text-white/80 mt-1 leading-relaxed">
                        · Pipeline ETL básico de inyección de datos históricos.<br />
                        · Integración de Leaflet Maps en entorno Next.js.
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase font-bold">Hito de Control de Calidad</div>
                      <div className="text-xs text-white/80 mt-1 leading-relaxed">
                        · <strong className="text-amber-400 font-bold">Hito 1 (Avance 40-60%):</strong> Sustentación formal del tema, catálogo de requisitos y demostración del prototipo base funcional.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSprint === 3 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Sprint 3: Procesamiento de IA & Analítica</h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-mono">100% COMPLETADO</span>
                  </div>
                  <p className="text-xs text-white/50">
                    Despliegue del pipeline inteligente para el triaje autónomo de spam e integración del dashboard estadístico.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase font-bold">Tareas Técnicas</div>
                      <div className="text-xs text-white/80 mt-1 leading-relaxed">
                        · Creación de triggers y Cloud Functions en Node.js.<br />
                        · Conexión segura asíncrona con el SDK de Google Gemini.
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase font-bold">Requisitos Entregables</div>
                      <div className="text-xs text-white/80 mt-1 leading-relaxed">
                        · <strong className="text-white">RF1:</strong> Triaje Inteligente por IA (descarte de falsos).<br />
                        · <strong className="text-white">RF5:</strong> Dashboard Analítico Policial (Zustand/CSS).
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSprint === 4 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Sprint 4: Algoritmo Probabilístico & Cierre</h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-mono">100% COMPLETADO</span>
                  </div>
                  <p className="text-xs text-white/50">
                    Despliegue del algoritmo predictivo geoespacial, auditorías integrales de mantenibilidad y empaquetado final.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase font-bold">Requisitos Entregables</div>
                      <div className="text-xs text-white/80 mt-1 leading-relaxed">
                        · <strong className="text-white">RF2:</strong> Generación interactiva de Mapas de Calor Predictivos.<br />
                        · Ejecución de la suite de pruebas unitarias al 100%.
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-white/40 uppercase font-bold">Hito de Control de Calidad</div>
                      <div className="text-xs text-white/80 mt-1 leading-relaxed">
                        · <strong className="text-emerald-400 font-bold">Hito 2 (Avance 100%):</strong> Entrega final del ecosistema de software, artículo científico LaTeX formato IEEE y reporte de QA.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── DIAPOSITIVA 9: RESULTADOS DE ASEGURAMIENTO DE CALIDAD ── */}
        <section className="w-full h-full snap-start flex flex-col justify-center px-6 md:px-20 lg:px-32 relative">
          <div className="max-w-5xl space-y-6">
            <div className="space-y-2">
              <div className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">08. RESULTADOS DE PRUEBAS & QA</div>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-outfit)] text-white">
                Dashboard de Métricas de Calidad
              </h2>
              <p className="text-xs md:text-sm text-white/50">
                Los resultados consolidados de auditorías del linter, cobertura Jest y análisis estático en SonarQube:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Cobertura */}
              <div className="glass rounded-2xl border border-white/5 p-5 bg-white/[0.01] flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Cobertura de Código (Jest)</h3>
                  </div>
                  <p className="text-[11px] text-white/50">
                    Porcentaje de cobertura de pruebas unitarias sobre módulos clave del sistema:
                  </p>
                </div>
                <div className="py-4 flex justify-center items-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    {/* SVG Progress Ring */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-white/5" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-emerald-500" strokeWidth="3" strokeDasharray="87.33, 100" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-lg font-extrabold font-mono text-white leading-none">87.3%</span>
                      <span className="text-[8px] text-white/30 uppercase mt-0.5 tracking-wider font-semibold">Promedio</span>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-white/40 space-y-1 font-mono">
                  <div className="flex justify-between"><span>Componentes UI:</span><span className="text-white">82.3%</span></div>
                  <div className="flex justify-between"><span>Estado (Zustand):</span><span className="text-white">91.2%</span></div>
                  <div className="flex justify-between"><span>Cloud Functions:</span><span className="text-white">88.5%</span></div>
                  <div className="flex justify-between border-t border-white/5 pt-1 mt-1 text-emerald-400"><span>Algoritmo Confianza:</span><span className="font-bold">100% (Jest)</span></div>
                </div>
              </div>

              {/* SonarQube */}
              <div className="glass rounded-2xl border border-white/5 p-5 bg-white/[0.01] flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-amber-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Auditoría SonarQube</h3>
                  </div>
                  <p className="text-[11px] text-white/50">
                    Escaneo estático automatizado de la mantenibilidad, confiabilidad y seguridad:
                  </p>
                </div>
                <div className="py-4 text-center">
                  <div className="text-4xl md:text-5xl font-extrabold text-emerald-400 font-mono tracking-tight">Grade A</div>
                  <div className="text-[9px] text-white/40 uppercase tracking-widest font-semibold mt-1">Calificación Obtenida</div>
                </div>
                <div className="text-[9px] text-white/40 space-y-1 font-mono">
                  <div className="flex justify-between"><span>Bugs Críticos:</span><span className="text-emerald-400">0</span></div>
                  <div className="flex justify-between"><span>Vulnerabilidades:</span><span className="text-emerald-400">0</span></div>
                  <div className="flex justify-between"><span>Code Smells:</span><span className="text-white">8</span></div>
                </div>
              </div>

              {/* Quality Gate */}
              <div className="glass rounded-2xl border border-white/5 p-5 bg-white/[0.01] flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Settings size={14} className="text-red-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Puerta de Calidad (CI)</h3>
                  </div>
                  <p className="text-[11px] text-white/50">
                    Gobernanza del pipeline automatizado en GitHub Actions para impedir regresiones:
                  </p>
                </div>
                <div className="py-4 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-white/70">
                    <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                    <span>Linter sin errores (ESLint)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/70">
                    <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                    <span>Compilación TypeScript limpia</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/70">
                    <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                    <span>Pruebas unitarias Jest superadas</span>
                  </div>
                </div>
                <div className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-1 px-2.5 rounded-lg text-center font-bold font-mono tracking-wider">
                  PIPELINE: COMPLETADO Y OK
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── DIAPOSITIVA 10: CIERRE Y RECURSOS DE DESCARGA ── */}
        <section className="w-full h-full snap-start flex flex-col justify-center px-6 md:px-20 lg:px-32 relative">
          <div className="max-w-4xl space-y-8 animate-fade-in-up text-center mx-auto">
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-950/20">
                <Shield size={28} className="text-white" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight font-[family-name:var(--font-outfit)] text-white">
                ¡Gracias por su Atención!
              </h2>
              <p className="text-xs md:text-sm text-white/50 max-w-xl mx-auto leading-relaxed">
                El sistema &ldquo;Vigía 54&rdquo; demuestra cómo la integración de datos abiertos públicos y la inteligencia artificial en la nube, regidos por marcos ágiles y estándares rigurosos de calidad (ISO/IEC 25010), puede derivar en productos de software robustos, estables y de alto impacto social.
              </p>
            </div>

            {/* Quick Deliverable Access buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              {/* LaTeX link */}
              <a
                href="/informe_proyecto.tex"
                download="informe_proyecto.tex"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-xs font-bold text-white transition-all cursor-pointer"
              >
                <Download size={14} className="text-white/60" />
                DESCARGAR ARTÍCULO LATEX
              </a>

              {/* View Article Source */}
              <a
                href="/informe_proyecto.tex"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-xs font-bold text-white transition-all cursor-pointer"
              >
                <BookOpen size={14} className="text-white/60" />
                VER FUENTE LATEX
              </a>

              {/* Main App Redirection */}
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-xs font-bold text-white transition-all cursor-pointer"
              >
                PROBAR APLICACIÓN
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* SCM Badge */}
            <div className="pt-8 text-xs text-white/35 flex items-center justify-center gap-2">
              <Users size={12} />
              <span>Código fuente y documentación gestionada con Git / GitHub Actions.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
