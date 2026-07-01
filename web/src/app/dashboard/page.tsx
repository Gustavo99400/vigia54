"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Incident } from "@/types";
import ToastContainer, { showToast } from "@/components/Toast";
import TimeAgo from "@/components/TimeAgo";
import {
  AlertTriangle, MapPin, Shield, ImageOff,
  CheckCircle, XCircle, Loader, ChevronLeft,
} from "lucide-react";

const AppMap = dynamic(() => import("@/components/Map"), { ssr: false });

const PRIORITY: Record<number, { label: string; dot: string; badge: string }> = {
  1: { label: "CRÍTICA", dot: "bg-red-500",   badge: "bg-red-500/12 text-red-400 border-red-500/25" },
  2: { label: "ALTA",    dot: "bg-amber-400", badge: "bg-amber-500/12 text-amber-400 border-amber-500/25" },
  3: { label: "MEDIA",   dot: "bg-white/30",  badge: "bg-white/5 text-white/45 border-white/10" },
};

const STATUS_BADGE: Record<string, string> = {
  verificado:   "bg-emerald-500/12 text-emerald-400",
  falsa_alarma: "bg-red-500/12 text-red-400",
  atendido:     "bg-blue-500/12 text-blue-400",
  revision_ia:  "bg-white/5 text-white/30",
};

