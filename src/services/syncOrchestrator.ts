/**
 * 🚦 ORCHESTRATEUR DE SYNCHRONISATION
 *
 * AVANT : quatre files d'attente indépendantes, dont certaines n'étaient
 * JAMAIS vidées :
 *  - `lex_sync_queue`        (syncQueue)        → vidée par un intervalle fantôme
 *  - `lex_file_sync_globale` (objectifs)        → vidée seulement au démarrage de index.tsx
 *  - `lex_signalements_en_attente` (signalements) → idem, seulement au démarrage
 *
 * MAINTENANT : un point unique `toutSynchroniser()` appelé :
 *  - au démarrage de l'app,
 *  - à CHAQUE retour de connexion (listener réseau),
 *  - après chaque action réussie.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { syncQueue } from './syncQueue';
import { pousserProgression } from './syncCloud';
import { viderFileSignalements } from './signalementService';
import { synchroniserXp, synchroniserStreak } from './xpLocal';
import { publierMonProfilPublic } from './classementPublic';
import { estEnLigneSync, verifierConnexion } from '../utils/reseau';
import { rapporterErreur } from '../utils/logger';

const CLE_FILE_GLOBALE = 'lex_file_sync_globale';

/** Vide la file globale (signalements, devoirs rendus hors-ligne). */

/** Vide la file globale (défis joués, signalements, devoirs rendus hors-ligne). */
async function viderFileGlobale(): Promise<number> {
  let envoyes = 0;
  try {
    const brut = await AsyncStorage.getItem(CLE_FILE_GLOBALE);
    if (!brut) return 0;

    const file = JSON.parse(brut) as {
      type: 'signalement' | 'devoir';
      donnees: Record<string, unknown>;
    }[];
    const restants: typeof file = [];

    for (const element of file) {
      try {
        if (element.type === 'signalement') {
          await addDoc(collection(db, 'signalements'), element.donnees);
        } else if (element.type === 'devoir') {
          await addDoc(collection(db, 'devoir_reponses'), element.donnees);
        }
        envoyes++;
      } catch {
        restants.push(element);
      }
    }

    await AsyncStorage.setItem(CLE_FILE_GLOBALE, JSON.stringify(restants));
  } catch (error) {
    rapporterErreur('[syncOrchestrator] Erreur file globale :', error);
  }
  return envoyes;
}

export interface ResultatSync {
  enLigne: boolean;
  file: number;
  xp: boolean;
  streak: boolean;
  progression: boolean;
  divers: number;
}

/**
 * À appeler au démarrage ET à chaque retour du réseau.
 * 100% tolérant aux pannes : ne throw jamais.
 */
export async function toutSynchroniser(): Promise<ResultatSync> {
  const resultat: ResultatSync = {
    enLigne: false,
    file: 0,
    xp: false,
    streak: false,
    progression: false,
    divers: 0,
  };

  try {
    resultat.enLigne = await verifierConnexion();
    if (!estEnLigneSync()) return resultat;

    // 1) File principale (XP, streaks, logs de révisions, rôles…)
    const r = await syncQueue.flush().catch(() => ({ synced: 0, failed: 0 }));
    resultat.file = r.synced;

    // 2) XP non synchronisés (delta atomique)
    resultat.xp = await synchroniserXp();

    // 3) Streak
    resultat.streak = await synchroniserStreak();

    // 4) Progression pédagogique (stats, SRS, exos résolus)
    resultat.progression = await pousserProgression();

    // 5) Files diverses : file globale, signalements
    const globale = await viderFileGlobale().catch(() => 0);
    await viderFileSignalements();
    resultat.divers = globale;

    // 6) 🏆 Miroir du classement : republie ma fiche publique avec l'XP à jour.
    //    ⚠️ Indispensable : sans la Cloud Function (plan Spark), c'est la SEULE
    //    façon d'alimenter `classement_public`. Best-effort, jamais bloquant.
    await publierMonProfilPublic();
  } catch (error) {
    rapporterErreur('[syncOrchestrator] Erreur sync globale :', error);
  }

  return resultat;
}
