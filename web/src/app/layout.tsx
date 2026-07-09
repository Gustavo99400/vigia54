import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NotificationToast } from '@/components/layout/NotificationToast';
import { UploadProgressPopup } from '@/components/layout/UploadProgressPopup';

export const metadata: Metadata = {
  title: 'Vigía 54 — Sistema de Predicción de Incidencias Delictivas',
  description:
    'Plataforma inteligente de reporte ciudadano, predicción geoespacial y triaje con IA para la seguridad de Arequipa.',
  keywords: ['seguridad', 'arequipa', 'incidencias', 'mapa', 'predicción', 'ia'],
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/icon-192x192.png' },
  openGraph: {
    title: 'Vigía 54',
    description: 'Sistema Inteligente de Seguridad Ciudadana — Arequipa',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="mesh-bg" aria-hidden="true" />
        {children}
        <NotificationToast />
        <UploadProgressPopup />
      </body>
    </html>
  );
}
