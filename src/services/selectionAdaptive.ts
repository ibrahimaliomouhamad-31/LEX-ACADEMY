/**
 * 🎯 SÉLECTION ADAPTATIVE — zone proximale de développement
 *
 * Principe (Vygotsky) : un élève progresse le plus vite sur des exercices où
 * il réussit entre 40 % et 70 % du temps. Trop facile = ennui, trop dur =
 * découragement. Ce service utilise les stats locales (statsSuivi) pour
 * réordonner les exercices d'un chapitre : les "optimaux" d'abord, puis les
 * jamais tentés, puis les maîtrisés (pour consolider), les trop difficiles
 * en fin de liste.
 * 100% hors-ligne : tout vient d'AsyncStorage.
 */

import type { LexStats } from './statsSuivi';

export interface ExoAdaptable {
  id: string;
  difficulte?: string | number;
}

/** Taux de réussite d'un exercice (0 à 1), ou null si jamais tenté. */
function tauxReussite(stats: LexStats, exoId: string): number | null {
  const t = stats.tentatives[exoId];
  if (!t || t.total === 0) return null;
  return t.reussis / t.total;
}

/** Score de "bonus pédagogique" : plus grand = à faire en premier. */
function scoreAdaptatif(taux: number | null, difficulte: number): number {
  if (taux === null) return 60; // jamais tenté : bonne deuxième priorité
  if (taux >= 0.9) return 10;   // maîtrisé : consolider, mais pas prioritaire
  // Idéal 40–70 % : courbe en cloche centrée sur 55 %.
  const distance = Math.abs(taux - 0.55);
  return Math.round(100 - distance * 120); // 100 au centre, ~64 aux extrêmes utiles
}

/**
 * Réordonne une liste d'exercices selon la progression de l'élève.
 * Ne modifie pas la liste d'origine.
 */
export function prioriserExercices<T extends ExoAdaptable>(exercices: T[], stats: LexStats): T[] {
  return [...exercices].sort((a, b) => {
    const tauxA = tauxReussite(stats, a.id);
    const tauxB = tauxReussite(stats, b.id);
    const diffA = Number(a.difficulte) || 1;
    const diffB = Number(b.difficulte) || 1;
    const scoreA = scoreAdaptatif(tauxA, diffA);
    const scoreB = scoreAdaptatif(tauxB, diffB);
    if (scoreA !== scoreB) return scoreB - scoreA; // meilleurs scores d'abord
    return a.id < b.id ? -1 : 1; // stabilité
  });
}

/**
 * Difficulté (1..3) recommandée pour la prochaine session d'entraînement
 * infini d'un chapitre, selon la réussite récente de l'élève.
 */
export function difficulteRecommandee(stats: LexStats, chapitreId: string): number {
  const chap = stats.chapitres[chapitreId];
  if (!chap || chap.total < 3) return 1; // peu de données : commencer doux

  // Réussite globale du chapitre ; si parDifficulte est renseigné, on
  // l'utilise pour affiner le calcul.
  let total = chap.total || 0;
  let reussis = chap.reussis || 0;

  const parDiff = chap.parDifficulte || {};
  const entrees = Object.entries(parDiff);
  if (entrees.length > 0) {
    total = 0;
    reussis = 0;
    for (const [, t] of entrees) {
      total += t.total;
      reussis += t.reussis;
    }
  }

  const taux = total > 0 ? reussis / total : 0;

  if (taux >= 0.8) return 3;   // excellent : monter d'un cran
  if (taux >= 0.55) return 2;  // zone idéale : maintenir
  return 1;                    // fragile : consolider les bases
}

/** Libellé lisible pour afficher la recommandation à l'élève. */
export function libelleRecommandation(difficulte: number): string {
  if (difficulte >= 3) return '🔥 Tu maîtrises : niveau ★★★ recommandé !';
  if (difficulte === 2) return '💪 Zone parfaite : niveau ★★ recommandé.';
  return '🌱 On consolide les bases : niveau ★ recommandé.';
}