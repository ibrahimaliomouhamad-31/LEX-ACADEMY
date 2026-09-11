import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { avertirDev, logDev, rapporterErreur } from '../utils/logger';

// --- Types ---

export interface Exercice {
  id: string;
  classe: string;
  matiere: string;
  chapitre: string;
  chapitre_id: string;
  difficulte: string;
  enonce: string;
  bonne_reponse: string;
  indice1?: string;
  indice2?: string;
  explication?: string;
}

const CACHE_PREFIX = 'lex_cache_';

// --- Pure functions ---

export async function saveExercices(chapitre_id: string, exercices: Exercice[]): Promise<void> {
  try {
    const key = CACHE_PREFIX + chapitre_id;
    const json = JSON.stringify(exercices);
    await AsyncStorage.setItem(key, json);

    // 🔎 INDEX EXO→CHAPITRE (perf) : maintient getExoById en O(1) au lieu
    // de scanner TOUT le cache (jusqu'à ~40 Mo) à chaque ouverture d'exo.
    // Un échec d'index n'est PAS bloquant : reconstruit au prochain accès.
    try {
      const brut = await AsyncStorage.getItem(CLE_INDEX_EXO);
      const index: Record<string, string> = brut ? JSON.parse(brut) : {};
      for (const exo of exercices) {
        if (exo && typeof exo.id === 'string' && exo.id) {
          index[exo.id] = chapitre_id; // dernier chapitre téléchargé gagne
        }
      }
      await AsyncStorage.setItem(CLE_INDEX_EXO, JSON.stringify(index));
    } catch {
      // index indisponible : reconstruit au prochain getExoById
    }
  } catch (error) {
    rapporterErreur(`[cacheHorsLigne] Erreur saveExercices(${chapitre_id}):`, error);
    throw error;
  }
}

export async function getExercices(chapitre_id: string): Promise<Exercice[] | null> {
  try {
    const key = CACHE_PREFIX + chapitre_id;
    const json = await AsyncStorage.getItem(key);
    if (json === null) {
      return null;
    }
    await noterAcces(chapitre_id); // suivi LRU
    return JSON.parse(json) as Exercice[];
  } catch (error) {
    rapporterErreur(`[cacheHorsLigne] Erreur getExercices(${chapitre_id}):`, error);
    return null;
  }
}

export async function getExoById(id: string): Promise<Exercice | null> {
  try {
    // 1) Index O(1) exo → chapitre : la voie rapide, plus de scan complet.
    const brutIndex = await AsyncStorage.getItem(CLE_INDEX_EXO);
    if (brutIndex) {
      let index: Record<string, string> = {};
      try {
        index = JSON.parse(brutIndex) as Record<string, string>;
      } catch {
        index = {};
      }
      const chapitreId = typeof index[id] === 'string' ? index[id] : null;
      if (chapitreId) {
        const exos = await getExercices(chapitreId);
        const found = exos?.find((exo) => exo.id === id);
        if (found) return found;
        // Chapitre évincé (quota/suppression) : l'entrée d'index est
        // orpheline — on la nettoie pour ne pas re-tenter à chaque fois.
        delete index[id];
        await AsyncStorage.setItem(CLE_INDEX_EXO, JSON.stringify(index));
        return null;
      }
    }

    // 2) Première recherche après MAJ / index corrompu : rebuild on demand.
    await reconstruireIndexExo();
    const brutIndex2 = await AsyncStorage.getItem(CLE_INDEX_EXO);
    if (brutIndex2) {
      const index2 = JSON.parse(brutIndex2) as Record<string, string>;
      const chapId = typeof index2[id] === 'string' ? index2[id] : null;
      if (chapId) {
        const exos = await getExercices(chapId);
        const found = exos?.find((exo) => exo.id === id);
        if (found) return found;
      }
    }
    return null;
  } catch (error) {
    rapporterErreur(`[cacheHorsLigne] Erreur getExoById(${id}):`, error);
    return null;
  }
}

// ---------- 📦 QUOTA DE CACHE + LRU (gestion de l'espace) ----------

