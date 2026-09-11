/**
 * 🗺️ PARCOURS PERSONNALISÉ — moteur de recommandation 100% offline
 *
 * Analyse les statistiques de l'élève pour générer un parcours d'apprentissage
 * adapté : les chapitres faibles d'abord (consolidation), les moyens ensuite
 * (progression), les forts en dernier (maintien). Chaque étape recommande
 * une difficulté optimale (zone proximale de développement).
 *
 * 100% hors-ligne : tout vient d'AsyncStorage via statsSuivi.
 */

import { getStats, tauxMaitrise } from './statsSuivi';
import { difficulteRecommandee } from './selectionAdaptive';

export interface EtapeParcours {
  chapitreId: string;
  titre: string;
  matiere: string;
  tauxMaitrise: number;
  niveau: 'faible' | 'moyen' | 'maitrise' | 'non_commence';
  difficulteRecommandee: number;
  priorite: number; // 1 = plus haute priorité
  statut: 'a_faire' | 'en_cours' | 'termine';
}

export interface ParcoursPersonnalise {
  etapes: EtapeParcours[];
  dateGeneration: string;
  resume: {
    totalChapitres: number;
    faibles: number;
    moyens: number;
    maitrises: number;
    nonCommences: number;
  };
  conseil: string;
}

/** Score de priorité : plus petit = à faire en premier (faibles d'abord). */
function scorePriorite(niveau: EtapeParcours['niveau'], taux: number): number {
  switch (niveau) {
    case 'faible': return 100 + taux; // 100-139 : urgents, les plus faibles en premier
    case 'non_commence': return 200; // à découvrir
    case 'moyen': return 300 + taux; // 300-369 : progression
    case 'maitrise': return 400 + taux; // maintien en dernier
    default: return 500;
  }
}

/** Seuil de maîtrise pour catégoriser un chapitre. */
function categoriser(taux: number, aDesTentatives: boolean): EtapeParcours['niveau'] {
  if (!aDesTentatives) return 'non_commence';
  if (taux < 40) return 'faible';
  if (taux < 70) return 'moyen';
  return 'maitrise';
}

/** Conseil personnalisé selon le profil de l'élève. */
function genererConseil(resume: ParcoursPersonnalise['resume']): string {
  const { faibles, moyens, maitrises, nonCommences, totalChapitres } = resume;

  if (totalChapitres === 0) {
    return '📚 Commence par télécharger des cours et faire quelques exercices pour que je puisse analyser ton niveau.';
  }
  if (faibles > moyens + maitrises) {
    return '🌱 Tu as des bases à consolider. Concentre-toi sur les chapitres faibles d\'abord — chaque effort compte !';
  }
  if (maitrises >= totalChapitres * 0.7) {
    return '🏆 Excellent ! Tu maîtrises la plupart des chapitres. On maintient ça avec des exercices difficiles.';
  }
  if (nonCommences > totalChapitres * 0.5) {
    return '🗺️ Beaucoup de chapitres t\'attendent ! Explore-les un par un pour découvrir ton potentiel.';
  }
  if (moyens > faibles) {
    return '💪 Bonne progression ! Tu es dans la zone parfaite pour monter en niveau. Continue comme ça !';
  }
  return '🎯 Travaille les chapitres faibles en priorité, puis consolide les moyens. Tu y arriveras !';
}

/**
 * Génère le parcours personnalisé de l'élève.
 * @param chapitres Liste des chapitres disponibles (id, titre, matiere)
 */
export async function genererParcours(
  chapitres: { id: string; titre: string; matiere: string }[]
): Promise<ParcoursPersonnalise> {
  const stats = await getStats();
  const dateGeneration = new Date().toISOString();

  const etapes: EtapeParcours[] = chapitres.map((chap) => {
    const statsChap = stats.chapitres[chap.id];
    const taux = tauxMaitrise(statsChap);
    const aDesTentatives = statsChap && statsChap.total > 0;
    const niveau = categoriser(taux, aDesTentatives);
    const difficulte = difficulteRecommandee(stats, chap.id);
    const priorite = scorePriorite(niveau, taux);

    let statut: EtapeParcours['statut'] = 'a_faire';
    if (aDesTentatives && taux >= 70) statut = 'termine';
    else if (aDesTentatives) statut = 'en_cours';

    return {
      chapitreId: chap.id,
      titre: chap.titre,
      matiere: chap.matiere,
      tauxMaitrise: taux,
      niveau,
      difficulteRecommandee: difficulte,
      priorite,
      statut,
    };
  });

  etapes.sort((a, b) => a.priorite - b.priorite);

  const resume = {
    totalChapitres: chapitres.length,
    faibles: etapes.filter((e) => e.niveau === 'faible').length,
    moyens: etapes.filter((e) => e.niveau === 'moyen').length,
    maitrises: etapes.filter((e) => e.niveau === 'maitrise').length,
    nonCommences: etapes.filter((e) => e.niveau === 'non_commence').length,
  };

  const conseil = genererConseil(resume);

  return { etapes, dateGeneration, resume, conseil };
}

/**
 * Recommande la prochaine action concrète pour l'élève.
 * Retourne l'étape prioritaire avec une action spécifique.
 */
export async function prochaineAction(
  chapitres: { id: string; titre: string; matiere: string }[]
): Promise<{ etape: EtapeParcours | null; action: string }> {
  const parcours = await genererParcours(chapitres);
  const etape = parcours.etapes[0] || null;

  if (!etape) {
    return { etape: null, action: 'Aucun chapitre disponible.' };
  }

  let action: string;
  switch (etape.niveau) {
    case 'non_commence':
      action = `Découvre "${etape.titre}" en cours, puis fais quelques exercices.`;
      break;
    case 'faible':
      action = `Retravaille "${etape.titre}" — commence par des exercices faciles (niveau ★).`;
      break;
    case 'moyen':
      action = `Continue "${etape.titre}" avec des exercices niveau ★★ pour progresser.`;
      break;
    case 'maitrise':
      action = `Maintiens "${etape.titre}" avec un exercice difficile (niveau ★★★) de temps en temps.`;
      break;
    default:
      action = `Fais des exercices sur "${etape.titre}".`;
  }

  return { etape, action };
}

/** Couleur associée au niveau de maîtrise pour l'affichage. */
export function couleurNiveau(niveau: EtapeParcours['niveau']): string {
  switch (niveau) {
    case 'faible': return '#EF4444';
    case 'moyen': return '#FBBF24';
    case 'maitrise': return '#10B981';
    case 'non_commence': return '#64748B';
    default: return '#64748B';
  }
}

/** Emoji associé au niveau pour l'affichage. */
export function emojiNiveau(niveau: EtapeParcours['niveau']): string {
  switch (niveau) {
    case 'faible': return '🔴';
    case 'moyen': return '🟡';
    case 'maitrise': return '🟢';
    case 'non_commence': return '⚪';
    default: return '⚪';
  }
}
