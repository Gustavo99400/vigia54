export type IncidentType = 'robo_mano_armada' | 'sospechoso' | 'accidente' | 'vandalismo' | 'choque' | 'incendio' | 'derrumbe';
export type IncidentState = 'revision_ia' | 'verificado' | 'atendido' | 'falsa_alarma';
export type PriorityLevel = 1 | 2 | 3; // 1: Crítica, 2: Alta, 3: Media
export type UserRole = "ciudadano" | "admin_respuestas" | "admin_sistema" | "serenazgo" | "pnp" | null;

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  geohash: string;
  distrito?: string;
}

export interface Incident {
  id?: string;
  tipo: IncidentType;
  ubicacion: LocationData;
  evidencia: {
    fotoUrl: string | null;
    audioUrl: string | null;
    ia_score?: number;
  };
  estado: IncidentState;
  prioridad: PriorityLevel;
  timestamp: Date; // Usaremos firestore Timestamp en la BD, aquí tipamos como Date genérico
  usuarioId: string;
  descripcion?: string;
}

export interface UserProfile {
  uid: string;
  trust_score: number;
  rol: UserRole;
  distrito_base?: string;
  notificaciones_activas: boolean;
  ultima_conexion: Date;
}


export interface Unit {
  unidad_id: string;
  tipo: 'camioneta' | 'moto' | 'pie';
  estado: 'disponible' | 'ocupado' | 'patrullando';
  posicion_actual: [number, number];
  operativo: string;
}
