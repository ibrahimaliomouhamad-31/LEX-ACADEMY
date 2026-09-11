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

// Mocks natifs
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
  setUserItem: jest.fn(async () => {}),
}));

import { evaluer, formater } from '../services/calculatrice';
import { QCM_SVT, themesSvt } from '../services/qcmSvt';
import { selPourCompte, hacherAvecSel, hacherMotDePasse, genererSel } from '../services/auth';
import { chiffrer, dechiffrer, estChiffre, chiffrerAsync, dechiffrerAsync } from '../services/chiffrement';
import { scellerStreak, streakAuthentique, signalerAlteration } from '../services/integrite';

// ========== CALCULATRICE (cycle H) ==========
describe('Calculatrice (cycle H)', () => {
  it('évalue une addition simple', () => {
    expect(evaluer('2 + 3')).toBe(5);
  });

  it('évalue avec priorités (multiplication avant addition)', () => {
    expect(evaluer('2 + 3 * 4')).toBe(14);
  });

  it('respecte les parenthèses', () => {
    expect(evaluer('(2 + 3) * 4')).toBe(20);
  });

  it('gère la puissance', () => {
    expect(evaluer('2 ^ 3')).toBe(8);
  });

  it('gère le moins unaire', () => {
    expect(evaluer('-3 + 5')).toBe(2);
  });

  it('applique la priorité : -3^2 = -9 (pas 9)', () => {
    expect(evaluer('-3 ^ 2')).toBe(-9);
  });

  it('calcule une racine carrée', () => {
    expect(evaluer('√16')).toBe(4);
  });

  it('calcule sin(0)', () => {
    expect(evaluer('sin(0)')).toBeCloseTo(0, 10);
  });

  it('calcule cos(0)', () => {
    expect(evaluer('cos(0)')).toBeCloseTo(1, 10);
  });

  it('calcule ln(e)', () => {
    expect(evaluer('ln(e)')).toBeCloseTo(1, 10);
  });

  it('calcule log(100)', () => {
    expect(evaluer('log(100)')).toBeCloseTo(2, 10);
  });

  it('calcule exp(0)', () => {
    expect(evaluer('exp(0)')).toBeCloseTo(1, 10);
  });

  it('gère π', () => {
    expect(evaluer('π')).toBeCloseTo(Math.PI, 10);
  });

  it('convertit × et ÷', () => {
    expect(evaluer('6 × 7')).toBe(42);
    expect(evaluer('20 ÷ 4')).toBe(5);
  });

  it('convertit les virgules en points', () => {
    expect(evaluer('3,14 + 1')).toBeCloseTo(4.14, 10);
  });

  it('forme correctement les entiers', () => {
    expect(formater(42)).toBe('42');
  });

  it('forme correctement les décimales', () => {
    const f = formater(3.14159);
    expect(f).toContain('3.14');
  });

  it('lance une erreur pour expression vide', () => {
    expect(() => evaluer('')).toThrow();
  });

  it('lance une erreur pour parenthèse manquante', () => {
    expect(() => evaluer('(2 + 3')).toThrow();
  });

  it('lance une erreur pour caractère invalide', () => {
    expect(() => evaluer('2 + x')).toThrow();
  });

  it('lance une erreur pour jetons restants', () => {
    expect(() => evaluer('2 + 2)')).toThrow();
  });

  it('lance une erreur pour division par zéro', () => {
    expect(() => evaluer('1 / 0')).toThrow();
  });
});

// ========== QCM SVT (cycle H) ==========
describe('QCM SVT (cycle H)', () => {
  it('a au moins 30 questions', () => {
    expect(QCM_SVT.length).toBeGreaterThanOrEqual(30);
  });

  it('toutes les questions ont 4 options', () => {
    for (const q of QCM_SVT) {
      expect(q.options.length).toBe(4);
    }
  });

  it('toutes les questions ont un bonneIndex valide (0-3)', () => {
    for (const q of QCM_SVT) {
      expect(q.bonneIndex).toBeGreaterThanOrEqual(0);
      expect(q.bonneIndex).toBeLessThanOrEqual(3);
    }
  });

  it('toutes les questions ont une explication', () => {
    for (const q of QCM_SVT) {
      expect(q.explication.length).toBeGreaterThan(0);
    }
  });

  it('couvre les 3 niveaux (Seconde, Première, Terminale)', () => {
    const niveaux = new Set(QCM_SVT.map((q) => q.niveau));
    expect(niveaux.has('Seconde')).toBe(true);
    expect(niveaux.has('Première')).toBe(true);
    expect(niveaux.has('Terminale')).toBe(true);
  });

  it('a des thèmes variés', () => {
    const themes = themesSvt();
    expect(themes.length).toBeGreaterThanOrEqual(5);
  });

  it('tous les IDs sont uniques', () => {
    const ids = QCM_SVT.map((q) => q.id);
    const uniques = new Set(ids);
    expect(uniques.size).toBe(ids.length);
  });
});

