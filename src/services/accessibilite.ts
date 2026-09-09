// ACCESSIBILITÉ : contraste élevé, police dyslexie, thème sombre auto (améliorations 14 + 17)
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE_CONTRASTE = '@lex/contrasteEleve';
const CLE_DYSLEXIE = '@lex/policeDyslexie';
const CLE_SOMBRE_AUTO = '@lex/sombreAuto';

export async function getContrasteEleve(): Promise<boolean> {
  return (await AsyncStorage.getItem(CLE_CONTRASTE)) === '1';
}
export async function setContrasteEleve(v: boolean): Promise<void> {
  await AsyncStorage.setItem(CLE_CONTRASTE, v ? '1' : '0');
}
export async function getPoliceDyslexie(): Promise<boolean> {
  return (await AsyncStorage.getItem(CLE_DYSLEXIE)) === '1';
}
export async function setPoliceDyslexie(v: boolean): Promise<void> {
  await AsyncStorage.setItem(CLE_DYSLEXIE, v ? '1' : '0');
}
export async function getSombreAuto(): Promise<boolean> {
  return (await AsyncStorage.getItem(CLE_SOMBRE_AUTO)) === '1';
}
export async function setSombreAuto(v: boolean): Promise<void> {
  await AsyncStorage.setItem(CLE_SOMBRE_AUTO, v ? '1' : '0');
}

/** Thème sombre auto : entre 19h et 7h on suggère le mode dortoir. */
export function estHeureSombreMaintenant(): boolean {
  const h = new Date().getHours();
  return h >= 19 || h < 7;
}

/** Styles à appliquer globalement selon les préférences. */
export interface StylesAccessibilite {
  couleurTexte: string;
  couleurFond: string;
  policeDyslexie: boolean;
}

export async function stylesActuels(): Promise<StylesAccessibilite> {
  const [contraste, dyslexie] = await Promise.all([getContrasteEleve(), getPoliceDyslexie()]);
  return {
    couleurTexte: contraste ? '#000000' : '#111827',
    couleurFond: contraste ? '#FFFFFF' : '#F8FAFC',
    policeDyslexie: dyslexie,
  };
}