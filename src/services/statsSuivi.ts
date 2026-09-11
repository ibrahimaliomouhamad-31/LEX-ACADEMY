// SUIVI DES STATISTIQUES D'APPRENTISSAGE
// Données personnelles séparées par utilisateur.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserItem, setUserItem } from './userStorage';
import { jourLocal } from '../utils/correctifsAudit';
import { avertirDev, logDev, rapporterErreur } from '../utils/logger';

// Anciennes clés globales — utilisées uniquement pour la migration.
const ANCIENNE_CLE_STATS = 'lex_stats';
const ANCIENNE_CLE_CREDITS = 'lex_credits';

const NOM_STATS = 'stats';
const NOM_CREDITS = 'credits';

export interface TentativeExo {
  total: number;
  reussis: number;
}

export interface StatsChapitre {
  total: number;
  reussis: number;
  parDifficulte: { [diff: number]: TentativeExo };
}

export interface LexStats {
  tentatives: { [exoId: string]: TentativeExo };
  chapitres: { [chapitreId: string]: StatsChapitre };
  activiteJour: { [dateISO: string]: number };
  totalTentes: number;
  totalReussis: number;
}

function statsVierges(): LexStats {
  return {
    tentatives: {},
    chapitres: {},
    activiteJour: {},
    totalTentes: 0,
    totalReussis: 0,
  };
}

export function aujourdHui(): string {
  return jourLocal();
}

/**
 * Lit les statistiques personnelles.
 * Si l'utilisateur n'a pas encore été migré, récupère les anciennes données
 * globales une seule fois.
 */
export async function getStats(): Promise<LexStats> {
  try {
    let brut = await getUserItem(NOM_STATS);

    if (!brut) {
      const ancien = await AsyncStorage.getItem(ANCIENNE_CLE_STATS);

      if (ancien) {
        await setUserItem(NOM_STATS, ancien);
        brut = ancien;
      }
    }

    if (!brut) return statsVierges();

    const s = JSON.parse(brut) as LexStats;
    return { ...statsVierges(), ...s };
  } catch {
    return statsVierges();
  }
}

async function setStats(s: LexStats): Promise<void> {
  try {
    await setUserItem(NOM_STATS, JSON.stringify(s));
  } catch (error) {
    rapporterErreur('[statsSuivi] Erreur sauvegarde :', error);
  }
}

async function getCreditsBruts(): Promise<number> {
  try {
    let brut = await getUserItem(NOM_CREDITS);

    if (brut === null) {
      const ancien = await AsyncStorage.getItem(ANCIENNE_CLE_CREDITS);

      if (ancien !== null) {
        await setUserItem(NOM_CREDITS, ancien);
        brut = ancien;
      }
    }

    return parseInt(brut || '0', 10) || 0;
  } catch {
    return 0;
  }
}

async function setCredits(montant: number): Promise<void> {
  await setUserItem(NOM_CREDITS, String(Math.max(0, montant)));
}

// À appeler à CHAQUE vérification de réponse.
export async function enregistrerTentative(
  exo: { id: string; chapitre_id?: string; difficulte?: number | string },
  succes: boolean
): Promise<void> {
  const s = await getStats();

  const diff = Math.max(1, Math.min(3, Number(exo.difficulte) || 1));

  // Par exercice
  const t = s.tentatives[exo.id] || { total: 0, reussis: 0 };
  t.total += 1;

  if (succes) t.reussis += 1;

  s.tentatives[exo.id] = t;

  // Par chapitre
  if (exo.chapitre_id) {
    const c = s.chapitres[exo.chapitre_id] || {
      total: 0,
      reussis: 0,
      parDifficulte: {},
    };

    c.total += 1;

    if (succes) c.reussis += 1;

    const d = c.parDifficulte[diff] || { total: 0, reussis: 0 };

    d.total += 1;

    if (succes) d.reussis += 1;

    c.parDifficulte[diff] = d;
    s.chapitres[exo.chapitre_id] = c;
  }

  // Totaux + activité du jour
  s.totalTentes += 1;

  if (succes) s.totalReussis += 1;

  const jour = aujourdHui();
  s.activiteJour[jour] = (s.activiteJour[jour] || 0) + 1;

  await setStats(s);

  // +5 crédits par bonne réponse
  if (succes) {
    const actuel = await getCreditsBruts();
    await setCredits(actuel + 5);
  }
}

export async function getCredits(): Promise<number> {
  return getCreditsBruts();
}

export async function depenserCredits(montant: number): Promise<boolean> {
  if (!Number.isFinite(montant) || montant <= 0) return false;

  const actuel = await getCredits();

  if (actuel < montant) return false;

  await setCredits(actuel - montant);
  return true;
}

export function tauxMaitrise(c: StatsChapitre | undefined): number {
  if (!c || c.total === 0) return 0;

  return Math.round((c.reussis / c.total) * 100);
}

export function niveauMaitrise(
  c: StatsChapitre | undefined
): { label: string; couleur: string; taux: number } {
  const taux = tauxMaitrise(c);

  if (c === undefined || c.total < 3) {
    return { label: 'Non commencé', couleur: '#64748B', taux };
  }

  if (taux < 40) {
    return { label: '🔴 Faible', couleur: '#EF4444', taux };
  }

  if (taux < 70) {
    return { label: '🟡 Moyen', couleur: '#FBBF24', taux };
  }

  return { label: '🟢 Maîtrisé', couleur: '#10B981', taux };
}

// 7 derniers jours pour le graphique d'activité
export function activite7Jours(
  stats: LexStats
): { jour: string; nb: number }[] {
  const resultat: { jour: string; nb: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();

    d.setDate(d.getDate() - i);

    const cle = jourLocal(d);

    resultat.push({
      jour: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()],
      nb: stats.activiteJour[cle] || 0,
    });
  }

  return resultat;
}

export async function reinitialiserStats(): Promise<void> {
  await setUserItem(NOM_STATS, JSON.stringify(statsVierges()));
}
