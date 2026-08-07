import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Pencil, Check, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, getErrorMessage } from '@/lib/api/client';
import { listOriginTypes, listSites, listAidTypes } from '@/features/catalogs/catalogs.api';
import type { CatalogItem } from '@/features/catalogs/catalogs.api';
import { toast } from '@/components/ui/toast';

interface EditableRowProps {
  item: CatalogItem;
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>;
}

function EditableRow({ item, onSave }: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim() || name.trim().length < 2) return;
    setSaving(true);
    try {
      await onSave(item.id, { name: name.trim() });
      setEditing(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  }, [name, item.id, onSave]);

  return (
    <TableRow>
      <TableCell>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
        ) : (
          <span className={item.active ? '' : 'text-muted-foreground line-through'}>{item.name}</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {editing ? (
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
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
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function CatalogManager({
  title,
  items,
  onAdd,
  onSave,
  placeholder,
}: {
  title: string;
  items: CatalogItem[];
  onAdd: (data: Record<string, string | boolean>) => Promise<void>;
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>;
  placeholder?: string;
}) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = useCallback(async () => {
    if (!newName.trim() || newName.trim().length < 2) return;
    setSaving(true);
    try {
      await onAdd({ name: newName.trim() });
      setNewName('');
      void qc.invalidateQueries({ queryKey: [title] });
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo crear'));
    } finally {
      setSaving(false);
    }
  }, [newName, onAdd, qc, title]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder={placeholder || 'Nombre del nuevo elemento'}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="max-w-xs"
        />
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
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <EditableRow key={item.id} item={item} onSave={onSave} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export function CatalogsPage() {
  const qc = useQueryClient();

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

  const { data: aidTypes = [] } = useQuery({
    queryKey: ['aid-types'],
    queryFn: () => listAidTypes(),
    staleTime: 1000 * 60,
  });

  function makeOnAdd(url: string) {
    return async (data: Record<string, string | boolean>) => {
      await api.post(url, data);
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

  function invalidateAll() {
    void qc.invalidateQueries({ queryKey: ['origin-types'] });
    void qc.invalidateQueries({ queryKey: ['sites'] });
    void qc.invalidateQueries({ queryKey: ['aid-types'] });
  }

  return (
    <div className="container-page max-w-4xl">
      <h1 className="text-2xl font-serif text-secondary mb-1">Catálogos</h1>
      <p className="text-sm text-muted-foreground mb-4">Gestión de catálogos del sistema.</p>

      <Tabs defaultValue="origin-types">
        <TabsList>
          <TabsTrigger value="origin-types">Tipos de procedencia</TabsTrigger>
          <TabsTrigger value="sites">Sedes</TabsTrigger>
          <TabsTrigger value="aid-types">Tipos de ayuda</TabsTrigger>
        </TabsList>

        <TabsContent value="origin-types">
          <Card>
            <CardHeader><CardTitle>Tipos de procedencia</CardTitle></CardHeader>
            <CardContent>
              <CatalogManager
                title="origin-types"
                items={originTypes}
                onAdd={makeOnAdd('/catalogs/origin-types')}
                onSave={makeOnSave('/catalogs/origin-types')}
                placeholder="Ej: Interno"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites">
          <Card>
            <CardHeader><CardTitle>Sedes</CardTitle></CardHeader>
            <CardContent>
              <CatalogManager
                title="sites"
                items={sites}
                onAdd={makeOnAdd('/catalogs/sites')}
                onSave={makeOnSave('/catalogs/sites')}
                placeholder="Ej: Sede Bolívar"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aid-types">
          <Card>
            <CardHeader><CardTitle>Tipos de ayuda</CardTitle></CardHeader>
            <CardContent>
              <CatalogManager
                title="aid-types"
                items={aidTypes}
                onAdd={makeOnAdd('/catalogs/aid-types')}
                onSave={makeOnSave('/catalogs/aid-types')}
                placeholder="Ej: Social"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
