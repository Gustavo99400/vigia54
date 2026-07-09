'use client';
// ============================================================
// VIGÍA 54 — Map Page (RF4 + RF2)
// Interactive geospatial map with filters and heatmap
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Sidebar }   from '@/components/layout/Sidebar';
import { useAppStore } from '@/store/useAppStore';
import { subscribeToReports, fetchHeatmapData, updateReportStatus, submitReport } from '@/lib/firestore';
import { AREQUIPA_DISTRICTS, getNearestDistrict } from '@/utils/geo';
import type { Report, CrimeType, FilterState } from '@/types';
import { Map as MapIcon, Flame } from 'lucide-react';


const CRIME_COLORS: Record<CrimeType | string, string> = {
  robo:         '#ef4444',
  hurto:        '#f59e0b',
  violencia:    '#dc2626',
  accidente:    '#3b82f6',
  vandalismo:   '#8b5cf6',
  narcotráfico: '#ec4899',
  otro:         '#64748b',
};

const STATUS_BADGE: Record<string, string> = {
  pending:    'badge-warning',
  verified:   'badge-success',
  false_alarm:'badge-danger',
  reviewing:  'badge-info',
  resolved:   'badge-success',
};

export default function MapPage() {
  const mapRef    = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const mapInstance = useRef<import('leaflet').Map | null>(null);
  const markersRef  = useRef<import('leaflet').Marker[]>([]);
  const hotHeatLayer   = useRef<any>(null);
  const resolvedHeatLayer = useRef<any>(null);

  const { user, filters, setFilter, resetFilters, showNotification } = useAppStore();
  const [reports, setReports]   = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [showHeat, setShowHeat] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  const handleStatusChange = async (reportId: string, status: Report['status']) => {
    try {
      await updateReportStatus(reportId, status);
      if (selected && selected.id === reportId) {
        setSelected(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      console.error("Error updating status on map:", err);
    }
  };

  const handleSOSClick = async () => {
    if (!user) {
      showNotification('error', 'Debes iniciar sesión para activar la alerta SOS.');
      return;
    }

    const confirmed = window.confirm(
      '🚨 ¿Estás seguro de enviar una alerta SOS?\n\n' +
      'Esto enviará tus coordenadas actuales de forma inmediata y quedará verificado de forma automática.'
    );
    if (!confirmed) return;

    setSosLoading(true);
    showNotification('info', 'Obteniendo ubicación GPS actual...');

    if (!navigator.geolocation) {
      showNotification('error', 'Tu navegador no soporta geolocalización.');
      setSosLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const nearestDistrict = getNearestDistrict(latitude, longitude);

        try {
          await submitReport({
            authorId: user.uid,
            type: 'otro',
            description: '🚨 ALERTA DE EMERGENCIA SOS: Activada en tiempo real mediante el botón de pánico.',
            lat: latitude,
            lng: longitude,
            district: nearestDistrict,
            isSos: true,
          });
          showNotification('success', '🚨 Alerta SOS enviada con éxito. Autoridades notificadas.');
        } catch (error) {
          console.error(error);
          showNotification('error', 'Error al transmitir la señal SOS.');
        } finally {
          setSosLoading(false);
        }
      },
      (error) => {
        let msg = 'Error de ubicación.';
        if (error.code === 1) msg = 'Permiso de ubicación denegado.';
        showNotification('error', `No se pudo obtener ubicación: ${msg}`);
        setSosLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Initialize Leaflet map ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');
      // @ts-ignore
      await import('leaflet/dist/leaflet.css');
      if (cancelled) return;
      leafletRef.current = L;

      const map = L.map(mapRef.current!, {
        center: [-16.4, -71.537],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstance.current = map;
      setMapReady(true);
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Subscribe to real-time reports ───────────────────────
  useEffect(() => {
    const unsub = subscribeToReports(filters, setReports);
    return unsub;
  }, [filters]);

  // ── Render markers ────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !leafletRef.current) return;
    const L = leafletRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    reports.forEach(r => {
      const color = CRIME_COLORS[r.type] ?? '#64748b';
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer"></div>`,
        iconSize: [14, 14],
        className: '',
      });
      const marker = L.marker([r.location.lat, r.location.lng], { icon });
      marker.on('click', () => setSelected(r));
      marker.addTo(mapInstance.current!);
      markersRef.current.push(marker);
    });
  }, [reports, mapReady]);

  // ── Toggle heatmap layer (RF2) ────────────────────────────
  const toggleHeatmap = useCallback(async () => {
    if (!mapReady || !mapInstance.current) return;
    if (showHeat) {
      hotHeatLayer.current?.remove();
      resolvedHeatLayer.current?.remove();
      hotHeatLayer.current = null;
      resolvedHeatLayer.current = null;
      setShowHeat(false);
      return;
    }
    const { hotPoints, resolvedPoints } = await fetchHeatmapData();
    const L = leafletRef.current!;
    // @ts-ignore
    window.L = L;
    // @ts-ignore
    await import('leaflet.heat');
    
    // @ts-ignore
    hotHeatLayer.current = (window as any).L.heatLayer(
      hotPoints.map(p => [p.lat, p.lng, p.weight]),
      { radius: 25, blur: 15, maxZoom: 17, gradient: { 0.4: '#ef4444', 0.7: '#f59e0b', 1.0: '#b91c1c' } }
    ).addTo(mapInstance.current);

    // @ts-ignore
    resolvedHeatLayer.current = (window as any).L.heatLayer(
      resolvedPoints.map(p => [p.lat, p.lng, p.weight]),
      { radius: 25, blur: 15, maxZoom: 17, gradient: { 0.4: '#34d399', 0.7: '#059669', 1.0: '#065f46' } }
    ).addTo(mapInstance.current);

    setShowHeat(true);
  }, [showHeat, mapReady]);

  const districts = Object.entries(AREQUIPA_DISTRICTS);

  return (
    <RoleGuard>
      <div className="page-wrapper">
        <Sidebar />
        <div className="main-content">
          {/* Topbar */}
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapIcon size={20} strokeWidth={2} style={{ color: '#60a5fa' }} />
              <span className="topbar-title">Mapa en Vivo</span>
              <span className="badge badge-info" style={{ marginLeft: 12 }}>
                {reports.length} incidencias
              </span>
            </div>
            <div className="topbar-actions">
              <button
                id="btn-map-sos"
                className="btn btn-sm"
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  animation: 'pulseSOS 2s infinite',
                }}
                onClick={handleSOSClick}
                disabled={sosLoading}
              >
                🚨 {sosLoading ? 'Enviando...' : 'Pánico SOS'}
              </button>
              <button
                id="btn-toggle-heatmap"
                className={`btn btn-sm ${showHeat ? 'btn-danger' : 'btn-ghost'}`}
                onClick={toggleHeatmap}
                title="Activar/desactivar mapa de calor predictivo (RF2)"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Flame size={16} />
                {showHeat ? 'Ocultar calor' : 'Ver calor predictivo'}
              </button>
              <button id="btn-reset-filters" className="btn btn-ghost btn-sm" onClick={resetFilters}>
                ↺ Limpiar filtros
              </button>
            </div>
          </header>

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Filters panel (RF4) */}
            <aside style={{
              width: 240, background: 'var(--surface-1)', borderRight: '1px solid var(--glass-border)',
              padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Filtros Geoespaciales
              </h3>

              <div className="form-group">
                <label className="form-label" htmlFor="filter-district">Distrito</label>
                <select id="filter-district" className="form-input"
                  value={filters.district}
                  onChange={e => setFilter('district', e.target.value)}
                >
                  <option value="">Todos los distritos</option>
                  {districts.map(([key, d]) => (
                    <option key={key} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="filter-type">Tipo de delito</label>
                <select id="filter-type" className="form-input"
                  value={filters.type}
                  onChange={e => setFilter('type', e.target.value as CrimeType | '')}
                >
                  <option value="">Todos</option>
                  <option value="robo">🔴 Robo</option>
                  <option value="hurto">🟡 Hurto</option>
                  <option value="violencia">🔴 Violencia</option>
                  <option value="accidente">🔵 Accidente</option>
                  <option value="vandalismo">🟣 Vandalismo</option>
                  <option value="narcotráfico">💜 Narcotráfico</option>
                  <option value="otro">⚪ Otro</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="filter-status">Estado</label>
                <select id="filter-status" className="form-input"
                  value={filters.status}
                  onChange={e => setFilter('status', e.target.value as FilterState['status'])}
                >
                  <option value="">Todos</option>
                  <option value="pending">⏳ Pendiente</option>
                  <option value="verified">✅ Verificado</option>
                  <option value="resolved">🟢 Resuelto</option>
                  <option value="false_alarm">❌ Falsa alarma</option>
                  <option value="reviewing">🔍 En revisión</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Rango de Hora (0-23)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="form-input"
                    value={filters.startHour}
                    onChange={e => setFilter('startHour', Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                    placeholder="Desde"
                    style={{ width: '50%' }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="form-input"
                    value={filters.endHour}
                    onChange={e => setFilter('endHour', Math.max(0, Math.min(23, parseInt(e.target.value) || 23)))}
                    placeholder="Hasta"
                    style={{ width: '50%' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="filter-date-from">Desde Fecha</label>
                <input
                  id="filter-date-from"
                  type="date"
                  className="form-input"
                  value={filters.dateFrom}
                  onChange={e => setFilter('dateFrom', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="filter-date-to">Hasta Fecha</label>
                <input
                  id="filter-date-to"
                  type="date"
                  className="form-input"
                  value={filters.dateTo}
                  onChange={e => setFilter('dateTo', e.target.value)}
                />
              </div>

              {/* Legend */}
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                  LEYENDA
                </div>
                {Object.entries(CRIME_COLORS).map(([type, color]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: '0.8rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{type}</span>
                  </div>
                ))}
              </div>
            </aside>

            {/* Map area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div ref={mapRef} style={{ flex: 1 }} />

              {/* Selected report popup */}
              {selected && (
                <div style={{
                  position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                  border: '1px solid var(--glass-border)', borderRadius: 12, padding: '1rem',
                  minWidth: 300, maxWidth: 420, zIndex: 1000, animation: 'fadeIn 0.2s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className={`badge ${STATUS_BADGE[selected.status]}`}>{selected.status}</span>
                      <h4 style={{ marginTop: 6, textTransform: 'capitalize' }}>{selected.type}</h4>
                    </div>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelected(null)}>✕</button>
                  </div>
                  <p style={{ fontSize: '0.875rem', marginTop: 8, color: 'var(--text-secondary)', lineClamp: 3 }}>
                    {selected.description}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>📍 {selected.district}</span>
                    <span>🕐 {new Date(selected.timestamp).toLocaleString('es-PE')}</span>
                    {selected.aiScore !== undefined && selected.aiScore !== null && (
                      <span>🤖 IA: {Math.round(selected.aiScore * 100)}%</span>
                    )}
                  </div>
                  {user && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
                      {selected.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 10px', borderRadius: '4px' }}
                            onClick={() => handleStatusChange(selected.id, 'verified')}
                          >
                            Verificar
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontWeight: 600, padding: '4px 10px', borderRadius: '4px' }}
                            onClick={() => handleStatusChange(selected.id, 'false_alarm')}
                          >
                            Falsa Alarma
                          </button>
                        </>
                      )}
                      {selected.status === 'verified' && (
                        <button
                          className="btn btn-sm"
                          style={{ background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 10px', borderRadius: '4px' }}
                          onClick={() => handleStatusChange(selected.id, 'resolved')}
                        >
                          Resolver Caso
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulseSOS {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); transform: scale(1); }
          50% { box-shadow: 0 0 12px 6px rgba(220, 38, 38, 0); transform: scale(1.02); }
        }
      `}} />
    </RoleGuard>
  );
}
