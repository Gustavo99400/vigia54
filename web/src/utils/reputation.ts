/**
 * Calcula el Trust Score (reputación) de un ciudadano basado en sus reportes de incidentes.
 * Ponderación: Reportes Confirmados (verificados) = +1.0, Reportes Falsos (falsa alarma) = -5.0.
 * 
 * Fórmula:
 * TS = ((R_verificados * 1.0) - (R_falsas * 5.0)) / R_totales * 100
 * 
 * Condiciones límite:
 * - Si R_totales = 0, el Trust Score por defecto es 100.
 * - El valor está acotado (clamped) entre 0 y 100.
 */
export function calculateTrustScore(
  reportesVerificados: number,
  falsasAlarmas: number,
  reportesTotales: number
): number {
  if (reportesTotales <= 0) {
    return 100;
  }

  const verificados = Math.max(0, reportesVerificados);
  const falsas = Math.max(0, falsasAlarmas);
  
  const score = ((verificados * 1.0) - (falsas * 5.0)) / reportesTotales * 100;
  
  // Limitar el resultado entre 0 y 100 y redondear a dos decimales
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}
