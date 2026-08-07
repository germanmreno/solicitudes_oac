import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { EChart, type ECOption } from '@/components/charts/EChart';
import { getSummary, type StatsSummary } from '@/features/stats/stats.api';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const CVM_PALETTE = ['#638c3a', '#1e3a6b', '#E8DCC4', '#C98A2B', '#3F8F4F', '#B23A3A', '#8FA463', '#4A6FA5'];

function makePieOption(data: { name: string; count: number }[], title: string): ECOption {
  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['30%', '60%'],
        center: ['50%', '55%'],
        data: data.map((d) => ({ name: d.name, value: d.count })),
        label: { show: true, formatter: '{b}' },
        color: CVM_PALETTE,
      },
    ],
  };
}

function makeBarOption(data: { name: string; count: number }[], title: string, horizontal?: boolean): ECOption {
  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: horizontal
      ? { type: 'value' }
      : { type: 'category', data: data.map((d) => d.name), axisLabel: { rotate: 45 } },
    yAxis: horizontal
      ? { type: 'category', data: data.map((d) => d.name).reverse() }
      : { type: 'value' },
    series: [
      {
        type: 'bar',
        data: horizontal ? data.map((d) => d.count).reverse() : data.map((d) => d.count),
        itemStyle: { color: CVM_PALETTE[0] },
      },
    ],
  };
}

function makeMonthlyOption(data: StatsSummary['monthlyAmounts']): ECOption {
  return {
    title: { text: 'Gastos mensuales', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, data: ['USD', 'Bs.'] },
    grid: { left: '3%', right: '8%', bottom: '20%', containLabel: true },
    xAxis: { type: 'category', data: data.map((d) => d.month) },
    yAxis: [
      { type: 'value', name: 'USD', position: 'left', axisLabel: { formatter: '${value}' } },
      { type: 'value', name: 'Bs.', position: 'right', axisLabel: { formatter: 'Bs. {value}' } },
    ],
    series: [
      {
        name: 'USD',
        type: 'bar',
        data: data.map((d) => Number(d.amountUsd)),
        itemStyle: { color: CVM_PALETTE[0] },
        yAxisIndex: 0,
      },
      {
        name: 'Bs.',
        type: 'bar',
        data: data.map((d) => Number(d.amountBs)),
        itemStyle: { color: CVM_PALETTE[1] },
        yAxisIndex: 1,
      },
    ],
  };
}

export function ChartsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(sixMonthsAgo);
  const [to, setTo] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(from);
  const [appliedTo, setAppliedTo] = useState(to);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', appliedFrom, appliedTo],
    queryFn: () => getSummary(appliedFrom || undefined, appliedTo || undefined),
  });

  function apply() {
    setAppliedFrom(from ? startOfDay(new Date(from + 'T00:00:00')).toISOString() : '');
    setAppliedTo(to ? endOfDay(new Date(to + 'T00:00:00')).toISOString() : '');
  }

  return (
    <div className="container-page max-w-6xl">
      <h1 className="text-2xl font-serif text-secondary mb-1">Gráficos</h1>
      <p className="text-sm text-muted-foreground mb-4">Resumen estadístico de las solicitudes registradas.</p>

      <div className="flex items-end gap-3 mb-6 flex-wrap">
        <div>
          <Label htmlFor="from">Desde</Label>
          <Input id="from" type="date" value={from ? from.slice(0, 10) : ''} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="to">Hasta</Label>
          <Input id="to" type="date" value={to ? to.slice(0, 10) : ''} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={apply} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          Aplicar
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !stats ? (
        <p className="text-center text-muted-foreground py-12">Sin datos en el rango seleccionado.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de solicitudes</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-secondary">{stats.totals.count}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total USD</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-secondary">{formatCurrency(stats.totals.amountUsd, 'USD')}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Bs.</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-secondary">{formatCurrency(Number(stats.totals.amountBs), 'VES')}</p></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                {stats.byOriginType.length > 0
                  ? <EChart option={makePieOption(stats.byOriginType, 'Procedencias')} height={280} />
                  : <p className="text-center text-muted-foreground py-8">Sin datos</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                {stats.bySite.length > 0
                  ? <EChart option={makeBarOption(stats.bySite, 'Sedes más frecuentes')} height={280} />
                  : <p className="text-center text-muted-foreground py-8">Sin datos</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                {stats.topAidAreas.length > 0
                  ? <EChart option={makeBarOption(stats.topAidAreas, 'Áreas más atendidas', true)} height={300} />
                  : <p className="text-center text-muted-foreground py-8">Sin datos</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                {stats.byAidType.length > 0
                  ? <EChart option={makePieOption(stats.byAidType, 'Tipo de ayuda')} height={280} />
                  : <p className="text-center text-muted-foreground py-8">Sin datos</p>}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardContent className="pt-4">
                {stats.monthlyAmounts.length > 0
                  ? <EChart option={makeMonthlyOption(stats.monthlyAmounts)} height={300} />
                  : <p className="text-center text-muted-foreground py-8">Sin datos</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
