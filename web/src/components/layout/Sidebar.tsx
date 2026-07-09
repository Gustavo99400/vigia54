'use client';
// ============================================================
// VIGÍA 54 — Sidebar / Navigation Layout Component
// ============================================================
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { submitReport } from '@/lib/firestore';
import { getNearestDistrict } from '@/utils/geo';
import type { UserRole } from '@/types';
import { 
  Shield, 
  Map, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  User, 
  LogOut 
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  label: string;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/map',       icon: Map,           label: 'Mapa en Vivo' },
  { href: '/report',    icon: AlertTriangle, label: 'Nuevo Reporte' },
  { href: '/dashboard', icon: BarChart3,     label: 'Dashboard',    roles: ['agente','admin'] },
  { href: '/admin',     icon: Settings,      label: 'Administrador', roles: ['admin'] },
  { href: '/profile',   icon: User,          label: 'Mi Perfil' },
];

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user }  = useAuth();
  const { showNotification } = useAppStore();
  const [sosLoading, setSosLoading] = useState(false);

  async function handleSignOut() {
    await signOut();
    showNotification('info', 'Sesión cerrada.');
    router.replace('/login');
  }

  async function handleSOSClick() {
    if (!user) {
      showNotification('error', 'Debes iniciar sesión para activar la alerta SOS.');
      return;
    }

    const confirmed = window.confirm(
      '🚨 ¿Estás seguro de enviar una alerta SOS?\n\n' +
      'Esto enviará tus coordenadas actuales de forma inmediata y quedará verificado de forma automática en el sistema.'
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
        if (error.code === 1) msg = 'Permiso de ubicación denegado por el usuario.';
        showNotification('error', `No se pudo obtener ubicación: ${msg}`);
        setSosLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  const initials = user?.displayName
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '??';

  const roleLabel: Record<UserRole, string> = {
    ciudadano: 'Ciudadano',
    agente:    'Agente Policial',
    admin:     'Administrador',
  };

  return (
    <nav className="sidebar" role="navigation" aria-label="Navegación principal">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" aria-hidden="true" style={{ background: 'transparent', boxShadow: 'none' }}>
          <Shield size={24} color="#60a5fa" strokeWidth={2.5} />
        </div>
        <div className="sidebar-logo-text">Vigía <span>54</span></div>
      </div>

      <div className="sidebar-section-title">Navegación</div>

      {visibleItems.map(item => {
        const IconComponent = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${pathname === item.href ? ' active' : ''}`}
            aria-current={pathname === item.href ? 'page' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <IconComponent size={18} strokeWidth={2} style={{ opacity: pathname === item.href ? 1 : 0.7 }} />
            {item.label}
          </Link>
        );
      })}

      {/* Botón SOS */}
      <div style={{ padding: '0 12px', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
        <button
          id="btn-sos"
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            fontWeight: 800,
            fontSize: '0.9rem',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(220, 38, 38, 0.4)',
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            animation: 'pulseSOS 2s infinite',
          }}
          disabled={sosLoading}
          onClick={handleSOSClick}
        >
          <span>🚨</span>
          <span>{sosLoading ? 'ENVIANDO...' : 'BOTÓN SOS'}</span>
        </button>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulseSOS {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); transform: scale(1); }
          50% { box-shadow: 0 0 12px 6px rgba(220, 38, 38, 0); transform: scale(1.02); }
        }
      `}} />

      {/* Footer */}
      <div className="sidebar-footer">
        {user && (
          <div className="user-pill" title={`${user.email} — Trust Score: ${user.trustScore}`}>
            <div className="user-avatar" aria-hidden="true">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user.displayName}</div>
              <div className="user-role">{roleLabel[user.role]}</div>
            </div>
          </div>
        )}
        <button
          id="btn-signout"
          className="nav-item btn-ghost"
          style={{ marginTop: 8, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '12px' }}
          onClick={handleSignOut}
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} strokeWidth={2} /> Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
