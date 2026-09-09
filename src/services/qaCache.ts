/**
 * 💬 CACHE DE QUESTIONS/RÉPONSES POUR L'ASSISTANT (LEX.AI)
 *
 * Le chat IA exige du wifi. Ce cache permet un mode DÉGRADÉ hors-ligne :
 *  - quand l'élève a du wifi, chaque bonne réponse IA est mémorisée ;
 *  - sans wifi, on cherche dans le cache la question la plus proche
 *    (similarité de mots-clés) et on ressort la réponse connue.
 * Pragmatique, 100% local, aucune dépendance.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE_QA = 'lex_qa_cache';
const MAX_ENTREES = 60;

export interface EntreeQA {
  question: string;
  reponse: string;
  dateISO: string;
}

async function lireTout(): Promise<EntreeQA[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE_QA);
    return brut ? (JSON.parse(brut) as EntreeQA[]) : [];
  } catch {
    return [];
  }
}

async function ecrireTout(entrees: EntreeQA[]): Promise<void> {
  try {
    // Garde les plus récentes seulement.
    await AsyncStorage.setItem(CLE_QA, JSON.stringify(entrees.slice(-MAX_ENTREES)));
  } catch {
    // ignore
  }
}

/** Mémorise un couple question → réponse (quand le wifi est là). */
export async function memoriser(question: string, reponse: string): Promise<void> {
  if (!question.trim() || !reponse.trim()) return;
  const entrees = await lireTout();
  entrees.push({
    question: question.trim(),
    reponse: reponse.trim(),
    dateISO: new Date().toISOString(),
  });
  await ecrireTout(entrees);
}

function mots(texte: string): string[] {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((m) => m.length > 2);
}

/**
 * Cherche dans le cache la meilleure réponse possible pour une question.
 * Retourne null si rien de pertinent (score de similarité trop faible).
 */
export async function chercher(question: string): Promise<EntreeQA | null> {
  const entrees = await lireTout();
  if (entrees.length === 0) return null;

  const motsQuestion = mots(question);
  if (motsQuestion.length === 0) return null;

  let meilleure: EntreeQA | null = null;
  let meilleurScore = 0;

  for (const entree of entrees) {
    const motsCache = new Set(mots(entree.question));
    let communs = 0;
    for (const m of motsQuestion) {
      if (motsCache.has(m)) communs++;
    }
    const score = communs / Math.max(motsQuestion.length, 1);
    if (score > meilleurScore) {
      meilleurScore = score;
      meilleure = entree;
    }
  }

  // Seuil : au moins la moitié des mots-clés en commun.
  return meilleurScore >= 0.5 ? meilleure : null;
}

/** Nombre d'entrées en cache (pour l'affichage dans le chat). */
export async function tailleCache(): Promise<number> {
  return (await lireTout()).length;
}