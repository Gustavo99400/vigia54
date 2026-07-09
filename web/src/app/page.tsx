'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

function useCounter(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); observer.disconnect(); }
    }, { threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function ParticleGrid() {
  const particles = useRef(
    Array.from({ length: 55 }, (_, i) => ({
      w: ((i * 7 + 13) % 3) + 1,
      left: (i * 1.618 * 100) % 100,
      top: (i * 2.718 * 100) % 100,
      dur: (i % 6) + 4,
      delay: (i % 4),
      opacity: ((i % 5) * 0.1) + 0.15,
    }))
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {particles.current.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: p.w, height: p.w,
          background: `rgba(96,165,250,${p.opacity})`,
          borderRadius: '50%',
          left: `${p.left}%`,
          top: `${p.top}%`,
          animation: `floatDot ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
        }} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role === 'admin' || user.role === 'agente') {
      router.replace('/dashboard');
    } else {
      router.replace('/map');
    }
  }, [user, authLoading, router]);

  const statsRef = useInView();
  const c1 = useCounter(47832, 2200, statsRef.inView);
  const c2 = useCounter(26, 1800, statsRef.inView);
  const c3 = useCounter(94, 1600, statsRef.inView);
  const c4 = useCounter(200, 2000, statsRef.inView);

  if (authLoading || user) {
    return (
      <div className="loader-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="animate-pulse-ring" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #1e4db7, #3b82f6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>Vigía <span style={{ color: '#60a5fa' }}>54</span></div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Cargando sesión...</div>
          </div>
        </div>
        <div className="spinner" style={{ marginTop: 16 }} />
      </div>
    );
  }

  if (!mounted) return null;

  const features = [
    { rf: 'RF1', icon: '📱', title: 'Reporte Ciudadano', desc: 'Los ciudadanos registran incidencias con GPS automático, fotos y descripción desde cualquier dispositivo.', color: '#3b82f6', rgb: '59,130,246', items: ['Geolocalización GPS automática', 'Subida de fotografías', 'Formulario responsive'] },
    { rf: 'RF2', icon: '🤖', title: 'Scoring con IA', desc: 'Motor de IA que evalúa la credibilidad de cada reporte según contexto geográfico, horario e historial.', color: '#a78bfa', rgb: '167,139,250', items: ['Score 0–100% de credibilidad', 'Análisis de proximidad', 'Comentario contextual IA'] },
    { rf: 'RF3', icon: '📥', title: 'Ingesta Datos PNP', desc: 'Panel ETL para cargar el dataset histórico de denuncias del Portal de Datos Abiertos del PNP.', color: '#22c55e', rgb: '34,197,94', items: ['Parser CSV robusto', 'Hasta 200 reportes por carga', 'Coordenadas reales por distrito'] },
    { rf: 'RF4', icon: '🗺️', title: 'Mapa de Calor', desc: 'Visualización interactiva de zonas de riesgo en el mapa real de Arequipa con filtros avanzados.', color: '#f59e0b', rgb: '245,158,11', items: ['Leaflet.js + heatmap layer', 'Filtros por zona, tipo y mes', 'Datos en tiempo real'] },
    { rf: 'RF5', icon: '📊', title: 'Dashboard Agente', desc: 'Panel de control con gráficos, tablas de incidencias, verificación de reportes y despacho de alertas.', color: '#ec4899', rgb: '236,72,153', items: ['Botones Verificar / No Verificado', 'Alerta al Serenazgo con sirena', 'Gráficos por mes y tipo'] },
    { rf: 'RF6', icon: '👥', title: 'Gestión de Usuarios', desc: 'Sistema de roles diferenciados con control de acceso granular y panel de gestión de usuarios.', color: '#14b8a6', rgb: '20,184,166', items: ['Roles: admin / agente / ciudadano', 'Auth con Google + email', 'Panel admin CRUD usuarios'] },
  ];

  const techs = ['Next.js 15', 'React 19', 'TypeScript', 'Firebase Auth', 'Firestore', 'Firebase Hosting', 'Leaflet.js', 'Recharts', 'Zustand', 'Vanilla CSS', 'Web Audio API', 'Inter Font'];
  const techIcons = ['▲', '⚛', '🔷', '🔐', '🔥', '☁️', '🗺️', '📊', '🐻', '🎨', '🔊', '🔤'];

  return (
    <>
      <style>{`
        @keyframes floatDot { from { transform:translateY(0) scale(1); opacity:0.3; } to { transform:translateY(-22px) scale(1.5); opacity:0.9; } }
        @keyframes heroFadeUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseLp { 0%,100% { box-shadow:0 0 0 0 rgba(59,130,246,0.5); } 70% { box-shadow:0 0 0 14px rgba(59,130,246,0); } }
        @keyframes scanLine { 0% { top:-4%; } 100% { top:104%; } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
        @keyframes radPulse { 0%,100% { opacity:0.15; transform:scale(1); } 50% { opacity:0.42; transform:scale(1.12); } }
        @keyframes slideL { from { opacity:0; transform:translateX(-36px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideR { from { opacity:0; transform:translateX(36px); } to { opacity:1; transform:translateX(0); } }
        html { scroll-behavior:smooth; }
        .lnav a { color:rgba(241,245,249,0.65); text-decoration:none; font-size:0.875rem; font-weight:500; transition:color 0.2s; }
        .lnav a:hover { color:#60a5fa; }
        .lbtn { display:inline-flex; align-items:center; gap:10px; border-radius:50px; font-weight:700; text-decoration:none; transition:transform 0.2s, box-shadow 0.2s; cursor:pointer; border:none; }
        .lbtn-p { background:linear-gradient(135deg,#1e4db7,#3b82f6); color:#fff; padding:14px 32px; font-size:1rem; box-shadow:0 4px 24px rgba(59,130,246,0.4); }
        .lbtn-p:hover { transform:translateY(-3px); box-shadow:0 8px 32px rgba(59,130,246,0.65); }
        .lbtn-g { background:rgba(255,255,255,0.06); color:#f1f5f9; padding:14px 32px; font-size:1rem; border:1px solid rgba(148,163,184,0.22); backdrop-filter:blur(8px); }
        .lbtn-g:hover { background:rgba(255,255,255,0.12); border-color:rgba(96,165,250,0.45); transform:translateY(-3px); }
        .lfc { background:rgba(30,41,59,0.72); backdrop-filter:blur(16px); border:1px solid rgba(148,163,184,0.1); border-radius:20px; padding:2rem; transition:transform 0.25s,border-color 0.25s,box-shadow 0.25s; }
        .lfc:hover { transform:translateY(-6px); border-color:rgba(96,165,250,0.35); box-shadow:0 16px 48px rgba(0,0,0,0.4); }
        .lsc { background:rgba(30,41,59,0.82); backdrop-filter:blur(16px); border:1px solid rgba(148,163,184,0.1); border-radius:16px; padding:1.75rem 2rem; text-align:center; }
        .ltp { display:inline-flex; align-items:center; gap:8px; background:rgba(30,41,59,0.92); border:1px solid rgba(148,163,184,0.15); border-radius:50px; padding:8px 18px; font-size:0.85rem; font-weight:500; color:#cbd5e1; transition:border-color 0.2s,color 0.2s; }
        .ltp:hover { border-color:rgba(96,165,250,0.5); color:#60a5fa; }
        .ltl { position:relative; padding-left:2.5rem; padding-bottom:2rem; }
        .ltl::before { content:''; position:absolute; left:9px; top:26px; bottom:0; width:2px; background:rgba(96,165,250,0.18); }
        .ltl:last-child::before { display:none; }
        .ltd { position:absolute; left:0; top:4px; width:20px; height:20px; border-radius:50%; background:linear-gradient(135deg,#1e4db7,#3b82f6); box-shadow:0 0 0 4px rgba(59,130,246,0.2); }
        .label-sm { font-size:0.72rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; margin-bottom:0.75rem; }
      `}</style>

      {/* NAV */}
      <nav className="lnav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(148,163,184,0.07)', padding: '0 clamp(1rem,5vw,3rem)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#1e4db7,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', animation: 'pulseLp 2.5s infinite' }}>🛡️</div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f1f5f9' }}>Vigía <span style={{ color: '#60a5fa' }}>54</span></span>
          <span style={{ marginLeft: 8, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', background: 'rgba(59,130,246,0.18)', color: '#60a5fa', padding: '2px 8px', borderRadius: 50, border: '1px solid rgba(96,165,250,0.3)' }}>v2.0 BETA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="#contexto">Contexto</a>
          <a href="#stats">Métricas</a>
          <a href="#features">Funciones</a>
          <a href="#tech">Stack</a>
          <Link href="/login" className="lbtn lbtn-p" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Ingresar →</Link>
        </div>
      </nav>

      <main style={{ background: '#0f172a', color: '#f1f5f9', fontFamily: 'Inter,system-ui,sans-serif', overflowX: 'hidden' }}>

        {/* ── HERO ── */}
        <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px clamp(1rem,5vw,3rem) 80px', background: 'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(30,77,183,0.28) 0%, transparent 70%)', overflow: 'hidden' }}>
          <ParticleGrid />
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, height: 2, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(90deg,transparent,rgba(96,165,250,0.55),transparent)', animation: 'scanLine 4.5s linear infinite' }} />

          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 860 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 50, padding: '6px 18px', marginBottom: '2rem', animation: 'heroFadeUp 0.6s ease both', fontSize: '0.78rem', color: '#93c5fd', fontWeight: 600, letterSpacing: '0.06em' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulseLp 2s infinite' }} />
              SISTEMA EN LÍNEA — Arequipa Metropolitana · Perú
            </div>

            <h1 style={{ fontSize: 'clamp(2.8rem,6vw,5.2rem)', fontWeight: 900, lineHeight: 1.06, marginBottom: '1.5rem', animation: 'heroFadeUp 0.75s ease 0.1s both', letterSpacing: '-0.02em' }}>
              <span style={{ background: 'linear-gradient(135deg,#f1f5f9 0%,#93c5fd 55%,#60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Seguridad Ciudadana</span>
              <br />
              <span style={{ color: '#f1f5f9' }}>con </span>
              <span style={{ background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Inteligencia Artificial</span>
            </h1>

            <p style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', color: '#94a3b8', lineHeight: 1.75, maxWidth: 640, margin: '0 auto 2.5rem', animation: 'heroFadeUp 0.85s ease 0.2s both' }}>
              Plataforma de análisis predictivo de incidencias delictivas que integra <strong style={{ color: '#60a5fa' }}>IA generativa</strong>, datos históricos del PNP y geolocalización en tiempo real para fortalecer la respuesta del <strong style={{ color: '#a78bfa' }}>Serenazgo y la PNP</strong> en Arequipa.
            </p>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', animation: 'heroFadeUp 0.95s ease 0.3s both', marginBottom: '4rem' }}>
              <Link href="/login" className="lbtn lbtn-p"> Acceder al Sistema</Link>
              <Link href="/register" className="lbtn lbtn-g"> Registrarse</Link>
            </div>

            {/* Mock UI */}
            <div style={{ background: 'rgba(30,41,59,0.84)', backdropFilter: 'blur(20px)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: 24, padding: '1.25rem', maxWidth: 720, margin: '0 auto', animation: 'scaleIn 1s ease 0.5s both', boxShadow: '0 32px 80px rgba(0,0,0,0.55)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#22c55e' }} />
                <div style={{ flex: 1, height: 26, background: 'rgba(15,23,42,0.65)', borderRadius: 8, display: 'flex', alignItems: 'center', paddingLeft: 12, fontSize: '0.68rem', color: '#64748b', fontFamily: 'JetBrains Mono,monospace' }}>vigia54-5053e.web.app/map</div>
                <div style={{ padding: '3px 10px', background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 50, fontSize: '0.68rem', color: '#22c55e', fontWeight: 700 }}>● LIVE</div>
              </div>

              <div style={{ height: 200, borderRadius: 14, overflow: 'hidden', position: 'relative', background: 'linear-gradient(155deg,#0f2027,#203a43,#2c5364)' }}>
                {[{ x: '22%', y: '38%', r: 55, c: 'rgba(239,68,68,0.45)', d: 0 }, { x: '52%', y: '28%', r: 42, c: 'rgba(245,158,11,0.42)', d: 0.4 }, { x: '72%', y: '58%', r: 32, c: 'rgba(239,68,68,0.35)', d: 0.8 }, { x: '38%', y: '66%', r: 48, c: 'rgba(245,158,11,0.38)', d: 1.2 }, { x: '82%', y: '40%', r: 22, c: 'rgba(34,197,94,0.38)', d: 1.6 }, { x: '62%', y: '72%', r: 28, c: 'rgba(239,68,68,0.3)', d: 2.0 }].map((dot, i) => (
                  <div key={i} style={{ position: 'absolute', left: dot.x, top: dot.y, width: dot.r * 2, height: dot.r * 2, marginLeft: -dot.r, marginTop: -dot.r, borderRadius: '50%', background: `radial-gradient(circle,${dot.c},transparent 70%)`, animation: `radPulse ${2.5 + i * 0.35}s ease-in-out ${dot.d}s infinite` }} />
                ))}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(96,165,250,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(96,165,250,0.05) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
                <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: '0.65rem', color: 'rgba(148,163,184,0.5)', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>AREQUIPA · -16.4090° S · -71.5375° W</div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: '0.875rem' }}>
                {[{ icon: '🔴', l: 'Robo · Cayma', t: '2 min' }, { icon: '🟡', l: 'Hurto · Paucarpata', t: '5 min' }, { icon: '🟢', l: 'Verificado · Yanahuara', t: '8 min' }].map((a, i) => (
                  <div key={i} style={{ flex: 1, background: 'rgba(15,23,42,0.72)', borderRadius: 10, padding: '8px 10px', fontSize: '0.7rem', border: '1px solid rgba(148,163,184,0.07)' }}>
                    <div style={{ marginBottom: 2, color: '#e2e8f0' }}>{a.icon} {a.l}</div>
                    <div style={{ color: '#475569' }}>hace {a.t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CONTEXTO ── */}
        <section id="contexto" style={{ padding: 'clamp(3rem,8vw,6rem) clamp(1rem,5vw,3rem)', background: 'linear-gradient(180deg,rgba(30,77,183,0.1),transparent)', borderTop: '1px solid rgba(148,163,184,0.06)' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: '3rem', alignItems: 'start' }}>
            <div style={{ animation: 'slideL 0.9s ease both' }}>
              <div className="label-sm" style={{ color: '#60a5fa' }}>📌 Contexto Académico</div>
              <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: '1.25rem' }}>
                ¿Por qué existe<br /><span style={{ background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Vigía 54?</span>
              </h2>
              <p style={{ color: '#94a3b8', lineHeight: 1.8, marginBottom: '1rem', fontSize: '0.95rem' }}>Arequipa registró un incremento sostenido de incidencias delictivas entre 2018 y 2024, con picos críticos de <strong style={{ color: '#e2e8f0' }}>robo al paso, hurto y violencia familiar</strong> en zonas periféricas como Paucarpata, Cerro Colorado y Bustamante.</p>
              <p style={{ color: '#94a3b8', lineHeight: 1.8, marginBottom: '1rem', fontSize: '0.95rem' }}>Las instituciones operaban con datos fragmentados y sin visibilidad geoespacial unificada. Los reportes se registraban manualmente, sin retroalimentación ni análisis predictivo.</p>
              <p style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '0.95rem' }}><strong style={{ color: '#e2e8f0' }}>Vigía 54</strong> es un proyecto de <em style={{ color: '#60a5fa' }}>Calidad de Software</em> de la Universidad Católica San Pablo que propone centralizar, visualizar y predecir la criminalidad usando el dataset oficial del PNP procesado con IA.</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: '1.5rem', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 12, padding: '10px 16px', fontSize: '0.8rem', color: '#94a3b8' }}>
                <span style={{ fontSize: '1.2rem' }}>🇵🇪</span>
                <div><div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>Fuente de Datos</div><div>Portal Nacional de Datos Abiertos · PNP · datosabiertos.gob.pe</div></div>
              </div>
            </div>

            <div style={{ animation: 'slideR 0.9s ease both' }}>
              <div className="label-sm" style={{ color: '#a78bfa' }}>🔄 Flujo del Sistema</div>
              {[
                { icon: '📊', t: 'Análisis de Datos Históricos', d: 'Importación y normalización del dataset 2018–2024 con +47,000 denuncias filtradas para Arequipa.' },
                { icon: '📍', t: 'Geolocalización Inteligente', d: 'Coordenadas aleatorias dentro de los límites reales de cada distrito usando bounding boxes precisos.' },
                { icon: '🧠', t: 'Motor de IA', d: 'Scoring de credibilidad 0–100%, análisis de contexto geográfico y detección de zonas de alta incidencia.' },
                { icon: '🗺️', t: 'Visualización de Calor', d: 'Mapa interactivo Leaflet con capa heatmap, filtrable por tipo de delito, distrito, mes y año.' },
                { icon: '🚨', t: 'Despacho a Serenazgo', d: 'Flujo de verificación humana y alerta inmediata para respuesta de campo eficiente.' },
              ].map((item, i) => (
                <div key={i} className="ltl">
                  <div className="ltd" />
                  <div style={{ marginBottom: 4 }}><span>{item.icon} </span><strong style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{item.t}</strong></div>
                  <p style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.65 }}>{item.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section id="stats" style={{ padding: 'clamp(3rem,8vw,5rem) clamp(1rem,5vw,3rem)', background: '#080f1e' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div className="label-sm" style={{ color: '#60a5fa' }}>Números que importan</div>
              <h2 style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 800 }}>Métricas del <span style={{ color: '#60a5fa' }}>Sistema</span></h2>
            </div>
            <div ref={statsRef.ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '1.25rem' }}>
              {[
                { val: c1, sfx: '+', label: 'Denuncias Analizadas', icon: '📋', ac: '#3b82f6' },
                { val: c2, sfx: ' distritos', label: 'Área de Cobertura', icon: '🗺️', ac: '#a78bfa' },
                { val: c3, sfx: '%', label: 'Precisión del Modelo IA', icon: '🧠', ac: '#22c55e' },
                { val: c4, sfx: '', label: 'Reportes por Carga ETL', icon: '⚡', ac: '#f59e0b' },
              ].map((s, i) => (
                <div key={i} className="lsc" style={{ borderColor: `${s.ac}33` }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{s.icon}</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: 900, color: s.ac, lineHeight: 1, marginBottom: '0.5rem' }}>{s.val.toLocaleString()}{s.sfx}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" style={{ padding: 'clamp(3rem,8vw,6rem) clamp(1rem,5vw,3rem)', background: '#0f172a' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <div className="label-sm" style={{ color: '#60a5fa' }}>Requerimientos Funcionales</div>
              <h2 style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 800 }}>6 Funciones del <span style={{ color: '#60a5fa' }}>Sistema</span></h2>
              <p style={{ color: '#64748b', marginTop: '0.75rem', fontSize: '0.92rem', maxWidth: 480, margin: '0.75rem auto 0' }}>Diseñado bajo los RF del proyecto de Calidad de Software — UCSP 2025</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: '1.5rem' }}>
              {features.map((f, i) => (
                <div key={i} className="lfc">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1.25rem' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, fontSize: '1.5rem', flexShrink: 0, background: `rgba(${f.rgb},0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid rgba(${f.rgb},0.28)` }}>{f.icon}</div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: f.color, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 2 }}>{f.rf}</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>{f.title}</div>
                    </div>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.72, marginBottom: '1.25rem' }}>{f.desc}</p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {f.items.map((it, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#64748b' }}>
                        <span style={{ color: f.color, fontSize: '0.6rem' }}>▶</span> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TECH ── */}
        <section id="tech" style={{ padding: 'clamp(3rem,8vw,6rem) clamp(1rem,5vw,3rem)', background: 'linear-gradient(180deg,#080f1e,#0f172a)' }}>
          <div style={{ maxWidth: 920, margin: '0 auto', textAlign: 'center' }}>
            <div className="label-sm" style={{ color: '#60a5fa' }}>Stack Tecnológico</div>
            <h2 style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 800, marginBottom: '0.75rem' }}>Construido con <span style={{ color: '#60a5fa' }}>tecnología moderna</span></h2>
            <p style={{ color: '#64748b', marginBottom: '3rem', fontSize: '0.92rem', maxWidth: 500, margin: '0 auto 3rem' }}>Arquitectura JAMstack serverless, optimizada para rendimiento y escalabilidad</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: '3rem' }}>
              {techs.map((t, i) => (
                <div key={i} className="ltp"><span>{techIcons[i]}</span><span>{t}</span></div>
              ))}
            </div>

            <div style={{ background: 'rgba(30,41,59,0.72)', backdropFilter: 'blur(16px)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 20, padding: '2rem' }}>
              <div style={{ fontSize: '0.68rem', color: '#475569', marginBottom: '1.5rem', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Arquitectura del Sistema</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
                {[
                  { layer: 'FRONTEND', items: ['Next.js (SSG)', 'Leaflet Maps', 'Recharts', 'Zustand Store'], c: '#3b82f6', rgb: '59,130,246' },
                  { layer: 'BACKEND / BaaS', items: ['Firebase Auth', 'Firestore NoSQL', 'Security Rules', 'Realtime Listener'], c: '#a78bfa', rgb: '167,139,250' },
                  { layer: 'DATA / ETL', items: ['CSV Parser robusto', 'PNP Datos Abiertos', 'Geo Hashing', 'AI Score Engine'], c: '#22c55e', rgb: '34,197,94' },
                ].map((col, i) => (
                  <div key={i} style={{ background: 'rgba(15,23,42,0.55)', borderRadius: 14, padding: '1.25rem', border: `1px solid rgba(${col.rgb},0.2)` }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: col.c, letterSpacing: '0.14em', marginBottom: '0.75rem', fontFamily: 'JetBrains Mono,monospace', textTransform: 'uppercase' }}>{col.layer}</div>
                    {col.items.map((item, j) => (
                      <div key={j} style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '5px 0', borderBottom: j < col.items.length - 1 ? '1px solid rgba(148,163,184,0.06)' : 'none', textAlign: 'left' }}>{item}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ padding: 'clamp(4rem,10vw,7rem) clamp(1rem,5vw,3rem)', textAlign: 'center', background: 'radial-gradient(ellipse 80% 80% at 50% 50%,rgba(30,77,183,0.22),transparent)', borderTop: '1px solid rgba(148,163,184,0.06)' }}>
          <div style={{ maxWidth: 620, margin: '0 auto' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', animation: 'pulseLp 2.2s infinite' }}>🛡️</div>
            <h2 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, marginBottom: '1rem' }}>
              ¿Listo para <span style={{ background: 'linear-gradient(135deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>empezar?</span>
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '2.5rem', lineHeight: 1.75, fontSize: '1rem' }}>Accede al sistema de monitoreo, verifica reportes ciudadanos y gestiona la seguridad de Arequipa metropolitana desde un único panel inteligente.</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" className="lbtn lbtn-p" style={{ fontSize: '1.1rem', padding: '16px 40px' }}>🔐 Iniciar Sesión</Link>
              <Link href="/register" className="lbtn lbtn-g" style={{ fontSize: '1.1rem', padding: '16px 40px' }}>Crear Cuenta Gratis</Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ padding: '1.75rem clamp(1rem,5vw,3rem)', borderTop: '1px solid rgba(148,163,184,0.06)', color: '#2d3d55', fontSize: '0.78rem', textAlign: 'center', lineHeight: 1.8 }}>
          <div><strong style={{ color: '#334155' }}>Vigía 54</strong> — Proyecto Calidad de Software · Universidad Católica San Pablo · Arequipa, Perú · 2025</div>
          <div>Datos: Portal Nacional de Datos Abiertos (datosabiertos.gob.pe) · PNP · Serenazgo de Arequipa</div>
        </footer>

      </main>
    </>
  );
}
