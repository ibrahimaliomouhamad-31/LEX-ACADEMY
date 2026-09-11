// BADGES PAR MATIÈRE (amélioration 11)
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BadgeMatiere {
  id: string;
  matiere: string;
  titre: string;
  emoji: string;
  condition: string;
  seuil: number;
}

export const BADGES_MATIERE: BadgeMatiere[] = [
  { id: 'math-50', matiere: 'Mathématiques', titre: 'Stratège des nombres', emoji: '🧮', condition: '50 exercices de maths réussis', seuil: 50 },
  { id: 'math-200', matiere: 'Mathématiques', titre: 'Maître des équations', emoji: '🧠', condition: '200 exercices de maths réussis', seuil: 200 },
  { id: 'pc-50', matiere: 'Physique-Chimie', titre: 'Alchimiste', emoji: '⚗️', condition: '50 exercices de PC réussis', seuil: 50 },
  { id: 'pc-200', matiere: 'Physique-Chimie', titre: 'Newton du Sahel', emoji: '🔬', condition: '200 exercices de PC réussis', seuil: 200 },
  { id: 'svt-50', matiere: 'SVT', titre: 'Naturaliste', emoji: '🌿', condition: '50 exercices de SVT réussis', seuil: 50 },
  { id: 'svt-200', matiere: 'SVT', titre: 'Généticien', emoji: '🧬', condition: '200 exercices de SVT réussis', seuil: 200 },
  { id: 'anglais-50', matiere: 'Anglais', titre: 'Bilingue', emoji: '🇬🇧', condition: '50 exercices d\'anglais réussis', seuil: 50 },
];

const CLE = '@lex/badgesMatieres';

export async function getBadgesMatieresObtenus(): Promise<string[]> {
  const brut = await AsyncStorage.getItem(CLE);
  return brut ? (JSON.parse(brut) as string[]) : [];
}

/** Appelle après chaque exercice réussi : débloque les badges de matière franchis. */
export async function enregistrerReussite(matiere: string): Promise<BadgeMatiere[]> {
  const cle = `@lex/reussites:${matiere}`;
  const brut = await AsyncStorage.getItem(cle);
  const n = (brut ? parseInt(brut, 10) : 0) + 1;
  await AsyncStorage.setItem(cle, String(n));
  const obtenus = await getBadgesMatieresObtenus();
  const nouveaux: BadgeMatiere[] = [];
  for (const b of BADGES_MATIERE) {
    if (b.matiere === matiere && n >= b.seuil && !obtenus.includes(b.id)) {
      nouveaux.push(b);
    }
  }
  if (nouveaux.length > 0) {
    await AsyncStorage.setItem(CLE, JSON.stringify([...obtenus, ...nouveaux.map((b) => b.id)]));
  }
  return nouveaux;
}

export async function reussitesParMatiere(matiere: string): Promise<number> {
  const v = await AsyncStorage.getItem(`@lex/reussites:${matiere}`);
  return v ? parseInt(v, 10) : 0;
}