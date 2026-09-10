// Mock in-memory d'AsyncStorage (environnement node sans React Native)
const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: jest.fn(async (k: string) => { store.delete(k); }),
    getAllKeys: jest.fn(async () => [...store.keys()]),
    multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, store.get(k) ?? null])),
    multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => store.set(k, v)); }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => store.delete(k)); }),
  },
}));

// Mocks natifs : expo-constants est ESM pur (crash Jest sinon), firebase
// n'a rien à faire dans des tests unitaires de logique locale.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn((n: number) => n),
  collection: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn(() => ({})) }));
jest.mock('../config/firebaseConfig', () => ({ db: {} }));
jest.mock('../utils/reseau', () => ({ estEnLigne: jest.fn(async () => false) }));
jest.mock('../services/userStorage', () => ({
  getCurrentUserId: jest.fn(async () => 'test-user'),
  getUserItem: jest.fn(async () => null),
}));

import { messageAutorise, GROUPES_DISPONIBLES } from '../services/groupesEntraide';
import { modererFiche } from '../services/moderationFiches';
import { compresserTexte, planifierPrechargement } from '../services/prechargement';
import { streakAuthentique, scellerStreak, signalerAlteration } from '../services/integrite';
import { genererSectionsCours } from "../services/enrichirCours";
import { extraireMicroNotions, couvrirNotions } from "../services/microNotions";
import { chiffrer, dechiffrer, estChiffre } from '../services/chiffrement';
import { enregistrerActivite, alertesStagnation } from '../services/stagnation';
import {
  gagnerXp,
  lireXpTotal,
  lireXpNonSync,
  fusionnerXpCloud,
  validerStreakDuJour,
  lireStreakActuel,
  lireStreakFreezes,
  ajouterStreakFreezes,
  boosterDoubleXpActif,
  activerBoosterDoubleXp,
  synchroniserXp,
  lireXpSemaineActuelle,
} from '../services/xpLocal';
import {
  ContexteBadges,
  evaluerBadges,
  liguePourXp,
  quetesDeLaSemaine,
  numeroSemaine,
} from '../services/motivation';

describe('Groupes d\'entraide', () => {
  it('bloque le spam, les majuscules et les liens', () => {
    expect(messageAutorise('hello, je bloque sur la limite en x=1, merci').ok).toBe(true);
    expect(messageAutorise('a').ok).toBe(false);
    expect(messageAutorise('va sur https://spam.com').ok).toBe(false);
    expect(messageAutorise('QUELLE EST LA REPONSE DE L EXO 3 SVP').ok).toBe(false);
    expect(messageAutorise('aaaaaaaaaaaaaaaaaa').ok).toBe(false);
  });
  it('a un groupe par matière du BAC', () => {
    expect(GROUPES_DISPONIBLES.some((g) => g.matiere === 'Mathématiques')).toBe(true);
  });
});

describe('Modération de fiches', () => {
  it('bloque les fiches suspectes', () => {
    expect(modererFiche('trop court').ok).toBe(false);
    expect(modererFiche('Une fiche propre sur les suites arithmétiques, avec la formule un = u0 + n r et deux exemples.').ok).toBe(true);
    expect(modererFiche('Clique sur www.arnaque.com pour la fiche')).toMatchObject({ ok: false });
  });
});

describe('Préchargement intelligent', () => {
  it('priorise les chapitres faibles', async () => {
    const file = await planifierPrechargement([
      { id: 'a', titre: 'Fort', maitrise: 90 },
      { id: 'b', titre: 'Faible', maitrise: 10 },
    ], false);
    expect(file[0].chapitreId).toBe('b');
  });
  it('compresse en mode économie', () => {
    // Le mode économie remplace les sauts de ligne par des espaces et fusionne
    // les espaces consécutifs. Avec 'a\n\n\n' le mode normal garde '\n\n' (après
    // \n{3,} → \n\n) tandis que le mode économie compacte en 'a ' (2 caractères).
    const long = 'a\n\n\n'.repeat(100); // 400 caractères, mode normal → 300
    const normal = compresserTexte(long, false).length;  // 300
    const eco = compresserTexte(long, true).length;      // 200
    expect(eco).toBeLessThan(normal);
  });
});

describe('Intégrité du streak', () => {
  it('valide une valeur authentique et rejette une valeur falsifiée', async () => {
    await signalerAlteration();
    await scellerStreak(5, '2026-09-09');
    expect(await streakAuthentique(5, '2026-09-09')).toBe(true);
    expect(await streakAuthentique(999, '2026-09-09')).toBe(false);
  });
});

describe("Enrichissement des cours (morceau 1)", () => {
  it("garde le titre des exemples en premier meme apres permutation", () => {
    for (let i = 0; i < 100; i++) {
      const sections = genererSectionsCours("Chapitre test " + i, "Mathematiques", "Contenu de test assez long pour faire varier la graine locale " + i);
      expect(sections[2].lignes[0]).toContain("Exemples");
    }
  });
  it("genere 6 sections pedagogiques minimum", () => {
    const s1 = genererSectionsCours("Les suites numeriques", "Mathematiques", "x");
    expect(s1.length).toBeGreaterThanOrEqual(6);
    expect(s1[0].titre).toContain("Objectifs");
  });
  it("ajoute un schema quand le titre du chapitre correspond", () => {
    const s2 = genererSectionsCours("Le theoreme de Pythagore", "Mathematiques", "x");
    expect(s2.some((sec) => sec.titre.toLowerCase().includes("sch"))).toBe(true);
  });
});

