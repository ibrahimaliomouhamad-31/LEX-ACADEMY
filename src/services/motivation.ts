// MOTIVATION : badges, quêtes hebdomadaires et ligues.
// 100% hors-ligne : tout se calcule depuis les données locales de l'élève.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ContexteBadges {
  exosResolus: number; // exercices officiels résolus
  infiniTotal: number; // exercices générés résolus
  qcmRecord: number; // record QCM éclair
  chapitresTelecharges: number; // chapitres en cache
  flashcardsRevues: number; // decks de flashcards faits
  bacsBlancs: number; // bacs blancs terminés
}

export async function chargerContexte(): Promise<ContexteBadges> {
  const ctx: ContexteBadges = {
    exosResolus: 0,
    infiniTotal: 0,
    qcmRecord: 0,
    chapitresTelecharges: 0,
    flashcardsRevues: 0,
    bacsBlancs: 0,
  };
  try {
    const resolus = await AsyncStorage.getItem('lex_exos_resolus');
    if (resolus) ctx.exosResolus = (JSON.parse(resolus) as string[]).length;

    const infini = await AsyncStorage.getItem('lex_infini_stats');
    if (infini) {
      const s = JSON.parse(infini) as { [k: string]: number };
      ctx.infiniTotal = Object.values(s).reduce((a, b) => a + b, 0);
    }

    const qcm = await AsyncStorage.getItem('lex_qcm_meilleur');
    if (qcm) ctx.qcmRecord = parseInt(qcm, 10) || 0;

    const cles = await AsyncStorage.getAllKeys();
    ctx.chapitresTelecharges = cles.filter((k) => k.startsWith('lex_cache_')).length;

    const fc = await AsyncStorage.getItem('lex_flashcards_scores');
    if (fc) ctx.flashcardsRevues = Object.keys(JSON.parse(fc)).length;

    const bb = await AsyncStorage.getItem('lex_bac_blanc_scores');
    if (bb) ctx.bacsBlancs = (JSON.parse(bb) as unknown[]).length;
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
  { id: 'bac_1', titre: 'Candidat', emoji: '📝', description: 'Terminer 1 BAC blanc', objectif: 1, mesurer: (c) => c.bacsBlancs },
  { id: 'bac_5', titre: 'Vétéran du BAC', emoji: '🎓', description: 'Terminer 5 BAC blancs', objectif: 5, mesurer: (c) => c.bacsBlancs },
  { id: 'tous_terrains', titre: 'Tous Terrains', emoji: '🌟', description: 'Faire au moins 1 de chaque activité (exo, infini, QCM, flashcards, BAC)', objectif: 5, mesurer: (c) => [c.exosResolus > 0, c.infiniTotal > 0, c.qcmRecord > 0, c.flashcardsRevues > 0, c.bacsBlancs > 0].filter(Boolean).length },
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

// --- Quêtes hebdomadaires (déterministes : mêmes pour toute la semaine) ---
export interface Quete {
  id: string;
  titre: string;
  emoji: string;
  objectif: number;
  mesurer: (ctx: ContexteBadges) => number;
}

const TOUTES_QUETES: Quete[] = [
  { id: 'q_exos_10', titre: 'Résous 10 exercices officiels', emoji: '✍️', objectif: 10, mesurer: (c) => c.exosResolus },
  { id: 'q_infini_30', titre: 'Fais 30 exercices infinis', emoji: '♾️', objectif: 30, mesurer: (c) => c.infiniTotal },
  { id: 'q_qcm_5', titre: 'Atteins 5 au QCM Éclair', emoji: '⚡', objectif: 5, mesurer: (c) => c.qcmRecord },
  { id: 'q_flash_2', titre: 'Révise 2 decks de flashcards', emoji: '🃏', objectif: 2, mesurer: (c) => c.flashcardsRevues },
  { id: 'q_bac_1', titre: 'Termine un BAC blanc', emoji: '📝', objectif: 1, mesurer: (c) => c.bacsBlancs },
  { id: 'q_tel_3', titre: 'Télécharge 3 chapitres', emoji: '📥', objectif: 3, mesurer: (c) => c.chapitresTelecharges },
];

function numeroSemaine(): number {
  const d = new Date();
  const debut = new Date(d.getFullYear(), 0, 1);
  const jours = Math.floor((d.getTime() - debut.getTime()) / 86400000);
  return Math.floor((jours + debut.getDay() + 1) / 7) + d.getFullYear() * 100;
}

export function quetesDeLaSemaine(): Quete[] {
  const graine = numeroSemaine();
  const pool = [...TOUTES_QUETES];
  const choisies: Quete[] = [];
  let h = graine;
  while (choisies.length < 3 && pool.length > 0) {
    h = (h * 1103515245 + 12345) >>> 0;
    const i = h % pool.length;
    choisies.push(pool.splice(i, 1)[0]);
  }
  return choisies;
}
