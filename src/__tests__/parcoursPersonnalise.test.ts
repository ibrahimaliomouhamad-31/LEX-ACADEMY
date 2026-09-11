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
jest.mock('../services/userStorage', () => ({
  getCurrentUserId: jest.fn(async () => 'test-user'),
  getUserItem: jest.fn(async () => null),
  setUserItem: jest.fn(async () => {}),
}));

import { describe, it, expect } from '@jest/globals';
import {
  genererParcours, prochaineAction, couleurNiveau, emojiNiveau,
} from '../services/parcoursPersonnalise';

const CHAPITRES = [
  { id: 'chap-a', titre: 'Chapitre A', matiere: 'Maths' },
  { id: 'chap-b', titre: 'Chapitre B', matiere: 'Maths' },
];

describe('genererParcours', () => {
  it('retourne tous non_commences quand aucune stat', async () => {
    const p = await genererParcours(CHAPITRES);
    expect(p.etapes).toHaveLength(2);
    expect(p.resume.nonCommences).toBe(2);
    expect(p.conseil.length).toBeGreaterThan(0);
  });

  it('conseille de commencer quand liste vide', async () => {
    const p = await genererParcours([]);
    expect(p.etapes).toHaveLength(0);
    expect(p.resume.totalChapitres).toBe(0);
  });
});

describe('prochaineAction', () => {
  it('retourne une action pour le chapitre prioritaire', async () => {
    const { etape, action } = await prochaineAction(CHAPITRES);
    expect(etape).not.toBeNull();
    expect(action.length).toBeGreaterThan(0);
  });

  it('gere la liste vide', async () => {
    const { etape } = await prochaineAction([]);
    expect(etape).toBeNull();
  });
});

describe('helpers affichage', () => {
  it('couleurNiveau couvre les 4 niveaux', () => {
    expect(couleurNiveau('faible')).toBe('#EF4444');
    expect(couleurNiveau('moyen')).toBe('#FBBF24');
    expect(couleurNiveau('maitrise')).toBe('#10B981');
    expect(couleurNiveau('non_commence')).toBe('#64748B');
  });

  it('emojiNiveau couvre les 4 niveaux', () => {
    expect(emojiNiveau('faible')).toBeTruthy();
    expect(emojiNiveau('moyen')).toBeTruthy();
    expect(emojiNiveau('maitrise')).toBeTruthy();
    expect(emojiNiveau('non_commence')).toBeTruthy();
  });
});