const getDistrictName = (inc: Incident): string => {
  const desc = (inc.descripcion || "").toLowerCase();
  if (desc.includes("cayma")) return "Cayma";
  if (desc.includes("yanahuara")) return "Yanahuara";
  if (desc.includes("paucarpata")) return "Paucarpata";
  if (desc.includes("bustamante") || desc.includes("dolores")) return "J.L. Bustamante";
  if (desc.includes("cercado") || desc.includes("puente bolognesi") || desc.includes("plaza de armas")) return "Cercado";
  
  const lat = inc.ubicacion.latitude;
  const lng = inc.ubicacion.longitude;
  if (lat > -16.39) return "Cayma";
  if (lat < -16.41) {
    if (lng < -71.52) return "J.L. Bustamante";
    return "Paucarpata";
  }
  if (lng < -71.54) return "Yanahuara";
  return "Cercado";
};

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "map" | "detail">("list");
  const [validating, setValidating] = useState(false);

  // Filters state
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [filterPrioridad, setFilterPrioridad] = useState<string>("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "incidentes"), orderBy("prioridad", "asc"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      const items: Incident[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id, tipo: data.tipo, estado: data.estado,
          prioridad: data.prioridad || 3,
          evidencia: data.evidencia || { fotoUrl: null, audioUrl: null },
          ubicacion: data.ubicacion || { latitude: 0, longitude: 0, geohash: "" },
          timestamp: data.timestamp?.toDate?.() || new Date(),
          usuarioId: data.usuarioId || "unknown",
          descripcion: data.descripcion,
        } as Incident & { descripcion?: string };
      });
      setIncidents(items);
      if (selected) {
        const updated = items.find((i) => i.id === selected.id);
        if (updated) setSelected(updated);
      }
    }, console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = async (id: string, action: "Confirmado" | "Falsa Alarma" | "Resuelto") => {
    setValidating(true);
    try {
      const estado = action === "Falsa Alarma" ? "falsa_alarma" : action === "Resuelto" ? "atendido" : "verificado";
      await updateDoc(doc(db, "incidentes", id), {
        estado, "metadata.validacion_autoridad": action, "metadata.fecha_validacion": serverTimestamp(),
      });
      showToast(`Marcado como: ${action}`, "success");
    } catch { showToast("Error al validar", "error"); }
    finally { setValidating(false); }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (filterTipo !== "todos" && inc.tipo !== filterTipo) return false;
    if (filterEstado !== "todos" && inc.estado !== filterEstado) return false;
    if (filterPrioridad !== "todos" && String(inc.prioridad) !== filterPrioridad) return false;
    return true;
  });

  const typeCounts = { 
    robo_mano_armada: 0, 
    accidente: 0, 
    vandalismo: 0, 
    sospechoso: 0,
    choque: 0,
    incendio: 0,
    derrumbe: 0
  };
  const districtCounts: Record<string, number> = {};

  filteredIncidents.forEach((inc) => {
    if (inc.tipo in typeCounts) {
      typeCounts[inc.tipo as keyof typeof typeCounts]++;
    }
    const dist = getDistrictName(inc);
    districtCounts[dist] = (districtCounts[dist] || 0) + 1;
  });

  const TABS = [
    { key: "list"   as const, label: "Tickets", Icon: AlertTriangle },
    { key: "map"    as const, label: "Mapa",    Icon: MapPin },
    { key: "detail" as const, label: "Detalle", Icon: Shield },
  ];

  return (
    <div className="flex w-full h-full">
      <ToastContainer />

      {/* ── Sidebar izquierda: lista ── */}
      <aside className={`w-full md:w-[300px] bg-[#0a0a0d] border-r border-white/[0.05] flex flex-col h-full shrink-0 ${mobileTab !== "list" ? "hidden md:flex" : "flex"}`}>
        {/* Header sidebar */}
        <div className="px-4 py-3.5 border-b border-white/[0.05]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Cola en vivo</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white/20 bg-white/5 border border-white/7 px-2.5 py-0.5 rounded-full">
                {filteredIncidents.length}
              </span>
              <button
                onClick={() => { setShowFilters(!showFilters); setShowStats(false); }}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                  showFilters
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/50 border-white/10 hover:text-white"
                }`}
              >
                Filtros
              </button>
              <button
                onClick={() => { setShowStats(!showStats); setShowFilters(false); }}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                  showStats
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-white/5 text-white/50 border-white/10 hover:text-white"
                }`}
              >
                Estadísticas
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 space-y-2 animate-scale-in">
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full bg-[#111116] border border-white/[0.08] rounded-lg p-2 text-xs text-white/70 focus:outline-none"
              >
                <option value="todos">Todos los reportes</option>
                <option value="robo_mano_armada">Robo Armado</option>
                <option value="vandalismo">Vandalismo</option>
                <option value="sospechoso">Sospechoso</option>
                <option value="accidente">Accidente</option>
                <option value="choque">Choque Vehicular</option>
                <option value="incendio">Incendio</option>
                <option value="derrumbe">Derrumbe</option>
              </select>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full bg-[#111116] border border-white/[0.08] rounded-lg p-2 text-xs text-white/70 focus:outline-none"
              >
                <option value="todos">Todos los estados</option>
                <option value="revision_ia">Revisión IA</option>
                <option value="verificado">Verificado</option>
                <option value="atendido">Resuelto</option>
                <option value="falsa_alarma">Falsa Alarma</option>
              </select>
              <select
                value={filterPrioridad}
                onChange={(e) => setFilterPrioridad(e.target.value)}
                className="w-full bg-[#111116] border border-white/[0.08] rounded-lg p-2 text-xs text-white/70 focus:outline-none"
              >
                <option value="todos">Todas las prioridades</option>
                <option value="1">Prioridad Crítica</option>
                <option value="2">Prioridad Alta</option>
                <option value="3">Prioridad Media</option>
              </select>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {showStats ? (
            <div className="space-y-5 p-1 animate-fade-in">
              <div>
                <h3 className="text-[11px] font-bold text-white/35 uppercase tracking-widest mb-3">Distribución de Delitos</h3>
                <div className="space-y-3 bg-[#111116] border border-white/[0.04] p-3.5 rounded-xl">
                  {Object.entries(typeCounts).map(([tipo, count]) => {
                    const pct = filteredIncidents.length > 0 ? (count / filteredIncidents.length) * 100 : 0;
                    const labels: Record<string, string> = {
                      robo_mano_armada: "Robo Armado",
                      accidente: "Accidentes",
                      vandalismo: "Vandalismo",
                      sospechoso: "Sospechoso",
                      choque: "Choques",
                      incendio: "Incendios",
                      derrumbe: "Derrumbes",
                    };
                    const barColors: Record<string, string> = {
                      robo_mano_armada: "bg-red-500",
                      accidente: "bg-blue-400",
                      vandalismo: "bg-amber-400",
                      sospechoso: "bg-zinc-400",
                      choque: "bg-orange-500",
                      incendio: "bg-red-600",
                      derrumbe: "bg-yellow-600",
                    };
                    return (
                      <div key={tipo} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-white/60 font-medium">{labels[tipo]}</span>
                          <span className="text-white/45 font-bold">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColors[tipo]}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-bold text-white/35 uppercase tracking-widest mb-3">Ranking de Distritos</h3>
                <div className="space-y-3 bg-[#111116] border border-white/[0.04] p-3.5 rounded-xl">
                  {Object.entries(districtCounts).length === 0 ? (
                    <p className="text-[10px] text-white/20 text-center py-2">Sin datos de distritos</p>
                  ) : (
                    Object.entries(districtCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([dist, count]) => {
                        const maxVal = Math.max(...Object.values(districtCounts), 1);
                        const pct = (count / maxVal) * 100;
                        return (
                          <div key={dist} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-white/70 font-semibold">{dist}</span>
                              <span className="text-white/45 font-bold">{count} ({((count / filteredIncidents.length) * 100).toFixed(0)}%)</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-6">
              <Shield size={32} strokeWidth={1} className="opacity-20 text-white" />
              <p className="text-sm text-white/25">Sin incidentes activos</p>
              <p className="text-[10px] text-white/15">Los reportes aparecerán aquí en tiempo real</p>
            </div>
          ) : filteredIncidents.map((inc, i) => {
            const p = PRIORITY[inc.prioridad] || PRIORITY[3];
            const isActive = selected?.id === inc.id;
            return (
              <button
                key={inc.id}
                onClick={() => { setSelected(inc); setMobileTab("detail"); }}
                className={`incident-card ${isActive ? "active" : ""} animate-fade-in-up`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${p.badge}`}>
                    {p.label}
                  </span>
                  <span className="text-[10px] text-white/25"><TimeAgo date={inc.timestamp} /></span>
                </div>
                <p className="text-[13px] text-white/85 font-semibold capitalize leading-tight">
                  {inc.tipo.replace(/_/g, " ")}
                </p>
                <div className="flex items-center justify-between mt-2.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${STATUS_BADGE[inc.estado] || "bg-white/5 text-white/30"}`}>
                    {inc.estado.replace(/_/g, " ")}
                  </span>
                  <span className="text-white/20 text-xs">›</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Centro: mapa ── */}
      <section className={`flex-1 relative bg-black ${mobileTab !== "map" ? "hidden md:block" : "block"}`}>
        <AppMap
          selectedId={selected?.id}
          onSelectIncident={(inc) => {
            setSelected(inc);
            setMobileTab("detail");
          }}
          overlayClassName="top-3 left-3 right-3 md:left-4 md:right-auto md:w-80 z-10"
          incidents={filteredIncidents}
        />
      </section>

      {/* ── Sidebar derecha: detalle ── */}
      <aside className={`w-full md:w-[300px] bg-[#0a0a0d] border-l border-white/[0.05] flex flex-col h-full shrink-0 ${mobileTab !== "detail" ? "hidden md:flex" : "flex"}`}>
        {selected ? (
          <>
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-bold text-white font-[family-name:var(--font-outfit)]">Detalle</h2>
                <p className="text-[9px] text-white/20 font-mono mt-0.5 truncate max-w-[160px]">{selected.id}</p>
              </div>
              <button className="md:hidden text-[11px] text-white/35 hover:text-white/60 transition-colors flex items-center gap-1" onClick={() => setMobileTab("list")}>
                <ChevronLeft size={13} strokeWidth={2} /> Lista
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* Tipo */}
              <div>
                <p className="section-label mb-1.5">Clasificación</p>
                <p className="text-sm text-white/80 font-semibold capitalize">{selected.tipo.replace(/_/g, " ")}</p>
              </div>

              {/* Descripción */}
              {(selected as Incident & { descripcion?: string }).descripcion && (
                <div>
                  <p className="section-label mb-1.5">Descripción</p>
                  <p className="text-[13px] text-white/60 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 leading-relaxed">
                    {(selected as Incident & { descripcion?: string }).descripcion}
                  </p>
                </div>
              )}

              {/* IA score */}
              <div>
                <p className="section-label mb-2">Confianza IA</p>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${(selected.evidencia?.ia_score || 0) * 100}%` }} />
                </div>
                <p className="text-[10px] text-white/25 mt-1.5">{((selected.evidencia?.ia_score || 0) * 100).toFixed(0)}% certeza</p>
              </div>

              {/* Evidencia */}
              {selected.evidencia.fotoUrl ? (
                <div className="rounded-xl overflow-hidden border border-white/[0.06]">
                  <img src={selected.evidencia.fotoUrl} alt="Evidencia" className="w-full h-40 object-cover" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white/20 text-xs">
                  <ImageOff size={14} strokeWidth={1.5} />
                  <span>Sin evidencia adjunta</span>
                </div>
              )}

              {/* Ubicación */}
              <div>
                <p className="section-label mb-1.5">Ubicación GPS</p>
                <p className="text-xs text-white/45 font-mono">
                  {selected.ubicacion.latitude.toFixed(5)}, {selected.ubicacion.longitude.toFixed(5)}
                </p>
              </div>

              {/* Acciones */}
              <div className="pt-1">
                <p className="section-label mb-3">Verificación en Campo</p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => validate(selected.id!, "Confirmado")} disabled={validating} className="btn-confirm">
                    {validating
                      ? <Loader size={13} strokeWidth={2} className="animate-spin" />
                      : <AlertTriangle size={13} strokeWidth={2} />
                    }
                    Confirmado (Real)
                  </button>
                  <button onClick={() => validate(selected.id!, "Resuelto")} disabled={validating} className="btn-resolve">
                    <CheckCircle size={13} strokeWidth={2} /> Resuelto
                  </button>
                  <button onClick={() => validate(selected.id!, "Falsa Alarma")} disabled={validating} className="btn-false">
                    <XCircle size={13} strokeWidth={2} /> Falsa Alarma
                  </button>
                </div>
                <p className="text-[10px] text-white/15 mt-3 text-center leading-relaxed">
                  Esta acción actualiza el Trust Score del ciudadano
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
            <Shield size={40} strokeWidth={1} className="opacity-20 text-white" />
            <p className="text-sm text-white/25">Selecciona un incidente</p>
            <p className="text-[10px] text-white/15">Los detalles aparecerán aquí</p>
          </div>
        )}
      </aside>

      {/* ── Mobile tab bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 tab-bar">
        <div className="flex">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setMobileTab(tab.key)}
              className={`tab-bar-btn ${mobileTab === tab.key ? "active" : ""}`}>
              <tab.Icon size={16} strokeWidth={1.5} className="tab-icon" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
