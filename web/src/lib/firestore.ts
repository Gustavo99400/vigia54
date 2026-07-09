// ============================================================
// VIGÍA 54 — Firestore Queries (RF4/RF5)
// Geospatial and analytics queries
// ============================================================
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
  GeoPoint as FirestoreGeoPoint,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Report, FilterState, CrimeType, HeatmapPoint, DistrictAnalytics, HeatmapData } from '@/types';
import { encodeGeohash } from '@/utils/geo';

// ── Submit new report (RF8) ───────────────────────────────────
export async function submitReport(
  data: {
    authorId: string;
    type: CrimeType;
    description: string;
    lat: number;
    lng: number;
    district: string;
    mediaUrls?: string[];
    status?: Report['status'];
    priority?: Report['priority'];
    isSos?: boolean;
  }
): Promise<string> {
  const geohash = encodeGeohash(data.lat, data.lng, 7);
  
  const reportData: any = {
    authorId:    data.authorId,
    type:        data.type,
    description: data.description,
    location:    new FirestoreGeoPoint(data.lat, data.lng),
    geohash,
    district:    data.district,
    timestamp:   serverTimestamp(),
    status:      data.isSos ? 'pending' : (data.status ?? 'pending'),
    mediaUrls:   data.mediaUrls ?? [],
    priority:    data.isSos ? 'critical' : (data.priority ?? 'medium'),
    hour:        new Date().getHours(),
    aiScore:     !data.isSos && data.status === 'verified' ? 1.0 : null,
    aiAnalysis:  !data.isSos && data.status === 'verified' ? 'Reporte verificado automáticamente vía botón de pánico SOS.' : null,
  };

  if (data.isSos) {
    reportData.isSos = true;
  }

  const ref = await addDoc(collection(db, 'reports'), reportData);
  return ref.id;
}

// ── Real-time reports subscription (RF4) ──────────────────────
export function subscribeToReports(
  filters: Partial<FilterState>,
  callback: (reports: Report[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'reports'),
    orderBy('timestamp', 'desc'),
    limit(1000)
  );

  return onSnapshot(q, (snap) => {
    let reports: Report[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id:          d.id,
        authorId:    data.authorId,
        type:        data.type,
        description: data.description,
        location:    { lat: data.location?.latitude ?? 0, lng: data.location?.longitude ?? 0 },
        geohash:     data.geohash,
        district:    data.district,
        timestamp:   data.timestamp?.toDate() ?? new Date(),
        status:      data.status,
        mediaUrls:   data.mediaUrls ?? [],
        aiScore:     data.aiScore,
        aiAnalysis:  data.aiAnalysis,
        priority:    data.priority ?? 'medium',
        hour:        data.hour ?? 0,
      } as Report;
    });

    // Client-side filtering to avoid Firestore composite index requirements
    if (filters.district) {
      reports = reports.filter(r => r.district.toLowerCase() === filters.district!.toLowerCase());
    }
    if (filters.type) {
      reports = reports.filter(r => r.type === filters.type);
    }
    if (filters.status) {
      reports = reports.filter(r => r.status === filters.status);
    }
    if (filters.startHour !== undefined && filters.startHour !== null) {
      reports = reports.filter(r => r.hour >= filters.startHour!);
    }
    if (filters.endHour !== undefined && filters.endHour !== null) {
      reports = reports.filter(r => r.hour <= filters.endHour!);
    }
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      reports = reports.filter(r => new Date(r.timestamp) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      reports = reports.filter(r => new Date(r.timestamp) <= toDate);
    }

    callback(reports);
  });
}

// ── Fetch all reports for heatmap (RF2) ─────────────────────
export async function fetchHeatmapData(): Promise<HeatmapData> {
  const snap = await getDocs(
    query(collection(db, 'reports'), where('status', '!=', 'false_alarm'), limit(1000))
  );
  
  const hotPoints: HeatmapPoint[] = [];
  const resolvedPoints: HeatmapPoint[] = [];

  snap.docs.forEach((d) => {
    const data = d.data();
    const lat = data.location?.latitude ?? 0;
    const lng = data.location?.longitude ?? 0;
    const status = data.status;

    if (status === 'resolved') {
      resolvedPoints.push({
        lat,
        lng,
        weight: 0.2,
      });
    } else if (status === 'verified') {
      hotPoints.push({
        lat,
        lng,
        weight: 1.0,
      });
    } else if (status === 'pending' || status === 'reviewing') {
      hotPoints.push({
        lat,
        lng,
        weight: 0.5,
      });
    }
  });

  return { hotPoints, resolvedPoints };
}

// ── Fetch analytics per district (RF5) ──────────────────────
export async function fetchDistrictAnalytics(): Promise<DistrictAnalytics[]> {
  const snap = await getDocs(collection(db, 'analytics'));
  return snap.docs.map((d) => ({ ...(d.data() as DistrictAnalytics), districtId: d.id }));
}

// ── Update report status (agente/admin) ─────────────────────
export async function updateReportStatus(
  reportId: string,
  status: Report['status'],
  note?: string
): Promise<void> {
  await updateDoc(doc(db, 'reports', reportId), { status, adminNote: note ?? '' });
}
