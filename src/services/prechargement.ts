// PRÉCHARGEMENT INTELLIGENT : télécharge en priorité les chapitres faibles (amélioration 21)
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE_FILE = '@lex/filePrechargement';

export interface TachePrechargement {
  chapitreId: string;
  titre: string;
  priorite: number; // 100 = urgent (maitrise faible), 0 = déjà fort
}

/**
 * Construit la file de préchargement : les chapitres les moins maîtrisés d'abord,
 * en respectant le mode économie de données (limite réduite).
 */
export async function planifierPrechargement(
  chapitres: { id: string; titre: string; maitrise: number }[],
  economieDonnees: boolean,
): Promise<TachePrechargement[]> {
  const file = chapitres
    .map((c) => ({ chapitreId: c.id, titre: c.titre, priorite: Math.max(0, 100 - Math.round(c.maitrise)) }))
    .sort((a, b) => b.priorite - a.priorite);
  const limite = economieDonnees ? 3 : 10;
  const retenue = file.slice(0, limite);
  await AsyncStorage.setItem(CLE_FILE, JSON.stringify(retenue));
  return retenue;
}

export async function getFilePrechargement(): Promise<TachePrechargement[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE_FILE);
    const file = brut ? JSON.parse(brut) : [];
    return Array.isArray(file) ? file : [];
  } catch {
    // file corrompue : on repart d'une file vide (replanifiera au besoin)
    return [];
  }
}

/**
 * Compression native légère des données avant téléchargement (amélioration 22) :
 * on retire les espaces superflus SANS JAMAIS couper le contenu pédagogique.
 * 🛡️ ANTI-TRONCATURE : l'ancienne version coupait 30% du texte en mode
 * économie — les fins de cours/exercices disparaissaient silencieusement.
 * Désormais on compresse seulement les blancs, jamais le contenu.
 */
export function compresserTexte(s: string, modeEconomie: boolean): string {
  if (!s) return '';
  let result = (s || '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  // Mode économie : on compacte les sauts de ligne pour réduire la taille
  if (modeEconomie) {
    result = result.replace(/\n/g, ' ').replace(/[ ]+/g, ' ').trim();
  }
  return result;
}
