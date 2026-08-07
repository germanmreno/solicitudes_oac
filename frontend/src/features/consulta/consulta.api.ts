import { api } from '@/lib/api/client';

export interface ConsultaResultado {
  fileNumber: string | null;
  aidStatus: 'ATENDIDO' | 'EN_PROCESO' | 'EN_EVALUACION' | 'NO_PROCEDE';
  aidObservation: string | null;
  aidType: string | null;
  aidArea: string | null;
  updatedAt: string;
}

export async function consultarEstatus(q: string): Promise<ConsultaResultado> {
  const { data } = await api.get<{ data: ConsultaResultado }>('/public/consulta', {
    params: { q },
  });
  return data.data;
}
