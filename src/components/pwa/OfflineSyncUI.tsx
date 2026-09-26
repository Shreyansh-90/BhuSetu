'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type SyncRequest = {
  id: number;
  url: string;
  method: string;
  headers: [string, string][];
  body: string;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  error?: string;
  retryCount: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BhuSetuOfflineDB', 2);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function OfflineSyncUI() {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<SyncRequest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadQueue = async () => {
    try {
      const db = await openDB();
      const tx = db.transaction('requests', 'readonly');
      const store = tx.objectStore('requests');
      const request = store.getAll();
      request.onsuccess = () => {
        setQueue(request.result || []);
      };
    } catch (e) {
      console.error('Failed to load sync queue', e);
    }
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load
    loadQueue();

    // Poll for queue changes (since SW might write to it)
    const interval = setInterval(loadQueue, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const syncNow = async () => {
    if (!navigator.onLine) {
      alert('Cannot sync while offline');
      return;
    }

    const db = await openDB();
    const tx = db.transaction('requests', 'readonly');
    const store = tx.objectStore('requests');
    const getRequest = store.getAll();
    
    getRequest.onsuccess = async () => {
      const requests: SyncRequest[] = getRequest.result || [];
      const pending = requests.filter(r => r.status !== 'synced');
      
      if (pending.length === 0) return;
      
      setIsSyncing(true);
      let successCount = 0;
      let failCount = 0;

      for (const req of pending) {
        // Update status to syncing
        await updateRequestStatus(req.id, 'syncing');
        setQueue(q => q.map(r => r.id === req.id ? { ...r, status: 'syncing' } : r));

        try {
          // Reconstruct headers (exclude content-length if present, browser handles it)
          const headers = new Headers();
          req.headers.forEach(([key, val]) => {
            if (key.toLowerCase() !== 'content-length') {
              headers.append(key, val);
            }
          });
          // Append idempotency key
          headers.append('X-Idempotency-Key', `offline-sync-${req.id}-${req.timestamp}`);

          const res = await fetch(req.url, {
            method: req.method,
            headers,
            body: req.body,
          });

          if (res.ok || res.status === 409) { // 409 could mean already processed due to idempotency
            await deleteRequest(req.id);
            setQueue(q => q.filter(r => r.id !== req.id));
            successCount++;
          } else {
            // e.g. 401 Unauthorized, 403 Forbidden, 400 Bad Request
            const errorText = await res.text();
            await updateRequestStatus(req.id, 'failed', errorText, (req.retryCount || 0) + 1);
            setQueue(q => q.map(r => r.id === req.id ? { ...r, status: 'failed', error: errorText, retryCount: (req.retryCount || 0) + 1 } : r));
            failCount++;
          }
        } catch (err: any) {
          // Network error during sync
          await updateRequestStatus(req.id, 'failed', err.message, (req.retryCount || 0) + 1);
          setQueue(q => q.map(r => r.id === req.id ? { ...r, status: 'failed', error: err.message, retryCount: (req.retryCount || 0) + 1 } : r));
          failCount++;
        }
      }

      setIsSyncing(false);
      
      if (successCount > 0) {
        alert(`Successfully synchronized ${successCount} mutations.`);
      }
      if (failCount > 0) {
        alert(`${failCount} mutations failed to sync. Check console.`);
      }
    };
  };

  const updateRequestStatus = async (id: number, status: string, error?: string, retryCount?: number) => {
    const db = await openDB();
    const tx = db.transaction('requests', 'readwrite');
    const store = tx.objectStore('requests');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const updated = { ...getReq.result, status };
        if (error !== undefined) updated.error = error;
        if (retryCount !== undefined) updated.retryCount = retryCount;
        store.put(updated);
      }
    };
  };

  const deleteRequest = async (id: number) => {
    const db = await openDB();
    const tx = db.transaction('requests', 'readwrite');
    tx.objectStore('requests').delete(id);
  };

  if (!isOnline || queue.length > 0) {
    const pendingCount = queue.filter(r => r.status === 'pending' || r.status === 'failed').length;

    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[280px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {!isOnline ? <WifiOff className="text-red-500 w-5 h-5" /> : <Wifi className="text-green-500 w-5 h-5" />}
            <span className="font-semibold text-sm">
              {!isOnline ? 'Offline Mode' : 'Online'}
            </span>
          </div>
          {isOnline && pendingCount > 0 && (
            <Button size="sm" variant="outline" onClick={syncNow} disabled={isSyncing} className="h-7 text-xs">
              <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
        </div>
        
        {queue.length > 0 && (
          <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
            <span className="text-xs text-gray-500 font-medium mb-1">Pending Mutations ({queue.length})</span>
            {queue.map(req => (
              <div key={req.id} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 dark:bg-gray-900 rounded border">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono text-[10px]">{req.method}</span>
                  <span className="truncate max-w-[120px]" title={req.url}>{new URL(req.url, window.location.origin).pathname}</span>
                </div>
                <div>
                  {req.status === 'syncing' && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
                  {req.status === 'synced' && <CheckCircle className="w-3 h-3 text-green-500" />}
                  {req.status === 'failed' && <span title={req.error}><AlertCircle className="w-3 h-3 text-red-500" /></span>}
                  {(req.status === 'pending' || !req.status) && <div className="w-2 h-2 rounded-full bg-yellow-500" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
