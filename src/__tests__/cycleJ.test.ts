/**
 * 🧪 CYCLE J — Sauvegarde complète + croissance bornée.
 * Couvre : sélection des clés d'export (toute la progression, jamais les
 * secrets), plafonnement des listes, file de préchargement corrompue → [].
 */

const mockStore = new Map<string, string>();
const mockGetItem = jest.fn(async (k: string) => mockStore.get(k) ?? null);
const mockSetItem = jest.fn(async (k: string, v: string) => { mockStore.set(k, v); });

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: jest.fn(async (k: string) => { mockStore.delete(k); }),
    getAllKeys: jest.fn(async () => [...mockStore.keys()]),
    multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, mockStore.get(k) ?? null])),
    multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => mockStore.set(k, v)); }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => mockStore.delete(k)); }),
  },
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { selectionnerClesProgression, plafonner, CLES_GLOBALES_PROGRESSION } from '../services/sauvegardeCompte';
import { getFilePrechargement } from '../services/prechargement';

const CLE_FILE = '@lex/filePrechargement';

describe('Sauvegarde — sélection des clés (sauvegardeCompte)', () => {
  it('inclut TOUTES les clés globales de progression', () => {
    const resultat = selectionnerClesProgression([...CLES_GLOBALES_PROGRESSION]);
    // Chaque clé de l'allowlist doit être sélectionnée.
    expect(resultat.sort()).toEqual([...CLES_GLOBALES_PROGRESSION].sort());
  });

  it('inclut l espace utilisateur lex_user_* (sans la session)', () => {
    const resultat = selectionnerClesProgression([
      'lex_user_id',
      'lex_user_abcd123_stats',
      'lex_user_session',
      'lex_xp_local',
    ]);
    expect(resultat).toContain('lex_user_id');
    expect(resultat).toContain('lex_user_abcd123_stats');
    expect(resultat).toContain('lex_xp_local');
    expect(resultat).not.toContain('lex_user_session');
  });

  it('exclut secrets, session, caches et files de sync', () => {
    const resultat = selectionnerClesProgression([
      'lex_comptes_locaux', 'lex_session_expiry', 'lex_examen_actif',
      'lex_cache_chap1', 'lex_cours_chap1', 'lex_cache_meta', 'lex_index_exo_id',
      'lex_sync_queue', 'lex_sync_conflicts', 'lex_defi_en_attente',
      'lex_file_sync_globale', 'lex_dernier_pretelechargement', 'lex_crash_logs',
      'lex_guide_vu',
    ]);
    expect(resultat).toEqual([]);
  });

  it('rétablit TOUTES les clés de progression absentes de l ancien export',
    () => {
      // Clés oubliées par l'ancien filtrage → sauvegarde incomplète (anti-farm
      // réinitialisé, historique perdu).
      const oubliees = [
        'lex_exos_resolus', 'lex_bac_blanc_scores', 'lex_flashcards_scores',
        'lex_qcm_meilleur', 'lex_infini_stats', 'lex_srs', 'lex_srs_sm2',
        'lex_srs_faits', 'lex_objectifs', 'lex_positionnement', 'lex_credits',
        'lex_booster_double_xp_fin', 'lex_badges_debloques',
        'lex_maitrise_notions', 'lex_olympiades_resolus', 'lex_favoris_chapitres',
        'lex_annotations', 'lex_qa_cache',
      ];
      const resultat = selectionnerClesProgression(oubliees);
      expect(resultat.sort()).toEqual(oubliees.sort());
    });
});

describe('Sauvegarde — plafonnement (croissance bornée)', () => {
  it('garde les plus récentes entrées quand la liste dépasse le plafond', () => {
    const liste = [1, 2, 3, 4, 5];
    expect(plafonner(liste, 200)).toEqual([1, 2, 3, 4, 5]);
    expect(plafonner(liste, 3)).toEqual([1, 2, 3]);
  });
});

describe('Préchargement — file corrompue', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('retourne [] si la file stockée est corrompue (zéro crash)', async () => {
    mockStore.set(CLE_FILE, '{corrompu');
    expect(await getFilePrechargement()).toEqual([]);
  });

  it('retourne [] si la file stockée est un objet (pas un tableau)', async () => {
    mockStore.set(CLE_FILE, '{"chapitre":"x"}');
    expect(await getFilePrechargement()).toEqual([]);
  });

  it('retourne la file valide telle quelle', async () => {
    mockStore.set(CLE_FILE, JSON.stringify([{ chapitreId: 'c1', titre: 'T', priorite: 80 }]));
    const file = await getFilePrechargement();
    expect(file).toHaveLength(1);
    expect(file[0]?.chapitreId).toBe('c1');
  });
});