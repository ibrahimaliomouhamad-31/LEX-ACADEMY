// DEVOIRS & ESPACE PROF — Firestore, optimisé pour 150+ élèves :
// - un prof crée un devoir (une liste d'exercices d'un chapitre, niveau choisi)
// - chaque élève rend UNE petite fiche de résultat (1 écriture par élève)
// - le prof lit les résultats d'UN devoir à la fois (≤ ~40 lectures par classe)

import { addDoc, collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export interface Devoir {
  id: string;
  titre: string;
  classe: string;
  matiere: string;
  chapitreId: string;
  chapitreTitre: string;
  nbExercices: number;
  niveauGenerateur: number;
  dateLimite: string;
  profNom: string;
  dateCreation: string;
}

export interface ReponseDevoir {
  devoirId: string;
  eleveNom: string;
  score: number;
  total: number;
  dateISO: string;
}

const CODE_PROF_DEFAUT = 'LEXPROF2026';

/**
 * Vérifie le code prof.
 * 🔒 Le code officiel vit dans Firestore (config/code_prof) et peut être
 * changé par l'admin sans nouvelle version de l'app. Le code par défaut
 * n'est qu'un filet de sécurité si le doc n'existe pas encore.
 */
export async function verifierCodeProf(code: string): Promise<boolean> {
  const saisie = code.trim().toUpperCase();
  if (saisie.length < 4) return false;

  try {
    const snap = await getDoc(doc(db, 'config', 'code_prof'));
    if (snap.exists()) {
      const officiel = String(snap.data().valeur || '').trim().toUpperCase();
      if (officiel) return saisie === officiel;
    }
  } catch {
    // hors-ligne ou doc absent : on compare avec le code par défaut
  }
  return saisie === CODE_PROF_DEFAUT;
}

export async function creerDevoir(d: Omit<Devoir, 'id' | 'dateCreation'>): Promise<string> {
  const ref = await addDoc(collection(db, 'devoirs'), {
    ...d,
    dateCreation: new Date().toISOString(),
  } as unknown as Record<string, unknown>);
  return ref.id;
}

export async function listeDevoirs(classe: string): Promise<Devoir[]> {
  // Un seul where : pas d'index composite requis. Tri côté client.
  const q = query(collection(db, 'devoirs'), where('classe', '==', classe), limit(20));
  const snap = await getDocs(q);
  const resultat: Devoir[] = [];
  snap.forEach((d) => resultat.push({ id: d.id, ...(d.data() as Omit<Devoir, 'id'>) }));
  resultat.sort((a, b) => (a.dateCreation < b.dateCreation ? 1 : -1));
  return resultat;
}

export async function rendreDevoir(r: Omit<ReponseDevoir, 'dateISO'>): Promise<boolean> {
  try {
    await addDoc(collection(db, 'devoir_reponses'), {
      ...r,
      dateISO: new Date().toISOString(),
    } as unknown as Record<string, unknown>);
    return true;
  } catch {
    return false;
  }
}

export async function resultatsDevoir(devoirId: string): Promise<ReponseDevoir[]> {
  const q = query(collection(db, 'devoir_reponses'), where('devoirId', '==', devoirId));
  const snap = await getDocs(q);
  const resultat: ReponseDevoir[] = [];
  snap.forEach((d) => resultat.push(d.data() as ReponseDevoir));
  resultat.sort((a, b) => b.score - a.score);
  return resultat;
}