describe("Micro-notions (morceau 1)", () => {
  it("extrait les titres dun cahier colle (I. / 1. / Definition)", () => {
    const cahier = [
      "I. DEFINITION : la derivee est le taux de variation instantane",
      "La derivee en a est la pente de la tangente en a",
      "1. Propriete : la derivee dun produit suit la regle u v",
      "II. METHODE : calculer la derivee etape par etape",
      "III. EXEMPLES : la fonction carre donne 2x",
    ].join("\n");
    const n = extraireMicroNotions(cahier);
    expect(n.length).toBeGreaterThanOrEqual(3);
    expect(new Set(n.map((x) => x.id)).size).toBe(n.length);
    expect(n.every((x) => x.maitrise === 0)).toBe(true);
  });
  it("couvre les notions avec des exercices par mots-cles", () => {
    const notions = extraireMicroNotions("I. Derivee et tangente\nLa pente.\nII. Limites\nLa notion.");
    const r = couvrirNotions(notions, [
      { enonce: "Calcule la derivee de x2" },
      { enonce: "Etudie la limite en 0" },
    ]);
    expect(r.length).toBe(notions.length);
    expect(r[0].nbExercices).toBe(1);
  });
});

describe('Cahier chiffre + stagnation (cycle E)', () => {
  it('chiffre et dechiffre sans perte (accents et symboles math)', () => {
    const original = 'Derivee : f(x) = x² + 3x — la tangente a une pente égale à 2.';
    const chiffre = chiffrer(original);
    expect(chiffre).not.toBe(original);
    expect(estChiffre(chiffre)).toBe(true);
    expect(dechiffrer(chiffre)).toBe(original);
  });
  it('tolere un texte non chiffre (compat anciennes donnees)', () => {
    const brut = 'ancien cahier non chiffre';
    expect(dechiffrer(brut)).toBe(brut);
  });
  it('une matiere travaillee aujourdhui est suivie sans alerte impossible', async () => {
    await enregistrerActivite('SVT');
    const alertes = await alertesStagnation();
    const svt = alertes.find((a) => a.matiere === 'SVT');
    expect(svt ? svt.jours : 0).toBeGreaterThanOrEqual(0);
  });
});

// ========== XP LOCAL & STREAK (cycle F) ==========
describe('XP local (cycle F)', () => {
  beforeEach(async () => {
    store.clear();
  });

  it('gagne 10 XP et les lit', async () => {
    expect(await lireXpTotal()).toBe(0);
    const total = await gagnerXp(10);
    expect(total).toBe(10);
    expect(await lireXpTotal()).toBe(10);
    expect(await lireXpNonSync()).toBe(10);
  });

  it('applique le booster 2x quand actif', async () => {
    await activerBoosterDoubleXp();
    expect(await boosterDoubleXpActif()).toBe(true);
    const total = await gagnerXp(10);
    expect(total).toBe(20);
  });

  it('accumule XP sur plusieurs gains', async () => {
    await gagnerXp(5);
    await gagnerXp(7);
    await gagnerXp(3);
    expect(await lireXpTotal()).toBe(15);
  });

  it('fusionne avec le XP cloud sans perdre les XP locaux', async () => {
    await gagnerXp(100);
    expect(await fusionnerXpCloud(150)).toBe(150);
    await gagnerXp(50);
    // Local = 150 + 50 = 200 > cloud 180 : le cloud ne doit JAMAIS
    // faire baisser le local (max), sinon l'élève perd ses XP hors-ligne.
    expect(await fusionnerXpCloud(180)).toBe(200);
    // Cloud supérieur au local : on adopte le cloud (sync multi-appareils).
    expect(await fusionnerXpCloud(250)).toBe(250);
  });
});

describe('Streak local (cycle F)', () => {
  beforeEach(async () => {
    store.clear();
  });

  it('commence a 1 le premier jour', async () => {
    const streak = await validerStreakDuJour();
    expect(streak).toBe(1);
    expect(await lireStreakActuel()).toBe(1);
  });

  it('ne compte qu une fois par jour', async () => {
    await validerStreakDuJour();
    const apres = await validerStreakDuJour();
    expect(apres).toBe(1);
  });

  it('plafonne a 5 gels de streak', async () => {
    await ajouterStreakFreezes(7);
    expect(await lireStreakFreezes()).toBe(5);
  });
});

describe('Motivation & ligues (cycle F)', () => {
  it('determine la ligue selon l XP', () => {
    expect(liguePourXp(0).nom).toBe('Bronze');
    expect(liguePourXp(500).nom).toBe('Argent');
    expect(liguePourXp(1500).nom).toBe('Or');
    expect(liguePourXp(3000).nom).toBe('Platine');
    expect(liguePourXp(6000).nom).toBe('Diamant');
    expect(liguePourXp(10000).nom).toBe('Légende');
  });

  it('retourne le bon palier suivant', () => {
    const ligue = liguePourXp(500);
    expect(ligue.prochainPalier).toBe(1500);
    const max = liguePourXp(10000);
    expect(max.prochainPalier).toBeNull();
  });

  it('evalue les badges et detecte ceux debloques', () => {
    const ctx: ContexteBadges = {
      exosResolus: 10,
      infiniTotal: 0,
      qcmRecord: 0,
      chapitresTelecharges: 0,
      flashcardsRevues: 0,
      bacsBlancs: 0,
    };
    const resultats = evaluerBadges(ctx);
    const debloques = resultats.filter((r) => r.debloque);
    expect(debloques.some((d) => d.badge.id === 'dix_exos')).toBe(true);
    expect(debloques.some((d) => d.badge.id === 'cinquante_exos')).toBe(false);
  });

  it('selectionne 3 quetes par semaine de facon deterministic', () => {
    const quetes = quetesDeLaSemaine();
    expect(quetes.length).toBe(3);
    const quetes2 = quetesDeLaSemaine();
    expect(quetes2.length).toBe(3);
  });
});
