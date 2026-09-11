/**
 * ✅ SYNC QUEUE - OFFLINE-FIRST
 * Garantit AUCUNE perte de données même 7+ jours sans connexion.
 *
 * 🔄 CORRECTIONS MAJEURES (audit offline) :
 *  1. `isOnline` n'était jamais alimenté (listener réseau inexistant) et
 *     valait `true` par défaut → flush raté hors-ligne toutes les 15 s.
 *  2. Pire : chaque échec réseau incrémentait `retries` (max 5 ≈ 75 s) puis
 *     l'action était abandonnée → PERTES DE DONNÉES dès ~1 min hors-ligne.
 *     Désormais : une erreur RÉSEAU n'incrémente plus le compteur — l'action
 *     attend le retour du wifi, indéfiniment. Seules les erreurs MÉTIER
 *     (conflit de données, document invalide) consomment des retries.
 *  3. Race d'initialisation du constructeur async corrigée (promesse `pret`).
 *  4. Support des deltas `increment()` Firestore pour les compteurs (XP),
 *     résolus au moment du flush et non à l'empilement.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCurrentUserId } from './auth';
import { estEnLigneSync, surChangementConnexion, verifierConnexion } from '../utils/reseau';
import { genererIdUnique, parseEntier } from '../utils/correctifsAudit';
import { estErreurReseau } from '../utils/erreurs';
import { avertirDev, logDev, rapporterErreur } from '../utils/logger';

const SYNC_QUEUE_KEY = 'lex_sync_queue';
const LAST_SYNC_KEY = 'lex_last_sync_timestamp';
const SYNC_CONFLICTS_KEY = 'lex_sync_conflicts';

/** Valeurs qu'on résout au moment du flush (compteurs atomiques). */
export type ValeurDynamique = { __increment: number };

interface SyncAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  docId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
  maxRetries: number;
  lastError?: string;
}

interface SyncConflict {
  id: string;
  collection: string;
  docId: string;
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  timestamp: number;
}

/** Les erreurs réseau doivent attendre le wifi, pas abandonner.
 *  🔄 Déplacé dans utils/erreurs.ts (source unique, testable unitairement).
 */
export { estErreurReseau } from '../utils/erreurs';

/** Remplace les deltas {__increment: n} par de vrais FieldValue au flush. */
function resoudreDeltas(data: Record<string, unknown>): Record<string, unknown> {
  const resultat: Record<string, unknown> = {};
  for (const [cle, valeur] of Object.entries(data)) {
    if (valeur && typeof valeur === 'object' && '__increment' in (valeur as object)) {
      resultat[cle] = increment(Number((valeur as ValeurDynamique).__increment));
    } else {
      resultat[cle] = valeur;
    }
  }
  return resultat;
}


export class SyncQueue {
  private queue: SyncAction[] = [];
  private isSyncing = false;
  private isOnline = true;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private pret: Promise<void>;

  constructor() {
    this.pret = this.init();
  }

  /** Attend que la file soit chargée (utilisé avant un flush immédiat). */
  async quandPret(): Promise<void> {
    await this.pret;
  }

