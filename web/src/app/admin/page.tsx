'use client';
// ============================================================
// VIGÍA 54 — Admin Page (RF3 - ETL + RF6 - User Management)
// ============================================================
import { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RoleGuard }   from '@/components/layout/RoleGuard';
import { Sidebar }     from '@/components/layout/Sidebar';
import { useAppStore } from '@/store/useAppStore';
import type { AppUser, UserRole } from '@/types';
import { Settings } from 'lucide-react';


interface EtlState {
  status: 'idle' | 'parsing' | 'uploading' | 'done' | 'error';
  total: number;
  loaded: number;
  errors: string[];
  fileName: string;
}

const DISTRICTS = [
  'Cercado','Cayma','Yanahuara','Miraflores','Mariano Melgar',
  'Paucarpata','Socabaya','Hunter','J.L. Bustamante','Alto Selva Alegre',
];

const DISTRICT_COORDINATES: Record<string, { lat: number; lng: number; radius: number }> = {
  'CERCADO': { lat: -16.3988, lng: -71.5369, radius: 0.015 },
  'AREQUIPA': { lat: -16.3988, lng: -71.5369, radius: 0.015 },
  'CAYMA': { lat: -16.3742, lng: -71.5586, radius: 0.02 },
  'YANAHUARA': { lat: -16.3881, lng: -71.5414, radius: 0.01 },
  'MIRAFLORES': { lat: -16.3853, lng: -71.5175, radius: 0.012 },
  'MARIANO MELGAR': { lat: -16.3869, lng: -71.5111, radius: 0.01 },
  'PAUCARPATA': { lat: -16.4250, lng: -71.5035, radius: 0.018 },
  'SOCABAYA': { lat: -16.4633, lng: -71.5283, radius: 0.02 },
  'HUNTER': { lat: -16.4428, lng: -71.5492, radius: 0.012 },
  'JACOBO HUNTER': { lat: -16.4428, lng: -71.5492, radius: 0.012 },
  'CERRO COLORADO': { lat: -16.3686, lng: -71.5583, radius: 0.025 },
  'J.L. BUSTAMANTE': { lat: -16.4275, lng: -71.5236, radius: 0.012 },
  'JOSE LUIS BUSTAMANTE Y RIVERO': { lat: -16.4275, lng: -71.5236, radius: 0.012 },
  'ALTO SELVA ALEGRE': { lat: -16.3764, lng: -71.5186, radius: 0.015 },
  'LA JOYA': { lat: -16.5886, lng: -71.9056, radius: 0.04 },
  'YURA': { lat: -16.2522, lng: -71.6797, radius: 0.03 },
  'TIABAYA': { lat: -16.4428, lng: -71.5878, radius: 0.015 },
  'SACHACA': { lat: -16.4258, lng: -71.5658, radius: 0.015 },
  'CHARACATO': { lat: -16.4719, lng: -71.4981, radius: 0.02 },
  'UCHUMAYO': { lat: -16.4258, lng: -71.6761, radius: 0.03 },
  'MOLLEBAYA': { lat: -16.4897, lng: -71.4586, radius: 0.015 },
  'SABANDIA': { lat: -16.4597, lng: -71.5019, radius: 0.012 },
  'QUEQUEÑA': { lat: -16.5564, lng: -71.4503, radius: 0.015 },
  'YARABAMBA': { lat: -16.5458, lng: -71.4806, radius: 0.02 },
  'CHIGUATA': { lat: -16.4022, lng: -71.3986, radius: 0.03 },
  'VITOR': { lat: -16.4178, lng: -71.9286, radius: 0.04 }
};

function getRandomCoordinatesForDistrict(districtName: string): { lat: number; lng: number } {
  const normalized = districtName.trim().toUpperCase();
  const config = DISTRICT_COORDINATES[normalized] || { lat: -16.3988, lng: -71.5369, radius: 0.03 };
  
  const u = Math.random();
  const v = Math.random();
  const theta = u * 2.0 * Math.PI;
  const r = Math.sqrt(v) * config.radius;
  
  return {
    lat: config.lat + r * Math.sin(theta),
    lng: config.lng + r * Math.cos(theta),
  };
}

