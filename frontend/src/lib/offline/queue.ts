import { v4 as uuidv4 } from 'uuid';
import { db, type PendingMutation, type MutationMethod } from './db';
import { api } from '@/lib/api/client';
import { useSyncStore } from './sync.store';

export async function enqueueMutation(input: {
  method: MutationMethod;
  url: string;
  body?: unknown;
}): Promise<string> {
  const id = uuidv4();
  const mutation: PendingMutation = {
    id,
    idempotencyKey: id,
    method: input.method,
    url: input.url,
    body: input.body,
    createdAt: Date.now(),
    attempts: 0,
  };
  await db.mutations.add(mutation);
  useSyncStore.getState().refresh();
  return id;
}

export async function drainMutations(): Promise<{ ok: number; failed: number }> {
  const pending = await db.mutations.orderBy('createdAt').toArray();
  let ok = 0;
  let failed = 0;

  for (const m of pending) {
    try {
      if (m.method === 'POST') await api.post(m.url, m.body);
      else if (m.method === 'PATCH') await api.patch(m.url, m.body);
      else if (m.method === 'DELETE') await api.delete(m.url);
      await db.mutations.delete(m.id);
      ok++;
    } catch (err) {
      failed++;
      await db.mutations.update(m.id, {
        attempts: m.attempts + 1,
        lastError: err instanceof Error ? err.message : String(err),
      });
    }
  }
  useSyncStore.getState().refresh();
  return { ok, failed };
}

export function setupAutoSync() {
  const trySync = () => {
    if (navigator.onLine) {
      void drainMutations();
    }
  };
  window.addEventListener('online', trySync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') trySync();
  });
}
