import { useEffect } from 'react';
import { CloudOff, Cloud, RefreshCw } from 'lucide-react';
import { useSyncStore } from '@/lib/offline/sync.store';
import { drainMutations } from '@/lib/offline/queue';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SyncIndicator() {
  const { online, pending, syncing, refresh, setOnline, setSyncing } = useSyncStore();

  useEffect(() => {
    void refresh();
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refresh, setOnline]);

  async function handleSync() {
    if (syncing || !online) return;
    setSyncing(true);
    try {
      await drainMutations();
    } finally {
      setSyncing(false);
    }
  }

  if (pending === 0 && online) {
    return (
      <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
        <Cloud className="h-4 w-4" /> En línea
      </span>
    );
  }

  return (
    <Button
      variant={online ? 'outline' : 'destructive'}
      size="sm"
      onClick={handleSync}
      disabled={!online || syncing}
      className="gap-2"
    >
      {syncing ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : online ? (
        <RefreshCw className="h-4 w-4" />
      ) : (
        <CloudOff className="h-4 w-4" />
      )}
      <span className={cn('text-xs')}>
        {!online ? 'Sin conexión' : syncing ? 'Sincronizando...' : `Sincronizar (${pending})`}
      </span>
    </Button>
  );
}
