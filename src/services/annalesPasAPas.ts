// ANNALES PAS-À-PAS (amélioration 28) : démarche complète, pas juste la réponse
export interface EtapeCorrection {
  enonce: string;
  etapes: string[];
  reponseFinale: string;
  matiere: string;
  annee: string;
}

export const ANNALES_PAS_A_PAS: EtapeCorrection[] = [
  {
    matiere: 'Mathématiques',
    annee: 'BAC C — type',
    enonce: 'Résoudre dans ℝ : 2x² − 5x + 2 = 0',
    etapes: [
      '1. Identifier : a = 2, b = −5, c = 2 → équation du second degré.',
      '2. Calculer le discriminant : Δ = b² − 4ac = 25 − 16 = 9 > 0.',
      '3. Δ > 0 → deux racines réelles distinctes.',
      '4. x₁ = (−b − √Δ)/(2a) = (5 − 3)/4 = 1/2.',
      '5. x₂ = (−b + √Δ)/(2a) = (5 + 3)/4 = 2.',
    ],
    reponseFinale: 'S = { 1/2 ; 2 }',
  },
  {
    matiere: 'Mathématiques',
    annee: 'BAC D — type',
    enonce: 'Étudier les variations de f(x) = x³ − 3x sur ℝ',
    etapes: [
      '1. f est dérivable sur ℝ (polynôme).',
      '2. f\'(x) = 3x² − 3 = 3(x − 1)(x + 1).',
      '3. Racines de f\' : x = −1 et x = 1.',
      '4. Signe : f\' > 0 sur ]−∞;−1[ et ]1;+∞[ ; f\' < 0 sur ]−1;1[.',
      '5. Tableau : f croissante, max local f(−1) = 2, min local f(1) = −2.',
    ],
    reponseFinale: 'f croissante sur ]−∞;−1] et [1;+∞[, décroissante sur [−1;1].',
  },
  {
    matiere: 'Physique-Chimie',
    annee: 'BAC C/D — type',
    enonce: 'Calculer la masse molaire de Ca(OH)₂ (Ca=40, O=16, H=1)',
    etapes: [
      '1. Décomposer : 1 Ca + 2 O + 2 H.',
      '2. M(Ca) = 40 g/mol.',
      '3. M(2×O) = 2 × 16 = 32 g/mol.',
      '4. M(2×H) = 2 × 1 = 2 g/mol.',
      '5. Additionner : 40 + 32 + 2.',
    ],
    reponseFinale: 'M(Ca(OH)₂) = 74 g/mol',
  },
  {
    matiere: 'SVT',
    annee: 'BAC D — type',
    enonce: 'Un ADN contient 30 % d\'adénine. Quels sont les % des autres bases ?',
    etapes: [
      '1. Règle de Chargaff : A = T (complémentarité).',
      '2. Donc T = 30 %.',
      '3. A + T = 60 % → G + C = 100 − 60 = 40 %.',
      '4. G = C (complémentarité) → G = C = 20 %.',
    ],
    reponseFinale: 'A = T = 30 % ; G = C = 20 %.',
  },
];

/** Retourne les corrections pas-à-pas filtrables par matière. */
export function annalesParMatiere(matiere?: string): EtapeCorrection[] {
  if (!matiere) return ANNALES_PAS_A_PAS;
  return ANNALES_PAS_A_PAS.filter((a) => a.matiere === matiere);
}