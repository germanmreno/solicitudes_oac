import { api } from '@/lib/api/client';
import { API_BASE } from '@/lib/api/config';

export interface CensusListItem {
  id: string;
  fileNumber: string | null;
  registrationDate: string;
  applicantName: string;
  applicantIdNumber: string;
  applicantSex: 'MASCULINO' | 'FEMENINO';
  applicantType: string | null;
  personnelType: string | null;
  originType: { id: string; name: string; requiresSite: boolean };
  site: { id: string; name: string } | null;
  externalOrigin: { id: string; name: string } | null;
  originDetail: string | null;
  beneficiarySameAsApplicant: boolean;
  beneficiaryName: string | null;
  beneficiaryIdNumber: string | null;
  beneficiarySex: 'MASCULINO' | 'FEMENINO' | null;
  aidType: { id: string; name: string };
  aidArea: { id: string; name: string; requiresDetail: boolean };
  aidAreaOther: string | null;
  aidDescription: string;
  managementMode: string | null;
  cooperatingEntity: string | null;
  aidStatus: 'ATENDIDO' | 'EN_PROCESO' | 'EN_EVALUACION' | 'NO_PROCEDE';
  idDocumentType: { id: string; name: string; code: string } | null;
  invoiceType: { id: string; name: string; code: string } | null;
  createdBy: { id: string; username: string; fullName: string };
  _count: { documents: number };
  hasCedula: boolean;
  hasCarta: boolean;
}

export interface CensusDocument {
  id: string;
  kind: 'MEDICAL' | 'INVOICE';
  documentTypeId: string | null;
  documentType: { id: string; name: string; code: string } | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface CensusDetail extends CensusListItem {
  phone: string | null;
  email: string | null;
  idDocumentPath: string | null;
  aidProvider: string | null;
  aidObservation: string | null;
  amountUsd: string | null;
  amountBs: string | null;
  paymentRate: string | null;
  paymentDate: string | null;
  paymentStatus: 'PENDIENTE' | 'PAGADO' | 'ANULADO' | null;
  invoicePath: string | null;
  invoiceNote: string | null;
  responsibleName: string | null;
  documents: CensusDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface ListCensusParams {
  q?: string;
  status?: string;
  aidAreaId?: string;
  from?: string;
  to?: string;
  createdById?: string;
  page?: number;
  limit?: number;
}

export async function getNextFileNumber(): Promise<string> {
  const { data } = await api.get<{ data: { fileNumber: string } }>('/census/next-file-number');
  return data.data.fileNumber;
}

export async function listCensus(params: ListCensusParams) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) search.set(k, String(v));
  });
  const { data } = await api.get<{
    items: CensusListItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>(`/census?${search.toString()}`);
  return data;
}

export async function getCensus(id: string): Promise<CensusDetail> {
  const { data } = await api.get<{ data: CensusDetail }>(`/census/${id}`);
  return data.data;
}

export async function createCensus(formData: FormData) {
  const { data } = await api.post<{ data: CensusDetail }>('/census', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function addMedicalDocuments(censusId: string, files: File[], documentTypeIds: string[] = []) {
  const formData = new FormData();
  files.forEach((f, i) => {
    formData.append('medical', f);
    if (documentTypeIds[i]) formData.append('documentTypeId', documentTypeIds[i]);
  });
  if (documentTypeIds.length > 0) {
    formData.append('documentTypeIds', documentTypeIds.join(','));
  }
  const { data } = await api.post<{ data: CensusDocument[] }>(
    `/census/${censusId}/documents`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

export async function addReceiptDocuments(censusId: string, files: File[], documentTypeIds: string[] = []) {
  const formData = new FormData();
  files.forEach((f, i) => {
    formData.append('receipt', f);
    if (documentTypeIds[i]) formData.append('documentTypeId', documentTypeIds[i]);
  });
  if (documentTypeIds.length > 0) {
    formData.append('documentTypeIds', documentTypeIds.join(','));
  }
  const { data } = await api.post<{ data: CensusDocument[] }>(
    `/census/${censusId}/documents`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

export async function changeCensusStatus(
  censusId: string,
  payload: { aidStatus: 'ATENDIDO' | 'EN_PROCESO' | 'EN_EVALUACION' | 'NO_PROCEDE'; aidObservation?: string },
) {
  const { data } = await api.patch<{ data: CensusDetail }>(`/census/${censusId}/status`, payload);
  return data.data;
}

export async function updatePayment(censusId: string, payload: {
  aidProvider?: string | null;
  aidObservation?: string | null;
  amountUsd?: string | null;
  amountBs?: string | null;
  paymentRate?: string | null;
  paymentDate?: string | null;
  paymentStatus?: 'PENDIENTE' | 'PAGADO' | 'ANULADO' | null;
}) {
  const { data } = await api.patch<{ data: CensusDetail }>(`/census/${censusId}/payment`, payload);
  return data.data;
}

export async function deleteCensusDocument(censusId: string, docId: string) {
  await api.delete(`/census/${censusId}/documents/${docId}`);
}

export async function updateCensus(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch<{ data: CensusDetail }>(`/census/${id}`, payload);
  return data.data;
}

export async function downloadDocumentUrl(censusId: string, docId: string) {
  return `${API_BASE}/census/${censusId}/documents/${docId}`;
}

export async function downloadCensusDocument(
  censusId: string,
  docId: string,
  suggestedName?: string,
): Promise<void> {
  const { api } = await import('@/lib/api/client');
  const response = await api.get<Blob>(
    `/census/${censusId}/documents/${docId}`,
    { responseType: 'blob' },
  );
  triggerBlobDownload(response.data, suggestedName || `documento-${docId}`);
}

export async function downloadInitialCensusFile(
  censusId: string,
  kind: 'idDocument' | 'invoice',
  suggestedName?: string,
): Promise<void> {
  const { api } = await import('@/lib/api/client');
  const response = await api.get<Blob>(
    `/census/${censusId}/files/${kind}`,
    { responseType: 'blob' },
  );
  triggerBlobDownload(response.data, suggestedName || `${kind}-${censusId}`);
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
