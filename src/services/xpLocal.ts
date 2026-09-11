/**
 * ⚡ XP & STREAK — LOCAL-FIRST (moteur de motivation 100% hors-ligne)
 *
 * Avant : les XP n'existaient QUE dans Firestore. Hors-ligne (le cas
 * principal des élèves du LEX, jusqu'à 4 jours+), un exercice réussi
 * n'octroyait RIEN : `getDoc`/`updateDoc` jetaient une erreur réseau et la
 * récompense était perdue → démotivation garantie.
 *
 * Maintenant :
 *  1. Chaque XP/streak est écrit IMMÉDIATEMENT dans AsyncStorage → la
 *     récompense est instantanée et visible, même après 4 jours sans wifi.
 *  2. Le delta d'XP non synchronisé est conservé à part.
 *  3. Quand le réseau revient, `synchroniserXp()` pousse le delta avec
 *     `increment()` Firestore (atomique, pas d'écrasement entre appareils).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCurrentUserId } from './userStorage';
import { estEnLigne } from '../utils/reseau';
import { jourLocal } from '../utils/correctifsAudit';
import { avertirDev, logDev, rapporterErreur } from '../utils/logger';

const CLE_XP = 'lex_xp_local'; // { xp: number, xpNonSync: number }
const CLE_STREAK = 'lex_streak_local'; // { streak: number, dernierJour: string }

interface XpLocal {
  xp: number;
  xpNonSync: number;
}

interface StreakLocal {
  streak: number;
  dernierJour: string; // YYYY-MM-DD
}

async function lireXp(): Promise<XpLocal> {
  try {
    const brut = await AsyncStorage.getItem(CLE_XP);
    if (brut) {
      const p = JSON.parse(brut) as Partial<XpLocal>;
      return { xp: Number(p.xp) || 0, xpNonSync: Number(p.xpNonSync) || 0 };
    }
  } catch {
    // données corrompues → on repart de zéro sans crasher
  }
  return { xp: 0, xpNonSync: 0 };
}

async function ecrireXp(xp: XpLocal): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_XP, JSON.stringify(xp));
  } catch (error) {
    rapporterErreur('[xpLocal] Erreur sauvegarde XP :', error);
  }
}

/** Attribue des XP localement. Instantané, fonctionne 100% hors-ligne.
 *  ⚡ Applique automatiquement le booster Double XP s'il est actif.
 */
export async function gagnerXp(montant: number): Promise<number> {
  const facteur = (await boosterDoubleXpActif()) ? 2 : 1;
  const xp = await lireXp();
  const gagne = montant * facteur;
  xp.xp += gagne;
  xp.xpNonSync += gagne;
  await ecrireXp(xp);
  await ajouterXpSemaine(gagne);
  return xp.xp;
}

/** XP total de l'élève (local, toujours dispo hors-ligne). */
export async function lireXpTotal(): Promise<number> {
  return (await lireXp()).xp;
}

/** Combien d'XP attendent d'être poussés vers le cloud. */
export async function lireXpNonSync(): Promise<number> {
  return (await lireXp()).xpNonSync;
}

/** Fusionne le profil cloud avec le local sans jamais perdre d'XP local. */
export async function fusionnerXpCloud(xpCloud: number | undefined | null): Promise<number> {
  const xp = await lireXp();
  if (typeof xpCloud === 'number' && xpCloud > xp.xp) {
    // 🔄 ANTI DOUBLE COMPTAGE : si le cloud connaît déjà AU MOINS tout le
    // travail local (xp cloud >= xp local + delta non sync), le delta a
    // déjà été compté côté serveur → on le remet à zéro, sinon on le
    // garde pour le prochain push.
    if (xpCloud >= xp.xp + xp.xpNonSync) {
      xp.xpNonSync = 0;
    }
    xp.xp = xpCloud;
    await ecrireXp(xp);
  }
  return xp.xp;
}

/**
 * Pousse le delta d'XP non synchronisé vers Firestore.
 * Retourne true si tout est à jour. Sans réseau : no-op sans erreur.
 */