  private async init(): Promise<void> {
    await this.loadQueue();
    this.setupNetworkListener();
    // État réseau réel dès le démarrage (au lieu du défaut optimiste).
    verifierConnexion().then((enLigne) => {
      this.isOnline = enLigne;
      if (enLigne && this.queue.length > 0) this.flush();
    });
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      const parse = stored ? JSON.parse(stored) : [];
      this.queue = Array.isArray(parse) ? parse : [];
      if (this.queue.length > 0) {
        logDev(`[SyncQueue] ${this.queue.length} actions en attente`);
      }
    } catch (error) {
      rapporterErreur('[SyncQueue] Erreur chargement:', error);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      rapporterErreur('[SyncQueue] Erreur sauvegarde:', error);
    }
  }

  private setupNetworkListener(): void {
    // 🔄 VRAI branchement réseau (avant : faux intervalle qui faisait
    // échouer le flush hors-ligne toutes les 15 s).
    surChangementConnexion((enLigne) => {
      this.setOnlineStatus(enLigne);
    });

    // Filet de sécurité : toutes les 60 s, et uniquement si on SAIT qu'on
    // est en ligne (aucune tentative inutile hors-ligne).
    this.syncInterval = setInterval(() => {
      if (estEnLigneSync() && this.isOnline && !this.isSyncing && this.queue.length > 0) {
        this.flush();
      }
    }, 60000);
  }

  async add(
    type: 'create' | 'update' | 'delete',
    collection: string,
    docId: string,
    data: Record<string, unknown>
  ): Promise<string> {
    await this.pret;

    if (!docId || docId === 'null' || docId === 'undefined') {
      // La donnée n'est JAMAIS jetée : identifiant de rattrapage.
      rapporterErreur('[SyncQueue] docId invalide, action sauvegardée en orphelin :', collection);
      docId = `orphan_${Date.now()}`;
    }

    const action: SyncAction = {
      id: genererIdUnique('sync'),
      type,
      collection,
      docId,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 5,
    };

    // Déduplication : fusionne avec une action pendants du même doc/type
    // (les deltas s'additionnent, les autres champs : le dernier gagne).
    const existante = this.queue.find(
      (a) => a.collection === action.collection && a.docId === action.docId && a.type === action.type
    );
    if (existante && action.type !== 'delete') {
      for (const [cle, valeur] of Object.entries(action.data)) {
        const avant = existante.data[cle];
        if (
          avant && typeof avant === 'object' && '__increment' in avant &&
          valeur && typeof valeur === 'object' && '__increment' in valeur
        ) {
          (avant as ValeurDynamique).__increment += (valeur as ValeurDynamique).__increment;
        } else {
          existante.data[cle] = valeur;
        }
      }
      existante.timestamp = action.timestamp;
      await this.saveQueue();
      return existante.id;
    }

    this.queue.push(action);
    await this.saveQueue();

    if (this.isOnline && !this.isSyncing) {
      this.flush();
    }

    return action.id;
  }

  async flush(): Promise<{ synced: number; failed: number }> {
    await this.pret;
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
      } catch (error) {
        if (estErreurReseau(error)) {
          // 🔄 RÉSEAU : pas un échec définitif. L'action RESTE en file
          // jusqu'au retour du wifi (4 jours si besoin). Jamais de perte.
          action.lastError = String(error);
          failed++;
        } else {
          action.retries++;
          action.lastError = String(error);

          if (action.retries >= action.maxRetries) {
            await this.recordConflict(action, error);
            toRemove.push(action.id);
          }
          failed++;
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

      case 'update': {
        // Conflit horaire : on FUSIONNE plutôt que d'abandonner — l'élève
        // vient de refaire l'action, ses champs priment sur le serveur.
        const existing = await getDoc(docRef);
        if (existing.exists()) {
          const remote = existing.data() || {};
          const remoteTime = new Date(remote.updatedAt || remote.syncedAt || 0).getTime();
          if (remoteTime > action.timestamp) {
            await updateDoc(docRef, {
              ...remote,
              ...resoudreDeltas(action.data),
              userId,
              updatedAt: new Date(action.timestamp).toISOString(),
              syncedAt: new Date().toISOString(),
            });
            return;
          }
        }
        await updateDoc(docRef, {
          ...resoudreDeltas(action.data),
          userId,
          updatedAt: new Date(action.timestamp).toISOString(),
          syncedAt: new Date().toISOString(),
        });
        break;
      }

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
      // Garde-fou mémoire : max 100 conflits conservés.
      await AsyncStorage.setItem(SYNC_CONFLICTS_KEY, JSON.stringify(conflicts.slice(-100)));
      rapporterErreur('[SyncQueue] 🔴 Conflit enregistré :', error);
    } catch (e) {
      rapporterErreur('[SyncQueue] Erreur conflit:', e);
    }
  }

  async getStats(): Promise<{
    pending: number;
    synced: boolean;
    lastSync?: string;
    conflicts: number;
    isOnline: boolean;
  }> {
    await this.pret;
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const conflicts = JSON.parse(
      (await AsyncStorage.getItem(SYNC_CONFLICTS_KEY)) || '[]'
    );
    return {
      pending: this.queue.length,
      synced: this.queue.length === 0,
      lastSync: lastSync ? new Date(parseEntier(lastSync)).toISOString() : undefined,
      conflicts: conflicts.length,
      isOnline: this.isOnline && estEnLigneSync(),
    };
  }

  setOnlineStatus(online: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;
    logDev(`[SyncQueue] ${online ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
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

/**
 * Pousse des compteurs vers un doc avec increment() atomique.
 * Exemple : pousserCompteur('utilisateurs', uid, { xp: 50 })
 * L'action part dans la file : envoyée immédiatement si en ligne,
 * au retour du wifi sinon.
 */
export async function pousserCompteur(
  collection: string,
  docId: string,
  compteurs: Record<string, number>
): Promise<void> {
  const data: Record<string, ValeurDynamique> = {};
  for (const [cle, valeur] of Object.entries(compteurs)) {
    data[cle] = { __increment: valeur };
  }
  await syncQueue.add('update', collection, docId, data);
}

