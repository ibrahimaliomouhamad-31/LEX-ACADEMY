// FLASHCARDS : génération automatique de cartes révision depuis le texte des cours.
// 100% hors-ligne (les cours viennent du cache local).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCours } from './cacheHorsLigne';
import { jourLocal } from '../utils/correctifsAudit';
import { avertirDev, logDev, rapporterErreur } from '../utils/logger';

export interface Flashcard {
  recto: string;
  verso: string;
  source: string; // titre du chapitre
}

function nettoyer(texte: string): string {
  return texte.replace(/\s+/g, ' ').trim();
}

// Génère des cartes depuis le texte du cours : définitions ("X : Y") et formules ("A = B")
export function genererFlashcards(theorie: string, titreChapitre: string): Flashcard[] {
  const cartes: Flashcard[] = [];
  const dejaVues = new Set<string>();
  const texte = nettoyer(theorie);
  if (texte.length < 40) return cartes;

  // 1) Phrases de définition avec " : "
  const phrases = texte.split(/(?<=[.!?])\s+|\n+/);
  for (const phrase of phrases) {
    const p = nettoyer(phrase);
    if (p.length < 15 || p.length > 350) continue;
    const idx = p.indexOf(' : ');
    if (idx > 4 && idx < 90) {
      const recto = `Que dit le cours sur : ${p.slice(0, idx)} ?`;
      const verso = p.slice(idx + 3);
      const cle = recto.toLowerCase();
      if (verso.length >= 3 && !dejaVues.has(cle)) {
        dejaVues.add(cle);
        cartes.push({ recto, verso, source: titreChapitre });
      }
    }
  }

  // 2) Formules avec "="
  for (const phrase of phrases) {
    const p = nettoyer(phrase);
    if (p.length < 8 || p.length > 220) continue;
    const idx = p.indexOf('=');
    if (idx > 2 && idx < 80) {
      const recto = `Complète : ${p.slice(0, idx).trim()} = ?`;
      const cle = recto.toLowerCase();
      if (!dejaVues.has(cle)) {
        dejaVues.add(cle);
        cartes.push({ recto, verso: p.slice(idx + 1).trim(), source: titreChapitre });
      }
    }
    if (cartes.length >= 25) break;
  }

  return cartes.slice(0, 25);
}

// Deck d'un chapitre depuis le cours en cache
export async function getDeck(chapitreId: string): Promise<Flashcard[]> {
  try {
    const cours = await getCours(chapitreId);
    if (!cours) return [];
    const texte = `${cours.theorie || ''}\n${cours.methode_content || ''}`;
    return genererFlashcards(texte, cours.titre || chapitreId);
  } catch {
    return [];
  }
}

export interface ScoreDeck {
  sues: number;
  revues: number;
  dateISO: string;
}

// Sauvegarde du score d'un deck
export async function enregistrerScoreDeck(chapitreId: string, sues: number, revues: number): Promise<void> {
  try {
    const brut = await AsyncStorage.getItem('lex_flashcards_scores');
    const scores = brut ? JSON.parse(brut) : {};
    scores[chapitreId] = { sues, revues, dateISO: jourLocal() };
    await AsyncStorage.setItem('lex_flashcards_scores', JSON.stringify(scores));
  } catch (error) {
    rapporterErreur('[flashcardsService] Erreur sauvegarde score :', error);
  }
}

export async function getScores(): Promise<{ [chapitreId: string]: ScoreDeck }> {
  try {
    const brut = await AsyncStorage.getItem('lex_flashcards_scores');
    return brut ? JSON.parse(brut) : {};
  } catch {
    return {};
  }
}
