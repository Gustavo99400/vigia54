'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerWithEmail, signInWithGoogle } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener mínimo 6 caracteres.'); return; }
    setLoading(true);
    try {
      await registerWithEmail(email, password, name);
      router.replace('/map');
    } catch {
      setError('No se pudo crear la cuenta. El correo puede estar en uso.');
    } finally { setLoading(false); }
  }

  async function handleGoogleRegister() {
    setError(''); setLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/map');
    } catch {
      setError('Error con Google. Intenta nuevamente.');
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="auth-logo">
          <div className="auth-logo-icon"></div>
          <div className="auth-logo-text">Vigía <span>54</span></div>
        </div>

        <h1 className="auth-title" style={{ fontSize: '1.5rem' }}>Crear cuenta</h1>
        <p className="auth-subtitle">Únete a la red de seguridad ciudadana de Arequipa</p>

        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}

        <form className="auth-form" onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Nombre completo</label>
            <input id="name" type="text" className="form-input" placeholder="Juan Pérez"
              value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Correo electrónico</label>
            <input id="reg-email" type="email" className="form-input" placeholder="tu@correo.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Contraseña</label>
            <input id="reg-password" type="password" className="form-input" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">Confirmar contraseña</label>
            <input id="confirm-password" type="password" className="form-input" placeholder="••••••••"
              value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
          </div>

          <button id="btn-register" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <><span className="spinner" /> Creando cuenta...</> : '✅ Registrarse'}
          </button>
        </form>

        <div className="auth-divider">o</div>
        <button id="btn-google-register" type="button" className="btn btn-ghost btn-full"
          onClick={handleGoogleRegister} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Registrarse con Google
        </button>

        <div className="auth-footer">
          ¿Ya tienes cuenta? <Link href="/login" style={{ fontWeight: 600 }}>Iniciar sesión</Link>
        </div>
      </div>
    </div>
  );
}
