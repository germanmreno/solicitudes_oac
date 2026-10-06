import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Pencil, Check, X, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, getErrorMessage } from '@/lib/api/client';
import {
  listOriginTypes,
  listSites,
  listExternalOrigins,
  listAidTypes,
  listAidAreas,
} from '@/features/catalogs/catalogs.api';
import type { CatalogItem, CatalogKind } from '@/features/catalogs/catalogs.api';
import { CatalogCasesDialog } from '@/components/catalogs/CatalogCasesDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';

interface EditableRowProps {
  item: CatalogItem;
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onViewCases: (item: CatalogItem) => void;
  showAreaCount?: boolean;
}

function EditableRow({ item, onSave, onDelete, onViewCases, showAreaCount }: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [busy, setBusy] = useState(false);
  const blocked = (item.usageCount ?? 0) > 0 || (item.areaCount ?? 0) > 0;

  const handleSave = useCallback(async () => {
    if (!name.trim() || name.trim().length < 2) return;
    setBusy(true);
    try {
      await onSave(item.id, { name: name.trim() });
      setEditing(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar'));
    } finally {
      setBusy(false);
    }
  }, [name, item.id, onSave]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    try {
      await onDelete(item.id);
      toast.success('Elemento eliminado');
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo eliminar'));
    } finally {
      setBusy(false);
    }
  }, [item.name, item.id, onDelete]);

  return (
    <TableRow>
      <TableCell>
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
        ) : (
          <span className={item.active ? '' : 'text-muted-foreground line-through'}>{item.name}</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {(item.usageCount ?? 0) > 0 ? (
          <button
            type="button"
            onClick={() => onViewCases(item)}
            className="text-primary hover:underline font-medium"
            aria-label={`Ver los ${item.usageCount} casos de ${item.name}`}
            title="Ver casos"
          >
            {item.usageCount}
          </button>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </TableCell>
      {showAreaCount && (
        <TableCell className="text-right tabular-nums">{item.areaCount ?? 0}</TableCell>
      )}
      <TableCell className="text-right">
        {editing ? (
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setName(item.name); setEditing(false); }}>
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={busy || blocked}
              title={blocked ? 'No se puede eliminar: tiene casos o áreas asociadas' : 'Eliminar'}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function CatalogManager({
  items,
  onAdd,
  onSave,
  onDelete,
  placeholder,
  extraNewFields,
  casesKind,
  showAreaCount,
}: {
  items: CatalogItem[];
  onAdd: (data: Record<string, string | boolean>) => Promise<void>;
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  placeholder?: string;
  extraNewFields?: React.ReactNode;
  casesKind: CatalogKind;
  showAreaCount?: boolean;
}) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [casesItem, setCasesItem] = useState<CatalogItem | null>(null);

  const handleAdd = useCallback(async () => {
    if (!newName.trim() || newName.trim().length < 2) return;
    setSaving(true);
    try {
      await onAdd({ name: newName.trim() });
      setNewName('');
      void qc.invalidateQueries();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo crear'));
    } finally {
      setSaving(false);
    }
  }, [newName, onAdd, qc]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder={placeholder || 'Nombre del nuevo elemento'}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="max-w-xs"
        />
        {extraNewFields}
        <Button size="sm" onClick={handleAdd} disabled={saving || !newName.trim()}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Añadir
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay elementos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Casos</TableHead>
              {showAreaCount && <TableHead className="text-right">Áreas</TableHead>}
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <EditableRow
                key={item.id}
                item={item}
                onSave={onSave}
                onDelete={onDelete}
                onViewCases={setCasesItem}
                showAreaCount={showAreaCount}
              />
            ))}
          </TableBody>
        </Table>
      )}

      <CatalogCasesDialog
        kind={casesKind}
        item={casesItem}
        open={!!casesItem}
        onOpenChange={(o) => { if (!o) setCasesItem(null); }}
      />
    </div>
  );
}

