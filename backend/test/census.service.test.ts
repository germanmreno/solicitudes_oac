import { describe, it, expect } from 'vitest';
import { generateFileNumber, listCensus } from '../src/modules/census/census.service.js';

describe('census.service.generateFileNumber', () => {
  it('generates a number in the CVM-YYYY-NNNNN format', async () => {
    const year = new Date().getFullYear();
    const num = await generateFileNumber(year);
    expect(num).toMatch(new RegExp(`^CVM-${year}-\\d{5}$`));
  });
});

describe('census.service.listCensus', () => {
  it('returns paginated result with meta', async () => {
    const result = await listCensus({ page: 1, limit: 10 });
    expect(result.meta).toBeDefined();
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
    expect(Array.isArray(result.items)).toBe(true);
  });
});
