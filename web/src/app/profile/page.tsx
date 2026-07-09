'use client';
// ============================================================
// VIGÍA 54 — Profile Page (RF7)
// User profile management
// ============================================================
import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile }  from 'firebase/auth';
import { auth, db }       from '@/lib/firebase';
import { RoleGuard }      from '@/components/layout/RoleGuard';
import { Sidebar }        from '@/components/layout/Sidebar';
import { useAppStore }    from '@/store/useAppStore';
import { getTrustLabel }  from '@/utils/trustScore';
import { AREQUIPA_DISTRICTS } from '@/utils/geo';
import { User } from 'lucide-react';


export default function ProfilePage() {
  const { user, setUser, showNotification } = useAppStore();
  const [name, setName]       = useState(user?.displayName ?? '');
  const [district, setDistrict] = useState(user?.district ?? '');
  const [saving, setSaving]   = useState(false);

  const trustInfo = getTrustLabel(user?.trustScore ?? 100);
  const trustColor: Record<string, string> = {
    high: 'var(--success)', medium: 'var(--warning)', low: 'var(--danger)', critical: 'var(--danger)'
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !auth.currentUser) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: name });
      await updateDoc(doc(db, 'users', user.uid), { displayName: name, district });
      setUser({ ...user, displayName: name, district });
      showNotification('success', 'Perfil actualizado correctamente.');
    } catch {
      showNotification('error', 'Error al actualizar el perfil.');
    } finally { setSaving(false); }
  }

  if (!user) return null;

  const initials = user.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <RoleGuard>
      <div className="page-wrapper">
        <Sidebar />
        <div className="main-content">
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} strokeWidth={2} style={{ color: '#60a5fa' }} />
              <span className="topbar-title">Mi Perfil</span>
            </div>
          </header>

          <div className="page-inner" style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Profile card */}
              <div className="card animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--brand-600), var(--brand-400))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.75rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div>
                  <h2>{user.displayName}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user.email}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <span className={`badge ${user.role === 'admin' ? 'badge-danger' : user.role === 'agente' ? 'badge-info' : 'badge-muted'}`}>
                      {user.role}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Miembro desde {new Date(user.createdAt).toLocaleDateString('es-PE')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust Score card */}
              <div className="card animate-fade-in">
                <h3 style={{ marginBottom: '1rem' }}>🏆 Trust Score</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '3rem', fontWeight: 900, color: trustColor[trustInfo.level]
                    }}>
                      {user.trustScore}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: trustColor[trustInfo.level], fontWeight: 700 }}>
                      {trustInfo.label}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: 'var(--surface-2)', borderRadius: 999, height: 12, overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{
                        height: '100%',
                        width: `${user.trustScore}%`,
                        background: `linear-gradient(90deg, ${trustColor[trustInfo.level]}, ${trustColor[trustInfo.level]}88)`,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div className="stat-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{user.totalReports}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total</div>
                      </div>
                      <div className="stat-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{user.verifiedReports}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Verificados</div>
                      </div>
                      <div className="stat-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>{user.falseAlarms}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Falsas alarmas</div>
                      </div>
                    </div>
                    {user.trustScore < 30 && (
                      <div className="alert alert-danger" style={{ marginTop: 12 }}>
                        ⚠️ Tu Trust Score está por debajo de 30. El triaje por IA ha sido deshabilitado y tus reportes requieren revisión manual.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit form */}
              <div className="card animate-fade-in">
                <h3 style={{ marginBottom: '1rem' }}>✏️ Editar Información</h3>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-name">Nombre completo</label>
                    <input id="profile-name" type="text" className="form-input"
                      value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-email">Correo electrónico</label>
                    <input id="profile-email" type="email" className="form-input"
                      value={user.email} disabled style={{ opacity: 0.6 }} />
                    <span className="form-hint">El correo no puede modificarse.</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-district">Distrito de residencia</label>
                    <select id="profile-district" className="form-input"
                      value={district} onChange={e => setDistrict(e.target.value)}>
                      <option value="">Sin especificar</option>
                      {Object.entries(AREQUIPA_DISTRICTS).map(([k, d]) => (
                        <option key={k} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <button id="btn-save-profile" type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner" /> Guardando...</> : '💾 Guardar cambios'}
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
