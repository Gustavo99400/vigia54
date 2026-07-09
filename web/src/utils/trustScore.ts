// ============================================================
// VIGÍA 54 — Trust Score Algorithm (RF1)
// Algorithm for citizen report reputation management
// Formula: TS = ((R_verified * 1.0) - (R_false * 5.0)) / R_total * 100
// ============================================================

export const TRUST_SCORE_INITIAL = 100.0;
export const TRUST_SCORE_MIN     = 0.0;
export const TRUST_SCORE_AI_THRESHOLD = 30.0;  // below this → manual review

export const VERIFIED_WEIGHT = 1.0;
export const FALSE_ALARM_PENALTY = 5.0;

/**
 * Calculate a user's Trust Score.
 * - If totalReports === 0 → returns 100.0 (convention, no division by zero)
 * - If score < TRUST_SCORE_AI_THRESHOLD → AI triage is disabled for the user
 *
 * @param verifiedReports  Reports confirmed by police/admin
 * @param falseAlarms      Reports classified as false by operators
 * @param totalReports     Total reports submitted by user
 */
export function calculateTrustScore(
  verifiedReports: number,
  falseAlarms: number,
  totalReports: number
): number {
  if (totalReports <= 0) return TRUST_SCORE_INITIAL;

  const numerator = verifiedReports * VERIFIED_WEIGHT - falseAlarms * FALSE_ALARM_PENALTY;
  const raw = (numerator / totalReports) * 100;

  // Clamp to [0, 100]
  return Math.min(100, Math.max(0, parseFloat(raw.toFixed(2))));
}

/**
 * Determine if the user is eligible for AI triage
 * (score >= 30 → eligible)
 */
export function isAiEligible(trustScore: number): boolean {
  return trustScore >= TRUST_SCORE_AI_THRESHOLD;
}

/**
 * Human-readable label for the trust score
 */
export function getTrustLabel(score: number): { label: string; level: 'critical' | 'low' | 'medium' | 'high' } {
  if (score < 30) return { label: 'Suspendido',  level: 'critical' };
  if (score < 50) return { label: 'Bajo',        level: 'low' };
  if (score < 75) return { label: 'Moderado',    level: 'medium' };
  return             { label: 'Confiable',    level: 'high' };
}
