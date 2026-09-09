// OBJECTIFS PERSONNELS — Firestore, 100% élève :
// - l'élève se fixe ses propres objectifs de révision
// - chaque objectif = un chapitre + un nombre d'exercices + un niveau
// - l'élève suit sa propre progression, sans aucun prof

import { addDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export interface ObjectifPersonnel {
  id: string;
  eleveNom: string;
  eleveId: string;
  titre: string;
  classe: string;
  matiere: string;
  chapitreId: string;
  chapitreTitre: string;
  nbExercices: number;
  niveauGenerateur: number;
  dateLimite: string;
  dateCreation: string;
  complete: boolean;
  scoreFinal?: number;
}

export interface ReponseObjectif {
  objectifId: string;
  eleveNom: string;
  eleveId: string;
  score: number;
  total: number;
  dateISO: string;
}

/**
 * Crée un objectif personnel pour l'élève.
 * L'élève se fixe lui-même ses buts de révision.
 */
export async function creerObjectif(d: Omit<ObjectifPersonnel, 'id' | 'dateCreation' | 'complete'>): Promise<string> {
  const ref = await addDoc(collection(db, 'objectifs_personnels'), {
    ...d,
    dateCreation: new Date().toISOString(),
    complete: false,
  } as unknown as Record<string, unknown>);
  return ref.id;
}

/**
 * Liste les objectifs personnels d'un élève.
 */
export async function listeObjectifs(eleveId: string): Promise<ObjectifPersonnel[]> {
  const q = query(collection(db, 'objectifs_personnels'), where('eleveId', '==', eleveId), limit(50));
  const snap = await getDocs(q);
  const resultat: ObjectifPersonnel[] = [];
  snap.forEach((d) => resultat.push({ id: d.id, ...(d.data() as Omit<ObjectifPersonnel, 'id'>) }));
  resultat.sort((a, b) => (a.dateCreation < b.dateCreation ? 1 : -1));
  return resultat;
}

/**
 * Marque un objectif comme complet avec le score final.
 */
export async function completerObjectif(objectifId: string, score: number, total: number): Promise<boolean> {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'objectifs_personnels', objectifId), {
      complete: true,
      scoreFinal: Math.round((score / Math.max(total, 1)) * 100),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Enregistre le résultat d'un objectif personnel (local + cloud).
 */
export async function enregistrerResultat(r: Omit<ReponseObjectif, 'dateISO'>): Promise<boolean> {
  try {
    await addDoc(collection(db, 'resultats_objectifs'), {
      ...r,
      dateISO: new Date().toISOString(),
    } as unknown as Record<string, unknown>);
    return true;
  } catch {
    return false;
  }
}

/**
 * Liste les résultats d'objectifs d'un élève.
 */
export async function listeResultats(eleveId: string): Promise<ReponseObjectif[]> {
  const q = query(collection(db, 'resultats_objectifs'), where('eleveId', '==', eleveId), limit(100));
  const snap = await getDocs(q);
  const resultat: ReponseObjectif[] = [];
  snap.forEach((d) => resultat.push(d.data() as ReponseObjectif));
  resultat.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
  return resultat;
}
