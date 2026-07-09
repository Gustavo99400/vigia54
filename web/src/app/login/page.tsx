'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithGoogle, signInWithEmail, resetPassword } from '@/lib/auth';
import { useAppStore } from '@/store/useAppStore';

export default function LoginPage() {
  const router = useRouter();
  const { showNotification } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signInWithEmail(email, password);
      router.replace('/');
    } catch {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally { setLoading(false); }
  }

  async function handleGoogleLogin() {
    setError(''); setLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/');
    } catch {
      setError('Error al autenticar con Google. Intenta nuevamente.');
    } finally { setLoading(false); }
  }

  async function handleForgotPassword() {
    if (!email) { setError('Ingresa tu correo primero.'); return; }
    await resetPassword(email);
    showNotification('success', 'Correo de recuperación enviado.');
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon"></div>
          <div className="auth-logo-text">Vigía <span>54</span></div>
        </div>

        <h1 className="auth-title" style={{ fontSize: '1.5rem' }}>Bienvenido de nuevo</h1>
        <p className="auth-subtitle">Inicia sesión para acceder al sistema</p>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleEmailLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="tu@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-end', marginTop: -4 }}
              onClick={handleForgotPassword}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            id="btn-login-email"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> Ingresando...</> : '🔐 Iniciar sesión'}
          </button>
        </form>

        <div className="auth-divider">o continúa con</div>

        <button
          id="btn-login-google"
          type="button"
          className="btn btn-ghost btn-full btn-lg"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ gap: 10 }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continuar con Google
        </button>

        <div className="auth-footer">
          ¿No tienes cuenta?{' '}
          <Link href="/register" style={{ fontWeight: 600 }}>Regístrate</Link>
        </div>
      </div>
    </div>
  );
}
