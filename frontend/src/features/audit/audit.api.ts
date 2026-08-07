import { api } from '@/lib/api/client';

export interface AuditUser {
  id: string;
  username: string;
  fullName: string;
}

export interface AuditItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  payload: unknown;
  createdAt: string;
  user: AuditUser | null;
}

export interface AuditQuery {
  entity?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AuditResponse {
  items: AuditItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function listAudit(query: AuditQuery): Promise<AuditResponse> {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  });
  const qs = search.toString();
  const { data } = await api.get<AuditResponse>(`/audit${qs ? `?${qs}` : ''}`);
  return data;
}
