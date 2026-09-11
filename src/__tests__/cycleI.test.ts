/**
 * 🧪 CYCLE I — Perf cache LRU/index exo→chapitre + antifragilité sync.
 * Couvre : index O(1), rebuild on demand, coalescing LRU (écritures
 * AsyncStorage évitées), éviction quota par ancienneté, retry saveQueue,
 * conflicts corrompus → 0 sans crash.
 */

// --- Mock in-memory d'AsyncStorage (jest.fn pour compter / forcer échecs) ---
const mockStore = new Map<string, string>();
const mockGetItem = jest.fn(async (k: string) => mockStore.get(k) ?? null);
const mockSetItem = jest.fn(async (k: string, v: string) => { mockStore.set(k, v); });
const mockRemoveItem = jest.fn(async (k: string) => { mockStore.delete(k); });
const mockGetAllKeys = jest.fn(async () => [...mockStore.keys()]);
const mockMultiGet = jest.fn(async (keys: string[]) => keys.map((k) => [k, mockStore.get(k) ?? null]));
const mockMultiRemove = jest.fn(async (keys: string[]) => { keys.forEach((k) => mockStore.delete(k)); });

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    getAllKeys: mockGetAllKeys,
    multiGet: mockMultiGet,
    multiRemove: mockMultiRemove,
  },
}));

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn((n: number) => n),
  collection: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn(() => ({})) }));
jest.mock('../config/firebaseConfig', () => ({ db: {} }));
jest.mock('../utils/reseau', () => ({
  estEnLigne: jest.fn(async () => false),
  estEnLigneSync: jest.fn(() => false),
  verifierConnexion: jest.fn(async () => false),
  surChangementConnexion: jest.fn(() => () => {}),
}));
jest.mock('../services/userStorage', () => ({
  getCurrentUserId: jest.fn(async () => 'test-user'),
  getUserItem: jest.fn(async () => null),
}));

import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import {
  saveExercices,
  getExercices,
  getExoById,
  supprimerChapitre,
  appliquerQuotaCache,
  flushMetaLRU,
  _resetCacheMemoire,
  type Exercice,
} from '../services/cacheHorsLigne';
import { SyncQueue, syncQueue as syncQueueGlobal } from '../services/syncQueue';

const CLE_META = 'lex_cache_meta';
const CLE_INDEX = 'lex_index_exo_id';
const CLE_QUEUE = 'lex_sync_queue';

// Simule le global Expo `__DEV__` (présent dans l'app, absent sous Jest node) :
// nécessaire car SyncQueue.setOnlineStatus passe par logDev().
(globalThis as Record<string, unknown>).__DEV__ = true;

const exoA: Exercice = {
  id: 'exoA', classe: 'Tle C', matiere: 'Maths', chapitre: 'Chapitre A',
  chapitre_id: 'chapA', difficulte: '1', enonce: 'q'.repeat(120), bonne_reponse: '4',
};
const exoB: Exercice = {
  id: 'exoB', classe: 'Tle C', matiere: 'Maths', chapitre: 'Chapitre B',
  chapitre_id: 'chapB', difficulte: '1', enonce: 'r'.repeat(120), bonne_reponse: '5',
};
const exoC: Exercice = {
  id: 'exoC', classe: 'Tle C', matiere: 'SVT', chapitre: 'Chapitre C',
  chapitre_id: 'chapC', difficulte: '2', enonce: 's'.repeat(120), bonne_reponse: '6',
};

