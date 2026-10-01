import { describe, it, expect } from 'vitest';
import { normalizeCedula, parseDecimal, parseSex } from '../src/modules/import/import.service.js';
import { FILE_NUMBER_REGEX } from '../src/modules/census/census.service.js';

describe('import.normalizeCedula', () => {
  it('canonicaliza los centinelas No Aplica / No Posee', () => {
    expect(normalizeCedula('N/A')).toBe('N/A');
    expect(normalizeCedula('n/a')).toBe('N/A');
    expect(normalizeCedula('No aplica')).toBe('N/A');
    expect(normalizeCedula('N/P')).toBe('N/P');
    expect(normalizeCedula('Np')).toBe('N/P');
    expect(normalizeCedula('No posee')).toBe('N/P');
  });

  it('normaliza cédulas con puntos y espacios', () => {
    expect(normalizeCedula('V- 11.011.782')).toBe('V-11011782');
    expect(normalizeCedula('27376369')).toBe('V-27376369');
    expect(normalizeCedula('C.I. V-12345678')).toBe('V-12345678');
  });
});

describe('import.parseSex', () => {
  it('mapea N/A a NO_APLICA', () => {
    expect(parseSex('N/A')).toBe('NO_APLICA');
    expect(parseSex('No aplica')).toBe('NO_APLICA');
  });
  it('mapea M/F a masculino/femenino', () => {
    expect(parseSex('M')).toBe('MASCULINO');
    expect(parseSex('Femenino')).toBe('FEMENINO');
  });
  it('devuelve undefined si está vacío', () => {
    expect(parseSex('')).toBeUndefined();
  });
});

describe('import.parseDecimal', () => {
  it('acepta montos en formato español e inglés', () => {
    expect(parseDecimal('5.000,00')).toBe('5000');
    expect(parseDecimal('2,423,846.87')).toBe('2423846.87');
    expect(parseDecimal('1.234,56')).toBe('1234.56');
    expect(parseDecimal('16,789,00')).toBe('16789');
    expect(parseDecimal('652.9726')).toBe('652.9726');
  });
  it('ignora celdas sin dígitos', () => {
    expect(parseDecimal('-')).toBeUndefined();
    expect(parseDecimal('N/A')).toBeUndefined();
    expect(parseDecimal('')).toBeUndefined();
  });
});

describe('census FILE_NUMBER_REGEX', () => {
  it('acepta expedientes base y con sufijo extra', () => {
    expect(FILE_NUMBER_REGEX.test('OAC-0001-2026')).toBe(true);
    expect(FILE_NUMBER_REGEX.test('OAC-0309-1-2026')).toBe(true);
  });
  it('rechaza formatos inválidos', () => {
    expect(FILE_NUMBER_REGEX.test('OAC-309-2026')).toBe(false);
    expect(FILE_NUMBER_REGEX.test('OAC-0309-2026-1')).toBe(false);
    expect(FILE_NUMBER_REGEX.test('0309')).toBe(false);
  });
});
