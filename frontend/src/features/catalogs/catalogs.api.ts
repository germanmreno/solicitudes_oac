import { api } from '@/lib/api/client';

export interface CatalogItem {
  id: string;
  name: string;
  active: boolean;
  requiresSite?: boolean;
  requiresDetail?: boolean;
  aidType?: { id: string; name: string };
}

export async function listOriginTypes(): Promise<CatalogItem[]> {
  const { data } = await api.get<{ data: CatalogItem[] }>('/catalogs/origin-types');
  return data.data;
}

export async function listSites(): Promise<CatalogItem[]> {
  const { data } = await api.get<{ data: CatalogItem[] }>('/catalogs/sites');
  return data.data;
}

export async function listAidTypes(): Promise<CatalogItem[]> {
  const { data } = await api.get<{ data: CatalogItem[] }>('/catalogs/aid-types');
  return data.data;
}

export async function listAidAreas(typeId?: string): Promise<CatalogItem[]> {
  const params = typeId ? `?typeId=${typeId}` : '';
  const { data } = await api.get<{ data: CatalogItem[] }>(`/catalogs/aid-areas${params}`);
  return data.data;
}