describe('Cache — index exo→chapitre', () => {
  beforeEach(() => {
    mockStore.clear();
    mockSetItem.mockClear();
    _resetCacheMemoire();
  });

  it('saveExercices maintient l index exo→chapitre', async () => {
    await saveExercices('chapA', [exoA]);
    await saveExercices('chapB', [exoB]);
    const index = JSON.parse(mockStore.get(CLE_INDEX) || '{}') as Record<string, string>;
    expect(index.exoA).toBe('chapA');
    expect(index.exoB).toBe('chapB');
  });

  it('getExoById retrouve un exercice via l index', async () => {
    await saveExercices('chapA', [exoA]);
    const trouve = await getExoById('exoA');
    expect(trouve?.id).toBe('exoA');
    expect(trouve?.bonne_reponse).toBe('4');
  });

  it('nettoie l index quand le chapitre est supprimé (plus de scan orphelin)', async () => {
    await saveExercices('chapA', [exoA]);
    await supprimerChapitre('chapA');
    expect(await getExoById('exoA')).toBeNull();
    const index = JSON.parse(mockStore.get(CLE_INDEX) || '{}') as Record<string, string>;
    expect(index).not.toHaveProperty('exoA');
  });

  it('reconstruit l index au premier accès après mise à jour de l app', async () => {
    // Simule un téléphone migré : chapitre présent mais PAS d'index.
    mockStore.set('lex_cache_chapA', JSON.stringify([exoA]));
    const trouve = await getExoById('exoA');
    expect(trouve?.id).toBe('exoA');
    const index = JSON.parse(mockStore.get(CLE_INDEX) || '{}') as Record<string, string>;
    expect(index.exoA).toBe('chapA');
  });
describe('Cache — LRU coalescé', () => {
  beforeEach(() => {
    mockStore.clear();
    mockSetItem.mockClear();
    _resetCacheMemoire();
    mockStore.set('lex_cache_chapA', JSON.stringify([exoA]));
  });

  it('ne réécrit pas la meta de LRU à chaque lecture (coalescing)', async () => {
    mockStore.set(CLE_META, JSON.stringify({ chapA: 1000 }));
    await getExercices('chapA'); // accès mémorisé en RAM, PAS d'écriture
    const ecrituresMeta = mockSetItem.mock.calls.filter(([k]) => k === CLE_META).length;
    expect(ecrituresMeta).toBe(0);
  });

  it('flushMetaLRU force la persistance des accès en mémoire', async () => {
    await getExercices('chapA');
    await flushMetaLRU();
    const brut = mockStore.get(CLE_META);
    expect(brut).toBeTruthy();
    const meta = JSON.parse(brut || '{}') as Record<string, number>;
    expect(meta.chapA).toBeGreaterThan(0);
  });
});

describe('Cache — éviction par quota (LRU)', () => {
  beforeEach(async () => {
    mockStore.clear();
    mockSetItem.mockClear();
    _resetCacheMemoire();
    // Construits via saveExercices pour peupler l'index exo→chapitre.
    await saveExercices('chapA', [exoA]);
    await saveExercices('chapB', [exoB]);
    await saveExercices('chapC', [exoC]);
    // 3 chapitres de même taille ; C récent, B moyen, A très ancien.
    mockStore.set(CLE_META, JSON.stringify({ chapA: 1000, chapB: 2000, chapC: 3000 }));
  });

  it('supprime d abord les chapitres utilisés le moins récemment', async () => {
    // Chaque chapitre ≈ 280 o (enonce de 120 caractères) : quota à 400 o →
    // exactement les 2 plus anciens (A puis B) sont évincés, C reste.
    const supprimes = await appliquerQuotaCache(400);
    expect(supprimes).toBe(2);
    expect(mockStore.has('lex_cache_chapA')).toBe(false);
    expect(mockStore.has('lex_cache_chapB')).toBe(false);
    expect(mockStore.has('lex_cache_chapC')).toBe(true);
    // L index est nettoyé en même temps (pas de pointeur fantôme).
    const index = JSON.parse(mockStore.get(CLE_INDEX) || '{}') as Record<string, string>;
    expect(index.exoA).toBeUndefined();
    expect(index.exoC).toBe('chapC');
  });
});

describe('SyncQueue — antifragilité', () => {
  let queue: SyncQueue | null = null;

  beforeEach(() => {
    mockStore.clear();
    mockSetItem.mockClear();
  });

  afterEach(() => {
    queue?.destroy();
    queue = null;
  });

  it('getStats ne crashe pas si les conflits stockés sont corrompus', async () => {
    mockStore.set('lex_sync_conflicts', '{corrompu');
    queue = new SyncQueue();
    await queue.quandPret();
    const stats = await queue.getStats();
    expect(stats.conflicts).toBe(0);
  });

  it('saveQueue réessaie après un échec transitoire d écriture (zéro perte)', async () => {
    let echecsRestants = 2;
    const implementationOriginale = mockSetItem.getMockImplementation();
    mockSetItem.mockImplementation(async (k: string, v: string) => {
      if (k === CLE_QUEUE && echecsRestants > 0) {
        echecsRestants--;
        throw new Error('stockage saturé (simulé)');
      }
      mockStore.set(k, v);
    });
    try {
      queue = new SyncQueue();
      await queue.quandPret();
      queue.setOnlineStatus(false); // hors-ligne : pas de flush réseau
      await queue.add('update', 'utilisateurs', 'u1', { xp: 10 });
      const stock = mockStore.get(CLE_QUEUE);
      expect(stock).toBeTruthy();
      const file = JSON.parse(stock || '[]') as { docId: string }[];
      expect(file.some((a) => a.docId === 'u1')).toBe(true);
    } finally {
      mockSetItem.mockImplementation(implementationOriginale);
    }
  });
});
});
afterAll(() => {
  // Nettoie le timer interne du singleton global importé (sinon Jest
  // force-exit le worker : « Active timers »).
  syncQueueGlobal.destroy();
});