/**
 * 📡 MODE ÉCONOMIE DE DONNÉES
 *
 * Contexte Niger : forfaits 3G/4G limités et chers. Quand le mode est actif,
 * l'app réduit sa consommation réseau sans perdre en fonctionnalité :
 *   - limite le "téléchargement automatique" des cours/exercices (moins gros),
 *   - tronque les longs textes audio et contenus à l'essentiel,
 *   - désactive l'attente des mises à jour automatiques (OTA),
 *   - sert de badge visible dans l'interface.
 *
 * 100 % local : l'état est mémorisé sur l'appareil via AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE = 'lex_mode_economie_donnees';

/** Lit le mode économie de données (par défaut : inactif). */
export async function getEconomieDonnees(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(CLE);
    return v === '1';
  } catch {
    return false;
  }
}

/** Active ou désactive le mode économie de données. */
export async function setEconomieDonnees(actif: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE, actif ? '1' : '0');
  } catch {
    // silencieux : mode non bloquant
  }
}

/** Tronque un texte à une longueur max (en caractères) pour économiser la
 *  bande passante / la mémoire à l'affichage. */
export function tronquer(texte: string, max: number): string {
  if (!texte) return texte;
  if (texte.length <= max) return texte;
  return `${texte.slice(0, max).trimEnd()}…`;
}

/**
 * Durée audio conseillée (secondes de synthèse vocale) selon le mode.
 * En économie, on réduit la plage de lecture pour limiter le streaming TTS.
 */
export async function plafondTexteAudio(): Promise<number> {
  const actif = await getEconomieDonnees();
  return actif ? 1500 : 3500;
}

/** Titre/description court pour l'UI. */
export function libelleEconomie(actif: boolean): string {
  return actif
    ? 'Économie de données ACTIVÉE 📡 — contenus allégés, conso réduite.'
    : 'Économie de données désactivée — qualité maximale.';
}