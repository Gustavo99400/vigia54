'use client';
// ============================================================
// VIGÍA 54 — useGeolocation Hook (RF8)
// ============================================================
import { useState, useEffect } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null, lng: null, accuracy: null, error: null, loading: false,
  });

  function requestLocation() {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocalización no soportada por este navegador.' }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error:    null,
          loading:  false,
        });
      },
      (err) => {
        setState(s => ({
          ...s,
          error:   err.code === 1 ? 'Permiso denegado. Activa la ubicación.' : 'Error obteniendo ubicación.',
          loading: false,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  return { ...state, requestLocation };
}
