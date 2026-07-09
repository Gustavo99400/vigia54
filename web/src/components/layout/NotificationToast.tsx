'use client';

import { useAppStore } from '@/store/useAppStore';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

export function NotificationToast() {
  const { notification, clearNotification } = useAppStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [notification]);

  if (!notification) return null;

  const icons = {
    success: <CheckCircle size={20} style={{ color: 'var(--success)' }} />,
    error: <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />,
    info: <Info size={20} style={{ color: 'var(--info)' }} />,
  };

  const borders = {
    success: 'rgba(34,197,94,0.3)',
    error: 'rgba(239,68,68,0.3)',
    info: 'rgba(59,130,246,0.3)',
  };

  return (
    <div
      id="global-notification-toast"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${borders[notification.type]}`,
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: 'var(--shadow-lg)',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        maxWidth: '350px',
      }}
      role="alert"
    >
      <div>{icons[notification.type]}</div>
      <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
        {notification.message}
      </div>
      <button
        onClick={clearNotification}
        id="btn-close-notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex',
          padding: '2px',
          borderRadius: '4px',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      >
        <X size={16} />
      </button>
    </div>
  );
}
