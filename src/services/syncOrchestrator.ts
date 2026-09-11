/**
 * 🚦 ORCHESTRATEUR DE SYNCHRONISATION
 *
 * AVANT : quatre files d'attente indépendantes, dont certaines n'étaient
 * JAMAIS vidées :
 *  - `lex_sync_queue`        (syncQueue)        → vidée par un intervalle fantôme
 *  - `lex_file_sync_globale` (objectifs)        → vidée seulement au démarrage de index.tsx
 *  - `lex_signalements_en_attente` (signalements) → idem, seulement au démarrage
 *  - `lex_defi_en_attente`   (defiService)      → ❌ JAMAIS vidée : scores de défis perdus
 *
 * MAINTENANT : un point unique `toutSynchroniser()` appelé :
 *  - au démarrage de l'app,
 *  - à CHAQUE retour de connexion (listener réseau),
 *  - après chaque action réussie.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { syncQueue } from './syncQueue';
import { pousserProgression } from './syncCloud';
import { viderFileSignalements } from './signalementService';
import { synchroniserXp, synchroniserStreak } from './xpLocal';
import { estEnLigneSync, verifierConnexion } from '../utils/reseau';
import { avertirDev, logDev, rapporterErreur } from '../utils/logger';

const CLE_FILE_GLOBALE = 'lex_file_sync_globale';
const CLE_DEFI_EN_ATTENTE = 'lex_defi_en_attente';

interface ElementFileDefi {
  nom: string;
  classe: string;
  score: number;
  tempsS: number;
  date: string;
}

/** Vide la file de scores du Défi du Jour (avant : jamais vidée). */
async function viderDefisEnAttente(): Promise<number> {
  let envoyes = 0;
  try {
    const brut = await AsyncStorage.getItem(CLE_DEFI_EN_ATTENTE);
    if (!brut) return 0;

    const file: ElementFileDefi[] = JSON.parse(brut);
    const restants: ElementFileDefi[] = [];

    for (const d of file) {
      try {
        const userId = (await AsyncStorage.getItem('lex_user_id')) || `local_${d.nom}`;
        await setDoc(doc(db, 'defi_jour', `${d.date}_${userId}`), {
          date: d.date,
          nom: d.nom,
          classe: d.classe,
          score: d.score,
          tempsS: d.tempsS,
        });
        envoyes++;
      } catch {
        restants.push(d); // toujours hors-ligne : on garde
      }
    }

    await AsyncStorage.setItem(CLE_DEFI_EN_ATTENTE, JSON.stringify(restants));
  } catch (error) {
    rapporterErreur('[syncOrchestrator] Erreur défis en attente :', error);
  }
  return envoyes;
}

/** Vide la file globale (défis joués, signalements, devoirs rendus hors-ligne). */
async function viderFileGlobale(): Promise<number> {
  let envoyes = 0;
  try {
    const brut = await AsyncStorage.getItem(CLE_FILE_GLOBALE);
    if (!brut) return 0;

    const file = JSON.parse(brut) as {
      type: 'defi' | 'signalement' | 'devoir';
      donnees: Record<string, unknown>;
    }[];
    const restants: typeof file = [];

    for (const element of file) {
      try {
        if (element.type === 'defi') {
          const d = element.donnees as { date: string; userId: string };
          await setDoc(doc(db, 'defi_jour', `${d.date}_${d.userId}`), element.donnees);
        } else if (element.type === 'signalement') {
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

    // 5) Files diverses : défis du jour, file globale, signalements
    const defis = await viderDefisEnAttente().catch(() => 0);
    const globale = await viderFileGlobale().catch(() => 0);
    await viderFileSignalements();
    resultat.divers = defis + globale;
  } catch (error) {
    rapporterErreur('[syncOrchestrator] Erreur sync globale :', error);
  }

  return resultat;
}
