import { describe, it, expect } from '@jest/globals';
import { prioriserExercices, difficulteRecommandee, libelleRecommandation } from '../services/selectionAdaptive';
import type { LexStats } from '../services/statsSuivi';

function statsAvec(tentatives: LexStats['tentatives']): LexStats {
  return {
    tentatives,
    chapitres: {},
    activiteJour: {},
    totalTentes: 0,
    totalReussis: 0,
  };
}

describe('prioriserExercices', () => {
  it('met la zone proximale (40–70 %) avant les jamais tentés', () => {
    const stats = statsAvec({
      exo_zone: { total: 10, reussis: 5 }, // 50 % → optimal
    });
    const liste = [
      { id: 'exo_maitrise', difficulte: 1 },
      { id: 'exo_zone', difficulte: 1 },
      { id: 'exo_jamais', difficulte: 1 },
    ];
    const tries = prioriserExercices(liste, stats);
    expect(tries[0].id).toBe('exo_zone');
  });

  it('relègue les exercices maîtrisés (> 90 %) en fin de liste', () => {
    const stats = statsAvec({
      exo_facile: { total: 10, reussis: 10 },
    });
    const liste = [
      { id: 'exo_facile', difficulte: 1 },
      { id: 'exo_nouveau', difficulte: 1 },
    ];
    const tries = prioriserExercices(liste, stats);
    expect(tries[tries.length - 1].id).toBe('exo_facile');
  });

  it('ne modifie pas la liste d’origine', () => {
    const stats = statsAvec({});
    const liste = [{ id: 'a' }, { id: 'b' }];
    prioriserExercices(liste, stats);
    expect(liste[0].id).toBe('a');
  });
});

describe('difficulteRecommandee', () => {
  it('recommande ★ quand peu de données', () => {
    expect(difficulteRecommandee(statsAvec({}), 'chap')).toBe(1);
  });

  it('recommande ★★★ quand l’élève réussit très bien', () => {
    const stats = statsAvec({});
    stats.chapitres = {
      chap: { total: 10, reussis: 9, parDifficulte: {} },
    };
    expect(difficulteRecommandee(stats, 'chap')).toBe(3);
  });

  it('recommande ★★ dans la zone idéale', () => {
    const stats = statsAvec({});
    stats.chapitres = {
      chap: { total: 10, reussis: 6, parDifficulte: {} },
    };
    expect(difficulteRecommandee(stats, 'chap')).toBe(2);
  });
});

describe('libelleRecommandation', () => {
  it('produit un message lisible pour chaque niveau', () => {
    expect(libelleRecommandation(3)).toContain('★★★');
    expect(libelleRecommandation(2)).toContain('★★');
    expect(libelleRecommandation(1)).toContain('★');
  });
});