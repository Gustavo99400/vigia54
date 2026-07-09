'use client';

import { useAppStore } from '@/store/useAppStore';
import { X, CheckCircle, AlertTriangle, Loader2, Database } from 'lucide-react';

export function UploadProgressPopup() {
  const { etlProgress, clearEtlProgress } = useAppStore();

  if (!etlProgress || etlProgress.status === 'idle') {
    return null;
  }

  const { status, total, loaded, errors, fileName } = etlProgress;
  const progressPercent = total > 0 ? Math.round((loaded / total) * 100) : 0;

  const isDone = status === 'done';
  const isError = status === 'error';
  const isProcessing = status === 'parsing' || status === 'uploading';

  return (
    <div
      id="global-upload-progress"
      className="animate-fade-in"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9998,
        width: '320px',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(16px)',
        border: isError 
          ? '1px solid rgba(239, 68, 68, 0.4)' 
          : isDone 
            ? '1px solid rgba(34, 197, 94, 0.4)' 
            : '1px solid rgba(96, 165, 250, 0.4)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isProcessing && (
            <Loader2 size={18} className="animate-spin" style={{ color: '#60a5fa' }} />
          )}
          {isDone && (
            <CheckCircle size={18} style={{ color: '#22c55e' }} />
          )}
          {isError && (
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          )}
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {status === 'parsing' ? 'Procesando archivo'
             : status === 'uploading' ? 'Subiendo a la nube'
             : status === 'done' ? 'Carga completada'
             : 'Error en la carga'}
          </span>
        </div>

        {(isDone || isError) && (
          <button
            onClick={clearEtlProgress}
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
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* File Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isError ? '#ef4444' : isDone ? '#22c55e' : '#60a5fa'
        }}>
          <Database size={20} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {fileName}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {status === 'parsing' ? 'Analizando estructura...'
             : status === 'uploading' ? `Guardando en base de datos...`
             : status === 'done' ? `${loaded} de ${total} registros cargados`
             : `Error: ${errors[0] || 'Carga interrumpida'}`}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {status === 'uploading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Progreso</span>
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>{progressPercent}%</span>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Errors Summary if any */}
      {isDone && errors.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          padding: '8px 10px',
          fontSize: '0.75rem',
          color: '#ef4444'
        }}>
          ⚠️ Se omitieron {errors.length} filas con errores o fuera del ámbito de Arequipa.
        </div>
      )}
    </div>
  );
}
