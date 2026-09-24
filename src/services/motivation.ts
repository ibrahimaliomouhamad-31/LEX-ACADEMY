// MOTIVATION : badges et ligues.
// 100% hors-ligne : tout se calcule depuis les données locales de l'élève.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getUserItem } from './userStorage';

export interface ContexteBadges {
  exosResolus: number; // exercices officiels résolus
  infiniTotal: number; // exercices générés résolus
  qcmRecord: number; // record QCM éclair
  chapitresTelecharges: number; // chapitres en cache
  flashcardsRevues: number; // decks de flashcards faits
}

export async function chargerContexte(): Promise<ContexteBadges> {
  const ctx: ContexteBadges = {
    exosResolus: 0,
    infiniTotal: 0,
    qcmRecord: 0,
    chapitresTelecharges: 0,
    flashcardsRevues: 0,
  };
  try {
    // 🔄 BUG CORRIGÉ : ce service lisait les ANCIENNES clés globales
    // ('lex_exos_resolus', etc.) alors que les données sont stockées par
    // utilisateur depuis la migration (lex_user_<UID>_...). Résultat :
    // badges et quêtes affichaient 0 pour les élèves migrés. On lit les
    // clés utilisateur, avec repli sur l'ancienne clé globale.
    const [resolus, infini, qcm, fc] = await Promise.all([
      getUserItem('exos_resolus'),
      getUserItem('infini_stats'),
      getUserItem('qcm_meilleur'),
      getUserItem('flashcards_scores'),
    ]);

    const resolusBrut = resolus ?? (await AsyncStorage.getItem('lex_exos_resolus'));
    if (resolusBrut) {
      const liste = JSON.parse(resolusBrut);
      ctx.exosResolus = Array.isArray(liste) ? liste.length : 0;
    }

    const infiniBrut = infini ?? (await AsyncStorage.getItem('lex_infini_stats'));
    if (infiniBrut) {
      const s: unknown = JSON.parse(infiniBrut);
      ctx.infiniTotal = s && typeof s === 'object' && !Array.isArray(s)
        ? Object.values(s as Record<string, number>).reduce((a, b) => a + Number(b || 0), 0)
        : 0;
    }

    const qcmBrut = qcm ?? (await AsyncStorage.getItem('lex_qcm_meilleur'));
    if (qcmBrut) ctx.qcmRecord = parseInt(qcmBrut, 10) || 0;

    const cles = await AsyncStorage.getAllKeys();
    ctx.chapitresTelecharges = cles.filter((k) => k.startsWith('lex_cache_')).length;

    const fcBrut = fc ?? (await AsyncStorage.getItem('lex_flashcards_scores'));
    if (fcBrut) {
      const obj = JSON.parse(fcBrut);
      ctx.flashcardsRevues = obj && typeof obj === 'object' ? Object.keys(obj).length : 0;
    }

  } catch {
    // valeurs par défaut
  }
  return ctx;
}

export interface BadgeDef {
  id: string;
  titre: string;
  emoji: string;
  description: string;
  objectif: number;
  mesurer: (ctx: ContexteBadges) => number;
}

export const BADGES: BadgeDef[] = [
  { id: 'premier_pas', titre: 'Premier Pas', emoji: '👣', description: 'Résoudre 1 exercice officiel', objectif: 1, mesurer: (c) => c.exosResolus },
  { id: 'dix_exos', titre: 'En Forme', emoji: '🔥', description: 'Résoudre 10 exercices officiels', objectif: 10, mesurer: (c) => c.exosResolus },
  { id: 'cinquante_exos', titre: 'Travailleur', emoji: '💪', description: 'Résoudre 50 exercices officiels', objectif: 50, mesurer: (c) => c.exosResolus },
  { id: 'cent_exos', titre: 'Bête de Somme', emoji: '🐎', description: 'Résoudre 100 exercices officiels', objectif: 100, mesurer: (c) => c.exosResolus },
  { id: 'cinq_cents', titre: 'Machine de Guerre', emoji: '🏆', description: 'Résoudre 500 exercices officiels', objectif: 500, mesurer: (c) => c.exosResolus },
  { id: 'infini_cent', titre: 'Sans Fin', emoji: '♾️', description: 'Résoudre 100 exercices générés', objectif: 100, mesurer: (c) => c.infiniTotal },
  { id: 'infini_mille', titre: 'Cerveau d\'Or', emoji: '🧠', description: 'Résoudre 1000 exercices générés', objectif: 1000, mesurer: (c) => c.infiniTotal },
  { id: 'qcm_5', titre: 'Éclair', emoji: '⚡', description: 'Score de 5 au QCM Éclair', objectif: 5, mesurer: (c) => c.qcmRecord },
  { id: 'qcm_10', titre: 'Foudroyant', emoji: '🌩️', description: 'Score de 10 au QCM Éclair', objectif: 10, mesurer: (c) => c.qcmRecord },
  { id: 'hors_ligne_5', titre: 'Prévoyant', emoji: '📱', description: 'Télécharger 5 chapitres', objectif: 5, mesurer: (c) => c.chapitresTelecharges },
  { id: 'hors_ligne_15', titre: 'Survivaliste', emoji: '🎒', description: 'Télécharger 15 chapitres', objectif: 15, mesurer: (c) => c.chapitresTelecharges },
  { id: 'flash_3', titre: 'Mémoire Vive', emoji: '🃏', description: 'Réviser 3 decks de flashcards', objectif: 3, mesurer: (c) => c.flashcardsRevues },
  { id: 'tous_terrains', titre: 'Tous Terrains', emoji: '🌟', description: 'Faire au moins 1 de chaque activité (exo, infini, QCM, flashcards)', objectif: 4, mesurer: (c) => [c.exosResolus > 0, c.infiniTotal > 0, c.qcmRecord > 0, c.flashcardsRevues > 0].filter(Boolean).length },
];

export function evaluerBadges(ctx: ContexteBadges): { badge: BadgeDef; progres: number; debloque: boolean }[] {
  return BADGES.map((badge) => {
    const progres = Math.min(badge.mesurer(ctx), badge.objectif);
    return { badge, progres, debloque: progres >= badge.objectif };
  });
}

// --- Ligues ---
export interface Ligue {
  nom: string;
  emoji: string;
  min: number;
}

const LIGUES: Ligue[] = [
  { nom: 'Bronze', emoji: '🥉', min: 0 },
  { nom: 'Argent', emoji: '🥈', min: 500 },
  { nom: 'Or', emoji: '🥇', min: 1500 },
  { nom: 'Platine', emoji: '💎', min: 3000 },
  { nom: 'Diamant', emoji: '💠', min: 6000 },
  { nom: 'Légende', emoji: '👑', min: 10000 },
];

export function liguePourXp(xp: number): { nom: string; emoji: string; min: number; prochainPalier: number | null } {
  let actuelle = LIGUES[0];
  for (const l of LIGUES) {
    if (xp >= l.min) actuelle = l;
  }
  const idx = LIGUES.indexOf(actuelle);
  const suivante = idx < LIGUES.length - 1 ? LIGUES[idx + 1] : null;
  return {
    nom: actuelle.nom,
    emoji: actuelle.emoji,
    min: actuelle.min,
    prochainPalier: suivante ? suivante.min : null,
  };
}
