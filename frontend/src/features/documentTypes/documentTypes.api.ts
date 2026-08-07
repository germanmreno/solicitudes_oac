import { api } from '@/lib/api/client';

export interface DocumentTypeItem {
  id: string;
  code: string;
  name: string;
  requiredByDefault: boolean;
  requiredForAidType: boolean;
}

export async function listDocumentTypes(aidTypeId?: string): Promise<DocumentTypeItem[]> {
  const params = aidTypeId ? `?aidTypeId=${aidTypeId}` : '';
  const { data } = await api.get<{ data: DocumentTypeItem[] }>(`/document-types${params}`);
  return data.data;
}
