import { describe, it, expect } from 'vitest';
import {
  censusFormSchema,
  cedulaSchema,
  dateInputToIso,
  isSiturIdNumber,
  normalizeDecimalInput,
  toDateInputValue,
} from './census';

describe('identificador SITUR', () => {
  it('acepta el formato SITUR', () => {
    expect(() => cedulaSchema.parse('C-123456789')).not.toThrow();
    expect(isSiturIdNumber('C-123456789')).toBe(true);
  });
  it('rechaza SITUR inválido', () => {
    expect(() => cedulaSchema.parse('C-12345')).toThrow();
    expect(() => cedulaSchema.parse('C-1234567890')).toThrow();
    expect(isSiturIdNumber('C-12345')).toBe(false);
  });
});

describe('normalizeDecimalInput', () => {
  it('normaliza formatos ES/EN', () => {
    expect(normalizeDecimalInput('1.234,56')).toBe('1234.56');
    expect(normalizeDecimalInput('2,423,846.87')).toBe('2423846.87');
    expect(normalizeDecimalInput('1234,56')).toBe('1234.56');
    expect(normalizeDecimalInput('1,234.56')).toBe('1234.56');
  });
  it('rechaza valores no numéricos', () => {
    expect(normalizeDecimalInput('abc')).toBeUndefined();
    expect(normalizeDecimalInput('-5')).toBeUndefined();
    expect(normalizeDecimalInput('1.23456789')).toBeUndefined();
  });
});

describe('fecha de registro', () => {
  it('dateInputToIso preserva el día calendario en hora local', () => {
    const iso = dateInputToIso('2026-10-06');
    expect(iso).toBeDefined();
    const d = new Date(iso!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(6);
  });

  it('dateInputToIso devuelve undefined para vacío o inválido', () => {
    expect(dateInputToIso('')).toBeUndefined();
    expect(dateInputToIso(undefined)).toBeUndefined();
  });

  it('toDateInputValue formatea la fecha local como YYYY-MM-DD', () => {
    expect(toDateInputValue(new Date(2026, 9, 6))).toBe('2026-10-06');
  });
});

describe('cedulaSchema', () => {
  it('acepta V-12345678', () => {
    expect(() => cedulaSchema.parse('V-27376369')).not.toThrow();
  });
  it('acepta E-1234567', () => {
    expect(() => cedulaSchema.parse('E-1234567')).not.toThrow();
  });
  it('acepta N-12345678', () => {
    expect(() => cedulaSchema.parse('N-12345678')).not.toThrow();
  });
  it('rechaza formato inválido', () => {
    expect(() => cedulaSchema.parse('27376369')).toThrow();
    expect(() => cedulaSchema.parse('V-123')).toThrow();
    expect(() => cedulaSchema.parse('X-12345678')).toThrow();
  });
  it('acepta centinelas No Aplica y No Posee', () => {
    expect(() => cedulaSchema.parse('N/A')).not.toThrow();
    expect(() => cedulaSchema.parse('n/p')).not.toThrow();
  });
});

describe('censusFormSchema', () => {
  it('valida un censo mínimo correcto', () => {
    const result = censusFormSchema.safeParse({
      applicantName: 'Juan',
      applicantIdNumber: 'V-27376369',
      applicantSex: 'MASCULINO',
      originTypeId: 'some-uuid',
      aidTypeId: 'some-uuid',
      aidAreaId: 'some-uuid',
      aidDescription: 'Detalle',
    });
    expect(result.success).toBe(true);
  });

  it('acepta sexo y cédula No Aplica (casos de proyectos)', () => {
    const result = censusFormSchema.safeParse({
      applicantName: 'SENOSALUD',
      applicantIdNumber: 'N/A',
      applicantSex: 'NO_APLICA',
      originTypeId: 'some-uuid',
      aidTypeId: 'some-uuid',
      aidAreaId: 'some-uuid',
      aidDescription: 'Proyecto',
    });
    expect(result.success).toBe(true);
  });

  it('acepta expediente con sufijo extra y lo normaliza', () => {
    const result = censusFormSchema.safeParse({
      applicantName: 'Proyecto',
      applicantIdNumber: 'N/A',
      applicantSex: 'NO_APLICA',
      originTypeId: 'some-uuid',
      aidTypeId: 'some-uuid',
      aidAreaId: 'some-uuid',
      aidDescription: 'Proyecto',
      fileNumber: 'OAC- 0309-1- 2026',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fileNumber).toBe('OAC-0309-1-2026');
  });

  it('rechaza expediente con formato inválido', () => {
    const result = censusFormSchema.safeParse({
      applicantName: 'Proyecto',
      applicantIdNumber: 'N/A',
      applicantSex: 'NO_APLICA',
      originTypeId: 'some-uuid',
      aidTypeId: 'some-uuid',
      aidAreaId: 'some-uuid',
      aidDescription: 'Proyecto',
      fileNumber: 'OAC-309-2026',
    });
    expect(result.success).toBe(false);
  });

  it('requiere datos del beneficiario si no es el mismo solicitante', () => {
    const result = censusFormSchema.safeParse({
      applicantName: 'Juan',
      applicantIdNumber: 'V-27376369',
      applicantSex: 'MASCULINO',
      originTypeId: 'some-uuid',
      aidTypeId: 'some-uuid',
      aidAreaId: 'some-uuid',
      aidDescription: 'Detalle',
      beneficiarySameAsApplicant: false,
    });
    expect(result.success).toBe(false);
  });

  it('normaliza montos con separadores de miles y decimales', () => {
    const result = censusFormSchema.safeParse({
      applicantName: 'Juan',
      applicantIdNumber: 'V-27376369',
      applicantSex: 'MASCULINO',
      originTypeId: 'some-uuid',
      aidTypeId: 'some-uuid',
      aidAreaId: 'some-uuid',
      aidDescription: 'Detalle',
      amountUsd: '1.234,56',
      amountBs: '2,423,846.87',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountUsd).toBe('1234.56');
      expect(result.data.amountBs).toBe('2423846.87');
    }
  });

  it('rechaza montos no numéricos', () => {
    const result = censusFormSchema.safeParse({
      applicantName: 'Juan',
      applicantIdNumber: 'V-27376369',
      applicantSex: 'MASCULINO',
      originTypeId: 'some-uuid',
      aidTypeId: 'some-uuid',
      aidAreaId: 'some-uuid',
      aidDescription: 'Detalle',
      amountUsd: 'abc',
    });
    expect(result.success).toBe(false);
  });
});
