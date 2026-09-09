/**
 * 📥 PRÉ-TÉLÉCHARGEMENT AUTOMATIQUE DES CHAPITRES
 *
 * Le point faible du cache manuel : il faut y PENSER avant de perdre le wifi.
 * Ce service télécharge automatiquement, dès que l'app ouvre avec une
 * connexion, les cours + exercices de la classe de l'élève (une fois par
 * jour max) → l'élève est toujours prêt pour 4 jours hors-ligne, sans y
 * penser. 100% transparent et tolérant aux pannes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { saveCours, saveExercices, type Exercice } from './cacheHorsLigne';
import { estEnLigneSync } from '../utils/reseau';

const CLE_DERNIER_AUTO = 'lex_dernier_pretelechargement';
const MAX_COURS = 30;
const MAX_EXOS = 200;
const INTERVALLE_MS = 20 * 60 * 60 * 1000; // 1×/jour max

/** Classe de l'élève : mémoire locale d'abord, profil cloud en secours. */
async function classeEleve(userId: string | null): Promise<string> {
  const locale = await AsyncStorage.getItem('lex_classe_actuelle');
  if (locale) return locale;

  if (!userId) return '';
  try {
    const snap = await getDoc(doc(db, 'utilisateurs', userId));
    const classe = String(snap.data()?.classe || '');
    if (classe) await AsyncStorage.setItem('lex_classe_actuelle', classe);
    return classe;
  } catch {
    return '';
  }
}

export interface ResultatPreTelechargement {
  cours: number;
  chapitres: number;
  fait: boolean;
  raison?: string;
}

/**
 * À appeler au démarrage (best-effort, jamais bloquant).
 * Télécharge cours + exercices de la classe → cache hors-ligne.
 */
export async function telechargerChapitresAuto(): Promise<ResultatPreTelechargement> {
  const resultat: ResultatPreTelechargement = { cours: 0, chapitres: 0, fait: false };

  try {
    if (!estEnLigneSync()) {
      resultat.raison = 'hors-ligne';
      return resultat;
    }

    // Une fois par jour max (pas de spam au démarrage).
    const dernier = await AsyncStorage.getItem(CLE_DERNIER_AUTO);
    if (dernier && Date.now() - Number(dernier) < INTERVALLE_MS) {
      resultat.raison = 'deja-fait-aujourdhui';
      return resultat;
    }

    const userId = await AsyncStorage.getItem('lex_user_id');
    const classe = await classeEleve(userId);
    if (!classe) {
      resultat.raison = 'classe-inconnue';
      return resultat;
    }

    // 1) Cours de la classe → cache
    try {
      const qCours = query(collection(db, 'cours'), where('classe', '==', classe), limit(MAX_COURS));
      const snapCours = await getDocs(qCours);
      snapCours.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        saveCours({
          id: d.id,
          titre: String(data.titre ?? ''),
          theorie: data.theorie ? String(data.theorie) : undefined,
          methode_content: data.methode_content ? String(data.methode_content) : undefined,
          matiere: data.matiere ? String(data.matiere) : undefined,
          classe,
        });
        resultat.cours++;
      });
    } catch {
      // cours indispo : les exercices peuvent marcher quand même
    }

    // 2) Exercices de la classe → groupés par chapitre → cache
    try {
      const qExos = query(collection(db, 'exercices'), where('classe', '==', classe), limit(MAX_EXOS));
      const snapExos = await getDocs(qExos);
      const parChapitre = new Map<string, Exercice[]>();

      snapExos.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const chapitreId = String(data.chapitre_id ?? '');
        if (!chapitreId) return;
        const exo: Exercice = {
          id: d.id,
          classe,
          matiere: String(data.matiere ?? ''),
          chapitre: String(data.chapitre ?? ''),
          chapitre_id: chapitreId,
          difficulte: String(data.difficulte ?? '1'),
          enonce: String(data.enonce ?? ''),
          bonne_reponse: String(data.bonne_reponse ?? ''),
          indice1: data.indice1 ? String(data.indice1) : undefined,
          indice2: data.indice2 ? String(data.indice2) : undefined,
          explication: data.explication ? String(data.explication) : undefined,
        };
        const liste = parChapitre.get(chapitreId) || [];
        liste.push(exo);
        parChapitre.set(chapitreId, liste);
      });

      for (const [chapitreId, exercices] of parChapitre) {
        await saveExercices(chapitreId, exercices);
        resultat.chapitres++;
      }
    } catch {
      // exercices indispo
    }

    await AsyncStorage.setItem(CLE_DERNIER_AUTO, String(Date.now()));
    resultat.fait = resultat.cours > 0 || resultat.chapitres > 0;
    if (!resultat.fait) resultat.raison = 'rien-a-telecharger';
    return resultat;
  } catch (error) {
    console.error('[telechargementAuto] Erreur :', error);
    resultat.raison = 'erreur';
    return resultat;
  }
}