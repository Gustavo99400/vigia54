// ============================================================
// VIGÍA 54 — Cloud Functions (RF1 + RF3 + RF5)
// Serverless backend on Firebase
// ============================================================
import * as functions from 'firebase-functions/v2';
import * as admin     from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// ── RF1: Triaje IA con Gemini ─────────────────────────────
// Triggered when a new report is created in Firestore
export const triageReport = functions.firestore.onDocumentCreated(
  'reports/{reportId}',
  async (event) => {
    const data = event.data?.data();
    if (!data || data.source === 'etl_import') return; // skip ETL data
    if (data.status !== 'pending') return;

    const reportId = event.params.reportId;

    if (data.isSos === true) {
      try {
        await db.doc(`reports/${reportId}`).update({
          status:     'verified',
          priority:   'critical',
          aiScore:    1.0,
          aiAnalysis: 'Reporte verificado automáticamente vía botón de pánico SOS.',
        });
        functions.logger.info(`[RF1] SOS Auto-verificación OK: ${reportId}`);
      } catch (err) {
        functions.logger.error('[RF1] SOS Auto-verificación error:', err);
      }
      return;
    }

    const apiKey   = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      functions.logger.warn('GEMINI_API_KEY not set. Skipping triage.');
      return;
    }

    // Fetch local police allocation context
    let policeContext = '';
    try {
      const districtUpper = (data.district || '').toUpperCase();
      const policeSnap = await db.doc(`police_allocation/${districtUpper}`).get();
      if (policeSnap.exists) {
        const p = policeSnap.data()!;
        policeContext = `Contexto del Despliegue de Fuerza Policial PNP en el distrito de ${data.district}:
- Efectivos Totales Asignados: ${p.total || 0}
- Oficiales: ${p.oficial || 0}, Suboficiales: ${p.suboficial || 0}
- Personal de Armas: ${p.armas || 0}, Personal de Servicios: ${p.servicios || 0}
- Efectivos en Funciones Operativas: ${p.operativo || 0}, Funciones Administrativas: ${p.administrativo || 0}
- Provincia: ${p.provincia || 'Desconocido'}, Departamento: ${p.departamento || 'Desconocido'}

Usa este contexto para ponderar la gravedad y explicar en el campo "analysis" si el distrito posee suficiente personal operativo de armas para responder eficazmente a este incidente en particular.`;
      } else {
        policeContext = `No hay datos registrados sobre el despliegue policial en el distrito de ${data.district}.`;
      }
    } catch (err) {
      functions.logger.error('Error fetching police allocation context:', err);
    }

    try {
      // Call Gemini API
      const prompt = `Eres un sistema de triaje policial en Arequipa, Perú.
Analiza el siguiente reporte ciudadano y responde SOLO con un JSON con estos campos:
- "score": número de 0 a 1 (0=falsa alarma, 1=emergencia crítica)
- "priority": "low" | "medium" | "high" | "critical"  
- "analysis": resumen explicativo en español de máximo 100 palabras que justifique la prioridad e incorpore análisis del despliegue policial local si está disponible.
- "isFalseAlarm": boolean

${policeContext}

REPORTE:
Tipo: ${data.type}
Distrito: ${data.district}
Descripción: ${data.description}

Responde SOLO con el JSON, sin texto adicional.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
          }),
        }
      );

      const json  = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const raw   = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const clean = raw.replace(/```json|```/g, '').trim();
      const result= JSON.parse(clean) as { score: number; priority: string; analysis: string; isFalseAlarm: boolean };

      const newStatus = result.isFalseAlarm ? 'false_alarm' : 'pending';

      await db.doc(`reports/${reportId}`).update({
        aiScore:    result.score,
        aiAnalysis: result.analysis,
        priority:   result.priority,
        status:     newStatus,
      });

      // Update user trust score if false alarm
      if (result.isFalseAlarm && data.authorId && data.authorId !== 'etl_import') {
        const userRef = db.doc(`users/${data.authorId}`);
        await db.runTransaction(async (tx) => {
          const userSnap = await tx.get(userRef);
          if (!userSnap.exists) return;
          const u = userSnap.data()!;
          const total    = (u['totalReports']   ?? 0) + 1;
          const verified = u['verifiedReports'] ?? 0;
          const falseAlarms = (u['falseAlarms'] ?? 0) + 1;
          const ts = total > 0
            ? Math.max(0, Math.min(100, ((verified - falseAlarms * 5) / total) * 100))
            : 100;
          tx.update(userRef, { totalReports: total, falseAlarms, trustScore: Math.round(ts) });
        });
      }

      functions.logger.info(`[RF1] Triaje OK: ${reportId} → score=${result.score} priority=${result.priority}`);
    } catch (err) {
      functions.logger.error('[RF1] Triage error:', err);
    }
  }
);

// ── RF5: Scheduled analytics aggregation ─────────────────
// Runs every hour to aggregate district-level stats
export const aggregateAnalytics = functions.scheduler.onSchedule(
  'every 60 minutes',
  async () => {
    const snap = await db.collection('reports').where('status', '!=', 'false_alarm').get();
    const byDistrict: Record<string, { total: number; byType: Record<string, number>; byHour: Record<number,number> }> = {};

    snap.forEach(doc => {
      const d = doc.data();
      const district = d['district'] ?? 'Desconocido';
      if (!byDistrict[district]) byDistrict[district] = { total: 0, byType: {}, byHour: {} };
      byDistrict[district].total++;
      byDistrict[district].byType[d['type']] = (byDistrict[district].byType[d['type']] ?? 0) + 1;
      byDistrict[district].byHour[d['hour']] = (byDistrict[district].byHour[d['hour']] ?? 0) + 1;
    });

    const batch = db.batch();
    for (const [district, stats] of Object.entries(byDistrict)) {
      const ref = db.doc(`analytics/${encodeURIComponent(district)}`);
      batch.set(ref, { ...stats, lastUpdated: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    await batch.commit();
    functions.logger.info(`[RF5] Analytics aggregated for ${Object.keys(byDistrict).length} districts`);
  }
);
