import { api } from '@/lib/api/client';

export interface ImportResult {
  successCount: number;
  errorCount: number;
  errors: { row: number; message: string }[];
}

export async function importCensusCsv(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<{ data: ImportResult }>('/import/census', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function downloadImportTemplate(): Promise<void> {
  const response = await api.get<Blob>('/import/template', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_solicitudes.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
