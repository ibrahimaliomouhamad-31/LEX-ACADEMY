/**
 * 🎮 SYSTÈME DE RÉVISION GAMIFIÉ — local-first
 *
 * 🔄 CE FICHIER NE COMPILAIT PAS (audit) :
 *  - `private async function` est une syntaxe INVALIDE au niveau module
 *    (TS1131/TS1128) → tout le module était du code mort, aucun XP/streak
 *    gamifié ne fonctionnait.
 *  - La clé `1000XP:` de l'interface était un littéral numérique invalide.
 *  - 🐛 LOGIQUE PÉDAGOGIQUE INVERSÉE : le bloc d'attribution d'XP était
 *    exécuté quand `session.reussi` était FAUX (sur un échec !) — l'élève
 *    gagnait de l'XP en se trompant et rien en réussissant. Corrigé.
 *  - L'XP gamifié vit désormais dans xpLocal (local-first) : instantané
 *    hors-ligne, poussé au cloud via increment() au retour du wifi.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUserItem, getUserItem } from './userStorage';
import { gagnerXp, lireXpTotal } from './xpLocal';
import { syncQueue } from './syncQueue';
import { streakAuthentique, scellerStreak } from './integrite';

const STATS_KEY = 'stats_gamifiees';

interface RevisionStats {
  xpTotal: number;
  streak: number;
  dernierJour: string; // YYYY-MM-DD
  revisionsFaites: number; // aujourd'hui
  badges: string[];
  milestones: {
    premierExercice: boolean;
    premier100XP: boolean;
    streak7jours: boolean;
    streak30jours: boolean;
    xp1000: boolean;
  };
}

interface RevisionSession {
  exoId: string;
  dureeS: number;
  reussi: boolean;
  xpGagne: number;
  bonus: string[]; // ex: ['streak', 'rapide', 'matin']
}

const XP_BASE = 10; // Par exercice réussi
const XP_BONUS_STREAK = 5; // Bonus si streak actif
const XP_BONUS_RAPIDE = 5; // Si résolu en < 30s
const AUJOURD_HUI = (): string => new Date().toISOString().split('T')[0];

function hier(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export async function initRevisionStats(): Promise<RevisionStats> {
  let stats = await getRevisionStats();
  if (!stats) {
    stats = {
      xpTotal: 0,
      streak: 0,
      dernierJour: AUJOURD_HUI(),
      revisionsFaites: 0,
      badges: [],
      milestones: {
        premierExercice: false,
        premier100XP: false,
        streak7jours: false,
        streak30jours: false,
        xp1000: false,
      },
    };
    await saveRevisionStats(stats);
  }
  // 🛡️ INTÉGRITÉ (amélioration 7) : le streak est vérifié contre son empreinte scellée ;
  // une valeur falsifiée (édition manuelle du cache) est réinitialisée.
  const authentique = await streakAuthentique(stats.streak, stats.dernierJour);
  if (!authentique) {
    stats.streak = 0;
    await saveRevisionStats(stats);
  }
  await scellerStreak(stats.streak, stats.dernierJour);
  return stats;
}

export async function getRevisionStats(): Promise<RevisionStats | null> {
  try {
    const data = await getUserItem(STATS_KEY);
    return data ? (JSON.parse(data) as RevisionStats) : null;
  } catch (e) {
    console.error('[revisions] Erreur lecture stats:', e);
    return null;
  }
}

async function getUserCourant(): Promise<string | null> {
  try {
    const { getCurrentUserId } = await import('./userStorage');
    return await getCurrentUserId();
  } catch {
    return null;
  }
}

// 🔄 était `private async function` (syntaxe invalide) → fonction module simple
async function saveRevisionStats(stats: RevisionStats): Promise<void> {
  try {
    await setUserItem(STATS_KEY, JSON.stringify(stats));
    // Sync cloud via la file offline-first (partira au retour du wifi).
    const userId = await getUserCourant();
    if (userId) {
      await syncQueue.add('update', 'utilisateurs', userId, {
        xpGamifie: stats.xpTotal,
        streakGamifie: stats.streak,
      });
    }
  } catch (e) {
    console.error('[revisions] Erreur sauvegarde stats:', e);
  }
}

// ✅ ENREGISTRER UNE RÉVISION COMPLÉTÉE
export async function enregistrerRevision(
  session: RevisionSession
): Promise<{ xpGagne: number; bonus: string[]; newStreak: number }> {
  const stats = await initRevisionStats();
  const aujourd_hui = AUJOURD_HUI();
  let xpGagne = 0;
  const bonus: string[] = [];

  // 🔄 BUG PÉDAGOGIQUE CORRIGÉ : on récompense la RÉUSSITE (reussi === true),
  // pas l'échec. Un essai raté ne rapporte rien mais reste encourageant.
  if (session.reussi) {
    xpGagne = XP_BASE;
    stats.revisionsFaites++;

    // 🔥 BONUS STREAK : révisé hier ET aujourd'hui
    if (stats.dernierJour === hier()) {
      stats.streak = stats.dernierJour === aujourd_hui ? stats.streak : stats.streak + 1;
      if (stats.streak > 1) {
        xpGagne += XP_BONUS_STREAK;
        bonus.push('streak');
      }
    } else if (stats.dernierJour !== aujourd_hui) {
      // Série cassée ou premier jour : on repart de 1 (l'élève est revenu !)
      stats.streak = 1;
    }

    // ⚡ BONUS RAPIDE : < 30s
    if (session.dureeS < 30) {
      xpGagne += XP_BONUS_RAPIDE;
      bonus.push('rapide');
    }

    // 🌅 BONUS MATIN : révisé avant 9h
    const heure = new Date().getHours();
    if (heure < 9) {
      xpGagne += 3;
      bonus.push('matin');
    }

    stats.xpTotal += xpGagne;
    stats.dernierJour = aujourd_hui;

    // 🏆 MILESTONES
    if (!stats.milestones.premierExercice) {
      stats.milestones.premierExercice = true;
      stats.badges.push('🌟 Premier exercice');
    }
    if (stats.xpTotal >= 100 && !stats.milestones.premier100XP) {
      stats.milestones.premier100XP = true;
      stats.badges.push('💯 100 XP atteints');
    }
    if (stats.streak >= 7 && !stats.milestones.streak7jours) {
      stats.milestones.streak7jours = true;
      stats.badges.push('🔥 7 jours de suite !');
    }
    if (stats.streak >= 30 && !stats.milestones.streak30jours) {
      stats.milestones.streak30jours = true;
      stats.badges.push('💪 30 jours de suite !!!');
    }
    if (stats.xpTotal >= 1000 && !stats.milestones.xp1000) {
      stats.milestones.xp1000 = true;
      stats.badges.push('👑 1000 XP - Maître !');
    }

    // L'XP part dans le compteur local-first (visible instantanément,
    // synchronisé au cloud au retour du réseau).
    await gagnerXp(xpGagne);
  }

  await saveRevisionStats(stats);
  // Re-scelle l'empreinte après chaque mise à jour légitime du streak (amélioration 7)
  await scellerStreak(stats.streak, stats.dernierJour);

  // Journal de révision dans la file offline-first (docId null-safe).
  const userId = await getUserCourant();
  await syncQueue.add(
    'create',
    'revisions_log',
    `${userId || 'anonyme'}_${session.exoId}_${Date.now()}`,
    {
      exoId: session.exoId,
      dureeS: session.dureeS,
      reussi: session.reussi,
      xpGagne,
      bonus,
      timestamp: new Date().toISOString(),
    }
  );

  return { xpGagne, bonus, newStreak: stats.streak };
}

// ✅ OBTENIR PROGRESSION DU JOUR
export async function getProgressionDuJour(): Promise<{
  revisionsFaites: number;
  xpAujourdHui: number;
  objectif: number;
  pourcentage: number;
}> {
  const stats = await initRevisionStats();
  const aujourd_hui = AUJOURD_HUI();
  // Estimation honnête du XP du jour à partir des révisions faites.
  const xpAujourdHui =
    stats.dernierJour === aujourd_hui
      ? Math.min(stats.revisionsFaites * (XP_BASE + XP_BONUS_RAPIDE), await lireXpTotal())
      : 0;

  return {
    revisionsFaites: stats.revisionsFaites,
    xpAujourdHui,
    objectif: 100, // 100 XP par jour
    pourcentage: Math.min(100, Math.round((xpAujourdHui / 100) * 100)),
  };
}

// ✅ ENCOURAGEMENTS DYNAMIQUES (100% hors-ligne)
export function getEncouragement(stats: { streak: number; xpTotal: number }): string {
  if (stats.streak === 0) {
    return '🔥 Commence ta série maintenant !';
  } else if (stats.streak < 3) {
    return `🔥 Bonne série ! Encore ${3 - stats.streak} jour(s) pour déverrouiller un badge`;
  } else if (stats.streak < 7) {
    return `🔥🔥 ${stats.streak} jours ! Fonce vers 7 !`;
  } else if (stats.streak < 30) {
    return `🔥🔥🔥 ${stats.streak} jours incroyable ! Vise 30 !`;
  } else {
    return `👑 INCROYABLE ! ${stats.streak} jours - Tu es une LÉGENDE !`;
  }
}

// ✅ CLASSEMENT LOCAL (fonctionne sans réseau)
export async function getRankingPosition(
  userId: string,
  allStats: { userId: string; xp: number }[]
): Promise<number> {
  const sorted = [...allStats].sort((a, b) => b.xp - a.xp);
  return sorted.findIndex((s) => s.userId === userId) + 1;
}

// ✅ Nombre de badges gamifiés débloqués (pour le profil)
export async function compterBadges(): Promise<number> {
  const stats = await getRevisionStats();
  return stats?.badges.length ?? 0;
}

export type { RevisionStats, RevisionSession };