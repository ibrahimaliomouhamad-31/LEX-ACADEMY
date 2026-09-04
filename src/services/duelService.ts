// DUELS : défis solo contre un "fantôme" (le meilleur score local sur le chapitre).
// 100% hors-ligne. Le vrai duel à deux se joue en se passant le téléphone.

import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Score du fantôme : meilleur score local, sinon 6 (soit 60% de réussite par défaut)
export async function getFantome(chapitreId: string): Promise<number> {
  const stock = await lireStock();
  return stock[chapitreId]?.score ?? 6;
}

// Enregistre le duel ; le fantôme devient le nouveau record si battu
export async function enregistrerDuel(chapitreId: string, score: number): Promise<void> {
  try {
    const stock = await lireStock();
    const ancien = stock[chapitreId];
    if (!ancien || score > ancien.score) {
      stock[chapitreId] = { score, dateISO: new Date().toISOString().split('T')[0] };
      await AsyncStorage.setItem(CLE_DUELS, JSON.stringify(stock));
    }
  } catch (error) {
    console.error('[duelService] Erreur enregistrerDuel :', error);
  }
}

export async function getTousScores(): Promise<{ chapitreId: string; score: number; dateISO: string }[]> {
  const stock = await lireStock();
  return Object.entries(stock)
    .map(([chapitreId, r]) => ({ chapitreId, score: r.score, dateISO: r.dateISO }))
    .sort((a, b) => b.score - a.score);
}
