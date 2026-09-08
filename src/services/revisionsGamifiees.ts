/**
 * 🎮 SYSTÈME DE RÉVISION GAMIFIÉ
 * Pour élèves intelligents mais fainéants :
 * - Streaks (motivation continue)
 * - Bonusses (récompenses immédiates)
 * - Challenges quotidiens (défi dopamine)
 * - Progression visible (bars, badges)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from './auth';
import { setUserItem, getUserItem } from './userStorage';
import { syncQueue } from './syncQueue';

const STATS_KEY = 'lex_stats_gamifiees';

interface RevisionStats {
  xpTotal: number;
  streak: number;
  dernierJour: string; // YYYY-MM-DD
  revisionsFaites: number; // Aujourd'hui
  badges: string[];
  milestones: {
    premierExercice: boolean;
    premier100XP: boolean;
    streak7jours: boolean;
    streak30jours: boolean;
    1000XP: boolean;
  };
}

interface RevisionSession {
  exoId: string;
  dureeS: number;
  reussi: boolean;
  xpGagne: number;
  bonus: string[]; // ex: ['streak', 'rapide', 'matin']
}

const XP_BASE = 10; // Par exercice
const XP_BONUS_STREAK = 5; // Bonus si streak actif
const XP_BONUS_RAPIDE = 5; // Si résolu en < 30s
const AUJOURD_HUI = (): string => new Date().toISOString().split('T')[0];

export async function initRevisionStats(): Promise<RevisionStats> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Pas de session');

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
        1000XP: false,
      },
    };
    await saveRevisionStats(stats);
  }
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

private async function saveRevisionStats(stats: RevisionStats): Promise<void> {
  try {
    await setUserItem(STATS_KEY, JSON.stringify(stats));
    // Sync vers Firestore
    const userId = await getCurrentUserId();
    if (userId) {
      await syncQueue.add('update', 'utilisateurs', userId, {
        xp: stats.xpTotal,
        streak: stats.streak,
        badges: stats.badges,
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
  let stats = await initRevisionStats();
  const aujourd_hui = AUJOURD_HUI();
  let xpGagne = 0;
  const bonus: string[] = [];

  if (!session.reussi) {
    // Réussi : accréditer XP
    xpGagne = XP_BASE;
    stats.revisionsFaites++;

    // 🔥 BONUS STREAK : révisé hier et aujourd'hui
    if (stats.dernierJour === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
      stats.streak++;
      xpGagne += XP_BONUS_STREAK;
      bonus.push('streak');
    } else if (stats.dernierJour !== aujourd_hui) {
      // Cassé le streak
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
      stats.badges.push('🔥 7 jours de suite!');
    }
    if (stats.streak >= 30 && !stats.milestones.streak30jours) {
      stats.milestones.streak30jours = true;
      stats.badges.push('💪 30 jours de suite!!!');
    }
    if (stats.xpTotal >= 1000 && !stats.milestones['1000XP']) {
      stats.milestones['1000XP'] = true;
      stats.badges.push('👑 1000 XP - Maître!');
    }
  }

  await saveRevisionStats(stats);

  // Envoyer en queue de sync
  await syncQueue.add('create', 'revisions_log', `${await getCurrentUserId()}_${Date.now()}`, {
    exoId: session.exoId,
    dureeS: session.dureeS,
    reussi: session.reussi,
    xpGagne,
    bonus,
    timestamp: new Date().toISOString(),
  });

  return { xpGagne, bonus, newStreak: stats.streak };
}

// ✅ OBTENIR PROGRESSION DU JOUR
export async function getProgressionDuJour(): Promise<{
  revisionsFaites: number;
  xpAujourd_hui: number;
  objectif: number;
  pourcentage: number;
}> {
  const stats = await initRevisionStats();
  const aujourd_hui = AUJOURD_HUI();
  const xpAujourd_hui =
    stats.dernierJour === aujourd_hui
      ? stats.xpTotal - (await getXpHier())
      : 0;

  return {
    revisionsFaites: stats.revisionsFaites,
    xpAujourd_hui,
    objectif: 100, // 100 XP par jour
    pourcentage: Math.min(100, Math.round((xpAujourd_hui / 100) * 100)),
  };
}

private async function getXpHier(): Promise<number> {
  // TODO: Récupérer XP d'hier depuis historique
  return 0;
}

// ✅ ENCOURAGEMENTS DYNAMIQUES
export function getEncouragement(stats: { streak: number; xpTotal: number }): string {
  if (stats.streak === 0) {
    return '🔥 Commence ta série maintenant!';
  } else if (stats.streak < 3) {
    return `🔥 Bonne série! Encore ${3 - stats.streak} jour(s) pour déverrouiller un badge`;
  } else if (stats.streak < 7) {
    return `🔥🔥 ${stats.streak} jours! Fonce vers 7!`;
  } else if (stats.streak < 30) {
    return `🔥🔥🔥 ${stats.streak} jours incroyable! Vise 30!`;
  } else {
    return `👑 INCROYABLE! ${stats.streak} jours - Tu es une LÉGENDE!`;
  }
}

// ✅ CLASSEMENT GLOBAL
export async function getRankingPosition(
  userId: string,
  allStats: { userId: string; xp: number }[]
): Promise<number> {
  const sorted = allStats.sort((a, b) => b.xp - a.xp);
  return sorted.findIndex((s) => s.userId === userId) + 1;
}
