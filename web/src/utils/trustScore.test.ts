// ============================================================
// VIGÍA 54 — Tests: Trust Score Algorithm (RF1)
// ============================================================
import {
  calculateTrustScore,
  isAiEligible,
  getTrustLabel,
  TRUST_SCORE_INITIAL,
  TRUST_SCORE_AI_THRESHOLD,
} from '@/utils/trustScore';

describe('calculateTrustScore', () => {
  it('returns 100 when no reports have been submitted', () => {
    expect(calculateTrustScore(0, 0, 0)).toBe(TRUST_SCORE_INITIAL);
  });

  it('returns 100 when all reports are verified', () => {
    expect(calculateTrustScore(10, 0, 10)).toBe(100);
  });

  it('penalizes false alarms heavily (×5)', () => {
    // 5 verified, 1 false alarm, 6 total
    // (5×1 - 1×5) / 6 × 100 = 0/6 × 100 = 0
    expect(calculateTrustScore(5, 1, 6)).toBe(0);
  });

  it('clamps to 0 when false alarms exceed verified reports', () => {
    expect(calculateTrustScore(0, 10, 10)).toBe(0);
  });

  it('clamps to 100 maximum', () => {
    expect(calculateTrustScore(1000, 0, 1000)).toBe(100);
  });

  it('matches formula: ((V×1 - F×5) / T) × 100', () => {
    // 8 verified, 0 false, 10 total → (8/10)*100 = 80
    expect(calculateTrustScore(8, 0, 10)).toBe(80);
  });

  it('is a number in range [0, 100]', () => {
    for (let i = 0; i < 20; i++) {
      const v = Math.floor(Math.random() * 10);
      const f = Math.floor(Math.random() * 5);
      const t = v + f + Math.floor(Math.random() * 3);
      const score = calculateTrustScore(v, f, t || 1);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('isAiEligible', () => {
  it('returns true above threshold', () => {
    expect(isAiEligible(TRUST_SCORE_AI_THRESHOLD)).toBe(true);
    expect(isAiEligible(100)).toBe(true);
  });

  it('returns false below threshold', () => {
    expect(isAiEligible(TRUST_SCORE_AI_THRESHOLD - 1)).toBe(false);
    expect(isAiEligible(0)).toBe(false);
  });
});

describe('getTrustLabel', () => {
  it('returns Suspendido for score < 30', () => {
    expect(getTrustLabel(0).label).toBe('Suspendido');
    expect(getTrustLabel(29).label).toBe('Suspendido');
    expect(getTrustLabel(0).level).toBe('critical');
  });

  it('returns Bajo for 30–49', () => {
    expect(getTrustLabel(30).label).toBe('Bajo');
    expect(getTrustLabel(49).label).toBe('Bajo');
  });

  it('returns Moderado for 50–74', () => {
    expect(getTrustLabel(50).label).toBe('Moderado');
    expect(getTrustLabel(74).label).toBe('Moderado');
  });

  it('returns Confiable for 75+', () => {
    expect(getTrustLabel(75).label).toBe('Confiable');
    expect(getTrustLabel(100).label).toBe('Confiable');
    expect(getTrustLabel(100).level).toBe('high');
  });
});

describe('User Reputation Lifecycle Simulation (Complex Integration Scenario)', () => {
  it('correctly simulates a complex user reporting history timeline', () => {
    // Stage 1: New user submits their first report (pending). Reputations starts at default 100.
    let verified = 0;
    let falseAlarms = 0;
    let total = 0;
    expect(calculateTrustScore(verified, falseAlarms, total)).toBe(100);

    // Stage 2: First report gets verified.
    verified = 1;
    total = 1;
    expect(calculateTrustScore(verified, falseAlarms, total)).toBe(100);
    expect(getTrustLabel(calculateTrustScore(verified, falseAlarms, total)).label).toBe('Confiable');

    // Stage 3: User submits 3 more reports, all are verified. Reputation remains 100.
    verified = 4;
    total = 4;
    expect(calculateTrustScore(verified, falseAlarms, total)).toBe(100);

    // Stage 4: User submits a false alarm (e.g. joke or spam report).
    // Verified: 4, False: 1, Total: 5.
    // Formula: ((4*1 - 1*5)/5)*100 = (-1/5)*100 = -20% -> clamped to 0
    falseAlarms = 1;
    total = 5;
    let score = calculateTrustScore(verified, falseAlarms, total);
    expect(score).toBe(0);
    // AI Triage eligibility gets disabled because score is below 30
    expect(isAiEligible(score)).toBe(false);
    expect(getTrustLabel(score).label).toBe('Suspendido');

    // Stage 5: User tries to recover by submitting genuine reports.
    // 5.1: Submits 1 verified report. Total = 6. Verified = 5, False = 1.
    // Formula: ((5*1 - 1*5)/6)*100 = 0 -> still 0.
    verified = 5;
    total = 6;
    expect(calculateTrustScore(verified, falseAlarms, total)).toBe(0);

    // 5.2: Submits 5 more verified reports. Total = 11. Verified = 10, False = 1.
    // Formula: ((10*1 - 1*5)/11)*100 = 5/11*100 = 45.45%
    verified = 10;
    total = 11;
    score = calculateTrustScore(verified, falseAlarms, total);
    expect(score).toBe(45.45);
    expect(isAiEligible(score)).toBe(true); // Recovered AI eligibility (> 30)
    expect(getTrustLabel(score).label).toBe('Bajo');

    // 5.3: Submits 15 more verified reports. Total = 26. Verified = 25, False = 1.
    // Formula: ((25*1 - 1*5)/26)*100 = 20/26*100 = 76.92%
    verified = 25;
    total = 26;
    score = calculateTrustScore(verified, falseAlarms, total);
    expect(score).toBe(76.92);
    expect(getTrustLabel(score).label).toBe('Confiable'); // Full recovery to trustworthy status
  });
});
