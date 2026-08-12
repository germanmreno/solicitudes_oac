import { api } from '@/lib/api/client';

export interface StatsSummary {
  byOriginType: { name: string; count: number }[];
  bySite: { name: string; count: number }[];
  byExternalOrigin: { name: string; count: number }[];
  byAidType: { name: string; count: number }[];
  topAidAreas: { name: string; count: number }[];
  monthlyAmounts: {
    month: string;
    amountUsd: string;
    amountBs: string;
    pagadoUsd: string;
    pendienteUsd: string;
    pagadoBs: string;
    pendienteBs: string;
  }[];
  totals: {
    count: number;
    amountUsd: string;
    amountBs: string;
    pagadoUsd: string;
    pendienteUsd: string;
    pagadoBs: string;
    pendienteBs: string;
  };
}

export async function getSummary(from?: string, to?: string): Promise<StatsSummary> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  const { data } = await api.get<{ data: StatsSummary }>(`/stats/summary${query ? `?${query}` : ''}`);
  return data.data;
}
