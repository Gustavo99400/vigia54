// ============================================================
// VIGÍA 54 — Shared TypeScript Types
// ============================================================

export type UserRole = 'ciudadano' | 'agente' | 'admin';

export type ReportStatus = 'pending' | 'verified' | 'false_alarm' | 'reviewing' | 'resolved';

export type CrimeType =
  | 'robo'
  | 'hurto'
  | 'violencia'
  | 'accidente'
  | 'vandalismo'
  | 'narcotráfico'
  | 'otro';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  trustScore: number;       // 0–100, algoritmo RF1
  totalReports: number;
  verifiedReports: number;
  falseAlarms: number;
  createdAt: Date;
  district?: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Report {
  id: string;
  authorId: string;         // anonimizado en queries públicas
  authorName?: string;
  type: CrimeType;
  description: string;
  location: GeoPoint;
  geohash: string;          // para queries geoespaciales (RF2/RF4)
  district: string;
  timestamp: Date;
  status: ReportStatus;
  mediaUrls: string[];
  aiScore?: number;         // confianza Gemini 0–1 (RF1)
  aiAnalysis?: string;      // texto del análisis de Gemini
  priority: 'low' | 'medium' | 'high' | 'critical';
  hour: number;             // 0–23 para filtros horarios (RF4)
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface HeatmapData {
  hotPoints: HeatmapPoint[];
  resolvedPoints: HeatmapPoint[];
}

export interface DistrictAnalytics {
  districtId: string;
  name: string;
  totalReports: number;
  verifiedReports: number;
  topCrimeType: CrimeType;
  byType: Record<CrimeType, number>;
  byHour: Record<number, number>;    // 0–23
  trend: 'up' | 'down' | 'stable';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  coordinates: GeoPoint;
  lastUpdated: Date;
}

export interface FilterState {
  district: string;
  type: CrimeType | '';
  status: ReportStatus | '';
  startHour: number;
  endHour: number;
  dateFrom: string;
  dateTo: string;
}

export interface EtlJob {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  recordsTotal: number;
  recordsLoaded: number;
  errors: string[];
  startedAt: Date;
  finishedAt?: Date;
}