const CLE_META = 'lex_cache_meta'; // { [chapitreId]: timestamp dernier accès }
const CLE_INDEX_EXO = 'lex_index_exo_id'; // { [exoId]: chapitre_id } — getExoById O(1)
const QUOTA_CACHE_OCTETS = 40 * 1024 * 1024; // ~40 Mo

// ⚡ COALESCING LRU (perf) : avant, CHAQUE getExercices() faisait
// 1 lecture + 1 écriture AsyncStorage de la meta — des dizaines d'écritures
// par session (recherche, QCM, duels…). Désormais la meta vit en RAM et
// n'est écrite qu'au plus 1 fois / LRU_FLUSH_MS, ou à la demande via
// flushMetaLRU() (avant une décision d'éviction par exemple).
const LRU_FLUSH_MS = 5000;

// 🛡️ CLÉS RÉSERVÉES : la meta et l'index commencent par le préfixe des
// chapitres (`lex_cache_`…) — il faut les EXCLURE des scans de chapitres
// (avant : `lex_cache_meta` était vue comme un chapitre « meta » fantôme,
// compté dans les tailles, listé dans getAllCachedChapterIds, et pire :
// évincé en premier par le quota → perte de la meta LRU à chaque purge).
const CLES_RESERVEES = new Set([CLE_META, CLE_INDEX_EXO]);

function estCleChapitre(cle: string): boolean {
  return cle.startsWith(CACHE_PREFIX) && !CLES_RESERVEES.has(cle);
}

let metaMemo: { [chapitreId: string]: number } | null = null;
let metaDirty = false;
let dernierFlushMeta = 0;
let flushMetaEnCours: Promise<void> | null = null;

async function chargerMeta(): Promise<void> {
  if (metaMemo !== null) return;
  dernierFlushMeta = Date.now(); // pas de flush systématique au démarrage
  try {
    const brut = await AsyncStorage.getItem(CLE_META);
    const v = brut ? JSON.parse(brut) : {};
    metaMemo = v && typeof v === 'object' && !Array.isArray(v)
      ? (v as { [chapitreId: string]: number })
      : {};
  } catch {
    metaMemo = {};
  }
}

/** Force l'écriture de la meta LRU (décision d'éviction = accès à jour). */
export async function flushMetaLRU(): Promise<void> {
  if (flushMetaEnCours) {
    await flushMetaEnCours;
    return;
  }
  if (!metaDirty || metaMemo === null) return;
  const promesse = (async () => {
    try {
      await AsyncStorage.setItem(CLE_META, JSON.stringify(metaMemo));
      metaDirty = false;
      dernierFlushMeta = Date.now();
    } catch (error) {
      rapporterErreur('[cacheHorsLigne] Erreur flush LRU:', error);
    }
  })();
  flushMetaEnCours = promesse;
  try {
    await promesse;
  } finally {
    flushMetaEnCours = null;
  }
}

/** ⚠️ Pour les tests uniquement : réinitialise l'état LRU en mémoire. */
export function _resetCacheMemoire(): void {
  metaMemo = null;
  metaDirty = false;
  dernierFlushMeta = 0;
  flushMetaEnCours = null;
}

/** Note le dernier accès d'un chapitre (pour l'éviction LRU). */
async function noterAcces(chapitreId: string): Promise<void> {
  await chargerMeta();
  if (metaMemo === null) return;
  metaMemo[chapitreId] = Date.now();
  metaDirty = true;
  // Coalescing : au plus une écriture AsyncStorage par fenêtre LRU_FLUSH_MS.
  if (Date.now() - dernierFlushMeta >= LRU_FLUSH_MS) {
    await flushMetaLRU();
  }
}

/** multiGet par lots : évite de matérialiser un gros cache en UNE seule
 *  allocation (mémoire téléphone limitée) — améliore aussi la réactivité. */
async function multiGetParLots(
  cles: string[],
  tailleLot = 40
): Promise<[string, string | null][]> {
  const resultat: [string, string | null][] = [];
  for (let i = 0; i < cles.length; i += tailleLot) {
    const lot = cles.slice(i, i + tailleLot);
    if (lot.length === 0) continue;
    const entrees = await AsyncStorage.multiGet(lot);
    resultat.push(...entrees);
  }
  return resultat;
}

