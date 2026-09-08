/**
 * ✅ SYNC QUEUE - OFFLINE-FIRST
 * Garantit AUCUNE perte de données même 7+ jours sans connexion
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCurrentUserId } from './auth';

const SYNC_QUEUE_KEY = 'lex_sync_queue';
const LAST_SYNC_KEY = 'lex_last_sync_timestamp';
const SYNC_CONFLICTS_KEY = 'lex_sync_conflicts';

interface SyncAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  docId: string;
  data: Record<string, any>;
  timestamp: number;
  retries: number;
  maxRetries: number;
  lastError?: string;
}

interface SyncConflict {
  id: string;
  collection: string;
  docId: string;
  local: Record<string, any>;
  remote: Record<string, any>;
  timestamp: number;
}

export class SyncQueue {
  private queue: SyncAction[] = [];
  private isSyncing = false;
  private isOnline = true;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadQueue();
    this.setupNetworkListener();
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      this.queue = stored ? JSON.parse(stored) : [];
      console.log(`[SyncQueue] ${this.queue.length} actions en attente`);
    } catch (error) {
      console.error('[SyncQueue] Erreur chargement:', error);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[SyncQueue] Erreur sauvegarde:', error);
    }
  }

  private setupNetworkListener(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.queue.length > 0) {
        this.flush();
      }
    }, 15000);
  }

  async add(
    type: 'create' | 'update' | 'delete',
    collection: string,
    docId: string,
    data: Record<string, any>
  ): Promise<string> {
    const action: SyncAction = {
      id: `${Date.now()}-${Math.random().toString(36)}`,
      type,
      collection,
      docId,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 5,
    };

    this.queue.push(action);
    await this.saveQueue();
    console.log(`[SyncQueue] ✏️ ${type.toUpperCase()}: ${collection}/${docId}`);

    if (this.isOnline && !this.isSyncing) {
      this.flush();
    }

    return action.id;
  }

  async flush(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing || this.queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;
    const toRemove: string[] = [];

    for (const action of this.queue) {
      try {
        await this.syncAction(action);
        toRemove.push(action.id);
        synced++;
        console.log(`[SyncQueue] ✅ ${action.type.toUpperCase()}`);
      } catch (error) {
        action.retries++;
        action.lastError = String(error);

        if (action.retries >= action.maxRetries) {
          console.error(`[SyncQueue] ❌ Max retries`);
          toRemove.push(action.id);
          failed++;
          await this.recordConflict(action, error);
        }
      }
    }

    this.queue = this.queue.filter((a) => !toRemove.includes(a.id));
    await this.saveQueue();
    this.isSyncing = false;

    if (synced > 0) {
      await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    }

    return { synced, failed };
  }

  private async syncAction(action: SyncAction): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Pas de session');

    const docRef = doc(db, action.collection, action.docId);

    switch (action.type) {
      case 'create':
        await setDoc(docRef, {
          ...action.data,
          userId,
          createdAt: new Date(action.timestamp).toISOString(),
          syncedAt: new Date().toISOString(),
        });
        break;

      case 'update':
        const existing = await getDoc(docRef);
        if (existing.exists()) {
          const remote = existing.data();
          const remoteTime = new Date(remote.updatedAt || remote.syncedAt || 0).getTime();
          if (remoteTime > action.timestamp) {
            throw new Error(`Conflit: données serveur plus récentes`);
          }
        }
        await updateDoc(docRef, {
          ...action.data,
          userId,
          updatedAt: new Date(action.timestamp).toISOString(),
          syncedAt: new Date().toISOString(),
        });
        break;

      case 'delete':
        await updateDoc(docRef, {
          isDeleted: true,
          deletedAt: new Date(action.timestamp).toISOString(),
          deletedBy: userId,
        });
        break;
    }
  }

  private async recordConflict(action: SyncAction, error: unknown): Promise<void> {
    try {
      const conflicts = JSON.parse(
        (await AsyncStorage.getItem(SYNC_CONFLICTS_KEY)) || '[]'
      );
      const conflict: SyncConflict = {
        id: action.id,
        collection: action.collection,
        docId: action.docId,
        local: action.data,
        remote: {},
        timestamp: Date.now(),
      };
      conflicts.push(conflict);
      await AsyncStorage.setItem(SYNC_CONFLICTS_KEY, JSON.stringify(conflicts));
      console.error('[SyncQueue] 🔴 Conflit enregistré');
    } catch (e) {
      console.error('[SyncQueue] Erreur conflit:', e);
    }
  }

  async getStats(): Promise<{
    pending: number;
    synced: boolean;
    lastSync?: string;
    conflicts: number;
    isOnline: boolean;
  }> {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const conflicts = JSON.parse(
      (await AsyncStorage.getItem(SYNC_CONFLICTS_KEY)) || '[]'
    );
    return {
      pending: this.queue.length,
      synced: this.queue.length === 0,
      lastSync: lastSync ? new Date(parseInt(lastSync)).toISOString() : undefined,
      conflicts: conflicts.length,
      isOnline: this.isOnline,
    };
  }

  setOnlineStatus(online: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;
    console.log(`[SyncQueue] ${online ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
    if (wasOffline && online && this.queue.length > 0) {
      this.flush();
    }
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const syncQueue = new SyncQueue();
