// SCHÉMAS ANNOTÉS : figures texte générées localement (amélioration 26)

export interface Schema {
  titre: string;
  art: string;
  legende: string;
}

const SCHEMAS: { motsCles: string[]; schema: Schema }[] = [
  {
    motsCles: ['atome', 'électron', 'noyau', 'ion'],
    schema: {
      titre: 'Structure de l\'atome',
      art: [
        '        + + + +',
        '      +  NOYAU  +     ← protons (+) et neutrons',
        '        + + + +',
        '     e-            e-  ← électrons (-) sur couches',
        '          e-',
      ].join('\n'),
      legende: 'Le noyau (protons + neutrons) concentre la masse ; les électrons occupent les couches K, L, M.',
    },
  },
  {
    motsCles: ['cellule', 'mitose', 'adn', 'chromosome'],
    schema: {
      titre: 'Cellule et mitose',
      art: [
        '  ┌───────────┐     ┌──┐ ┌──┐',
        '  │  ●  ●     │ →   │●●│ │●●│   ← chromosomes dupliqués',
        '  │  noyau    │     │  │ │  │      séparés en 2 cellules',
        '  └───────────┘     └──┘ └──┘',
      ].join('\n'),
      legende: 'Interphase (ADN copié) → Prophase → Métaphase → Anaphase → Télophase : 2 cellules filles identiques.',
    },
  },
  {
    motsCles: ['fonction', 'courbe', 'dérivée', 'tangente'],
    schema: {
      titre: 'Courbe et tangente',
      art: [
        '        y',
        '      6│        ___‾‾',
        '      4│     __/   ← tangente (pente = f\'(a))',
        '      2│   _/',
        '      ─└─┴──────┴──→ x',
        '         a',
      ].join('\n'),
      legende: 'f\'(a) = pente de la tangente en a : positive = fonction croissante, négative = décroissante.',
    },
  },
  {
    motsCles: ['triangle', 'théorème', 'pythagore'],
    schema: {
      titre: 'Triangle rectangle',
      art: [
        '        |\\',
        '        | \\',
        '  côté  |  \\  hypoténuse',
        '        |___\\',
        '       angle droit',
      ].join('\n'),
      legende: 'Pythagore : hypoténuse² = côté1² + côté2². L\'hypoténuse est face à l\'angle droit.',
    },
  },
];

/** Trouve un schéma pertinent pour un chapitre (null sinon). */
export function schemaPourChapitre(titre: string): Schema | null {
  const bas = (titre || '').toLowerCase();
  for (const s of SCHEMAS) {
    if (s.motsCles.some((m) => bas.includes(m))) return s.schema;
  }
  return null;
}

/** Rendu texte du schéma à insérer dans un cours enrichi. */
export function rendreSchema(s: Schema): string {
  return `📐 ${s.titre}\n${s.art}\n➡️ ${s.legende}`;
}