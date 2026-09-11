// DÉFI DU JOUR — le même défi pour toute la classe, change chaque jour.
// Déterministe : la graine vient de (date + classe) ⟹ tous les élèves de la
// classe ont exactement les mêmes questions. 100% hors-ligne pour jouer ;
// le classement se synchronise quand le wifi revient.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { genererExerciceSeede, type ExoGenere } from './generateurLocal';
import { jourLocal, parseTableauJSON } from '../utils/correctifsAudit';

const NB_QUESTIONS = 3;

function graineDuJour(classe: string): number {
  // 🛡️ AUDIT : jour LOCAL (pas UTC) — sinon à Niamey (UTC+1), entre 00h et
  // 01h locales, la graine change déjà : les élèves n'auraient PAS LE MÊME
  // défi au même moment, cassant la promesse « le même défi pour la classe ».
  const jour = jourLocal(); // YYYY-MM-DD local
  let h = 2166136261;
  const s = `${jour}|${classe}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// La matière tourne selon le jour de la semaine : Lun=Maths, Mar=PC, Mer=Maths...
export function matiereDuJour(): string {
  const jours = ['Physique-Chimie', 'Mathématiques', 'Mathématiques', 'Physique-Chimie', 'Mathématiques', 'Physique-Chimie', 'Mathématiques'];
  return jours[new Date().getDay()];
}

const SUJETS_DEFI: { matiere: string; titres: string[] }[] = [
  { matiere: 'Mathématiques', titres: ['Équations et calcul', 'Suites numériques', 'Dérivation', 'Probabilités', 'Arithmétique et PGCD', 'Puissances et radicaux', 'Second degré'] },
  { matiere: 'Physique-Chimie', titres: ["Électricité : loi d'Ohm", 'Mécanique : mouvement et vitesse', 'Chimie : solutions et concentration', 'Énergie cinétique'] },
];

export function defiDuJour(classe: string): ExoGenere[] {
  const graine = graineDuJour(classe);
  const matiere = matiereDuJour();
  const sujets = SUJETS_DEFI.find((s) => s.matiere === matiere) || SUJETS_DEFI[0];
  const exos: ExoGenere[] = [];
  for (let i = 0; i < NB_QUESTIONS; i++) {
    const titre = sujets.titres[(graine + i * 7) % sujets.titres.length];
    exos.push(genererExerciceSeede(`defi_${matiere}`, titre, 30 + ((graine + i * 13) % 40), graine + i));
  }
  return exos;
}

export interface EntreeClassementDefi {
  nom: string;
  classe: string;
  score: number;
  tempsS: number;
}

export async function envoyerScoreDefi(nom: string, classe: string, score: number, tempsS: number): Promise<boolean> {
  const jour = jourLocal();
  try {
    const userId = (await AsyncStorage.getItem('lex_user_id')) || `local_${Date.now()}`;
    await setDoc(doc(db, 'defi_jour', `${jour}_${userId}`), {
      date: jour, nom, classe, score, tempsS,
    } as unknown as EntreeClassementDefi);
    return true;
  } catch {
    // Hors-ligne : on met en file d'attente pour l'envoi au prochain wifi
    try {
      const brut = await AsyncStorage.getItem('lex_defi_en_attente');
      // 🛡️ AUDIT : parseTableauJSON → jamais de .push sur un objet corrompu.
      const file = parseTableauJSON(brut);
      file.push({ nom, classe, score, tempsS, date: jour });
      await AsyncStorage.setItem('lex_defi_en_attente', JSON.stringify(file));
    } catch {
      // ignore
    }
    return false;
  }
}

// Renvoie les scores du jour si en ligne (max 30), sinon null
export async function classementDuJour(classe: string): Promise<EntreeClassementDefi[] | null> {
  try {
    const jour = jourLocal();
    // Un seul where : pas d'index composite requis. Filtre classe côté client.
    const q = query(collection(db, 'defi_jour'), where('date', '==', jour), limit(200));
    const snap = await getDocs(q);
    const resultats: EntreeClassementDefi[] = [];
    snap.forEach((d) => {
      const donnees = d.data() as EntreeClassementDefi;
      if (donnees.classe === classe) resultats.push(donnees);
    });
    resultats.sort((a, b) => b.score - a.score || a.tempsS - b.tempsS);
    return resultats.slice(0, 30);
  } catch {
    return null;
  }
}
