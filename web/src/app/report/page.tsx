'use client';
// ============================================================
// VIGÍA 54 — Report Page (RF8)
// Manual incident report form with GPS capture
// ============================================================
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Sidebar }   from '@/components/layout/Sidebar';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAppStore }    from '@/store/useAppStore';
import { submitReport }   from '@/lib/firestore';
import { AREQUIPA_DISTRICTS } from '@/utils/geo';
import type { CrimeType } from '@/types';
import { AlertTriangle } from 'lucide-react';


const CRIME_TYPES: { value: CrimeType; label: string; icon: string }[] = [
  { value: 'robo',         label: 'Robo',        icon: '💰' },
  { value: 'hurto',        label: 'Hurto',       icon: '🏃' },
  { value: 'violencia',    label: 'Violencia',   icon: '🤜' },
  { value: 'accidente',    label: 'Accidente',   icon: '🚗' },
  { value: 'vandalismo',   label: 'Vandalismo',  icon: '🎨' },
  { value: 'narcotráfico', label: 'Narcotráfico',icon: '💊' },
  { value: 'otro',         label: 'Otro',        icon: '⚠️' },
];

export default function ReportPage() {
  const router = useRouter();
  const { user, showNotification } = useAppStore();
  const geo = useGeolocation();

  const [type, setType]             = useState<CrimeType>('robo');
  const [description, setDescription] = useState('');
  const [district, setDistrict]     = useState('');
  const [manualLat, setManualLat]   = useState('');
  const [manualLng, setManualLng]   = useState('');
  const [useManual, setUseManual]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lat = useManual ? parseFloat(manualLat) : (geo.lat ?? 0);
  const lng = useManual ? parseFloat(manualLng) : (geo.lng ?? 0);
  const hasLocation = useManual ? (!!manualLat && !!manualLng) : (geo.lat !== null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user)          { showNotification('error', 'Debes iniciar sesión.'); return; }
    if (!hasLocation)   { showNotification('error', 'Debes capturar o ingresar una ubicación.'); return; }
    if (!district)      { showNotification('error', 'Selecciona un distrito.'); return; }
    if (description.length < 20) { showNotification('error', 'La descripción debe tener al menos 20 caracteres.'); return; }

    setSubmitting(true);
    try {
      await submitReport({
        authorId: user.uid,
        type,
        description,
        lat,
        lng,
        district,
      });
      showNotification('success', '✅ Reporte enviado. Será evaluado por IA y revisores.');
      router.push('/map');
    } catch {
      showNotification('error', 'Error al enviar el reporte. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RoleGuard>
      <div className="page-wrapper">
        <Sidebar />
        <div className="main-content">
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} strokeWidth={2} style={{ color: '#60a5fa' }} />
              <span className="topbar-title">Nuevo Reporte de Incidencia</span>
            </div>
          </header>

          <div className="page-inner" style={{ maxWidth: 720 }}>
            <div className="card animate-fade-in">
              <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                Completa el formulario con la mayor cantidad de detalles posible. El reporte será
                procesado automáticamente por Inteligencia Artificial para su clasificación.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Type selection */}
                <div className="form-group">
                  <label className="form-label">Tipo de incidencia *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 8 }}>
                    {CRIME_TYPES.map(ct => (
                      <button
                        key={ct.value}
                        type="button"
                        id={`type-${ct.value}`}
                        onClick={() => setType(ct.value)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 10,
                          border: `2px solid ${type === ct.value ? 'var(--brand-500)' : 'var(--glass-border)'}`,
                          background: type === ct.value ? 'rgba(59,130,246,0.15)' : 'var(--surface-2)',
                          color: type === ct.value ? 'var(--brand-400)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          transition: 'all 0.15s',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{ct.icon}</span>
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label" htmlFor="description">
                    Descripción detallada * <span style={{ color: 'var(--text-muted)' }}>({description.length}/500)</span>
                  </label>
                  <textarea
                    id="description"
                    className="form-input"
                    rows={4}
                    maxLength={500}
                    placeholder="Describe lo ocurrido con el mayor detalle posible: circunstancias, personas involucradas, hora exacta, etc."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                    style={{ resize: 'vertical' }}
                  />
                  <span className="form-hint">Mínimo 20 caracteres.</span>
                </div>

                {/* District */}
                <div className="form-group">
                  <label className="form-label" htmlFor="district">Distrito *</label>
                  <select id="district" className="form-input" value={district}
                    onChange={e => setDistrict(e.target.value)} required>
                    <option value="">Selecciona un distrito</option>
                    {Object.entries(AREQUIPA_DISTRICTS).map(([key, d]) => (
                      <option key={key} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* GPS Location */}
                <div className="form-group">
                  <label className="form-label">Ubicación GPS *</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <button
                      id="btn-capture-gps"
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={geo.requestLocation}
                      disabled={geo.loading}
                    >
                      {geo.loading ? <><span className="spinner" /> Obteniendo...</> : '📍 Capturar GPS'}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${useManual ? 'btn-danger' : 'btn-ghost'}`}
                      onClick={() => setUseManual(!useManual)}
                    >
                      ✏️ {useManual ? 'Usar GPS' : 'Ingresar manualmente'}
                    </button>
                  </div>

                  {geo.error && <div className="alert alert-danger">{geo.error}</div>}

                  {useManual ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="manual-lat">Latitud</label>
                        <input id="manual-lat" type="number" className="form-input" step="any"
                          placeholder="-16.3989" value={manualLat} onChange={e => setManualLat(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="manual-lng">Longitud</label>
                        <input id="manual-lng" type="number" className="form-input" step="any"
                          placeholder="-71.5372" value={manualLng} onChange={e => setManualLng(e.target.value)} />
                      </div>
                    </div>
                  ) : geo.lat !== null ? (
                    <div className="alert alert-success">
                      ✅ Ubicación capturada: <strong>{geo.lat.toFixed(6)}, {geo.lng!.toFixed(6)}</strong>
                      {geo.accuracy && <> (precisión ±{Math.round(geo.accuracy)}m)</>}
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      📍 Presiona &quot;Capturar GPS&quot; para usar tu ubicación actual.
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  id="btn-submit-report"
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={submitting || !hasLocation}
                >
                  {submitting
                    ? <><span className="spinner" /> Enviando reporte...</>
                    : '🚨 Enviar Reporte'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
