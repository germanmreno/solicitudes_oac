import Dexie, { type EntityTable } from 'dexie';

export interface CensusDraft {
  id: string;
  data: Record<string, unknown>;
  step: number;
  updatedAt: number;
}

export type MutationMethod = 'POST' | 'PATCH' | 'DELETE';

export interface PendingMutation {
  id: string;
  idempotencyKey: string;
  method: MutationMethod;
  url: string;
  body?: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface CachedCatalog {
  id: string;
  type: 'originType' | 'site' | 'externalOrigin' | 'aidType' | 'aidArea';
  name: string;
  active: boolean;
  requiresSite?: boolean;
  requiresDetail?: boolean;
  aidTypeId?: string;
  aidType?: { id: string; name: string };
}

export interface CachedFileNumber {
  year: number;
  next: number;
}

class CensoCvmDB extends Dexie {
  drafts!: EntityTable<CensusDraft, 'id'>;
  mutations!: EntityTable<PendingMutation, 'id'>;
  catalogs!: EntityTable<CachedCatalog, 'id'>;
  fileNumbers!: EntityTable<CachedFileNumber, 'year'>;

  constructor() {
    super('censo_cvm');
    this.version(2).stores({
      drafts: 'id, updatedAt',
      mutations: 'id, idempotencyKey, createdAt',
      catalogs: 'id, type, name',
      fileNumbers: 'year',
    });
  }
}

export const db = new CensoCvmDB();
