import { api } from '@/lib/api/client';

export async function downloadCensusExport(): Promise<void> {
  const response = await api.get<Blob>('/export/census', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DATA DE CASOS OAC- ${new Date().getFullYear()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
