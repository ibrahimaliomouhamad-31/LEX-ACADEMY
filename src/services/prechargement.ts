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
  const brut = await AsyncStorage.getItem(CLE_FILE);
  return brut ? (JSON.parse(brut) as TachePrechargement[]) : [];
}

/**
 * Compression native légère des données avant téléchargement (amélioration 22) :
 * on retire les espaces superflus et on tronque les sections non essentielles.
 */
export function compresserTexte(s: string, modeEconomie: boolean): string {
  const nettoie = (s || '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  return modeEconomie ? nettoie.slice(0, Math.floor(nettoie.length * 0.7)) : nettoie;
}