export async function synchroniserXp(): Promise<boolean> {
  const xp = await lireXp();

  if (xp.xpNonSync <= 0) return true;
  if (!(await estEnLigne())) return false;

  try {
    const userId = await getCurrentUserId();
    if (!userId || userId.startsWith('invite')) return false;

    // increment() est atomique côté serveur : aucune perte si l'élève
    // joue depuis un autre appareil pendant la sync.
    await updateDoc(doc(db, 'utilisateurs', userId), {
      xp: increment(xp.xpNonSync),
      xp_derniere_sync: new Date().toISOString(),
    });

    xp.xpNonSync = 0;
    await ecrireXp(xp);
    return true;
  } catch {
    // réseau repris d'assaut / droits insuffisants : on réessaiera plus tard
    return false;
  }
}

// ---------- STREAK (série de jours consécutifs) ----------

function aujourdHui(): string {
  return jourLocal();
}

function hier(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return jourLocal(d);
}

async function lireStreak(): Promise<StreakLocal> {
  try {
    const brut = await AsyncStorage.getItem(CLE_STREAK);
    if (brut) {
      const p = JSON.parse(brut) as Partial<StreakLocal>;
      return { streak: Number(p.streak) || 0, dernierJour: p.dernierJour || '' };
    }
  } catch {
    // ignore
  }
  return { streak: 0, dernierJour: '' };
}

/**
 * Met à jour le streak pour aujourd'hui (une seule fois par jour).
 * 100% local : le streak monte même après 4 jours hors-ligne tant que
 * l'élève revient chaque jour.
 *
 * ❄️ STREAK FREEZE : si l'élève a manqué UN jour mais possède un gel de
 * série (acheté en boutique), la série est préservée au lieu d'être cassée.
 *
 * 🕐 ANTI-HORLOGE : si l'horloge du téléphone a reculé (manipulation ou
 * bug), on ne modifie pas le streak pour cette session — l'élève honnête
 * ne perd rien, le fraudeur ne gagne rien.
 */
export async function validerStreakDuJour(): Promise<number> {
  const s = await lireStreak();
  const jour = aujourdHui();

  if (s.dernierJour === jour) {
    return s.streak; // déjà compté aujourd'hui
  }

  // 🕐 Détection de saut d'horloge en arrière.
  try {
    const dernier = Number(await AsyncStorage.getItem('lex_horloge_derniere') || 0);
    const maintenant = Date.now();
    if (dernier > 0 && maintenant < dernier - 3600_000) {
      // Horloge reculée de plus d'1 h : on n'accumule rien cette fois.
      await AsyncStorage.setItem('lex_horloge_derniere', String(dernier));
      return s.streak;
    }
    await AsyncStorage.setItem('lex_horloge_derniere', String(maintenant));
  } catch {
    // ignore : pas bloquant
  }

  if (s.dernierJour === hier()) {
    s.streak += 1;
  } else if (s.dernierJour === hier2Jours() && (await lireStreakFreezes()) > 0) {
    // ❄️ Un seul jour manqué + gel disponible : la série survit.
    await consommerStreakFreeze();
    s.streak = s.streak; // préservée, aujourd'hui comptera comme retour
    s.dernierJour = hier(); // le gel "couvre" hier
    s.streak += 1;
  } else {
    s.streak = 1; // série cassée (ou première fois) : on repart de 1
  }
  s.dernierJour = jour;

  try {
    await AsyncStorage.setItem(CLE_STREAK, JSON.stringify(s));
  } catch (error) {
    rapporterErreur('[xpLocal] Erreur sauvegarde streak :', error);
  }

  return s.streak;
}

function hier2Jours(): string {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return jourLocal(d);
}

/** Streak affiché localement (sans le modifier). */
export async function lireStreakActuel(): Promise<number> {
  const s = await lireStreak();
  // Streak périmé (rien depuis hier) : on l'affiche tel quel pour ne pas
  // mentir, mais il ne repartira qu'à la prochaine activité.
  return s.streak;
}

