"use client";

import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, orderBy, getCountFromServer, where, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Activity, Cpu, AlertTriangle, Users, Database } from "lucide-react";

function useCounter(target: number, duration = 1100) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setCount(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return count;
}

interface UserData { id: string; displayName?: string; reportes_total: number; reportes_verificados: number; falsas_alarmas: number; trust_score: number; }
interface ETLRecord {
  tipo: string;
  latitude: number;
  longitude: number;
  descripcion?: string;
}

function TrustBadge({ score }: { score: number }) {
  const cls = score > 80 ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/25"
    : score > 30 ? "bg-amber-500/12 text-amber-400 border-amber-500/25"
    : "bg-red-500/12 text-red-400 border-red-500/25";
  const icon = score > 80 ? "▲" : score > 30 ? "─" : "▼";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cls}`}>
      {icon} {score.toFixed(0)}
    </span>
  );
}

type MetricIconName = "activity" | "cpu" | "alert";

const METRIC_ICONS: Record<MetricIconName, React.ReactNode> = {
  activity: <Activity size={16} strokeWidth={1.5} className="text-white/50" />,
  cpu:      <Cpu      size={16} strokeWidth={1.5} className="text-white/50" />,
  alert:    <AlertTriangle size={16} strokeWidth={1.5} className="text-white/50" />,
};

function MetricCard({ label, sublabel, value, unit, iconName, bar, barColor, delay }: {
  label: string; sublabel: string; value: number; unit: string;
  iconName: MetricIconName; bar: number; barColor: string; delay: number;
}) {
  const display = useCounter(Math.round(unit === "%" ? value * 10 : value));
  const shown = unit === "%" ? (display / 10).toFixed(1) : display;
  return (
    <div className="metric-card animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{label}</p>
          <p className="text-[10px] text-white/15 mt-0.5">{sublabel}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          {METRIC_ICONS[iconName]}
        </div>
      </div>
      <div className="flex items-end gap-1.5 mb-4">
        <span className="text-4xl font-bold text-white font-[family-name:var(--font-outfit)]">{shown}</span>
        {unit && <span className="text-sm text-white/25 font-mono mb-1">{unit}</span>}
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}

const MOCK_INCIDENTS = [
  { tipo: "robo_mano_armada", desc: "Robo al paso de celular con arma blanca en el Puente Bolognesi, Cercado.", lat: -16.4005, lng: -71.5385 },
  { tipo: "robo_mano_armada", desc: "Asalto a transeúnte por dos delincuentes en motocicleta cerca del Óvalo Quiñones, Yanahuara.", lat: -16.4020, lng: -71.5490 },
  { tipo: "accidente", desc: "Choque múltiple entre dos taxis y una combi de servicio público en la Av. Ejército, Cayma.", lat: -16.3955, lng: -71.5435 },
  { tipo: "accidente", desc: "Atropello en Av. Alfonso Ugarte frente a la Universidad La Salle Arequipa.", lat: -16.4078, lng: -71.5471 },
  { tipo: "vandalismo", desc: "Pintado de graffitis vandálicos en muros coloniales de la Plaza de Yanahuara.", lat: -16.3895, lng: -71.5418 },
  { tipo: "vandalismo", desc: "Destrucción de mobiliario urbano (tachos de basura) en la Av. Lambramani cerca del parque público.", lat: -16.4210, lng: -71.5210 },
  { tipo: "sospechoso", desc: "Sujetos en actitud sospechosa merodeando casas y observando cerraduras en la Urbanización Cayma.", lat: -16.3780, lng: -71.5450 },
  { tipo: "sospechoso", desc: "Vehículo polarizado estacionado por más de 3 horas vigilando un banco en la Av. Dolores, Bustamante.", lat: -16.4250, lng: -71.5310 },
  { tipo: "choque", desc: "Colisión frontal entre dos autos particulares bloqueando el tránsito en el Puente Bolognesi.", lat: -16.4005, lng: -71.5385 },
  { tipo: "incendio", desc: "Incendio estructural de mediana proporción en local comercial de la Av. Ejército, Cayma. Bomberos en ruta.", lat: -16.3932, lng: -71.5451 },
  { tipo: "derrumbe", desc: "Derrumbe de piedras y tierra bloqueando parcialmente la vía en la bajada de la Av. Arancota.", lat: -16.4350, lng: -71.5580 },
];

function getSimulatedData(tipo: string) {
  const templates = MOCK_INCIDENTS.filter((item) => item.tipo === tipo);
  const template = templates[Math.floor(Math.random() * templates.length)] || MOCK_INCIDENTS[0];
  const offsetLat = (Math.random() * 0.002 - 0.001);
  const offsetLng = (Math.random() * 0.002 - 0.001);
  return {
    tipo: template.tipo,
    descripcion: template.desc,
    latitude: template.lat + offsetLat,
    longitude: template.lng + offsetLng
  };
}

function getBurstSimulatedData(count: number) {
  const results = [];
  for (let i = 0; i < count; i++) {
    const template = MOCK_INCIDENTS[Math.floor(Math.random() * MOCK_INCIDENTS.length)];
    const offsetLat = (Math.random() * 0.003 - 0.0015);
    const offsetLng = (Math.random() * 0.003 - 0.0015);
    results.push({
      tipo: template.tipo,
      descripcion: template.desc,
      latitude: template.lat + offsetLat,
      longitude: template.lng + offsetLng
    });
  }
  return results;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"metrics" | "trust" | "etl" | "simulador">("metrics");
  const [users, setUsers] = useState<UserData[]>([]);
  const [totalInc, setTotalInc] = useState(0);
  const [verified, setVerified] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const loaded = useRef(false);

  // ETL states
  const [etlInput, setEtlInput] = useState("");
  const [etlStatus, setEtlStatus] = useState<"idle" | "valid" | "error">("idle");
  const [etlMessage, setEtlMessage] = useState("");
  const [parsedRecords, setParsedRecords] = useState<ETLRecord[]>([]);
  const [importing, setImporting] = useState(false);

  // Simulation states
  const [simulating, setSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState("");

  const triggerSimulation = async (tipo: string) => {
    setSimulating(true);
    setSimulationLog("Iniciando simulación de incidente...");
    try {
      const data = getSimulatedData(tipo);
      await addDoc(collection(db, "incidentes"), {
        tipo: data.tipo,
        descripcion: data.descripcion,
        ubicacion: {
          latitude: data.latitude,
          longitude: data.longitude,
          geohash: `${data.latitude.toFixed(3)}_${data.longitude.toFixed(3)}`
        },
        evidencia: { fotoUrl: null, audioUrl: null },
        estado: "revision_ia",
        prioridad: data.tipo === "robo_mano_armada" ? 1 : data.tipo === "accidente" ? 2 : 3,
        timestamp: serverTimestamp(),
        usuarioId: auth.currentUser?.uid || "simulador_produccion"
      });

      setSimulationLog(`[EXITOSO] Incidente inyectado en Firestore:
