// SIGNALEMENT D'ERREUR : les élèves signalent un exercice faux ou mal formulé.
// En ligne : envoyé directement dans Firestore. Hors-ligne : file d'attente
// locale vidée au prochain lancement connecté.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const CLE_FILE = 'lex_signalements_en_attente';

export interface Signalement {
  exoId: string;
  raison: string;
  dateISO: string;
  userId: string | null;
}

export async function signalerExercice(exoId: string, raison: string): Promise<boolean> {
  const userId = await AsyncStorage.getItem('lex_user_id').catch(() => null);
  const signalement: Signalement = {
    exoId,
    raison,
    dateISO: new Date().toISOString(),
    userId,
  };
  try {
    await addDoc(collection(db, 'signalements'), signalement as unknown as Record<string, unknown>);
    return true;
  } catch {
    try {
      const brut = await AsyncStorage.getItem(CLE_FILE);
      const file: Signalement[] = brut ? JSON.parse(brut) : [];
      file.push(signalement);
      await AsyncStorage.setItem(CLE_FILE, JSON.stringify(file));
    } catch {
      // même le stockage local échoue : tant pis
    }
    return false;
  }
}

// À appeler au démarrage : envoie les signalements mis en attente hors-ligne
export async function viderFileSignalements(): Promise<void> {
  try {
    const brut = await AsyncStorage.getItem(CLE_FILE);
    if (!brut) return;
    const file: Signalement[] = JSON.parse(brut);
    if (file.length === 0) return;
    const restants: Signalement[] = [];
    for (const s of file) {
      try {
        await addDoc(collection(db, 'signalements'), s as unknown as Record<string, unknown>);
      } catch {
        restants.push(s);
      }
    }
    await AsyncStorage.setItem(CLE_FILE, JSON.stringify(restants));
  } catch {
    // ignore
  }
}
