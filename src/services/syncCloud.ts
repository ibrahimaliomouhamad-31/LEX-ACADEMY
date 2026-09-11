// SYNC CLOUD : sauvegarde automatique de la progression locale sur Firestore.
// Les données personnelles sont séparées par utilisateur.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../config/firebaseConfig';
import { getCurrentUserId, getUserItem, setUserItem } from './userStorage';
import { avertirDev, logDev, rapporterErreur } from '../utils/logger';

// Anciennes clés globales — utilisées uniquement pour la migration.
const ANCIENNE_CLE_STATS = 'lex_stats';
const ANCIENNE_CLE_RESOLUS = 'lex_exos_resolus';
const ANCIENNE_CLE_INFINI = 'lex_infini_stats';
const ANCIENNE_CLE_SRS = 'lex_srs';

// Noms utilisés avec userStorage.
const NOM_STATS = 'stats';
const NOM_RESOLUS = 'exos_resolus';
const NOM_INFINI = 'infini_stats';
const NOM_SRS = 'srs';

interface SnapshotProgression {
  stats: unknown;
  resolus: string[];
  infiniStats: unknown;
  srs: unknown;
  dateISO: string;
}

/**
 * Lit une donnée personnelle.
 * Si elle n'existe pas encore, récupère l'ancienne donnée globale
 * et la migre vers l'utilisateur actuel.
 */
async function lireAvecMigration(
  nom: string,
  ancienneCle: string
): Promise<string | null> {
  try {
    let valeur = await getUserItem(nom);

    if (valeur === null) {
      const ancienneValeur = await AsyncStorage.getItem(ancienneCle);

      if (ancienneValeur !== null) {
        await setUserItem(nom, ancienneValeur);
        valeur = ancienneValeur;
      }
    }

    return valeur;
  } catch {
    return null;
  }
}

async function collecterLocal(): Promise<SnapshotProgression> {
  const stats = await lireAvecMigration(
    NOM_STATS,
    ANCIENNE_CLE_STATS
  );

  const resolus = await lireAvecMigration(
    NOM_RESOLUS,
    ANCIENNE_CLE_RESOLUS
  );

  const infini = await lireAvecMigration(
    NOM_INFINI,
    ANCIENNE_CLE_INFINI
  );

  const srs = await lireAvecMigration(
    NOM_SRS,
    ANCIENNE_CLE_SRS
  );

  let resolusParses: string[] = [];

  try {
    const valeur = resolus ? JSON.parse(resolus) : [];

    resolusParses = Array.isArray(valeur) ? valeur : [];
  } catch {
    resolusParses = [];
  }

  return {
    stats: parseObjetSecurise(stats),
    resolus: resolusParses,
    infiniStats: parseObjetSecurise(infini),
    srs: parseObjetSecurise(srs),
    dateISO: new Date().toISOString(),
  };
}

/** Parse une valeur censée être un objet local corrompu → null sans crash. */
function parseObjetSecurise(brut: string | null): unknown {
  if (!brut) return null;
  try {
    const v: unknown = JSON.parse(brut);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

// Envoie la progression locale vers Firestore.
// 🔄 ANTI-ÉCRASEMENT : avant, ce push écrasait TOUT le doc cloud avec le
// snapshot local — un élève qui rejouait sur un second appareil pouvait
// écraser sa progression du premier. Désormais les exercices résolus sont
// FUSIONNÉS (union) avec le cloud avant l'écriture.
export async function pousserProgression(): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();

    if (!userId) return false;

    const snapshot = await collecterLocal();

    // Fusion avec le cloud existant pour ne rien perdre.
    try {
      const snap = await getDoc(doc(db, 'progression', userId));

      if (snap.exists()) {
        const cloud = snap.data() as Partial<SnapshotProgression>;

        const cloudResolus = Array.isArray(cloud.resolus) ? cloud.resolus : [];
        const union = Array.from(new Set([...cloudResolus, ...snapshot.resolus]));

        if (union.length > snapshot.resolus.length) {
          snapshot.resolus = union;
        }

        // Un champ cloud non-null ne doit pas être écrasé par un local null.
        if (snapshot.stats === null && cloud.stats) snapshot.stats = cloud.stats;
        if (snapshot.infiniStats === null && cloud.infiniStats) snapshot.infiniStats = cloud.infiniStats;
        if (snapshot.srs === null && cloud.srs) snapshot.srs = cloud.srs;
      }
    } catch {
      // hors-ligne : on pousse quand même, Firestore gardera en attente
      // grâce au cache persistant, ou la sync rattrapera plus tard.
    }

    await setDoc(
      doc(db, 'progression', userId),
      snapshot as unknown as Record<string, unknown>,
      { merge: true }
    );

    return true;
  } catch (error) {
    rapporterErreur('[syncCloud] Erreur synchronisation :', error);
    return false;
  }
}

// Restaure la progression cloud si nécessaire.
export async function restaurerProgressionSiVide(): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();

    if (!userId) return false;

    const local = await collecterLocal();

    const localVide =
      local.resolus.length === 0 &&
      local.stats === null &&
      local.infiniStats === null &&
      local.srs === null;

    const snap = await getDoc(doc(db, 'progression', userId));

    // Rien dans le cloud.
    if (!snap.exists()) {
      if (!localVide) {
        await pousserProgression();
      }

      return false;
    }

    const cloud = snap.data() as Partial<SnapshotProgression>;

    const cloudResolus = Array.isArray(cloud.resolus)
      ? cloud.resolus
      : [];

    // Union des exercices résolus.
    const union = Array.from(
      new Set([...cloudResolus, ...local.resolus])
    );

    const reecritures: [string, string][] = [];

    // Stats.
    if (cloud.stats && local.stats === null) {
      reecritures.push([
        NOM_STATS,
        JSON.stringify(cloud.stats),
      ]);
    }

    // Statistiques Infini.
    if (cloud.infiniStats && local.infiniStats === null) {
      reecritures.push([
        NOM_INFINI,
        JSON.stringify(cloud.infiniStats),
      ]);
    }

    // Révisions SRS.
    if (cloud.srs && local.srs === null) {
      reecritures.push([
        NOM_SRS,
        JSON.stringify(cloud.srs),
      ]);
    }

    // Exercices résolus.
    if (union.length > local.resolus.length) {
      reecritures.push([
        NOM_RESOLUS,
        JSON.stringify(union),
      ]);
    }

    // Rien à restaurer : le local est déjà complet.
    if (reecritures.length === 0) {
      await pousserProgression();
      return false;
    }

    // Écriture avec les clés personnelles.
    for (const [nom, valeur] of reecritures) {
      await setUserItem(nom, valeur);
    }

    return true;
  } catch (error) {
    rapporterErreur('[syncCloud] Erreur restauration :', error);
    return false;
  }
}