/** Retire toutes les entrées d'un chapitre de l'index exo→chapitre. */
async function retirerChapitreDeIndex(chapitreId: string): Promise<void> {
  try {
    const brut = await AsyncStorage.getItem(CLE_INDEX_EXO);
    if (!brut) return;
    const index = JSON.parse(brut) as Record<string, string>;
    const reste: Record<string, string> = {};
    let modifie = false;
    for (const [exoId, chapId] of Object.entries(index)) {
      if (chapId !== chapitreId) reste[exoId] = chapId;
      else modifie = true;
    }
    if (modifie) await AsyncStorage.setItem(CLE_INDEX_EXO, JSON.stringify(reste));
  } catch {
    // index corrompu : reconstruit au prochain getExoById
  }
}

/**
 * 🔄 Reconstruit l'index exo→chapitre (1re recherche après MAJ de l'app
 * ou index corrompu). Coût : un scan du cache — cas rare par design.
 */
export async function reconstruireIndexExo(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => estCleChapitre(k));
    const index: Record<string, string> = {};
    const entries = await multiGetParLots(cacheKeys);
    for (const [key, json] of entries) {
      if (!json) continue;
      try {
        const exos: Exercice[] = JSON.parse(json);
        if (!Array.isArray(exos)) continue;
        const chapitreId = key.slice(CACHE_PREFIX.length);
        for (const exo of exos) {
          if (exo && typeof exo.id === 'string' && exo.id) {
            index[exo.id] = chapitreId;
          }
        }
      } catch {
        // entrée corrompue : ignorée (le chapitre sera re-téléchargé)
      }
    }
    await AsyncStorage.setItem(CLE_INDEX_EXO, JSON.stringify(index));
  } catch (error) {
    rapporterErreur('[cacheHorsLigne] Erreur reconstruireIndexExo:', error);
  }
}

/** Taille en octets de chaque chapitre en cache. */
export async function tailleParChapitre(): Promise<{ id: string; octets: number }[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => estCleChapitre(k));
    const entries = await multiGetParLots(cacheKeys);
    return entries.map(([key, json]) => ({
      id: key.slice(CACHE_PREFIX.length),
      octets: (json?.length ?? 0) + key.length,
    }));
  } catch {
    return [];
  }
}

/**
 * 🧹 Applique le quota : supprime les chapitres les PLUS ANCIENNEMENT
 * consultés jusqu'à repasser sous le plafond. Les chapitres jamais
 * rouverts depuis longtemps partent en premier — l'élève ne perd jamais
 * ce qu'il utilise réellement.
 * Retourne le nombre de chapitres supprimés.
 */
export async function appliquerQuotaCache(
  quotaOctets: number = QUOTA_CACHE_OCTETS
): Promise<number> {
  try {
    let supprimes = 0;
    let total = await getCacheSize();
    if (total <= quotaOctets) return 0;

    // Décision basée sur les accès les Plus RÉCENTS (coalescing pas encore
    // persisté → on force l'écriture puis on lit depuis la mémoire).
    await flushMetaLRU();
    await chargerMeta();
    const meta = metaMemo ?? {};
    const tailles = await tailleParChapitre();

    // Du plus ancien accès au plus récent (jamais accédés = timestamp 0).
    tailles.sort((a, b) => (meta[a.id] || 0) - (meta[b.id] || 0));

    for (const chap of tailles) {
      if (total <= quotaOctets) break;
      await AsyncStorage.removeItem(CACHE_PREFIX + chap.id);
      await retirerChapitreDeIndex(chap.id); // index exo→chapitre cohérent
      total -= chap.octets;
      supprimes++;
    }

    return supprimes;
  } catch (error) {
    rapporterErreur('[cacheHorsLigne] Erreur appliquerQuotaCache:', error);
    return 0;
  }
}

/** Supprime un chapitre précis (gestion manuelle). */
export async function supprimerChapitre(chapitreId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + chapitreId);
    await retirerChapitreDeIndex(chapitreId);
  } catch (error) {
    rapporterErreur(`[cacheHorsLigne] Erreur supprimerChapitre(${chapitreId}):`, error);
  }
}

export async function isCached(chapitre_id: string): Promise<boolean> {
  try {
    const key = CACHE_PREFIX + chapitre_id;
    const value = await AsyncStorage.getItem(key);
    return value !== null;
  } catch (error) {
    rapporterErreur(`[cacheHorsLigne] Erreur isCached(${chapitre_id}):`, error);
    return false;
  }
}

