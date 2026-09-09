// STAGNATION : détecte les matières non travaillées depuis trop longtemps (amélioration 9)
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE = '@lex/derniereActivite';
const SEUIL_JOURS = 5;

const MATIERES = ['Mathématiques', 'Physique-Chimie', 'SVT', 'Anglais', 'Philosophie'];

/** À appeler à chaque exercice réussi : horodate l'activité de la matière. */
export async function enregistrerActivite(matiere: string): Promise<void> {
  if (!matiere) return;
  const brut = await AsyncStorage.getItem(CLE);
  const dates: Record<string, string> = brut ? JSON.parse(brut) : {};
  dates[matiere] = new Date().toISOString();
  await AsyncStorage.setItem(CLE, JSON.stringify(dates));
}

export interface AlerteStagnation {
  matiere: string;
  jours: number;
}

/** Matières sans activité depuis ≥ SEUIL_JOURS jours (les plus urgentes d'abord). */
export async function alertesStagnation(): Promise<AlerteStagnation[]> {
  const brut = await AsyncStorage.getItem(CLE);
  const dates: Record<string, string> = brut ? JSON.parse(brut) : {};
  const maintenant = Date.now();
  return MATIERES.map((m) => {
    const dernier = dates[m] ? new Date(dates[m]).getTime() : 0;
    return { matiere: m, jours: dernier ? Math.floor((maintenant - dernier) / 86400000) : -1 };
  })
    .filter((a) => a.jours === -1 || a.jours >= SEUIL_JOURS)
    .sort((a, b) => b.jours - a.jours);
}