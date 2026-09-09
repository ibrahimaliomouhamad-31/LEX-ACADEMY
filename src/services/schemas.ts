// SCHÉMAS ANNOTÉS : figures texte générées localement (amélioration 26 + cycle A)
// 12 schémas couvrant maths, PC et SVT. 100% hors-ligne.

export interface Schema {
  titre: string;
  art: string;
  legende: string;
}

const SCHEMAS: { motsCles: string[]; schema: Schema }[] = [
  {
    motsCles: ['atome', 'électron', 'noyau', 'ion'],
    schema: {
      titre: "Structure de l'atome",
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
        "      4│     __/   ← tangente (pente = f'(a))",
        '      2│   _/',
        '      ─└─┴──────┴──→ x',
        '         a',
      ].join('\n'),
      legende: "f'(a) = pente de la tangente en a : positive = croissante, négative = décroissante.",
    },
  },
  {
    motsCles: ['triangle', 'théorème', 'pythagore'],
    schema: {
      titre: 'Triangle rectangle',
      art: [
        '        |╲',
        '        | ╲',
        '  côté  |  ╲  hypoténuse',
        '        |___╲',
        '       angle droit',
      ].join('\n'),
      legende: "Pythagore : hypoténuse² = côté1² + côté2². L'hypoténuse est face à l'angle droit.",
    },
  },
  {
    motsCles: ['cercle', 'trigonom', 'sinus', 'cosinus'],
    schema: {
      titre: 'Cercle trigonométrique',
      art: [
        '        y',
        '        │      M (cos x ; sin x)',
        '     ╭──┼──● M',
        '     │  │ ╱',
        '     │  │╱   ← angle x (sens direct)',
        '     ╰──●───────── x',
        '     cos x    sin x',
      ].join('\n'),
      legende: 'Cercle de rayon 1 : cos x = abscisse de M, sin x = ordonnée. Identité : sin²x + cos²x = 1. Un tour = 2π rad.',
    },
  },
  {
    motsCles: ['vecteur', 'chasles', 'somme vectorielle', 'translation'],
    schema: {
      titre: 'Somme de deux vecteurs',
      art: [
        '   u →       v →       u + v',
        '   ───►      ───►      ──────►',
        '   A ●──────►●──────►● B',
        '      u        v',
      ].join('\n'),
      legende: 'Relation de Chasles : AB + BC = AC. On met v au bout de u. Différence : u − v = u + (−v).',
    },
  },
  {
    motsCles: ['mole', 'concentration', 'molaire', 'solution', 'dilution'],
    schema: {
      titre: 'Mole et concentration',
      art: [
        '   n = m / M         C = n / V',
        '   ┌───────────┐',
        '   │  ~~~~~~~~ │ ← solution (V en L)',
        '   │   soluté  │ ← n moles dissoutes',
        '   └───────────┘',
        "   1 mole = 6,02×10²³ entités (constante d'Avogadro)",
      ].join('\n'),
      legende: 'n (mol) = m (g) / M (g/mol). Concentration C = n / V (mol/L). Convertir TOUJOURS mL → L avant C.',
    },
  },
  {
    motsCles: ['poids', 'force', 'newton', 'gravit', 'équilibre'],
    schema: {
      titre: 'Bilan des forces',
      art: [
        '          ↑ N (réaction du support)',
        '          │',
        '      ┌───┴───┐',
        '  f ← │ corps │  m',
        '      └───┬───┘',
        '          │',
        '          ↓ P = m·g',
      ].join('\n'),
      legende: "Poids P = m·g (g ≈ 9,8 N/kg). Immobile ou vitesse constante : ΣF = 0 (principe d'inertie). Plan incliné : décomposer P.",
    },
  },
  {
    motsCles: ['suite', 'arithmétique', 'géométrique', 'raison'],
    schema: {
      titre: 'Suites : arithmétique vs géométrique',
      art: [
        '  Arithmétique (on AJOUTE r)    Géométrique (on MULTIPLIE par q)',
        '  u0──u1──u2──u3                u0──u1──u2──u3',
        '   +r  +r  +r                    ×q  ×q  ×q',
        '  u(n) = u0 + n·r               u(n) = u0·q^n',
      ].join('\n'),
      legende: 'Arithmétique : u(n+1) = u(n) + r (linéaire). Géométrique : u(n+1) = q·u(n) (exponentiel). Reconnaître : u(n+1) − u(n) constant = arithmétique ; u(n+1)/u(n) constant = géométrique.',
    },
  },
  {
    motsCles: ['exponentielle', 'logarithme', 'croissance'],
    schema: {
      titre: 'e^x et ln x',
      art: [
        '  y                    y',
        '  │      ╱ eˣ          │ ╲＿＿ ln x',
        '  │    ╱               │＿＿   ╲',
        '  │  ╱                 │    ＼＿',
        '  └────────── x        └───────── x',
        '  passe par (0 ; 1)    passe par (1 ; 0)',
      ].join('\n'),
      legende: 'eˣ : définie sur ℝ, passe par (0 ; 1), croît très vite. ln x : définie sur ]0 ; +∞[, passe par (1 ; 0). Fonctions réciproques : ln(eˣ) = x.',
    },
  },
  {
    motsCles: ['neurone', 'synapse', 'influx', 'nerf', 'myéline'],
    schema: {
      titre: 'Le neurone',
      art: [
        '  dendrites   corps cellulaire   axone        synapse',
        '    ◉◉◉           ┌──┐         ▔▔▔▔▔▔▔    →→→  ○',
        '     ╲────────────│  │────────────────────────  muscle / autre neurone',
        '           influx nerveux →→→   (gaine de myéline)',
      ].join('\n'),
      legende: "Le neurone REÇOIT par les dendrites, INTÈGRE dans le corps cellulaire, TRANSMET le long de l'axone jusqu'à la synapse (neurotransmetteurs).",
    },
  },
  {
    motsCles: ['circuit', 'ohm', 'résistance', 'intensité', 'tension', 'électri', 'ampèremètre'],
    schema: {
      titre: 'Circuit électrique (loi d\'Ohm)',
      art: [
        '    ┌──(A)──┐      (A) ampèremètre : EN SÉRIE',
        '    │       │',
        '   ─┴─     (V)     (V) voltmètre : EN DÉRIVATION',
        '    │       │',
        '    └──(R)──┘',
        '    U = R·I',
      ].join('\n'),
      legende: "Loi d'Ohm : U = R·I (V, Ω, A). En série : même intensité partout. En dérivation : même tension aux bornes.",
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