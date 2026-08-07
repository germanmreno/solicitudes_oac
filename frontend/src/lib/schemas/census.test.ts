import { describe, it, expect } from 'vitest';
import { censusFormSchema, cedulaSchema } from './census';

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
});
