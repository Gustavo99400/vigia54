"use client";

import { useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAppStore } from "@/store/useAppStore";
import { showToast } from "@/components/Toast";
import {
  Camera, AlertTriangle, Hammer, UserRound,
  Car, MapPin, Loader, Check, X,
  AlertCircle, AlertOctagon, Mountain,
} from "lucide-react";

type Step = 1 | 2 | 3;

const CATEGORIES = [
  {
    id: "robo_mano_armada",
    Icon: AlertTriangle,
    label: "Robo Armado",
    color: "text-red-400   bg-red-500/10   border-red-500/25",
  },
  {
    id: "vandalismo",
    Icon: Hammer,
    label: "Vandalismo",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  },
  {
    id: "sospechoso",
    Icon: UserRound,
    label: "Sospechoso",
    color: "text-white/70  bg-white/5      border-white/10",
  },
  {
    id: "accidente",
    Icon: Car,
    label: "Accidente",
    color: "text-blue-400  bg-blue-500/10  border-blue-500/25",
  },
  {
    id: "choque",
    Icon: AlertOctagon,
    label: "Choque Vehicular",
    color: "text-orange-400 bg-orange-500/10 border-orange-500/25",
  },
  {
    id: "incendio",
    Icon: AlertCircle,
    label: "Incendio",
    color: "text-red-500 bg-red-600/10 border-red-600/25",
  },
  {
    id: "derrumbe",
    Icon: Mountain,
    label: "Derrumbe",
    color: "text-yellow-500 bg-yellow-600/10 border-yellow-600/25",
  },
];

export default function ReportForm({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const user = useAppStore((s) => s.user);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
    setStep(2);
  };

  const handleCat = (cat: string) => { setCategory(cat); setStep(3); };

  const handleSubmit = async () => {
    if (!user) { showToast("Inicia sesión primero", "error"); return; }
    setLoading(true);
    try {
      let fotoUrl: string | null = null;
      if (file) {
        const sRef = ref(storage, `incidentes/${Date.now()}_${file.name}`);
        const snap = await uploadBytes(sRef, file);
        fotoUrl = await getDownloadURL(snap.ref);
      }
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
      ).catch(() => null);
      const lat = pos?.coords.latitude || -16.409;
      const lng = pos?.coords.longitude || -71.5375;

      await addDoc(collection(db, "incidentes"), {
        tipo: category, descripcion: desc || null,
        ubicacion: { latitude: lat, longitude: lng, geohash: `${lat.toFixed(3)}_${lng.toFixed(3)}` },
        evidencia: { fotoUrl, audioUrl: null },
        estado: "revision_ia", prioridad: 3,
        timestamp: serverTimestamp(), usuarioId: user.uid,
      });
      showToast("Reporte enviado. La IA lo analizará en breve.", "success");
      onClose();
    } catch (err) {
      console.error(err);
      showToast("Error al enviar el reporte", "error");
      setLoading(false);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.id === category);

  return (
    <div className="report-overlay animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="report-sheet animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white font-[family-name:var(--font-outfit)]">Nuevo Reporte</h2>
            <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wider">Paso {step} de 3</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/7 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
            aria-label="Cerrar"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-400 ${s <= step ? "bg-white" : "bg-white/10"}`} />
          ))}
        </div>

        {/* Step 1 — Captura */}
        {step === 1 && (
          <div className="animate-fade-in text-center space-y-4">
            <label className="flex flex-col items-center justify-center h-48 w-full border border-dashed border-white/12 rounded-2xl bg-white/[0.015] cursor-pointer hover:bg-white/[0.04] hover:border-white/20 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-3">
                <Camera size={24} strokeWidth={1.5} className="text-white/50" />
              </div>
              <span className="text-sm font-semibold text-white/65">Tomar Foto o Video</span>
              <span className="text-[10px] text-white/25 mt-1">Toca para abrir la cámara</span>
              <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleFile} />
            </label>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-white/40 hover:text-white/70 transition-all underline cursor-pointer inline-block"
            >
              Reportar sin foto
            </button>
          </div>
        )}

        {/* Step 2 — Categoría */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            {preview && (
              <div className="w-full h-24 rounded-xl overflow-hidden border border-white/[0.06]">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Selecciona la categoría</p>
            <div className="grid grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => handleCat(cat.id)}
                  className={`cat-btn ${cat.color}`}>
                  <cat.Icon size={22} strokeWidth={1.5} />
                  <span className="text-xs font-bold">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Confirmar */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            {/* Textarea */}
            <div>
              <label className="text-[10px] text-white/25 uppercase tracking-widest font-bold block mb-2">
                Descripción <span className="text-white/15 normal-case">(opcional, mejora el análisis IA)</span>
              </label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
                placeholder="Describe qué ocurrió..."
                rows={3}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/15 transition-colors" />
            </div>

            {/* Resumen */}
            <div className="bg-white/[0.025] rounded-2xl p-4 border border-white/[0.05] space-y-3">
              {[
                {
                  label: "Categoría",
                  value: selectedCat ? selectedCat.label : "—",
                  Icon: selectedCat ? selectedCat.Icon : null,
                },
                {
                  label: "Evidencia",
                  value: file ? file.name.slice(0, 20) : "Sin foto",
                  Icon: Camera,
                },
                {
                  label: "Ubicación",
                  value: "GPS Activo",
                  Icon: MapPin,
                  green: true,
                },
              ].map(({ label, value, Icon, green }, i) => (
                <div key={label}>
                  {i > 0 && <div className="h-px bg-white/[0.04] mb-3" />}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/30 font-semibold uppercase tracking-wider">{label}</span>
                    <span className={`text-sm font-medium flex items-center gap-1.5 ${green ? "text-emerald-400" : "text-white/70"}`}>
                      {Icon && <Icon size={12} strokeWidth={2} />}
                      {value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Enviar */}
            <button onClick={handleSubmit} disabled={loading} id="btn-confirm-report"
              className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {loading
                ? <><Loader size={15} strokeWidth={2} className="animate-spin" /> Subiendo evidencia...</>
                : <><Check size={15} strokeWidth={2.5} /> Confirmar Envío</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
