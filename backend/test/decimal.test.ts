import { describe, it, expect } from 'vitest';
import { isValidDecimalInput, normalizeDecimalInput } from '../src/lib/decimal.js';

describe('decimal.normalizeDecimalInput', () => {
  it('acepta montos en formato español e inglés', () => {
    expect(normalizeDecimalInput('1.234,56')).toBe('1234.56');
    expect(normalizeDecimalInput('2,423,846.87')).toBe('2423846.87');
    expect(normalizeDecimalInput('1234,56')).toBe('1234.56');
    expect(normalizeDecimalInput('1234.56')).toBe('1234.56');
    expect(normalizeDecimalInput('1,234')).toBe('1234');
    expect(normalizeDecimalInput('1.234')).toBe('1234');
    expect(normalizeDecimalInput('120')).toBe('120');
    expect(normalizeDecimalInput('0.5')).toBe('0.5');
  });

  it('rechaza valores no numéricos', () => {
    expect(normalizeDecimalInput('')).toBeUndefined();
    expect(normalizeDecimalInput('abc')).toBeUndefined();
    expect(normalizeDecimalInput('-5')).toBeUndefined();
    expect(normalizeDecimalInput('1.23456789')).toBeUndefined();
  });
});

describe('decimal.isValidDecimalInput', () => {
  it('vacío es válido y texto no', () => {
    expect(isValidDecimalInput('')).toBe(true);
    expect(isValidDecimalInput('1.234,56')).toBe(true);
    expect(isValidDecimalInput('abc')).toBe(false);
  });
});
