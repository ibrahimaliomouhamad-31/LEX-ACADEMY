import { describe, it, expect } from '@jest/globals';
import { extraireMicroNotions, motsClesPourNotion } from '../services/microNotions';

describe('extraireMicroNotions', () => {
  it('extrait plusieurs micro-notions à partir d\'un cours structuré', () => {
    const cours = [
      'I. Définition d\'une fonction',
      'Une fonction associe à chaque nombre une unique image.',
      'II. Limite d\'une fonction',
      'On étudie le comportement en l\'infini.',
      'III. Continuité',
      'Une fonction continue se trace sans lever le stylo.',
      'IV. Dérivée',
      'La dérivée mesure le taux de variation instantané.',
      'V. Théorème des valeurs intermédiaires',
      'Toute valeur entre deux images est atteinte.',
      'VI. Suites arithmétiques',
      'La différence entre deux termes consécutifs est constante.',
      'VII. Suites géométriques',
      'Le rapport entre deux termes consécutifs est constant.',
      'VIII. Intégrale',
      'L\'intégrale calcule l\'aire sous la courbe.',
      'IX. Primitive',
      'Une primitive est une fonction dont la dérivée est donnée.',
      'X. Exponentielle',
      'La fonction exponentielle a des propriétés remarquables.',
      'XI. Logarithme',
      'Le logarithme est la réciproque de l\'exponentielle.',
      'XII. Nombres complexes',
      'On étend les nombres réels avec le nombre i.',
      'XIII. Probabilités',
      'On mesure la chance qu\'un événement se produise.',
      'XIV. Statistiques',
      'On résume des données par moyenne et écart-type.',
      'XV. Vecteurs',
      'On représente des translations et directions dans le plan.',
    ].join('\n');

    const notions = extraireMicroNotions(cours);
    expect(notions.length).toBeGreaterThanOrEqual(5);
    // Chaque notion doit être structurée
    expect(notions[0].titre.length).toBeGreaterThan(0);
    expect(Array.isArray(notions[0].motsCles)).toBe(true);
  });

  it('retourne un tableau vide pour du contenu vide ou inconnu', () => {
    expect(extraireMicroNotions('')).toEqual([]);
    expect(extraireMicroNotions(undefined as unknown as string)).toEqual([]);
  });

  it('dédoublonne les titres identiques', () => {
    const cours = 'I. Nombres\npremière ligne\nI. Nombres\ndeuxième ligne';
    const notions = extraireMicroNotions(cours);
    const titres = notions.map((n) => n.titre);
    expect(new Set(titres).size).toBe(titres.length);
  });
});

describe('motsClesPourNotion', () => {
  it('ajoute des mots-clés pertinents selon le titre', () => {
    const notion = { id: 'notion_0', titre: 'Dérivée et dérivation', motsCles: [], extrait: '', ordre: 0, maitrise: 0 };
    const mots = motsClesPourNotion(notion);
    // Le thème 'dérivé' doit déclencher l'ajout des mots-clés d'analyse
    expect(mots.some((m) => m.includes('derive') || m.includes('pente') || m.includes('taux'))).toBe(true);
  });

  it('garde les mots-clés de base sans doublon', () => {
    const notion = { id: 'notion_1', titre: 'Équations', motsCles: ['equation', 'resolution'], extrait: '', ordre: 0, maitrise: 0 };
    const mots = motsClesPourNotion(notion);
    expect(new Set(mots).size).toBe(mots.length);
  });
});