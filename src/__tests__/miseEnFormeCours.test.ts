import { describe, expect, it } from '@jest/globals';
import { coursEnMarkdown, decouperCoursEnBlocs } from '../services/miseEnFormeCours';

describe('miseEnFormeCours — style fiche excellence', () => {
  it('structure une theorie brute (filets, chiffres romains, puces)', () => {
    const md = coursEnMarkdown(
      '🎯 OBJECTIF DU CHAPITRE : decrire le mouvement.\n━━━━━━━━━━━━\nI. VECTEURS\nSoit un point M.\n🔹 1. Position\n• x et y\n• v et a',
    );
    expect(md).toContain('🎯 **Objectif** — decrire le mouvement.');
    expect(md).toContain('## I. VECTEURS');
    expect(md).toContain('### 1. Position');
    expect(md).toContain('- x et y');
    expect(md).toContain('---');
  });

  it('encadre les definitions en citation', () => {
    const md = coursEnMarkdown('Définition : une fonction continue se trace sans lever le crayon.');
    expect(md).toContain('> **Définition** — une fonction continue');
  });

  it('ne jette jamais (entree vide ou corrompue)', () => {
    expect(coursEnMarkdown('')).toBe('');
    expect(coursEnMarkdown(undefined)).toBe('');
    expect(coursEnMarkdown(null)).toBe('');
  });

  it('decoupe un vrai chapitre Terminale en 6 blocs ordonnes', () => {
    const blocs = decouperCoursEnBlocs({
      activite: '🌡️ Activité : le thermometre.',
      theorie: '🎯 OBJECTIF : le TVI.\n━━━\nI. CONTINUITE\n🔹 1. Def\n• somme',
      methode_titre: "ALGORITHME D'APPLICATION DU TVI",
      methode_content: 'Étape 1 : continuité.',
      piege: 'Oublier la monotonie.',
      demo: 'Démonstration de la réciproque.',
      exercice_corrige: 'Énoncé : f(x) = x3.',
    });
    expect(blocs.map((b) => b.cle)).toEqual([
      'situation', 'savoirs', 'methode', 'pieges', 'demonstration', 'exercice',
    ]);
    expect(blocs[2].markdown).toContain("ALGORITHME D'APPLICATION DU TVI");
    expect(blocs[3].markdown.startsWith('⚠️')).toBe(true);
  });

  it('omet les blocs absents (aucun titre fantome)', () => {
    const blocs = decouperCoursEnBlocs({ theorie: 'I. SEUL' });
    expect(blocs.map((b) => b.cle)).toEqual(['savoirs']);
  });
});
