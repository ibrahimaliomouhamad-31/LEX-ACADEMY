// OBJECTIFS PERSONNELS + FILE DE SYNCHRONISATION GLOBALE + ANNOTATIONS (services groupés)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, setDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { chargerContexte, type ContexteBadges } from './motivation';
import { getStats } from './statsSuivi';
import { parseTableauJSON, jourLocal } from '../utils/correctifsAudit';

// ---------- 41 : Objectifs personnels ----------

export type TypeObjectif = 'exos_officiels' | 'exos_infinis' | 'defis' | 'qcm' | 'revisions';

export interface Objectif {
  type: TypeObjectif;
  cible: number;
  creeLe: string; // YYYY-MM-DD
}

const CLE_OBJECTIFS = 'lex_objectifs';

export async function getObjectifs(): Promise<Objectif[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE_OBJECTIFS);
    // 🛡️ parseTableauJSON : objet corrompu → [] au lieu de crash
    return parseTableauJSON<Objectif>(brut, []);
  } catch {
    return [];
  }
}

export async function ajouterObjectif(type: TypeObjectif, cible: number): Promise<void> {
  const objectifs = await getObjectifs().then((o) => o.filter((x) => x.type !== type));
  objectifs.push({ type, cible, creeLe: jourLocal() });
  await AsyncStorage.setItem(CLE_OBJECTIFS, JSON.stringify(objectifs));
}

export async function supprimerObjectif(type: TypeObjectif): Promise<void> {
  const objectifs = (await getObjectifs()).filter((o) => o.type !== type);
  await AsyncStorage.setItem(CLE_OBJECTIFS, JSON.stringify(objectifs));
}

export async function progressionObjectifs(): Promise<{ objectif: Objectif; actuel: number }[]> {
  const objectifs = await getObjectifs();
  const ctx: ContexteBadges = await chargerContexte();
  const stats = await getStats();
  const semaine = new Date();
  semaine.setDate(semaine.getDate() - 7);
  const cleSemaine = jourLocal(semaine);
  const actifs7j = Object.entries(stats.activiteJour)
    .filter(([jour]) => jour >= cleSemaine)
    .reduce((somme, [, nb]) => somme + nb, 0);

  return objectifs.map((o) => {
    let actuel = 0;
    if (o.type === 'exos_officiels') actuel = ctx.exosResolus;
    else if (o.type === 'exos_infinis') actuel = ctx.infiniTotal;
    else if (o.type === 'qcm') actuel = ctx.qcmRecord;
    else if (o.type === 'revisions') actuel = actifs7j;
    else if (o.type === 'defis') actuel = actifs7j; // proxy : activité récente
    return { objectif: o, actuel };
  });
}

export const LIBELLES_OBJECTIFS: { type: TypeObjectif; titre: string; emoji: string }[] = [
  { type: 'exos_officiels', titre: 'Exercices officiels résolus (total)', emoji: '✍️' },
  { type: 'exos_infinis', titre: 'Exercices générés résolus (total)', emoji: '♾️' },
  { type: 'revisions', titre: 'Exercices faits en 7 jours', emoji: '📅' },
  { type: 'qcm', titre: 'Record au QCM Éclair', emoji: '⚡' },
  { type: 'defis', titre: 'Activité des 7 derniers jours', emoji: '🔥' },
];

// ---------- 42 : File de synchronisation globale ----------

interface ElementFile {
  type: 'defi' | 'signalement' | 'devoir';
  donnees: Record<string, unknown>;
  dateISO: string;
}

const CLE_FILE = 'lex_file_sync_globale';

export async function ajouterALaFile(type: ElementFile['type'], donnees: Record<string, unknown>): Promise<void> {
  try {
    const brut = await AsyncStorage.getItem(CLE_FILE);
    const file: ElementFile[] = parseTableauJSON<ElementFile>(brut, []);
    file.push({ type, donnees, dateISO: new Date().toISOString() });
    await AsyncStorage.setItem(CLE_FILE, JSON.stringify(file));
  } catch {
    // ignore
  }
}

export async function compterFile(): Promise<number> {
  try {
    const brut = await AsyncStorage.getItem(CLE_FILE);
    return parseTableauJSON<ElementFile>(brut, []).length;
  } catch {
    return 0;
  }
}

// Vide la file au passage au wifi. Renvoie le nombre d'éléments envoyés.
export async function viderFileGlobale(): Promise<number> {
  let envoyes = 0;
  try {
    const brut = await AsyncStorage.getItem(CLE_FILE);
    if (!brut) return 0;
    const file: ElementFile[] = parseTableauJSON<ElementFile>(brut, []);
    const restants: ElementFile[] = [];
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
        restants.push(element); // toujours hors-ligne : on garde
      }
    }
    await AsyncStorage.setItem(CLE_FILE, JSON.stringify(restants));
  } catch {
    // ignore
  }
  return envoyes;
}

// ---------- 40 : Annotations / notes de cours ----------

export interface Annotation {
  chapitreId: string;
  chapitreTitre: string;
  texte: string;
  dateISO: string;
}

const CLE_NOTES = 'lex_annotations';

export async function ajouterAnnotation(chapitreId: string, chapitreTitre: string, texte: string): Promise<void> {
  const notes = await getAnnotations();
  notes.unshift({ chapitreId, chapitreTitre, texte, dateISO: jourLocal() });
  await AsyncStorage.setItem(CLE_NOTES, JSON.stringify(notes.slice(0, 200)));
}

export async function getAnnotations(): Promise<Annotation[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE_NOTES);
    // 🛡️ parseTableauJSON : objet corrompu → [] au lieu de crash
    return parseTableauJSON<Annotation>(brut, []);
  } catch {
    return [];
  }
}

export async function supprimerAnnotation(index: number): Promise<void> {
  const notes = await getAnnotations();
  notes.splice(index, 1);
  await AsyncStorage.setItem(CLE_NOTES, JSON.stringify(notes));
}
