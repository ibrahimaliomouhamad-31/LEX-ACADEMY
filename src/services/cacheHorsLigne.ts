import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';

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
  } catch (error) {
    console.error(`[cacheHorsLigne] Erreur saveExercices(${chapitre_id}):`, error);
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
    return JSON.parse(json) as Exercice[];
  } catch (error) {
    console.error(`[cacheHorsLigne] Erreur getExercices(${chapitre_id}):`, error);
    return null;
  }
}

export async function getExoById(id: string): Promise<Exercice | null> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));

    if (cacheKeys.length === 0) {
      return null;
    }

    const entries = await AsyncStorage.multiGet(cacheKeys);

    for (const [, json] of entries) {
      if (!json) continue;
      try {
        const exercices: Exercice[] = JSON.parse(json);
        const found = exercices.find((exo) => exo.id === id);
        if (found) return found;
      } catch {
        // Ignore malformed entries
      }
    }

    return null;
  } catch (error) {
    console.error(`[cacheHorsLigne] Erreur getExoById(${id}):`, error);
    return null;
  }
}

export async function isCached(chapitre_id: string): Promise<boolean> {
  try {
    const key = CACHE_PREFIX + chapitre_id;
    const value = await AsyncStorage.getItem(key);
    return value !== null;
  } catch (error) {
    console.error(`[cacheHorsLigne] Erreur isCached(${chapitre_id}):`, error);
    return false;
  }
}

export async function getAllCachedChapterIds(): Promise<string[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .map((k) => k.slice(CACHE_PREFIX.length));
  } catch (error) {
    console.error('[cacheHorsLigne] Erreur getAllCachedChapterIds:', error);
    return [];
  }
}

export async function getCacheSize(): Promise<number> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(
      (k) => k.startsWith(CACHE_PREFIX) || k.startsWith(CACHE_COURS_PREFIX)
    );

    if (cacheKeys.length === 0) {
      return 0;
    }

    const entries = await AsyncStorage.multiGet(cacheKeys);
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
    console.error('[cacheHorsLigne] Erreur getCacheSize:', error);
    return 0;
  }
}

export async function clearCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX) || k.startsWith(CACHE_COURS_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.error('[cacheHorsLigne] Erreur clearCache:', error);
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
  matiere?: string;
  classe?: string;
}

export async function saveCours(cours: CoursCache): Promise<void> {
  try {
    const key = CACHE_COURS_PREFIX + cours.id;
    await AsyncStorage.setItem(key, JSON.stringify(cours));
  } catch (error) {
    console.error(`[cacheHorsLigne] Erreur saveCours(${cours.id}):`, error);
    throw error;
  }
}

export async function getCours(id: string): Promise<CoursCache | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_COURS_PREFIX + id);
    if (json === null) return null;
    return JSON.parse(json) as CoursCache;
  } catch (error) {
    console.error(`[cacheHorsLigne] Erreur getCours(${id}):`, error);
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
    console.error('[cacheHorsLigne] Erreur getAllCoursCache:', error);
    return [];
  }
}

export async function supprimerCours(id: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_COURS_PREFIX + id);
  } catch (error) {
    console.error(`[cacheHorsLigne] Erreur supprimerCours(${id}):`, error);
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
