/**
 * 📅 PLANIFICATION DES RÉVISIONS (SM-2 ALGORITHM)
 * Meilleur que Leitner pour long-terme
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUserItem, getUserItem } from './userStorage';

const SRS_KEY = 'lex_srs_sm2';

interface CardSM2 {
  id: string;
  front: string;
  back: string;
  interval: number; // Jours
  easeFactor: number; // 1.3-2.5
  repetitions: number;
  nextReview: string; // ISO date
  quality: number; // Dernière réponse (0-5)
}

type StockSM2 = { [id: string]: CardSM2 };

function dansNJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// SM-2 Algorithm: https://en.wikipedia.org/wiki/SuperMemo#History_of_research
function calculerIntervalle(
  quality: number, // 0 (complètement oublié) - 5 (réponse parfaite)
  easeFactor: number,
  interval: number,
  repetitions: number
): { newInterval: number; newEaseFactor: number } {
  let newEaseFactor = easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  let newInterval: number;
  if (quality < 3) {
    // Réponse incorrecte
    newInterval = 1;
  } else if (repetitions === 0) {
    newInterval = 1;
  } else if (repetitions === 1) {
    newInterval = 3;
  } else {
    newInterval = Math.round(interval * newEaseFactor);
  }

  return { newInterval, newEaseFactor };
}

export async function chargerCartesRevision(): Promise<CardSM2[]> {
  try {
    const data = await getUserItem(SRS_KEY);
    const stock: StockSM2 = data ? JSON.parse(data) : {};
    const aujourd_hui = new Date().toISOString().split('T')[0];
    return Object.values(stock).filter((c) => c.nextReview <= aujourd_hui);
  } catch (e) {
    console.error('[srs]:', e);
    return [];
  }
}

export async function enregistrerReponseCarte(
  cardId: string,
  quality: number // 0-5
): Promise<void> {
  try {
    const data = await getUserItem(SRS_KEY);
    const stock: StockSM2 = data ? JSON.parse(data) : {};
    const card = stock[cardId];

    if (!card) return;

    const { newInterval, newEaseFactor } = calculerIntervalle(
      quality,
      card.easeFactor,
      card.interval,
      card.repetitions
    );

    card.repetitions++;
    card.interval = newInterval;
    card.easeFactor = newEaseFactor;
    card.quality = quality;
    card.nextReview = dansNJours(newInterval);

    await setUserItem(SRS_KEY, JSON.stringify(stock));
  } catch (e) {
    console.error('[srs] Erreur enregistrement:', e);
  }
}

export async function ajouterNouvelleCarte(card: Omit<CardSM2, 'interval' | 'easeFactor' | 'repetitions' | 'nextReview' | 'quality'>): Promise<void> {
  try {
    const data = await getUserItem(SRS_KEY);
    const stock: StockSM2 = data ? JSON.parse(data) : {};

    stock[card.id] = {
      ...card,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: new Date().toISOString().split('T')[0],
      quality: 0,
    };

    await setUserItem(SRS_KEY, JSON.stringify(stock));
  } catch (e) {
    console.error('[srs] Erreur ajout:', e);
  }
}
