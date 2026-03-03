'use client';

import { useState, useTransition } from 'react';
import { Building2, Download, Loader2, Unplug, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { importFromTrueLayer, disconnectTrueLayer } from '@/db/mutations/truelayer';

type Connection = {
  id: string;
  provider_name: string | null;
  connected_at: Date;
};

type ImportResult = {
  accountsImported: number;
  transactionsImported: number;
};

export function ConnectBankButton({ connections }: { connections: Connection[] }) {
  const [open, setOpen] = useState(false);
  const [importing, startImport] = useTransition();
  const [disconnecting, startDisconnect] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleImport() {
    setResult(null);
    setError(null);
    startImport(async () => {
      try {
        const res = await importFromTrueLayer();
        setResult(res);
      } catch {
        setError('Bank sync failed. Please try again or reconnect your bank.');
      }
    });
  }

  function handleDisconnect(connectionId: string) {
    startDisconnect(async () => {
      await disconnectTrueLayer(connectionId);
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setResult(null);
      setError(null);
    }
    setOpen(next);
  }

  const hasConnections = connections.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Building2 className="mr-1 h-4 w-4" />
          {hasConnections ? 'Manage Bank' : 'Connect Bank'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open Banking</DialogTitle>
          <DialogDescription>
            Connect your bank via TrueLayer to automatically import accounts and transactions. Transactions sync automatically on each login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connected banks */}
          {hasConnections && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Connected banks</p>
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {conn.provider_name ?? 'Bank Account'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Connected {new Date(conn.connected_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    onClick={() => handleDisconnect(conn.id)}
                    disabled={disconnecting}
                  >
                    <Unplug className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-emerald-700 dark:text-emerald-400">Import complete</p>
                <p className="text-emerald-600 dark:text-emerald-500">
                  {result.accountsImported} new account{result.accountsImported !== 1 ? 's' : ''},{' '}
                  {result.transactionsImported} new transaction{result.transactionsImported !== 1 ? 's' : ''} imported.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
              <AlertCircle className="mt-0.5 h-4 w-4 text-red-600 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-700 dark:text-red-400">Import failed</p>
                <p className="text-red-600 dark:text-red-500">{error}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button asChild variant="outline">
            <a href="/api/truelayer/connect">
              <Building2 className="mr-1 h-4 w-4" />
              {hasConnections ? 'Connect Another Bank' : 'Connect Bank'}
            </a>
          </Button>
          {hasConnections && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              {importing ? 'Syncing…' : 'Sync Now (Manual)'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