export async function getAllCachedChapterIds(): Promise<string[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys
      .filter((k) => estCleChapitre(k))
      .map((k) => k.slice(CACHE_PREFIX.length));
  } catch (error) {
    rapporterErreur('[cacheHorsLigne] Erreur getAllCachedChapterIds:', error);
    return [];
  }
}

export async function getCacheSize(): Promise<number> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(
      (k) => estCleChapitre(k) || k.startsWith(CACHE_COURS_PREFIX)
    );

    if (cacheKeys.length === 0) {
      return 0;
    }

    const entries = await multiGetParLots(cacheKeys);
    let totalBytes = 0;
    for (const [key, json] of entries) {
      // Compte la taille de la clé + la valeur
      totalBytes += key.length;
      if (json) {
        totalBytes += json.length;
      }
    }
    return totalBytes;
  } catch (error) {
    rapporterErreur('[cacheHorsLigne] Erreur getCacheSize:', error);
    return 0;
  }
}

export async function clearCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX) || k.startsWith(CACHE_COURS_PREFIX));
    // On purge aussi l'index exo→chapitre et la meta LRU : repartir propre.
    await AsyncStorage.multiRemove([...cacheKeys, CLE_INDEX_EXO, CLE_META]);
    _resetCacheMemoire();
  } catch (error) {
    rapporterErreur('[cacheHorsLigne] Erreur clearCache:', error);
    throw error;
  }
}

// --- Cache des COURS (pour lire le cours hors-ligne) ---

const CACHE_COURS_PREFIX = 'lex_cours_';

export interface CoursCache {
  id: string;
  titre: string;
  theorie?: string;
  methode_content?: string;
  /** Titre de la méthode (affiché comme sous-titre) */
  methode_titre?: string;
  /** Activité d'approche */
  activite?: string;
  /** Piège du prof */
  piege?: string;
  /** Démonstration / approfondissement */
  demo?: string;
  /** Exercice type corrigé */
  exercice_corrige?: string;
  matiere?: string;
  classe?: string;
  /** Contenu extrait du cahier de l'élève (local, non synchronisé) */
  cahier?: string;
}

export async function saveCours(cours: CoursCache): Promise<void> {
  try {
    const key = CACHE_COURS_PREFIX + cours.id;
    await AsyncStorage.setItem(key, JSON.stringify(cours));
  } catch (error) {
    rapporterErreur(`[cacheHorsLigne] Erreur saveCours(${cours.id}):`, error);
    throw error;
  }
}

export async function getCours(id: string): Promise<CoursCache | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_COURS_PREFIX + id);
    if (json === null) return null;
    return JSON.parse(json) as CoursCache;
  } catch (error) {
    rapporterErreur(`[cacheHorsLigne] Erreur getCours(${id}):`, error);
    return null;
  }
}

export async function getAllCoursCache(): Promise<CoursCache[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const coursKeys = allKeys.filter((k) => k.startsWith(CACHE_COURS_PREFIX));
    if (coursKeys.length === 0) return [];
    const entries = await AsyncStorage.multiGet(coursKeys);
    const resultat: CoursCache[] = [];
    for (const [, json] of entries) {
      if (!json) continue;
      try {
        resultat.push(JSON.parse(json) as CoursCache);
      } catch {
        // entrée corrompue : on l'ignore
      }
    }
    resultat.sort((a, b) => (a.id > b.id ? 1 : -1));
    return resultat;
  } catch (error) {
    rapporterErreur('[cacheHorsLigne] Erreur getAllCoursCache:', error);
    return [];
  }
}

export async function supprimerCours(id: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_COURS_PREFIX + id);
  } catch (error) {
    rapporterErreur(`[cacheHorsLigne] Erreur supprimerCours(${id}):`, error);
  }
}

// --- React Hook ---

export function useCacheHorsLigne() {
  return useMemo(
    () => ({
      saveExercices,
      getExercices,
      getExoById,
      isCached,
      getAllCachedChapterIds,
      getCacheSize,
      clearCache,
    }),
    [],
  );
}
