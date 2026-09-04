// RÉPÉTITION ESPACÉE (Spaced Repetition, méthode Leitner)
// Un exercice raté revient 1 jour plus tard ; chaque réussite espace le retour :
// 1 → 3 → 7 → 16 → 35 → 70 → 140 jours. 100% hors-ligne.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Exercice } from './cacheHorsLigne';

const CLE_SRS = 'lex_srs';

// Intervalles en jours par boîte (boîte 1 à 7)
const INTERVALLES = [1, 3, 7, 16, 35, 70, 140];

interface EntreeSRS {
  exo: Exercice; // snapshot complet pour re-jouer hors-ligne
  boite: number; // 1..7
  prochaineRevision: string; // YYYY-MM-DD
  echecsConsecutifs: number;
}

type StockSRS = { [exoId: string]: EntreeSRS };

function dansNJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function aujourdhui(): string {
  return new Date().toISOString().split('T')[0];
}

async function lireStock(): Promise<StockSRS> {
  try {
    const brut = await AsyncStorage.getItem(CLE_SRS);
    return brut ? (JSON.parse(brut) as StockSRS) : {};
  } catch {
    return {};
  }
}

async function ecrireStock(stock: StockSRS): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_SRS, JSON.stringify(stock));
  } catch (error) {
    console.error('[revisions] Erreur sauvegarde SRS :', error);
  }
}

// À appeler après chaque réponse : planifie le retour de l'exercice
export async function planifierRevision(exo: Exercice, reussi: boolean): Promise<void> {
  const stock = await lireStock();
  const entree = stock[exo.id];

  if (reussi) {
    if (!entree) return; // réussi du premier coup sans historique : rien à revoir
    const nouvelleBoite = Math.min(entree.boite + 1, INTERVALLES.length);
    stock[exo.id] = {
      ...entree,
      boite: nouvelleBoite,
      echecsConsecutifs: 0,
      prochaineRevision: dansNJours(INTERVALLES[nouvelleBoite - 1]),
    };
  } else {
    stock[exo.id] = {
      exo,
      boite: 1,
      echecsConsecutifs: (entree?.echecsConsecutifs || 0) + 1,
      prochaineRevision: dansNJours(INTERVALLES[0]),
    };
  }

  await ecrireStock(stock);
}

// Exercices à revoir aujourd'hui (ou en retard)
export async function getRevisionsDuJour(): Promise<Exercice[]> {
  const stock = await lireStock();
  const jour = aujourdhui();
  return Object.values(stock)
    .filter((e) => e.prochaineRevision <= jour)
    .map((e) => e.exo);
}

export async function compterRevisionsDuJour(): Promise<number> {
  const stock = await lireStock();
  const jour = aujourdhui();
  return Object.values(stock).filter((e) => e.prochaineRevision <= jour).length;
}

// Tous les exercices en cours de révision (pour stats)
export async function getToutesRevisions(): Promise<{ exo: Exercice; boite: number; prochaineRevision: string }[]> {
  const stock = await lireStock();
  return Object.values(stock)
    .map((e) => ({ exo: e.exo, boite: e.boite, prochaineRevision: e.prochaineRevision }))
    .sort((a, b) => (a.prochaineRevision > b.prochaineRevision ? 1 : -1));
}

export async function retirerRevision(exoId: string): Promise<void> {
  const stock = await lireStock();
  delete stock[exoId];
  await ecrireStock(stock);
}
