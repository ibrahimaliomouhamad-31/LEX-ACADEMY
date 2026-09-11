// DUELS : défis solo contre un "fantôme" (le meilleur score local sur le chapitre).
// 100% hors-ligne. Le vrai duel à deux se joue en se passant le téléphone.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { jourLocal } from '../utils/correctifsAudit';
import { avertirDev, logDev, rapporterErreur } from '../utils/logger';

const CLE_DUELS = 'lex_duels';

export interface ResultatDuel {
  score: number;
  dateISO: string;
}

type StockDuels = { [chapitreId: string]: ResultatDuel };

async function lireStock(): Promise<StockDuels> {
  try {
    const brut = await AsyncStorage.getItem(CLE_DUELS);
    return brut ? JSON.parse(brut) : {};
  } catch {
    return {};
  }
}

// Score du fantôme : meilleur score local, calibré sur l'échelle réelle du duel
// (bonnes réponses ×10 − pénalité temps, max 100). 🛡️ ANTI-FANTÔME IMBATTABLE :
// l'ancien défaut de 6 venait de l'échelle QCM /10 et rendait le premier duel
// perdu d'avance ; 55 correspond à ~6 bonnes réponses avec un bon chrono.
export async function getFantome(chapitreId: string): Promise<number> {
  const stock = await lireStock();
  return stock[chapitreId]?.score ?? 55;
}

// Enregistre le duel ; le fantôme devient le nouveau record si battu
export async function enregistrerDuel(chapitreId: string, score: number): Promise<void> {
  try {
    const stock = await lireStock();
    const ancien = stock[chapitreId];
    if (!ancien || score > ancien.score) {
      stock[chapitreId] = { score, dateISO: jourLocal() };
      await AsyncStorage.setItem(CLE_DUELS, JSON.stringify(stock));
    }
  } catch (error) {
    rapporterErreur('[duelService] Erreur enregistrerDuel :', error);
  }
}

export async function getTousScores(): Promise<{ chapitreId: string; score: number; dateISO: string }[]> {
  const stock = await lireStock();
  return Object.entries(stock)
    .map(([chapitreId, r]) => ({ chapitreId, score: r.score, dateISO: r.dateISO }))
    .sort((a, b) => b.score - a.score);
}
