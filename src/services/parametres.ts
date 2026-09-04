// PARAMÈTRES : langue (FR/EN) et taille de police, persistés localement.
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Langue = 'fr' | 'en';
export type TaillePolice = 'petit' | 'normal' | 'grand';

const CLE_LANGUE = 'lex_langue';
const CLE_POLICE = 'lex_taille_police';

export async function getLangue(): Promise<Langue> {
  try {
    return ((await AsyncStorage.getItem(CLE_LANGUE)) as Langue) || 'fr';
  } catch {
    return 'fr';
  }
}

export async function setLangue(l: Langue): Promise<void> {
  await AsyncStorage.setItem(CLE_LANGUE, l);
}

export async function getTaillePolice(): Promise<TaillePolice> {
  try {
    return ((await AsyncStorage.getItem(CLE_POLICE)) as TaillePolice) || 'normal';
  } catch {
    return 'normal';
  }
}

export async function setTaillePolice(t: TaillePolice): Promise<void> {
  await AsyncStorage.setItem(CLE_POLICE, t);
}

export function multiplicateurPolice(t: TaillePolice): number {
  if (t === 'petit') return 0.85;
  if (t === 'grand') return 1.25;
  return 1;
}

// --- Options expérimentales (désactivées par défaut) ---
const CLE_DORTOIR = 'lex_option_dortoir';

export async function getDortoirActive(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLE_DORTOIR)) === '1';
  } catch {
    return false;
  }
}
export async function setDortoirActive(v: boolean): Promise<void> {
  await AsyncStorage.setItem(CLE_DORTOIR, v ? '1' : '0');
}

// --- Thème (couleur d'accent de l'app) ---
export type Theme = 'jaune' | 'bleu' | 'vert' | 'violet' | 'rose';
const CLE_THEME = 'lex_theme';

export async function getTheme(): Promise<Theme> {
  try {
    return ((await AsyncStorage.getItem(CLE_THEME)) as Theme) || 'jaune';
  } catch {
    return 'jaune';
  }
}
export async function setTheme(t: Theme): Promise<void> {
  await AsyncStorage.setItem(CLE_THEME, t);
}

export function couleurTheme(t: Theme): string {
  if (t === 'bleu') return '#3B82F6';
  if (t === 'vert') return '#10B981';
  if (t === 'violet') return '#8B5CF6';
  if (t === 'rose') return '#EC4899';
  return '#FBBF24';
}

// --- Mode examen (verrouille les outils d'aide pendant une épreuve) ---
const CLE_EXAMEN = 'lex_examen_actif';

export async function getExamenActif(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLE_EXAMEN)) === '1';
  } catch {
    return false;
  }
}
export async function setExamenActif(v: boolean): Promise<void> {
  await AsyncStorage.setItem(CLE_EXAMEN, v ? '1' : '0');
}

// --- Rappel quotidien (notification locale) ---
const CLE_RAPPEL = 'lex_rappel_actif';
const CLE_HEURE_RAPPEL = 'lex_rappel_heure';

export async function getRappelActif(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLE_RAPPEL)) === '1';
  } catch {
    return false;
  }
}
export async function setRappelActif(v: boolean): Promise<void> {
  await AsyncStorage.setItem(CLE_RAPPEL, v ? '1' : '0');
}
export async function getHeureRappel(): Promise<number> {
  try {
    return parseInt((await AsyncStorage.getItem(CLE_HEURE_RAPPEL)) || '20', 10) || 20;
  } catch {
    return 20;
  }
}
export async function setHeureRappel(h: number): Promise<void> {
  await AsyncStorage.setItem(CLE_HEURE_RAPPEL, String(Math.max(0, Math.min(23, h))));
}
