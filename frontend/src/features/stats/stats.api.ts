import { api } from '@/lib/api/client';

export interface StatsGroup {
  name: string;
  count: number;
  pagadoUsd: string;
  pendienteUsd: string;
  pagadoBs: string;
  pendienteBs: string;
}

export interface StatsMonthly {
  month: string;
  amountUsd: string;
  amountBs: string;
  pagadoUsd: string;
  pendienteUsd: string;
  pagadoBs: string;
  pendienteBs: string;
}

export interface StatsProyecto {
  name: string;
  count: number;
  pagadoUsd: string;
  pendienteUsd: string;
  pagadoBs: string;
  pendienteBs: string;
  monthly: StatsMonthly[];
}

export interface StatsSummary {
  byOriginType: StatsGroup[];
  bySite: { name: string; count: number }[];
  byExternalOrigin: { name: string; count: number }[];
  byAidType: StatsGroup[];
  topAidAreas: { name: string; count: number }[];
  monthlyAmounts: StatsMonthly[];
  proyecto: StatsProyecto | null;
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