export function CatalogsPage() {
  const qc = useQueryClient();
  const [selectedTypeId, setSelectedTypeId] = useState('');

  const { data: originTypes = [] } = useQuery({
    queryKey: ['origin-types'],
    queryFn: () => listOriginTypes(),
    staleTime: 1000 * 60,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => listSites(),
    staleTime: 1000 * 60,
  });

  const { data: externalOrigins = [] } = useQuery({
    queryKey: ['external-origins'],
    queryFn: () => listExternalOrigins(),
    staleTime: 1000 * 60,
  });

  const { data: aidTypes = [] } = useQuery({
    queryKey: ['aid-types'],
    queryFn: () => listAidTypes(),
    staleTime: 1000 * 60,
  });

  const { data: aidAreas = [] } = useQuery({
    queryKey: ['aid-areas', selectedTypeId],
    queryFn: () => listAidAreas(selectedTypeId || undefined),
    enabled: !!selectedTypeId,
    staleTime: 1000 * 60,
  });

  function makeOnAdd(baseUrl: string, extra?: Record<string, string>) {
    return async (data: Record<string, string | boolean>) => {
      await api.post(baseUrl, { ...data, ...extra });
      toast.success('Elemento creado');
      invalidateAll();
    };
  }

  function makeOnSave(baseUrl: string) {
    return async (id: string, data: Record<string, unknown>) => {
      await api.patch(`${baseUrl}/${id}`, data);
      toast.success('Elemento actualizado');
      invalidateAll();
    };
  }

  function makeOnDelete(baseUrl: string) {
    return async (id: string) => {
      await api.delete(`${baseUrl}/${id}`);
      invalidateAll();
    };
  }

  function invalidateAll() {
    void qc.invalidateQueries({ queryKey: ['origin-types'] });
    void qc.invalidateQueries({ queryKey: ['sites'] });
    void qc.invalidateQueries({ queryKey: ['external-origins'] });
    void qc.invalidateQueries({ queryKey: ['aid-types'] });
    void qc.invalidateQueries({ queryKey: ['aid-areas'] });
  }

  return (
    <div className="container-page max-w-4xl">
      <h1 className="text-2xl font-serif text-secondary mb-1">Catálogos</h1>
      <p className="text-sm text-muted-foreground mb-4">Gestión de catálogos del sistema.</p>

      <Tabs defaultValue="origin-types">
        <TabsList>
          <TabsTrigger value="origin-types">Tipos de procedencia</TabsTrigger>
          <TabsTrigger value="sites">Procedencias internas (Sedes)</TabsTrigger>
          <TabsTrigger value="external-origins">Procedencias externas</TabsTrigger>
          <TabsTrigger value="aid-types">Tipos de ayuda</TabsTrigger>
          <TabsTrigger value="aid-areas">Áreas de ayuda</TabsTrigger>
        </TabsList>

        <TabsContent value="origin-types">
          <Card>
            <CardHeader><CardTitle>Tipos de procedencia</CardTitle></CardHeader>
            <CardContent>
              <CatalogManager
                items={originTypes}
                onAdd={makeOnAdd('/catalogs/origin-types')}
                onSave={makeOnSave('/catalogs/origin-types')}
                onDelete={makeOnDelete('/catalogs/origin-types')}
                casesKind="origin-types"
                placeholder="Ej: Interno"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites">
          <Card>
            <CardHeader><CardTitle>Procedencias internas (Sedes)</CardTitle></CardHeader>
            <CardContent>
              <CatalogManager
                items={sites}
                onAdd={makeOnAdd('/catalogs/sites')}
                onSave={makeOnSave('/catalogs/sites')}
                onDelete={makeOnDelete('/catalogs/sites')}
                casesKind="sites"
                placeholder="Ej: Sede Bolívar"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external-origins">
          <Card>
            <CardHeader><CardTitle>Procedencias externas</CardTitle></CardHeader>
            <CardContent>
              <CatalogManager
                items={externalOrigins}
                onAdd={makeOnAdd('/catalogs/external-origins')}
                onSave={makeOnSave('/catalogs/external-origins')}
                onDelete={makeOnDelete('/catalogs/external-origins')}
                casesKind="external-origins"
                placeholder="Ej: Comunidad Nueva Jerusalén"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aid-types">
          <Card>
            <CardHeader><CardTitle>Tipos de ayuda</CardTitle></CardHeader>
            <CardContent>
              <CatalogManager
                items={aidTypes}
                onAdd={makeOnAdd('/catalogs/aid-types')}
                onSave={makeOnSave('/catalogs/aid-types')}
                onDelete={makeOnDelete('/catalogs/aid-types')}
                casesKind="aid-types"
                showAreaCount
                placeholder="Ej: Social"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aid-areas">
          <Card>
            <CardHeader><CardTitle>Áreas de ayuda</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <Label htmlFor="area-type-filter">Tipo de ayuda</Label>
                <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                  <SelectTrigger id="area-type-filter">
                    <SelectValue placeholder="Seleccione un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {aidTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTypeId && (
                <CatalogManager
                  items={aidAreas}
                  onAdd={makeOnAdd('/catalogs/aid-areas', { aidTypeId: selectedTypeId })}
                  onSave={makeOnSave('/catalogs/aid-areas')}
                  onDelete={makeOnDelete('/catalogs/aid-areas')}
                  casesKind="aid-areas"
                  placeholder="Ej: Cardiología"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