Tipo: ${data.tipo.replace(/_/g, " ")}
Descripción: ${data.descripcion}
Coordenadas: ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}
Hora: ${new Date().toLocaleTimeString()}
Gatillando pipeline de IA...`);
      await refreshCounts();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setSimulationLog(`[ERROR] No se pudo simular el incidente: ${err.message || String(error)}`);
    } finally {
      setSimulating(false);
    }
  };

  const triggerBurstSimulation = async () => {
    setSimulating(true);
    setSimulationLog("Iniciando ráfaga de 5 incidentes simultáneos...");
    try {
      const burstData = getBurstSimulatedData(5);
      let logs = "";
      for (const data of burstData) {
        await addDoc(collection(db, "incidentes"), {
          tipo: data.tipo,
          descripcion: data.descripcion,
          ubicacion: {
            latitude: data.latitude,
            longitude: data.longitude,
            geohash: `${data.latitude.toFixed(3)}_${data.longitude.toFixed(3)}`
          },
          evidencia: { fotoUrl: null, audioUrl: null },
          estado: "revision_ia",
          prioridad: data.tipo === "robo_mano_armada" ? 1 : data.tipo === "accidente" ? 2 : 3,
          timestamp: serverTimestamp(),
          usuarioId: auth.currentUser?.uid || "simulador_produccion"
        });

        logs += `• ${data.tipo.replace(/_/g, " ")} en ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}\n`;
      }
      setSimulationLog(`[EXITOSO] Ráfaga completada con éxito. Inyectados:\n${logs}`);
      await refreshCounts();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setSimulationLog(`[ERROR] No se pudo completar la ráfaga: ${err.message || String(error)}`);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "usuarios"), orderBy("trust_score", "desc")),
      (snap) => setUsers(snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, displayName: data.displayName || d.id.substring(0, 8),
          reportes_total: data.reportes_total || 0, reportes_verificados: data.reportes_verificados || 0,
          falsas_alarmas: data.falsas_alarmas || 0, trust_score: data.trust_score ?? 100 };
      }))
    );
  }, []);

  const refreshCounts = async () => {
    try {
      const [tot, ver, fal] = await Promise.all([
        getCountFromServer(collection(db, "incidentes")),
        getCountFromServer(query(collection(db, "incidentes"), where("estado", "==", "verificado"))),
        getCountFromServer(query(collection(db, "incidentes"), where("estado", "==", "falsa_alarma"))),
      ]);
      setTotalInc(tot.data().count);
      setVerified(ver.data().count);
      setFalseAlarms(fal.data().count);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    refreshCounts();
  }, []);

  // suppress unused warning
  void verified;

  const accuracy = totalInc > 0 ? ((totalInc - falseAlarms) / totalInc) * 100 : 100;

  const metrics: { label: string; sublabel: string; value: number; unit: string; iconName: MetricIconName; bar: number; barColor: string }[] = [
    { label: "Total Incidentes", sublabel: "Firestore · Tiempo Real", value: totalInc,   unit: "", iconName: "activity", bar: Math.min(totalInc * 10, 100), barColor: "bg-emerald-400" },
    { label: "Precisión IA",     sublabel: "Reportes válidos / total", value: accuracy,   unit: "%", iconName: "cpu",      bar: accuracy, barColor: "bg-white" },
    { label: "Falsas Alarmas",   sublabel: "Reportes descartados",     value: falseAlarms, unit: "", iconName: "alert",    bar: totalInc > 0 ? (falseAlarms / totalInc) * 100 : 0, barColor: "bg-red-500" },
  ];

  const TABS = [
    { key: "metrics" as const, label: "Infraestructura", Icon: Activity },
    { key: "trust"   as const, label: "Trust Score",     Icon: Users },
    { key: "etl"     as const, label: "Ingesta ETL",     Icon: Database },
    { key: "simulador" as const, label: "Simulador Live", Icon: AlertTriangle },
  ];

  const handleValidateETL = () => {
    if (!etlInput.trim()) {
      setEtlStatus("error");
      setEtlMessage("Por favor pegue o cargue un dataset válido.");
      setParsedRecords([]);
      return;
    }

    try {
      let records: ETLRecord[] = [];
      const input = etlInput.trim();

      // Check if it's JSON
      if (input.startsWith("[") || input.startsWith("{")) {
        const parsed = JSON.parse(input);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // CSV parsing
        const lines = input.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
          throw new Error("El CSV debe tener al menos una cabecera y una línea de datos.");
        }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const requiredHeaders = ["tipo", "latitude", "longitude"];
        const missing = requiredHeaders.filter(req => !headers.includes(req));
        if (missing.length > 0) {
          throw new Error(`Faltan las cabeceras requeridas: ${missing.join(", ")}`);
        }

        const tipoIdx = headers.indexOf("tipo");
        const latIdx = headers.indexOf("latitude");
        const lngIdx = headers.indexOf("longitude");
        const descIdx = headers.indexOf("descripcion");

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim());
          if (cols.length < requiredHeaders.length) continue; // skip malformed lines

          const lat = parseFloat(cols[latIdx]);
          const lng = parseFloat(cols[lngIdx]);
          if (isNaN(lat) || isNaN(lng)) {
            throw new Error(`Coordenadas inválidas en la línea ${i + 1}: lat=${cols[latIdx]}, lng=${cols[lngIdx]}`);
          }

          records.push({
            tipo: cols[tipoIdx] || "sospechoso",
            latitude: lat,
            longitude: lng,
            descripcion: descIdx !== -1 ? cols[descIdx] || "" : ""
          });
        }
      }

      // Final verification of records
      if (records.length === 0) {
        throw new Error("No se encontraron registros válidos para importar.");
      }

      // Check types are valid
      const validTypes = ["robo_mano_armada", "vandalismo", "sospechoso", "accidente"];
      records.forEach((r, idx) => {
        if (!validTypes.includes(r.tipo)) {
          r.tipo = "sospechoso"; // default fallback
        }
        if (typeof r.latitude !== "number" || typeof r.longitude !== "number" || isNaN(r.latitude) || isNaN(r.longitude)) {
          throw new Error(`Registro #${idx + 1} tiene coordenadas inválidas.`);
        }
      });

      setParsedRecords(records);
      setEtlStatus("valid");
      setEtlMessage(`¡Dataset verificado con éxito! Se encontraron ${records.length} registros listos para importar.`);
    } catch (error: unknown) {
      const err = error as { message?: string };
      setEtlStatus("error");
      setEtlMessage(`Error de Validación: ${err.message || String(error)}`);
      setParsedRecords([]);
    }
  };

  const handleLoadSampleData = () => {
    const sample = `tipo,latitude,longitude,descripcion
robo_mano_armada,-16.4078,-71.5471,Robo frustrado cerca de la Universidad La Salle Arequipa
vandalismo,-16.3988,-71.5369,Graffiti vandálico en la Plaza de Armas
accidente,-16.4222,-71.5173,Colisión de taxi en las inmediaciones de Mall Aventura Arequipa
sospechoso,-16.4055,-71.5460,Persona merodeando vehículos estacionados en Av Alfonso Ugarte
robo_mano_armada,-16.4032,-71.5420,Asalto a transeúnte en Av Bolognesi`;
    setEtlInput(sample);
    setEtlStatus("idle");
    setEtlMessage("Se ha cargado un dataset de muestra para Arequipa. Presione 'Validar Esquema' para procesar.");
    setParsedRecords([]);
  };

  const handleImportETL = async () => {
    if (parsedRecords.length === 0) return;
    setImporting(true);
    setEtlMessage("Importando registros a Firestore...");

    try {
      let count = 0;
      for (const rec of parsedRecords) {
        await addDoc(collection(db, "incidentes"), {
          tipo: rec.tipo,
          descripcion: rec.descripcion || null,
          ubicacion: {
            latitude: rec.latitude,
            longitude: rec.longitude,
            geohash: `${rec.latitude.toFixed(3)}_${rec.longitude.toFixed(3)}`
          },
          evidencia: { fotoUrl: null, audioUrl: null, ia_score: 0.8 },
          estado: "verificado",
          prioridad: rec.tipo === "robo_mano_armada" ? 1 : rec.tipo === "accidente" ? 2 : 3,
          timestamp: serverTimestamp(),
          usuarioId: "pnp_open_data"
        });
        count++;
      }
      setEtlStatus("idle");
      setEtlMessage(`¡Éxito! Se han importado ${count} incidentes históricos a Firestore.`);
      setParsedRecords([]);
      setEtlInput("");
      
      // Refresh count values
      await refreshCounts();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setEtlStatus("error");
      setEtlMessage(`Error al importar: ${err.message || String(error)}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">

      {/* Tab switcher */}
      <div className="tab-switcher">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`tab-switch-btn ${activeTab === tab.key ? "active" : ""}`}>
            <tab.Icon size={14} strokeWidth={1.75} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Metrics */}
      {activeTab === "metrics" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => <MetricCard key={m.label} {...m} delay={i * 100} />)}
        </div>
      )}

      {/* Trust Score */}
      {activeTab === "trust" && (
        <div className="space-y-4 animate-fade-in">
          {/* Formula */}
          <div className="metric-card">
            <h2 className="text-[13px] font-bold text-white font-[family-name:var(--font-outfit)] mb-3">Algoritmo de Confianza</h2>
            <div className="bg-black/50 rounded-xl px-4 py-3 border border-white/[0.04] font-mono text-[11px] text-white/35 leading-relaxed">
              TS = ((Σ Verificados × 1.0) − (Σ Falsas Alarmas × 5.0)) ÷ Total × 100
            </div>
          </div>

          {/* Users table */}
          <div className="metric-card !p-0 overflow-hidden">
            {users.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Users size={32} strokeWidth={1} className="opacity-20 text-white mx-auto" />
                <p className="text-sm text-white/25">Sin usuarios registrados</p>
                <p className="text-[10px] text-white/15">Aparecerán al iniciar sesión</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        {["Usuario", "Reportes", "Verificados", "Falsas", "Trust"].map((h, i) => (
                          <th key={h} className={`px-5 py-4 text-[10px] text-white/20 font-bold uppercase tracking-widest ${i > 0 ? "text-center" : ""} ${i === 4 ? "text-right" : ""}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                          <td className="px-5 py-3.5 text-[13px] text-white/60 font-medium">{u.displayName}</td>
                          <td className="px-5 py-3.5 text-center text-white/50">{u.reportes_total}</td>
                          <td className="px-5 py-3.5 text-center text-emerald-400/80 font-semibold">{u.reportes_verificados}</td>
                          <td className="px-5 py-3.5 text-center text-red-400/70">{u.falsas_alarmas}</td>
                          <td className="px-5 py-3.5 text-right"><TrustBadge score={u.trust_score} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden p-3 space-y-2">
                  {users.map((u, i) => (
                    <div key={u.id} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[13px] font-semibold text-white/65">{u.displayName}</span>
                        <TrustBadge score={u.trust_score} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        {[
                          { n: u.reportes_total, l: "Reportes", c: "text-white/70" },
                          { n: u.reportes_verificados, l: "Verificados", c: "text-emerald-400/80" },
                          { n: u.falsas_alarmas, l: "Falsas", c: "text-red-400/70" },
                        ].map(({ n, l, c }) => (
                          <div key={l}>
                            <p className={`text-xl font-bold ${c}`}>{n}</p>
                            <p className="text-[9px] text-white/20 uppercase tracking-wider mt-0.5">{l}</p>
                          </div>
                        ))}
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${u.trust_score > 80 ? "bg-emerald-400" : u.trust_score > 30 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${u.trust_score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Ingesta ETL */}
      {activeTab === "etl" && (
        <div className="space-y-4 animate-fade-in">
          <div className="metric-card">
            <h2 className="text-[13px] font-bold text-white font-[family-name:var(--font-outfit)] mb-3">
              Carga y Validación de Datasets (Datos Abiertos)
            </h2>
            <p className="text-xs text-white/50 mb-4 leading-relaxed">
              Sube o pega un dataset en formato CSV o JSON correspondiente a denuncias de la PNP en Arequipa.
              El sistema validará el esquema de datos (campos de latitud, longitud, tipo y descripción)
              antes de importarlos a la base de datos de producción.
            </p>

            {/* Input area */}
            <div className="space-y-4">
              <textarea
                value={etlInput}
                onChange={(e) => setEtlInput(e.target.value)}
                placeholder={`Pegue aquí el contenido CSV o JSON. Ejemplo CSV:
tipo,latitude,longitude,descripcion
robo_mano_armada,-16.4078,-71.5471,Robo frustrado cerca de la Universidad La Salle
vandalismo,-16.3988,-71.5369,Pared pintarrajeada en el centro histórico`}
                rows={8}
                className="w-full bg-black/50 rounded-xl px-4 py-3 border border-white/[0.06] font-mono text-[11px] text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/15"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleValidateETL}
                  className="btn-secondary cursor-pointer"
                >
                  Validar Esquema
                </button>
                
                <button
                  onClick={handleLoadSampleData}
                  className="btn-secondary !text-white/40 border-dashed cursor-pointer"
                >
                  Cargar Datos de Muestra
                </button>

                {etlStatus === "valid" && (
                  <button
                    onClick={handleImportETL}
                    disabled={importing}
                    className="btn-confirm !w-auto px-6 py-2 cursor-pointer"
                  >
                    {importing ? "Importando..." : "Importar a Firestore"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ETL feedback messages */}
          {etlMessage && (
            <div className={`p-4 rounded-xl text-xs border animate-scale-in ${
              etlStatus === "valid" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : etlStatus === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-white/5 border-white/10 text-white/60"
            }`}>
              {etlMessage}
            </div>
          )}

          {/* Data preview table */}
          {parsedRecords.length > 0 && (
            <div className="metric-card !p-0 overflow-hidden animate-scale-in">
              <div className="px-4 py-3 border-b border-white/[0.05]">
                <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Vista previa de registros ({parsedRecords.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                      <th className="px-4 py-3 text-white/40 font-bold uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 text-white/40 font-bold uppercase tracking-wider">Ubicación</th>
                      <th className="px-4 py-3 text-white/40 font-bold uppercase tracking-wider">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRecords.slice(0, 10).map((r, idx) => (
                      <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-2 font-semibold text-white/70 capitalize">{r.tipo.replace(/_/g, " ")}</td>
                        <td className="px-4 py-2 text-white/40 font-mono">{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</td>
                        <td className="px-4 py-2 text-white/50 max-w-[200px] truncate">{r.descripcion || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRecords.length > 10 && (
                <div className="px-4 py-2 text-[10px] text-white/20 border-t border-white/[0.03]">
                  Mostrando los primeros 10 registros...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Simulador Live */}
      {activeTab === "simulador" && (
        <div className="space-y-4 animate-fade-in">
          <div className="metric-card">
            <h2 className="text-[13px] font-bold text-white font-[family-name:var(--font-outfit)] mb-3">
              Simulador de Alertas en Tiempo Real (Arequipa)
            </h2>
            <p className="text-xs text-white/50 mb-4 leading-relaxed">
              Genera incidentes en tiempo real localizados en puntos de interés y distritos clave de la provincia de Arequipa. 
              Estas alertas son inyectadas en Firestore de forma automática, activando el pipeline de Inteligencia Artificial (Gemini) en la nube.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <button onClick={() => triggerSimulation("robo_mano_armada")} disabled={simulating} className="btn-confirm !w-auto cursor-pointer">
                Simular Robo Armado
              </button>
              <button onClick={() => triggerSimulation("accidente")} disabled={simulating} className="btn-resolve !w-auto cursor-pointer">
                Simular Accidente Tránsito
              </button>
              <button onClick={() => triggerSimulation("vandalismo")} disabled={simulating} className="btn-secondary cursor-pointer">
                Simular Vandalismo
              </button>
              <button onClick={() => triggerSimulation("sospechoso")} disabled={simulating} className="btn-secondary cursor-pointer">
                Simular Sospechoso
              </button>
              <button onClick={() => triggerSimulation("choque")} disabled={simulating} className="btn-secondary cursor-pointer !text-orange-400 border-orange-500/20">
                Simular Choque Vehicular
              </button>
              <button onClick={() => triggerSimulation("incendio")} disabled={simulating} className="btn-secondary cursor-pointer !text-red-400 border-red-500/20">
                Simular Incendio
              </button>
              <button onClick={() => triggerSimulation("derrumbe")} disabled={simulating} className="btn-secondary cursor-pointer !text-yellow-400 border-yellow-500/20">
                Simular Derrumbe
              </button>
              <button onClick={triggerBurstSimulation} disabled={simulating} className="col-span-full border border-dashed border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]">
                🔥 Simular Ráfaga de Alertas Múltiples (5 incidentes)
              </button>
            </div>
            {simulationLog && (
              <div className="mt-4 p-4 bg-black/60 border border-white/[0.04] rounded-xl font-mono text-[11px] text-emerald-400/90 whitespace-pre-line leading-relaxed">
                {simulationLog}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