/** Pousse le streak local vers le cloud (au retour du réseau). */
export async function synchroniserStreak(): Promise<boolean> {
  if (!(await estEnLigne())) return false;
  try {
    const userId = await getCurrentUserId();
    if (!userId || userId.startsWith('invite')) return false;

    const s = await lireStreak();
    const xpSemaine = await lireXpSemaine();
    await updateDoc(doc(db, 'utilisateurs', userId), {
      streak: s.streak,
      derniere_connexion: s.dernierJour,
      xp_semaine: xpSemaine.xp, // ligues hebdomadaires par classe
      xp_semaine_cle: xpSemaine.cle,
    });
    return true;
  } catch {
    return false;
  }
}

// ---------- ❄️ STREAK FREEZE (protection de série) ----------

const CLE_FREEZES = 'lex_streak_freezes';

/** Nombre de gels de série en possession de l'élève. */
export async function lireStreakFreezes(): Promise<number> {
  try {
    return Number(await AsyncStorage.getItem(CLE_FREEZES)) || 0;
  } catch {
    return 0;
  }
}

/** Crédite des gels (achat boutique). */
export async function ajouterStreakFreezes(n: number): Promise<void> {
  const actuels = await lireStreakFreezes();
  try {
    await AsyncStorage.setItem(CLE_FREEZES, String(Math.min(actuels + n, 5)));
  } catch {
    // ignore
  }
}

async function consommerStreakFreeze(): Promise<void> {
  const actuels = await lireStreakFreezes();
  try {
    await AsyncStorage.setItem(CLE_FREEZES, String(Math.max(0, actuels - 1)));
  } catch {
    // ignore
  }
}

// ---------- ⚡ BOOSTER DOUBLE XP ----------

const CLE_BOOSTER = 'lex_booster_double_xp_fin';

/** Le booster Double XP est-il actif maintenant ? */
export async function boosterDoubleXpActif(): Promise<boolean> {
  try {
    const fin = Number(await AsyncStorage.getItem(CLE_BOOSTER)) || 0;
    return fin > Date.now();
  } catch {
    return false;
  }
}

/** Active le booster Double XP pour 24 h. */
export async function activerBoosterDoubleXp(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_BOOSTER, String(Date.now() + 24 * 3600_000));
  } catch {
    // ignore
  }
}

/** Temps restant du booster (0 si inactif), pour l'affichage. */
export async function boosterTempsRestantMs(): Promise<number> {
  try {
    const fin = Number(await AsyncStorage.getItem(CLE_BOOSTER)) || 0;
    return Math.max(0, fin - Date.now());
  } catch {
    return 0;
  }
}

// ---------- 📅 XP DE LA SEMAINE (ligues hebdo) ----------

const CLE_XP_SEMAINE = 'lex_xp_semaine'; // { cle: '2026-W37', xp: number }

function cleSemaineActuelle(): string {
  const d = new Date();
  const debut = new Date(d.getFullYear(), 0, 1);
  const jours = Math.floor((d.getTime() - debut.getTime()) / 86400000);
  const numSemaine = Math.floor((jours + debut.getDay() + 1) / 7) + 1;
  return `${d.getFullYear()}-W${numSemaine}`;
}

async function lireXpSemaine(): Promise<{ cle: string; xp: number }> {
  try {
    const brut = await AsyncStorage.getItem(CLE_XP_SEMAINE);
    if (brut) {
      const p = JSON.parse(brut) as { cle: string; xp: number };
      if (p.cle === cleSemaineActuelle()) return p;
    }
  } catch {
    // ignore
  }
  return { cle: cleSemaineActuelle(), xp: 0 };
}

async function ajouterXpSemaine(montant: number): Promise<void> {
  const actuel = await lireXpSemaine();
  const nouveau = { cle: cleSemaineActuelle(), xp: actuel.xp + montant };
  try {
    await AsyncStorage.setItem(CLE_XP_SEMAINE, JSON.stringify(nouveau));
  } catch {
    // ignore
  }
}

/** XP de l'élève pour la semaine en cours (classement hebdo). */
export async function lireXpSemaineActuelle(): Promise<number> {
  return (await lireXpSemaine()).xp;
}