function mapModalidadToCrimeType(modality: string): 'robo' | 'hurto' | 'violencia' {
  const m = modality.toLowerCase().trim();
  if (m.includes('rob')) return 'robo';
  if (m.includes('hur')) return 'hurto';
  if (
    m.includes('viol') ||
    m.includes('agre') ||
    m.includes('les') ||
    m.includes('hom') ||
    m.includes('fami') ||
    m.includes('sex') ||
    m.includes('secues')
  ) {
    return 'violencia';
  }
  if (m.includes('estafa') || m.includes('extor') || m.includes('usurp') || m.includes('recept')) {
    return Math.random() > 0.5 ? 'robo' : 'hurto';
  }
  const types = ['robo', 'hurto', 'violencia'] as const;
  return types[Math.floor(Math.random() * types.length)];
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(v => v.replace(/^"|"$/g, '').trim());
}

export default function AdminPage() {
  const { showNotification, etlProgress, setEtlProgress } = useAppStore();
  const etl = etlProgress || { status: 'idle', total: 0, loaded: 0, errors: [], fileName: '' };
  const setEtl = setEtlProgress;
  const [users, setUsers]   = useState<AppUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'etl' | 'users'>('etl');
  const [etlType, setEtlType] = useState<'reports' | 'police'>('reports');
  const [clearing, setClearing] = useState(false);

  async function clearImportedData() {
    if (!confirm('¿Estás seguro de que deseas eliminar todas las incidencias importadas de la base de datos? Esto limpiará el mapa de calor de registros antiguos.')) return;
    setClearing(true);
    try {
      const { getDocs, query, collection, where, writeBatch, doc } = await import('firebase/firestore');
      const q = query(collection(db, 'reports'), where('source', '==', 'open_data_etl'));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        showNotification('info', 'No hay incidencias importadas para eliminar.');
        setClearing(false);
        return;
      }

      const docs = snap.docs;
      let deletedCount = 0;

      while (deletedCount < docs.length) {
        const batch = writeBatch(db);
        const chunk = docs.slice(deletedCount, deletedCount + 400);
        chunk.forEach(d => {
          batch.delete(doc(db, 'reports', d.id));
        });
        await batch.commit();
        deletedCount += chunk.length;
      }

      showNotification('success', `Se eliminaron ${deletedCount} incidencias importadas con éxito.`);
    } catch (err) {
      console.error('Error clearing data:', err);
      showNotification('error', 'Error al eliminar datos importados.');
    } finally {
      setClearing(false);
    }
  }

  // ── ETL: parse and upload CSV (RF3) ───────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setEtl({ status: 'parsing', total: 0, loaded: 0, errors: [], fileName: file.name });

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const rows = lines.slice(1);

      if (etlType === 'reports') {
        const cleanHeaderLine = lines[0].replace(/^\uFEFF/, '').trim();
        const delimiter = cleanHeaderLine.includes(';') ? ';' : ',';
        const header = parseCSVLine(cleanHeaderLine, delimiter).map(h => h.trim().toLowerCase());
        const isNewFormat = header.includes('dist_hecho') || header.includes('dpto_hecho_new');

        setEtl(s => ({ ...s, status: 'uploading', total: rows.length }));

        const { addDoc, collection: col, serverTimestamp } = await import('firebase/firestore');
        const { encodeGeohash } = await import('@/utils/geo');

        let loaded = 0;
        const errors: string[] = [];
        const batchSize = 20;

        for (let i = 0; i < rows.length; i += batchSize) {
          if (loaded >= 200) break;

          const batch = rows.slice(i, i + batchSize);
          await Promise.all(batch.map(async (line, idx) => {
            try {
              if (loaded >= 200) return;
              const cleanLine = line.replace(/\r/g, '').trim();
              const values = parseCSVLine(cleanLine, delimiter);
              const row: Record<string, string> = {};
              header.forEach((h, j) => { row[h] = values[j] ?? ''; });

              const distCol = isNewFormat ? 'dist_hecho' : 'distrito';
              const dist = row[distCol] ?? '';
              const normalizedDist = dist.trim().toUpperCase();

              // Descartar si el departamento o provincia no es Arequipa en el nuevo formato
              if (isNewFormat) {
                const dpto = (row['dpto_hecho_new'] || '').trim().toUpperCase();
                const prov = (row['prov_hecho'] || '').trim().toUpperCase();
                if (dpto !== 'AREQUIPA' || prov !== 'AREQUIPA') return;
              }

              // Descartar si el distrito no pertenece a Arequipa
              if (!DISTRICT_COORDINATES[normalizedDist]) {
                return;
              }

              let lat = 0;
              let lng = 0;
              if (!isNewFormat) {
                lat = parseFloat(row['latitud'] ?? row['lat'] ?? '');
                lng = parseFloat(row['longitud'] ?? row['lng'] ?? '');
              }

              const typeCol = isNewFormat ? 'p_modalidades' : 'tipo';
              const rawType = row[typeCol] ?? row['delito'] ?? 'otro';
              const finalType = mapModalidadToCrimeType(rawType);

              const year = parseInt(row['anio'] ?? row['año'] ?? row['anio'] ?? new Date().getFullYear().toString());
              const month = parseInt(row['mes'] ?? '1');
              const dateStr = isNewFormat 
                ? new Date(year, month - 1, 15).toISOString() 
                : (row['fecha'] ?? new Date().toISOString());

              const qty = isNewFormat ? (parseInt(row['cantidad']) || 1) : 1;
              const uploadCount = Math.min(qty, 3); // Limitar a máximo 3 reportes por fila para seguridad y optimización de cuotas

              const { GeoPoint } = await import('firebase/firestore');

              for (let c = 0; c < uploadCount; c++) {
                let finalLat = lat;
                let finalLng = lng;
                
                if (isNewFormat || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                  const coords = getRandomCoordinatesForDistrict(dist);
                  finalLat = coords.lat;
                  finalLng = coords.lng;
                }

                await addDoc(col(db, 'reports'), {
                  authorId:    'etl_import',
                  type:        finalType,
                  description: row['descripcion'] ?? `Importado desde datos abiertos: ${rawType}`,
                  location:    new GeoPoint(finalLat, finalLng),
                  geohash:     encodeGeohash(finalLat, finalLng),
                  district:    dist,
                  timestamp:   new Date(dateStr),
                  status:      'pending',
                  mediaUrls:   [],
                  priority:    'low',
                  hour:        isNewFormat ? 12 : (new Date(dateStr).getHours() || 12),
                  aiScore:     null,
                  source:      'open_data_etl',
                });
                loaded++;
              }
            } catch (err) {
              errors.push(`Fila ${i + idx + 2}: ${String(err)}`);
            }
          }));
          setEtl(s => ({ ...s, loaded: Math.min(loaded, rows.length), errors }));
        }

        setEtl(s => ({ ...s, status: 'done', loaded, errors }));
        showNotification('success', `ETL completado: ${loaded}/${rows.length} registros importados.`);
      } else {
        // Ingesta de personal policial con agregación al vuelo
        const header = lines[0].split(',').map(h => h.trim().toUpperCase());
        const aggregations: Record<string, any> = {};

        rows.forEach((line) => {
          try {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: Record<string, string> = {};
            header.forEach((h, j) => { row[h] = values[j] ?? ''; });

            const dist = row['DISTRITO']?.toUpperCase()?.trim();
            if (!dist || !DISTRICT_COORDINATES[dist]) return;

            const qty = parseInt(row['CANTIDAD']) || 0;
            if (qty <= 0) return;

            if (!aggregations[dist]) {
              aggregations[dist] = {
                total: 0,
                oficial: 0,
                suboficial: 0,
                armas: 0,
                servicios: 0,
                operativo: 0,
                administrativo: 0,
                masculino: 0,
                femenino: 0,
                provincia: row['PROVINCIA'] || '',
                departamento: row['DEPARTAMENTO'] || '',
              };
            }

            const agg = aggregations[dist];
            agg.total += qty;

            const cat = row['CATEGORIA_OFI_SUB']?.toUpperCase() || '';
            if (cat.includes('OFICIAL')) agg.oficial += qty;
            if (cat.includes('SUB')) agg.suboficial += qty;

            const arm = row['CATEGORIA_ARM_SERV']?.toUpperCase() || '';
            if (arm.includes('ARMAS')) agg.armas += qty;
            if (arm.includes('SERV')) agg.servicios += qty;

            const func = row['FUNCION']?.toUpperCase() || '';
            if (func.includes('OPE')) agg.operativo += qty;
            if (func.includes('ADM')) agg.administrativo += qty;

            const sexo = row['SEXO']?.toUpperCase() || '';
            if (sexo.includes('MAS')) agg.masculino += qty;
            if (sexo.includes('FEM')) agg.femenino += qty;
          } catch (e) {
            // Ignorar filas malformadas en parseo inicial
          }
        });

        const keys = Object.keys(aggregations);
        setEtl(s => ({ ...s, status: 'uploading', total: keys.length, loaded: 0 }));

        const { doc, setDoc } = await import('firebase/firestore');
        let loaded = 0;
        const errors: string[] = [];
        const batchSize = 10;

        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await Promise.all(batch.map(async (dist) => {
            try {
              const ref = doc(db, 'police_allocation', dist);
              await setDoc(ref, aggregations[dist]);
              loaded++;
            } catch (err) {
              errors.push(`Error en distrito ${dist}: ${String(err)}`);
            }
          }));
          setEtl(s => ({ ...s, loaded: Math.min(loaded, keys.length), errors }));
        }

        setEtl(s => ({ ...s, status: 'done', loaded, errors }));
        showNotification('success', `ETL completado: ${loaded} distritos guardados con agregación policial.`);
      }
    } catch (err) {
      setEtl(s => ({ ...s, status: 'error', errors: [String(err)] }));
      showNotification('error', 'Error procesando el archivo.');
    }
  }

  // ── Load users (RF6) ──────────────────────────────────────
  async function loadUsers() {
    const snap = await getDocs(collection(db, 'users'));
    const list: AppUser[] = snap.docs.map(d => ({ uid: d.id, ...(d.data() as Omit<AppUser,'uid'>) }));
    setUsers(list);
    setUsersLoaded(true);
  }

  async function changeRole(uid: string, role: UserRole) {
    await updateDoc(doc(db, 'users', uid), { role });
    setUsers(u => u.map(user => user.uid === uid ? { ...user, role } : user));
    showNotification('success', `Rol actualizado a: ${role}`);
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="page-wrapper">
        <Sidebar />
        <div className="main-content">
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} strokeWidth={2} style={{ color: '#60a5fa' }} />
              <span className="topbar-title">Panel Administrador</span>
            </div>
            <span className="badge badge-danger">Admin</span>
          </header>

          <div className="page-inner">
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
              {(['etl','users'] as const).map(tab => (
                <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => { setActiveTab(tab); if (tab === 'users' && !usersLoaded) loadUsers(); }}>
                  {tab === 'etl' ? '📥 Ingesta de Datos (RF3)' : '👥 Usuarios (RF6)'}
                </button>
              ))}
            </div>

            {/* ETL Tab */}
            {activeTab === 'etl' && (
              <div className="card animate-fade-in">
                <h2 style={{ marginBottom: '0.5rem' }}>Ingesta de Datos Abiertos</h2>
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                  Carga el archivo CSV del Portal Nacional de Datos Abiertos (datosabiertos.gob.pe). 
                  El sistema validará, procesará y cargará los registros de forma automatizada.
                </p>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" htmlFor="etl-type">Tipo de Datos a Cargar</label>
                  <select
                    id="etl-type"
                    className="form-input"
                    value={etlType}
                    onChange={(e) => setEtlType(e.target.value as any)}
                    disabled={etl.status === 'parsing' || etl.status === 'uploading'}
                    style={{ marginBottom: '1rem', background: 'var(--bg-main)' }}
                  >
                    <option value="reports">📋 Histórico de Incidencias / Denuncias (PNP)</option>
                    <option value="police">👮 Despliegue de Personal Policial (PNP)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" htmlFor="etl-file">
                    Archivo CSV / JSON <span style={{ color: 'var(--text-muted)' }}>(máx 50MB)</span>
                  </label>
                  <input
                    id="etl-file"
                    type="file"
                    className="form-input"
                    accept=".csv,.json"
                    onChange={handleFileUpload}
                    disabled={etl.status === 'parsing' || etl.status === 'uploading'}
                  />
                  <span className="form-hint">
                    {etlType === 'reports' ? (
                      <>Columnas esperadas: <code>latitud, longitud, tipo, distrito, fecha, descripcion</code></>
                    ) : (
                      <>Columnas esperadas: <code>AÑO, MES, DISTRITO, CANTIDAD, SEXO, CATEGORIA_OFI_SUB, CATEGORIA_ARM_SERV, FUNCION</code> (agrupación automática por distrito)</>
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                  <button
                    id="btn-clear-imported-data"
                    className="btn btn-ghost"
                    style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                    onClick={clearImportedData}
                    disabled={clearing || etl.status === 'uploading'}
                  >
                    {clearing ? 'Eliminando...' : '🧹 Limpiar Historial Importado'}
                  </button>
                </div>

                {etl.status !== 'idle' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Progress */}
                    {(etl.status === 'uploading' || etl.status === 'done') && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.875rem' }}>
                          <span>{etl.fileName}</span>
                          <span style={{ color: 'var(--brand-400)' }}>{etl.loaded}/{etl.total}</span>
                        </div>
                        <div style={{ background: 'var(--surface-2)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${etl.total ? (etl.loaded / etl.total * 100) : 0}%`,
                            background: 'linear-gradient(90deg, var(--brand-600), var(--brand-400))',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </div>
                    )}

                    {etl.status === 'done' && (
                      <div className="alert alert-success">
                        ✅ Carga completada: <strong>{etl.loaded}</strong> registros importados
                        {etl.errors.length > 0 && `, ${etl.errors.length} con errores`}.
                      </div>
                    )}
                    {etl.status === 'error' && (
                      <div className="alert alert-danger">❌ {etl.errors[0]}</div>
                    )}
                    {etl.errors.length > 0 && etl.status === 'done' && (
                      <details>
                        <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: 'var(--warning)' }}>
                          {etl.errors.length} errores de validación
                        </summary>
                        <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
                          {etl.errors.map((e, i) => <div key={i} style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{e}</div>)}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="card animate-fade-in">
                <h2 style={{ marginBottom: '1rem' }}>Gestión de Usuarios</h2>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Rol actual</th>
                        <th>Trust Score</th>
                        <th>Reportes</th>
                        <th>Cambiar rol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.uid}>
                          <td>{u.displayName}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</td>
                          <td>
                            <span className={`badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'agente' ? 'badge-info' : 'badge-muted'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${u.trustScore >= 75 ? 'badge-success' : u.trustScore >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                              {u.trustScore}
                            </span>
                          </td>
                          <td>{u.totalReports}</td>
                          <td>
                            <select
                              className="form-input"
                              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                              value={u.role}
                              onChange={e => changeRole(u.uid, e.target.value as UserRole)}
                            >
                              <option value="ciudadano">ciudadano</option>
                              <option value="agente">agente</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          Cargando usuarios...
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
