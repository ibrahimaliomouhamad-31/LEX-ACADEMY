import { describe, expect, it } from '@jest/globals';
import {
  analyserMarkdown,
  contientMarkdown,
  decouperCellules,
  estSeparateurTableau,
  segmentsInline,
} from '../services/markdownLex';

// ─── TABLEAUX (le point faible des réponses brutes : « | a | b | ») ──────────
describe('markdownLex — tableaux', () => {
  it('reconnaît un tableau GFM complet (en-tête + lignes)', () => {
    const blocs = analyserMarkdown([
      '| Grandeur | Formule | Unité |',
      '|---|---|---|',
      '| Poids | P = m.g | N |',
      '| Vitesse | v = d/t | m/s |',
    ].join('\n'));

    expect(blocs).toEqual([
      {
        type: 'tableau',
        entetes: ['Grandeur', 'Formule', 'Unité'],
        lignes: [
          ['Poids', 'P = m.g', 'N'],
          ['Vitesse', 'v = d/t', 'm/s'],
        ],
      },
    ]);
  });

  it('complète les lignes incomplètes (jamais de cellule manquante)', () => {
    const blocs = analyserMarkdown('| a | b | c |\n|---|---|---|\n| 1 | 2 |\n| 3 |');
    expect(blocs[0]).toEqual({
      type: 'tableau',
      entetes: ['a', 'b', 'c'],
      lignes: [['1', '2', ''], ['3', '', '']],
    });
  });

  it('SANS ligne de séparation, « | » reste du texte (pas de faux tableau)', () => {
    const blocs = analyserMarkdown('| pas | un tableau |');
    expect(blocs).toHaveLength(1);
    expect(blocs[0].type).toBe('paragraphe');
  });

  it('détecte la ligne de séparation avec alignements (:---:)', () => {
    expect(estSeparateurTableau('| :--- | :---: | ---: |')).toBe(true);
    expect(estSeparateurTableau('| a | b |')).toBe(false);
    expect(estSeparateurTableau(undefined)).toBe(false);
  });

  it('découpe les cellules en ignorant les barres périphériques', () => {
    expect(decouperCellules('| a | b |')).toEqual(['a', 'b']);
    expect(decouperCellules('a | b')).toEqual(['a', 'b']);
  });
});

// ─── BLOCS NATIFS DU PROGRAMME (titres, listes, séparateurs) ────────────────
describe('markdownLex — titres, listes et séparateurs', () => {
  it('lit les titres et borne le niveau à 3', () => {
    expect(analyserMarkdown('# Un')).toEqual([{ type: 'titre', niveau: 1, texte: 'Un' }]);
    expect(analyserMarkdown('## Deux')).toEqual([{ type: 'titre', niveau: 2, texte: 'Deux' }]);
    expect(analyserMarkdown('##### Cinq')).toEqual([{ type: 'titre', niveau: 3, texte: 'Cinq' }]);
  });

  it('sépare liste à puces et liste numérotée', () => {
    const blocs = analyserMarkdown('- a\n- b\n1. c\n2. d');
    expect(blocs).toEqual([
      { type: 'liste', ordonnee: false, items: ['a', 'b'] },
      { type: 'liste', ordonnee: true, items: ['c', 'd'] },
    ]);
  });

  it('reconnaît les séparateurs markdown ET ceux des cours (━━━)', () => {
    expect(analyserMarkdown('---')).toEqual([{ type: 'separateur' }]);
    expect(analyserMarkdown('━━━━━━━━━━━━━')).toEqual([{ type: 'separateur' }]);
    expect(analyserMarkdown('**a**')).not.toEqual([{ type: 'separateur' }]);
  });

  it('colle les lignes d’un même paragraphe', () => {
    const blocs = analyserMarkdown('ligne un\nligne deux\n\nautre paragraphe');
    expect(blocs).toEqual([
      { type: 'paragraphe', texte: 'ligne un\nligne deux' },
      { type: 'paragraphe', texte: 'autre paragraphe' },
    ]);
  });
});

// ─── CODE, CITATIONS, ROBUSTESSE ────────────────────────────────────────────
describe('markdownLex — code, citations et entrées hostiles', () => {
  it('extrait un bloc de code avec son langage', () => {
    const blocs = analyserMarkdown('```ts\nconst a = 1;\n```');
    expect(blocs).toEqual([{ type: 'code', langage: 'ts', contenu: 'const a = 1;' }]);
  });

  it('ne perd pas un bloc de code non fermé (réponse tronquée)', () => {
    const blocs = analyserMarkdown('```\nligne 1\nligne 2');
    expect(blocs).toEqual([{ type: 'code', langage: '', contenu: 'ligne 1\nligne 2' }]);
  });

  it('regroupe une citation multi-lignes', () => {
    expect(analyserMarkdown('> attention\n> au signe')).toEqual([
      { type: 'citation', texte: 'attention au signe' },
    ]);
  });

  it('ne throw jamais et rend une liste vide sur entrée vide', () => {
    expect(analyserMarkdown('')).toEqual([]);
    expect(analyserMarkdown('   \n\n  ')).toEqual([]);
    expect(analyserMarkdown('|')).toEqual([{ type: 'paragraphe', texte: '|' }]);
    expect(analyserMarkdown('#')).toEqual([{ type: 'paragraphe', texte: '#' }]);
  });

  it('détecte la mise en forme riche', () => {
    expect(contientMarkdown('## Titre')).toBe(true);
    expect(contientMarkdown('- puce')).toBe(true);
    expect(contientMarkdown('valeur **importante**')).toBe(true);
    expect(contientMarkdown('réponse simple')).toBe(false);
  });
});

// ─── SEGMENTS INLINE (couleurs appliquées au bon endroit) ───────────────────
describe('markdownLex — segments inline', () => {
  it('découpe gras, italique, code et formule', () => {
    expect(segmentsInline('a **b** *c* `d` $e$ f')).toEqual([
      { type: 'texte', valeur: 'a ' },
      { type: 'gras', valeur: 'b' },
      { type: 'texte', valeur: ' ' },
      { type: 'italique', valeur: 'c' },
      { type: 'texte', valeur: ' ' },
      { type: 'code', valeur: 'd' },
      { type: 'texte', valeur: ' ' },
      { type: 'formule', valeur: 'e' },
      { type: 'texte', valeur: ' f' },
    ]);
  });

  it('gère les formules \\(...\\) et les soulignés', () => {
    expect(segmentsInline('\\(x+1\\) et __fort__')).toEqual([
      { type: 'formule', valeur: 'x+1' },
      { type: 'texte', valeur: ' et ' },
      { type: 'gras', valeur: 'fort' },
    ]);
  });

  it('laisse le texte simple intact (étoiles non appariées)', () => {
    expect(segmentsInline('2 * 3 = 6')).toEqual([{ type: 'texte', valeur: '2 * 3 = 6' }]);
    expect(segmentsInline('')).toEqual([]);
  });
});
