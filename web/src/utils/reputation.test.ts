import { calculateTrustScore } from "./reputation";

describe("Algoritmo de Confianza (Trust Score)", () => {
  test("Caso base: Usuario nuevo con 0 reportes totales debe tener Trust Score de 100", () => {
    expect(calculateTrustScore(0, 0, 0)).toBe(100);
  });

  test("Usuario con reportes confirmados y 0 falsas alarmas debe tener Trust Score de 100", () => {
    expect(calculateTrustScore(5, 0, 5)).toBe(100);
  });

  test("Usuario con 1 reporte verificado y 1 falsa alarma sobre 2 totales debe restar reputación y acotarse a 0", () => {
    // ((1 * 1) - (1 * 5)) / 2 * 100 = -4 / 2 * 100 = -200% -> Acotado a 0
    expect(calculateTrustScore(1, 1, 2)).toBe(0);
  });

  test("Caso intermedio: 9 reportes confirmados y 1 falsa alarma sobre 10 totales debe dar 40%", () => {
    // ((9 * 1) - (1 * 5)) / 10 * 100 = 4 / 10 * 100 = 40%
    expect(calculateTrustScore(9, 1, 10)).toBe(40);
  });

  test("Caso de alta reputación: 19 reportes confirmados y 1 falsa alarma sobre 20 totales debe dar 70%", () => {
    // ((19 * 1) - (1 * 5)) / 20 * 100 = 14 / 20 * 100 = 70%
    expect(calculateTrustScore(19, 1, 20)).toBe(70);
  });

  test("Puntaje negativo extremo debe acotarse a 0", () => {
    expect(calculateTrustScore(0, 3, 3)).toBe(0);
  });

  test("Parámetros negativos en entradas deben ser tratados como cero", () => {
    expect(calculateTrustScore(-5, -2, 10)).toBe(0);
  });
});
