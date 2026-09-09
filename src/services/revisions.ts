// RÉPÉTITION ESPACÉE (Spaced Repetition, méthode Leitner)
// Un exercice raté revient 1 jour plus tard ; chaque réussite espace le retour :
// 1 → 3 → 7 → 16 → 35 → 70 → 140 jours. 100% hors-ligne.
//
// 🔄 AMÉLIORATIONS PÉDAGOGIQUES :
//  - PLAFOND QUOTIDIEN (20/jour) : réviser 200 cartes d'un coup ne consolide
//    rien — on priorise et on garde l'élève frais ;
//  - INTERLEAVING : les matières sont alternées (Maths, PC, Maths...) —
//    la recherche montre que l'entrelacement bat le blocage par matière ;
//  - EXERCICES SŒURS : chaque échec génère UNE variante fraîche du même
//    énoncé (via le générateur local) → l'élève retravaille exactement sa
//    lacune au lieu de mémoriser la réponse.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Exercice } from './cacheHorsLigne';
import { genererExerciceSeede, generateurDisponible } from './generateurLocal';

const CLE_SRS = 'lex_srs';
const CLE_FAITS_JOUR = 'lex_srs_faits'; // { date: 'YYYY-MM-DD', n: number }
const MAX_REVISIONS_PAR_JOUR = 20;

// Intervalles en jours par boîte (boîte 1 à 7)
const INTERVALLES = [1, 3, 7, 16, 35, 70, 140];

interface EntreeSRS {
  exo: Exercice; // snapshot complet pour re-jouer hors-ligne
  boite: number; // 1..7
  prochaineRevision: string; // YYYY-MM-DD
  echecsConsecutifs: number;
  estVariante?: boolean; // générée localement (exercice sœur)
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

async function compterFaitAujourdhui(): Promise<number> {
  try {
    const brut = await AsyncStorage.getItem(CLE_FAITS_JOUR);
    if (brut) {
      const p = JSON.parse(brut) as { date: string; n: number };
      if (p.date === aujourdhui()) return p.n;
    }
  } catch {
    // ignore
  }
  return 0;
}

// À appeler après chaque réponse : planifie le retour de l'exercice
export async function planifierRevision(exo: Exercice, reussi: boolean): Promise<void> {
  const stock = await lireStock();

  if (reussi) {
    const entree = stock[exo.id];
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
      echecsConsecutifs: (stock[exo.id]?.echecsConsecutifs || 0) + 1,
      prochaineRevision: dansNJours(INTERVALLES[0]),
    };

    // 🧬 EXERCICE SŒUR : variante fraîche de la même notion (générateur local).
    try {
      const matiere = exo.matiere || exo.chapitre_id || '';
      if (matiere && generateurDisponible(matiere)) {
        const graine = (exo.id.length * 7919 + Date.now()) >>> 0;
        const gen = genererExerciceSeede(
          exo.chapitre_id || matiere,
          exo.chapitre || matiere,
          30 + (Number(exo.difficulte) || 1) * 15,
          graine
        );
        const idVariante = `${exo.id}#sv${stock[exo.id].echecsConsecutifs}`;
        stock[idVariante] = {
          exo: {
            ...exo,
            id: idVariante,
            enonce: gen.enonce,
            bonne_reponse: gen.bonne_reponse,
            indice1: gen.indice1,
            indice2: gen.indice2,
            explication: gen.explication,
          },
          boite: 1,
          echecsConsecutifs: 0,
          prochaineRevision: dansNJours(INTERVALLES[0]),
          estVariante: true,
        };
      }
    } catch {
      // générateur indisponible pour cette matière : pas grave
    }
  }

  await ecrireStock(stock);
}

// Exercices à revoir aujourd'hui (ou en retard), plafonnés et entrelacés.
export async function getRevisionsDuJour(): Promise<Exercice[]> {
  const stock = await lireStock();
  const jour = aujourdhui();
  const dues = Object.values(stock)
    .filter((e) => e.prochaineRevision <= jour)
    .map((e) => e.exo);

  // 🧠 Interleaving d'abord (ordre pédagogique), puis plafond quotidien.
  const entrelacees = entrelacerParMatiere(dues);
  const dejaFaits = await compterFaitAujourdhui();
  const restant = Math.max(0, MAX_REVISIONS_PAR_JOUR - dejaFaits);
  return entrelacees.slice(0, restant);
}

/**
 * 🔄 INTERLEAVING : alterne les matières (Maths, PC, Maths...) au lieu de
 * bloquer par matière — meilleure rétention démontrée par la recherche.
 */
function entrelacerParMatiere(exercices: Exercice[]): Exercice[] {
  const groupes = new Map<string, Exercice[]>();
  for (const e of exercices) {
    const cle = e.matiere || 'autre';
    const liste = groupes.get(cle) || [];
    liste.push(e);
    groupes.set(cle, liste);
  }

  const resultats: Exercice[] = [];
  const cles = [...groupes.keys()];
  let resteVrai = true;
  while (resteVrai) {
    resteVrai = false;
    for (const cle of cles) {
      const suivant = groupes.get(cle)!.shift();
      if (suivant) {
        resultats.push(suivant);
        resteVrai = true;
      }
    }
  }
  return resultats;
}

export async function compterRevisionsDuJour(): Promise<number> {
  const stock = await lireStock();
  const jour = aujourdhui();
  return Object.values(stock).filter((e) => e.prochaineRevision <= jour).length;
}

/** Cartes déjà revues aujourd'hui (affichage "X/20"). */
export async function revisionsFaitesAujourdhui(): Promise<number> {
  return compterFaitAujourdhui();
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

/** À appeler après chaque carte traitée (alimente le plafond du jour). */
export async function marquerRevisionFaite(): Promise<void> {
  try {
    const n = (await compterFaitAujourdhui()) + 1;
    await AsyncStorage.setItem(CLE_FAITS_JOUR, JSON.stringify({ date: aujourdhui(), n }));
  } catch {
    // ignore
  }
}
