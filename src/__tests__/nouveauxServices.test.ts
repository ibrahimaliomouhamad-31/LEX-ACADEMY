// Mock in-memory d'AsyncStorage (environnement node sans React Native)
const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: jest.fn(async (k: string) => { store.delete(k); }),
  },
}));

import { messageAutorise, GROUPES_DISPONIBLES } from '../services/groupesEntraide';
import { modererFiche } from '../services/moderationFiches';
import { compresserTexte, planifierPrechargement } from '../services/prechargement';
import { streakAuthentique, scellerStreak, signalerAlteration } from '../services/integrite';
import { genererSectionsCours } from "../services/enrichirCours";

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
    const long = 'a '.repeat(200);
    expect(compresserTexte(long, true).length).toBeLessThan(compresserTexte(long, false).length);
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
