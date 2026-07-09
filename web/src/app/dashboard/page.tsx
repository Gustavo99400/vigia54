'use client';
// ============================================================
// VIGÍA 54 — Dashboard Page (RF5)
// Analytics dashboard for agents and admins
// ============================================================
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { RoleGuard }      from '@/components/layout/RoleGuard';
import { Sidebar }        from '@/components/layout/Sidebar';
import { subscribeToReports, updateReportStatus } from '@/lib/firestore';
import { useAppStore }    from '@/store/useAppStore';
import { BarChart3, FileText, Clock, CheckCircle2, Cpu, AlertTriangle } from 'lucide-react';
import { haversineDistance } from '@/utils/geo';

import type { Report }    from '@/types';

const COLORS = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#ec4899','#64748b'];

export default function DashboardPage() {
  const [reports, setReports]   = useState<Report[]>([]);
  const [loading, setLoading]   = useState(true);
  const { showNotification }    = useAppStore();
  const [activeAlert, setActiveAlert] = useState<{
    type: string;
    district: string;
    description: string;
    timestamp: string;
  } | null>(null);
  const [selectedReportForAnalysis, setSelectedReportForAnalysis] = useState<Report | null>(null);

  function playSirenSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      mod.frequency.value = 2.5;
      modGain.gain.value = 160;
      
      mod.connect(modGain);
      modGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      
      mod.start();
      osc.start();
      
      setTimeout(() => {
        try {
          osc.stop();
          mod.stop();
          ctx.close();
        } catch (e) {}
      }, 2500);
    } catch (err) {
      console.warn('Web Audio not supported', err);
    }
  }

  useEffect(() => {
    const unsub = subscribeToReports({}, (data) => {
      setReports(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Aggregate stats ───────────────────────────────────────
  const total     = reports.length;
  const pending   = reports.filter(r => r.status === 'pending').length;
  const verified  = reports.filter(r => r.status === 'verified').length;
  const falseAlarm= reports.filter(r => r.status === 'false_alarm').length;

  // By type
  const byType = Object.entries(
    reports.reduce((acc, r) => { acc[r.type] = (acc[r.type] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // By district
  const byDistrict = Object.entries(
    reports.reduce((acc, r) => { acc[r.district] = (acc[r.district] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 8)
   .map(([name, value]) => ({ name, value }));

  // By hour
  const byHour = Array.from({ length: 24 }, (_, h) => ({
    hora: `${h}:00`,
    reportes: reports.filter(r => r.hour === h).length,
  }));

  // AI accuracy
  const aiReports = reports.filter(r => r.aiScore !== undefined && r.aiScore !== null);
  const avgAiScore = aiReports.length
    ? (aiReports.reduce((s, r) => s + (r.aiScore ?? 0), 0) / aiReports.length * 100).toFixed(1)
    : '—';

  // Status update
  async function handleStatusChange(id: string, status: Report['status']) {
    await updateReportStatus(id, status);
    
    if (status === 'false_alarm') {
      showNotification('error', `Reporte catalogado como Falsa Alarma - Descartando`);
    } else if (status === 'verified') {
      const report = reports.find(r => r.id === id);
      if (report) {
        setActiveAlert({
          type: report.type,
          district: report.district,
          description: report.description,
          timestamp: new Date(report.timestamp).toLocaleString('es-PE'),
        });
        playSirenSound();
      }
      showNotification('success', `Reporte verificado. Alerta enviada a Serenazgo.`);
    } else if (status === 'resolved') {
      showNotification('success', `Incidencia resuelta. El mapa ahora marcará esta zona en verde.`);
    } else {
      showNotification('success', `Reporte actualizado a: ${status}`);
    }
  }

  return (
    <RoleGuard allowedRoles={['agente','admin']}>
      <div className="page-wrapper">
        <Sidebar />
        <div className="main-content">
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} strokeWidth={2} style={{ color: '#60a5fa' }} />
              <span className="topbar-title">Dashboard Analítico</span>
            </div>
            <span className="badge badge-info">{total} reportes totales</span>
          </header>

          <div className="page-inner">
            {/* Stats */}
            <div className="stats-grid animate-fade-in">
              <div className="stat-card">
                <div className="stat-icon stat-icon-blue"><FileText size={20} /></div>
                <div className="stat-value">{total}</div>
                <div className="stat-label">Total Reportes</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon stat-icon-yellow"><Clock size={20} /></div>
                <div className="stat-value">{pending}</div>
                <div className="stat-label">Pendientes</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon stat-icon-green"><CheckCircle2 size={20} /></div>
                <div className="stat-value">{verified}</div>
                <div className="stat-label">Verificados</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon stat-icon-red"><Cpu size={20} /></div>
                <div className="stat-value">{avgAiScore}%</div>
                <div className="stat-label">Confianza IA Promedio</div>
              </div>
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* By type pie */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Incidencias por Tipo</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* By district bar */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Top Distritos</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byDistrict} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By hour line chart */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3 className="card-title">Distribución Horaria de Incidencias</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hora" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={2} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="reportes" stroke="#60a5fa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pending reports table */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Reportes Pendientes de Revisión</h3>
                <span className="badge badge-warning">{pending} pendientes</span>
              </div>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 50 }} />)}
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Distrito</th>
                        <th>Descripción</th>
                        <th>Fecha</th>
                        <th>IA Score</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.filter(r => r.status === 'pending').slice(0, 20).map(r => (
                        <tr key={r.id}>
                          <td><span style={{ textTransform: 'capitalize' }}>{r.type}</span></td>
                          <td>{r.district}</td>
                          <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.description}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(r.timestamp).toLocaleDateString('es-PE')}
                          </td>
                          <td>
                            {r.aiScore !== undefined && r.aiScore !== null
                              ? <span className={`badge ${r.aiScore > 0.7 ? 'badge-success' : r.aiScore > 0.4 ? 'badge-warning' : 'badge-danger'}`}>
                                  {Math.round(r.aiScore * 100)}%
                                </span>
                              : <span className="badge badge-muted">—</span>
                            }
                          </td>
                          <td>
                             <div style={{ display: 'flex', gap: 6 }}>
                               <button
                                 className="btn btn-sm"
                                 style={{
                                   background: '#22c55e',
                                   color: '#ffffff',
                                   border: 'none',
                                   fontWeight: 600,
                                   padding: '4px 10px',
                                 }}
                                 onClick={() => {
                                   handleStatusChange(r.id, 'verified');
                                   showNotification('success', '¡Reporte verificado! Alerta despachada de inmediato al Serenazgo de la zona.');
                                 }}
                                 title="Verificar y despachar al Serenazgo"
                               >
                                 Verificar
                               </button>
                               <button
                                 className="btn btn-sm"
                                 style={{
                                   background: 'rgba(239,68,68,0.15)',
                                   color: '#ef4444',
                                   border: '1px solid rgba(239,68,68,0.3)',
                                   fontWeight: 600,
                                   padding: '4px 10px',
                                 }}
                                 onClick={() => {
                                   handleStatusChange(r.id, 'false_alarm');
                                   showNotification('info', 'Reporte descartado como No Verificado.');
                                 }}
                                 title="Descartar reporte"
                               >
                                 No Verificado
                               </button>
                               <button
                                 className="btn btn-sm"
                                 style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                 onClick={() => setSelectedReportForAnalysis(r)}
                                 title="Analizar Contexto de IA y Proximidad"
                               >
                                 <span>🤖</span>
                                 <span>Analizar IA</span>
                               </button>
                             </div>
                           </td>
                        </tr>
                      ))}
                      {reports.filter(r => r.status === 'pending').length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          ✅ No hay reportes pendientes
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Verified reports card */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="card-header" style={{ borderLeft: '4px solid var(--success)' }}>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                  Reportes Verificados (En proceso de atención)
                </h3>
                <span className="badge badge-success">{reports.filter(r => r.status === 'verified').length} en proceso</span>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Distrito</th>
                      <th>Descripción</th>
                      <th>Fecha</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.filter(r => r.status === 'verified').slice(0, 20).map(r => (
                      <tr key={r.id}>
                        <td><span style={{ textTransform: 'capitalize' }}>{r.type}</span></td>
                        <td>{r.district}</td>
                        <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.description}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(r.timestamp).toLocaleDateString('es-PE')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-sm"
                              style={{
                                background: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 600,
                                padding: '4px 10px',
                              }}
                              onClick={() => handleStatusChange(r.id, 'resolved')}
                              title="Marcar incidencia como resuelta"
                            >
                              Resolver
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => setSelectedReportForAnalysis(r)}
                              title="Analizar Contexto de IA y Proximidad"
                            >
                              <span>🤖</span>
                              <span>Analizar IA</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reports.filter(r => r.status === 'verified').length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No hay reportes verificados activos.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Dispatch Simulation Alert Modal */}
      {activeAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0728 100%)',
            border: '2px solid #ef4444',
            borderRadius: '16px',
            padding: '2.5rem',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 0 50px rgba(239, 68, 68, 0.4)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes sirenBar {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
              @keyframes pulseSiren {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                100% { transform: scale(1.1); box-shadow: 0 0 20px 10px rgba(239, 68, 68, 0); }
              }
            `}} />
            
            {/* Sirena visual pulsing effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: 'linear-gradient(90deg, #ef4444 0%, #3b82f6 50%, #ef4444 100%)',
              backgroundSize: '200% 100%',
              animation: 'sirenBar 2s linear infinite'
            }} />

            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239,68,68,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              border: '3px solid #ef4444',
              animation: 'pulseSiren 1s infinite alternate'
            }}>
              <AlertTriangle size={40} color="#ef4444" />
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', letterSpacing: '1px' }}>
              ¡DESPACHO DE EMERGENCIA!
            </h2>
            <p style={{ color: '#f87171', fontWeight: 600, fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Alerta enviada en tiempo real a Serenazgo
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'left',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                <span>TIPO:</span>
                <span style={{ color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>{activeAlert.type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                <span>DISTRITO:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{activeAlert.district}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>DESCRIPCIÓN:</span>
                <p style={{ color: '#e2e8f0', fontSize: '0.875rem', margin: 0, lineHeight: 1.4 }}>{activeAlert.description}</p>
              </div>
            </div>

            <button
              className="btn"
              style={{
                background: 'linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)',
                color: '#fff',
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(239,68,68,0.2)'
              }}
              onClick={() => setActiveAlert(null)}
            >
              Entendido / Confirmar Despacho
            </button>
          </div>
        </div>
      )}

      {/* AI Inspector & Geographic Correlation Modal */}
      {selectedReportForAnalysis && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '650px',
            width: '92%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={24} style={{ color: 'var(--brand-400)' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Inspector de Inteligencia Artificial</h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ minWidth: '32px', height: '32px', borderRadius: '50%', padding: 0 }}
                onClick={() => setSelectedReportForAnalysis(null)}
              >✕</button>
            </div>

            {/* Report summary card */}
            <div style={{
              background: 'var(--surface-2)',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ textTransform: 'capitalize', fontWeight: 700, color: 'var(--brand-300)' }}>
                  {selectedReportForAnalysis.type}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  📍 {selectedReportForAnalysis.district}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {selectedReportForAnalysis.description}
              </p>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Reportado el: {new Date(selectedReportForAnalysis.timestamp).toLocaleString('es-PE')}
              </div>
            </div>

            {/* AI Triage Section */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                CONTEXTO DE TRIAJE GENERADO POR IA
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* Score */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Confianza de IA:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: (selectedReportForAnalysis.aiScore ?? 0.5) > 0.7
                        ? 'var(--success)'
                        : (selectedReportForAnalysis.aiScore ?? 0.5) > 0.4
                        ? 'var(--warning)'
                        : 'var(--danger)'
                    }}>
                      {Math.round((selectedReportForAnalysis.aiScore ?? 0.5) * 100)}%
                    </span>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(selectedReportForAnalysis.aiScore ?? 0.5) * 100}%`,
                        background: (selectedReportForAnalysis.aiScore ?? 0.5) > 0.7
                          ? 'var(--success)'
                          : (selectedReportForAnalysis.aiScore ?? 0.5) > 0.4
                          ? 'var(--warning)'
                          : 'var(--danger)'
                      }} />
                    </div>
                  </div>
                </div>
                {/* Priority */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Prioridad Asignada:</div>
                  <span className={`badge ${
                    selectedReportForAnalysis.priority === 'critical' || selectedReportForAnalysis.priority === 'high'
                      ? 'badge-danger'
                      : selectedReportForAnalysis.priority === 'medium'
                      ? 'badge-warning'
                      : 'badge-info'
                  }`} style={{ textTransform: 'uppercase', padding: '4px 8px', fontSize: '0.8rem', fontWeight: 700 }}>
                    {selectedReportForAnalysis.priority ?? 'medium'}
                  </span>
                </div>
              </div>

              <div style={{
                background: 'rgba(96,165,250,0.05)',
                border: '1px solid rgba(96,165,250,0.15)',
                borderRadius: '10px',
                padding: '1rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-300)', display: 'block', marginBottom: '0.25rem' }}>
                  🤖 RESUMEN ANALÍTICO DE GEMINI:
                </span>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4, fontStyle: 'italic' }}>
                  {selectedReportForAnalysis.aiAnalysis || 'Análisis de triaje contextual no disponible para este reporte.'}
                </p>
              </div>
            </div>

            {/* Geographic Correlation */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                CORRELACIÓN GEOGRÁFICA Y PROXIMIDAD (RADIO 1.5 KM)
              </h4>

              {/* Calculations block */}
              {(() => {
                const nearby = reports.filter(r => {
                  if (r.id === selectedReportForAnalysis.id) return false;
                  if (r.status === 'false_alarm') return false;
                  const dist = haversineDistance(
                    { lat: selectedReportForAnalysis.location.lat, lng: selectedReportForAnalysis.location.lng },
                    { lat: r.location.lat, lng: r.location.lng }
                  );
                  return dist <= 1.5;
                }).map(r => {
                  const dist = haversineDistance(
                    { lat: selectedReportForAnalysis.location.lat, lng: selectedReportForAnalysis.location.lng },
                    { lat: r.location.lat, lng: r.location.lng }
                  );
                  return { ...r, distance: dist };
                }).sort((a, b) => a.distance - b.distance);

                let dangerText = 'Estable — Sin incidencias cercanas';
                let dangerColor = 'var(--success)';
                let dangerBg = 'rgba(34,197,94,0.1)';
                let dangerBorder = 'rgba(34,197,94,0.3)';

                if (nearby.length >= 3) {
                  dangerText = '🚨 Peligro Extremo — Clúster Activo Detectado';
                  dangerColor = 'var(--danger)';
                  dangerBg = 'rgba(239,68,68,0.1)';
                  dangerBorder = 'rgba(239,68,68,0.4)';
                } else if (nearby.length > 0) {
                  dangerText = '⚠️ Precaución — Incidentes Cercanos';
                  dangerColor = 'var(--warning)';
                  dangerBg = 'rgba(245,158,11,0.1)';
                  dangerBorder = 'rgba(245,158,11,0.3)';
                }

                return (
                  <>
                    {/* Hazard Level Badge */}
                    <div style={{
                      background: dangerBg,
                      border: `1px solid ${dangerBorder}`,
                      color: dangerColor,
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertTriangle size={18} />
                      <span>{dangerText} ({nearby.length} {nearby.length === 1 ? 'incidente correlacionado' : 'incidentes correlacionados'})</span>
                    </div>

                    {/* Correlated list */}
                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {nearby.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                          No se encontraron reportes o alarmas activos en un radio de 1.5 km.
                        </div>
                      ) : (
                        nearby.map(n => (
                          <div key={n.id} style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            padding: '0.6rem 0.8rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.8rem'
                          }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ textTransform: 'capitalize', fontWeight: 700, color: 'var(--brand-300)' }}>{n.type}</span>
                                <span className={`badge ${n.status === 'verified' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem', padding: '2px 4px' }}>
                                  {n.status === 'verified' ? 'Verificado' : 'Pendiente'}
                                </span>
                              </div>
                              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {n.description}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ color: 'var(--brand-400)', fontWeight: 700 }}>{(n.distance * 1000).toFixed(0)}m</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{n.district}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Close Button */}
            <button
              className="btn"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--glass-border)', color: '#fff', padding: '0.75rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer' }}
              onClick={() => setSelectedReportForAnalysis(null)}
            >
              Cerrar Panel Inspector
            </button>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}