// ========== AUTH — HACHAGE (cycle H) ==========
describe('Auth — hachage (cycle H)', () => {
  it('génère un sel déterministe par compte', () => {
    const sel1 = selPourCompte('Ibrahim');
    const sel2 = selPourCompte('Ibrahim');
    expect(sel1).toBe(sel2);
  });

  it('normalise la casse et les accents', () => {
    const sel1 = selPourCompte('IBRAHIM');
    const sel2 = selPourCompte('ibrahim');
    const sel3 = selPourCompte('ïbràhîm');
    expect(sel1).toBe(sel2);
    expect(sel2).toBe(sel3);
  });

  it('génère des sels différents pour des noms différents', () => {
    const sel1 = selPourCompte('Ibrahim');
    const sel2 = selPourCompte('Aminata');
    expect(sel1).not.toBe(sel2);
  });

  it('hache avec sel de façon déterministe', () => {
    const h1 = hacherAvecSel('motdepasse123', 'sel-fixé');
    const h2 = hacherAvecSel('motdepasse123', 'sel-fixé');
    expect(h1).toBe(h2);
  });

  it('produit des hachés différents pour des sels différents', () => {
    const h1 = hacherAvecSel('motdepasse', 'sel-A');
    const h2 = hacherAvecSel('motdepasse', 'sel-B');
    expect(h1).not.toBe(h2);
  });

  it('hacherMotDePasse = hacherAvecSel(mdp, selPourCompte(nom))', () => {
    const attendu = hacherAvecSel('secret', selPourCompte('Ibrahim'));
    expect(hacherMotDePasse('Ibrahim', 'secret')).toBe(attendu);
  });

  it('genererSel produit un hexadécimal 32 caractères', () => {
    const sel = genererSel();
    expect(sel).toMatch(/^[0-9a-f]{32}$/);
  });

  it('deux appels à genererSel donnent des valeurs différentes', () => {
    const s1 = genererSel();
    const s2 = genererSel();
    expect(s1).not.toBe(s2);
  });
});

// ========== CHIFFREMENT (cycle H) ==========
describe('Chiffrement LEX1/LEX2 (cycle H)', () => {
  it('LEX1 : chiffrer/déchiffrer est un round-trip', () => {
    const original = 'Bonjour Tessaoua 2026';
    const chiffre = chiffrer(original);
    expect(chiffre).toMatch(/^LEX1:/);
    expect(dechiffrer(chiffre)).toBe(original);
  });

  it('estChiffre détecte LEX1 et LEX2', () => {
    expect(estChiffre(chiffrer('test'))).toBe(true);
    expect(estChiffre('texte en clair')).toBe(false);
    expect(estChiffre('')).toBe(false);
  });

  it('chiffrer préserve les chaînes vides', () => {
    expect(chiffrer('')).toBe('');
  });

  it('dechiffrer retourne le texte brut pour non-chiffré', () => {
    expect(dechiffrer('texte clair')).toBe('texte clair');
  });

  it('LEX2 async : round-trip', async () => {
    const original = 'Cahier secret de l\'élève';
    const chiffre = await chiffrerAsync(original);
    expect(chiffre).toMatch(/^LEX2:/);
    const dechiffre = await dechiffrerAsync(chiffre);
    expect(dechiffre).toBe(original);
  });

  it('LEX2 async : chaine vide préservée', async () => {
    expect(await chiffrerAsync('')).toBe('');
    expect(await dechiffrerAsync('')).toBe('');
  });

  it('dechiffrerAsync tolère un préfixe LEX2 malformé', async () => {
    const resultat = await dechiffrerAsync('LEX2:malformed');
    expect(resultat).toBe('');
  });
});

// ========== INTÉGRITÉ STREAK (cycle H) ==========
describe('Intégrité streak (cycle H)', () => {
  beforeEach(() => {
    store.clear();
  });

  it('scelle et vérifie un streak authentique', async () => {
    await scellerStreak(5, '2026-09-11');
    expect(await streakAuthentique(5, '2026-09-11')).toBe(true);
  });

  it('détecte une altération du streak', async () => {
    await scellerStreak(5, '2026-09-11');
    // Quelqu'un modifie le streak sans recalculer l'empreinte
    expect(await streakAuthentique(999, '2026-09-11')).toBe(false);
  });

  it('première vérification scelle automatiquement', async () => {
    // Aucune empreinte stockée → première fois = sceller + authentique
    expect(await streakAuthentique(3, '2026-09-11')).toBe(true);
    // Vérification suivante avec les mêmes valeurs → authentique
    expect(await streakAuthentique(3, '2026-09-11')).toBe(true);
  });

  it('signalerAlteration réinitialise l\'empreinte', async () => {
    await scellerStreak(7, '2026-09-11');
    await signalerAlteration();
    // Après suppression, toute valeur est considérée comme "première fois"
    expect(await streakAuthentique(0, '2026-09-11')).toBe(true);
  });

  it('détecte un changement de date sans scellement', async () => {
    await scellerStreak(5, '2026-09-11');
    // Même streak mais date différente → incohérent
    expect(await streakAuthentique(5, '2026-09-12')).toBe(false);
  });
});


