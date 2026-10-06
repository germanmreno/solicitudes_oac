import { api } from '@/lib/api/client';

export interface CatalogItem {
  id: string;
  name: string;
  active: boolean;
  requiresSite?: boolean;
  requiresDetail?: boolean;
  aidType?: { id: string; name: string };
  usageCount?: number;
  areaCount?: number;
}

export type CatalogKind =
  | 'origin-types'
  | 'sites'
  | 'external-origins'
  | 'aid-types'
  | 'aid-areas';

export interface CatalogCase {
  id: string;
  fileNumber: string | null;
  applicantName: string;
  applicantIdNumber: string;
  registrationDate: string;
  aidStatus: 'ATENDIDO' | 'EN_PROCESO' | 'EN_EVALUACION' | 'NO_PROCEDE';
  aidType: { name: string } | null;
  aidArea: { name: string } | null;
}

export interface CatalogCasesResult {
  total: number;
  items: CatalogCase[];
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

export async function listCatalogCases(kind: CatalogKind, id: string): Promise<CatalogCasesResult> {
  const { data } = await api.get<{ data: CatalogCasesResult }>(`/catalogs/${kind}/${id}/cases`);
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
