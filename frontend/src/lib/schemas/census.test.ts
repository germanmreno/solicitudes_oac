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
});
