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

export async function listExternalOrigins(): Promise<CatalogItem[]> {
  const { data } = await api.get<{ data: CatalogItem[] }>('/catalogs/external-origins');
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

export async function deleteOriginType(id: string) {
  await api.delete(`/catalogs/origin-types/${id}`);
}

export async function deleteSite(id: string) {
  await api.delete(`/catalogs/sites/${id}`);
}

export async function deleteAidType(id: string) {
  await api.delete(`/catalogs/aid-types/${id}`);
}

export async function deleteAidArea(id: string) {
  await api.delete(`/catalogs/aid-areas/${id}`);
}
