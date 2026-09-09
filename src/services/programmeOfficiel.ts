/**
 * 📘 PROGRAMME OFFICIEL DU NIGER — Second cycle (Terminale C / D)
 *
 * Extrait du document officiel « Programmes de l'Enseignement Secondaire
 * Général — Second Cycle » (Ministère des Enseignements Secondaires du Niger).
 * Ici : les compétences (contenus/objectifs) réels des Terminales C et D,
 * réparties en micro-compétences pour l'auto-évaluation (amélioration 3) et le
 * glossaire scientifique (amélioration 29).
 *
 * Source : NOUVEAUX_PROGRAMMES_DENSEIGNEMENT_SECOND_CYCLE.pdf (pages 228-245).
 */

export interface CompetenceOfficielle {
  id: string;
  matiere: string;
  filiere: 'C' | 'D' | 'C/D';
  theme: string;
  competence: string;
  notions: string[];
}

export const PROGRAMME_TERMINALE_C: CompetenceOfficielle[] = [
  // Organisation des calculs — Calculs numériques (48h)
  {
    id: 'TC-calc', matiere: 'Mathématiques', filiere: 'C',
    theme: 'Calculs numériques',
    competence: 'Organiser les calculs numériques sur les suites réelles',
    notions: ['suites', 'limite de suite', 'convergence', 'théorèmes de comparaison', 'calculs numériques'],
  },
  {
    id: 'TC-complexes', matiere: 'Mathématiques', filiere: 'C',
    theme: 'Nombres complexes',
    competence: 'Manipuler les nombres complexes sous leurs différentes formes',
    notions: ['corps des nombres complexes', 'forme algébrique', 'module', 'argument', 'forme trigonométrique', 'équations du second degré'],
  },
  {
    id: 'TC-barycentre', matiere: 'Mathématiques', filiere: 'C',
    theme: 'Géométrie plane (60h)',
    competence: 'Utiliser les calculs barycentriques et les transformations du plan',
    notions: ['barycentre', 'similitudes directes', 'similitudes indirectes', 'isométries', 'angles orientés'],
  },
  {
    id: 'TC-espace', matiere: 'Mathématiques', filiere: 'C',
    theme: 'Géométrie dans l\'espace (32h)',
    competence: 'Étudier les applications affines et les positions dans l\'espace',
    notions: ['applications affines', 'droites', 'plans', 'orthogonalité', 'projections'],
  },
  {
    id: 'TC-limites', matiere: 'Mathématiques', filiere: 'C',
    theme: 'Limites et continuité',
    competence: 'Étudier limxité, continuité et prolongement des fonctions',
    notions: ['limite à gauche', 'limite à droite', 'continuité', 'prolongement par continuité', 'théorème des valeurs intermédiaires'],
  },
  {
    id: 'TC-expo', matiere: 'Mathématiques', filiere: 'C',
    theme: 'Fonctions exponentielles',
    competence: 'Étudier la fonction exponentielle et ses applications',
    notions: ['exponentielle de base e', 'nombre e', 'propriétés', 'représentation graphique', 'équations'],
  },
  {
    id: 'TC-log', matiere: 'Mathématiques', filiere: 'C',
    theme: 'Fonctions logarithmes',
    competence: 'Maîtriser les fonctions logarithmes et leurs équations',
    notions: ['logarithme népérien', 'logarithme décimal', 'propriétés algébriques', 'équations', 'inéquations'],
  },
  {
    id: 'TC-proba', matiere: 'Mathématiques', filiere: 'C',
    theme: 'Probabilité sur un ensemble fini',
    competence: 'Calculer des probabilités sur un univers fini',
    notions: ['probabilité', 'événement', 'loi de probabilité', 'variable aléatoire', 'résultat simple'],
  },
  {
    id: 'TC-stats', matiere: 'Mathématiques', filiere: 'C',
    theme: 'Statistique à deux variables',
    competence: 'Ajuster un nuage de points et interpréter une corrélation',
    notions: ['nuage de points', 'point moyen', 'droite de régression', 'coefficient de corrélation'],
  },
];
export const PROGRAMME_TERMINALE_D: CompetenceOfficielle[] = [
  {
    id: 'TD-corp', matiere: 'Mathématiques', filiere: 'D',
    theme: 'Corps des nombres',
    competence: 'Manipuler les corps de nombres et le calcul numérique',
    notions: ['nombres réels', 'nombres complexes', 'calculs numériques'],
  },
  {
    id: 'TD-suites', matiere: 'Mathématiques', filiere: 'D',
    theme: 'Suites numériques',
    competence: 'Étudier les suites et leurs limites',
    notions: ['suites', 'limite de suite', 'suites convergentes', 'théorèmes de comparaison'],
  },
  {
    id: 'TD-application', matiere: 'Mathématiques', filiere: 'D',
    theme: 'Applications affines du plan (9h)',
    competence: 'Étudier les similitudes et transformations du plan',
    notions: ['similitudes', 'applications affines', 'isométries'],
  },
  {
    id: 'TD-expo', matiere: 'Mathématiques', filiere: 'D',
    theme: 'Fonction exponentielle',
    competence: 'Étudier la fonction exponentielle et ses applications',
    notions: ['exponentielle', 'définition', 'représentation graphique', 'nombre e'],
  },
  {
    id: 'TD-log', matiere: 'Mathématiques', filiere: 'D',
    theme: 'Fonctions logarithmes',
    competence: 'Maîtriser les logarithmes et résoudre leurs équations',
    notions: ['logarithme', 'propriétés', 'équations', 'inéquations'],
  },
  {
    id: 'TD-integ', matiere: 'Mathématiques', filiere: 'D',
    theme: 'Calcul intégral',
    competence: 'Calculer des intégrales et aires sous une courbe',
    notions: ['intégrale', 'primitive', 'fonction continue', 'aire sous la courbe', 'propriétés'],
  },
  {
    id: 'TD-proba', matiere: 'Mathématiques', filiere: 'D',
    theme: 'Probabilité conditionnelle',
    competence: 'Calculer des probabilités conditionnelles et événements indépendants',
    notions: ['probabilité conditionnelle', 'événements indépendants', 'produit d\'espaces probabilisés'],
  },
];

/** Compétences « socle » communes aux deux filières (Programme officiel Niger) */
export const PROGRAMME_COMMUN_C_D: CompetenceOfficielle[] = [
  {
    id: 'CD-vecteur', matiere: 'Mathématiques', filiere: 'C/D',
    theme: 'Outils vectoriels',
    competence: 'Utiliser vecteurs et repères pour résoudre des problèmes',
    notions: ['vecteur', 'repère', 'coordonnées', 'colinéarité', 'calcul vectoriel'],
  },
  {
    id: 'CD-fonctions', matiere: 'Mathématiques', filiere: 'C/D',
    theme: 'Étude de fonctions',
    competence: 'Étudier les variations et tracer les courbes de fonctions usuelles',
    notions: ['fonction', 'tableau de variations', 'dérivée', 'asymptote', 'représentation graphique'],
  },
  {
    id: 'CD-trigo', matiere: 'Mathématiques', filiere: 'C/D',
    theme: 'Trigonométrie',
    competence: 'Résoudre équations et inéquations trigonométriques',
    notions: ['sinus', 'cosinus', 'tangente', 'équation trigonométrique', 'inéquation', 'formules d\'addition'],
  },
];

/** Toutes les compétences officielles, triées. */
export function toutesCompetences(filiere?: 'C' | 'D'): CompetenceOfficielle[] {
  const base = [...PROGRAMME_COMMUN_C_D];
  if (!filiere || filiere === 'C') base.push(...PROGRAMME_TERMINALE_C);
  if (!filiere || filiere === 'D') base.push(...PROGRAMME_TERMINALE_D);
  return base;
}
/** Glossaire : vocabulaire scientifique réelle du Niger, par matière. */
export interface TermeGlossaire {
  terme: string;
  definition: string;
  matiere: string;
}

export const GLOSSAIRE_NIGER: TermeGlossaire[] = [
  { terme: 'Nombre complexe', definition: 'Nombre de la forme z = a + ib où a et b sont réels et i² = -1. Corps des nombres complexes introduit en Terminale C.', matiere: 'Mathématiques' },
  { terme: 'Module d\'un complexe', definition: 'Distance du point M(z) à l\'origine : |z| = √(a² + b²).', matiere: 'Mathématiques' },
  { terme: 'Argument', definition: 'Angle orienté θ défini par cosθ = a/|z| et sinθ = b/|z|.', matiere: 'Mathématiques' },
  { terme: 'Barycentre', definition: 'Point pondéré G tel que la somme vectorielle des masses s\'annule ; outil central de la géométrie plane de Terminale C.', matiere: 'Mathématiques' },
  { terme: 'Similitude directe', definition: 'Transformation du plan conservant les angles et multipliant les distances par un facteur k (rotation + homothétie).', matiere: 'Mathématiques' },
  { terme: 'Droite de régression', definition: 'Droite qui ajuste au mieux un nuage de points (méthode des moindres carrés), utilisée en statistique à deux variables.', matiere: 'Mathématiques' },
  { terme: 'Coefficient de corrélation', definition: 'Nombre r entre -1 et 1 mesurant la force du lien linéaire entre deux séries statistiques.', matiere: 'Mathématiques' },
  { terme: 'Probabilité conditionnelle', definition: 'Probabilité P(A|B) = P(A∩B)/P(B) : probabilité de A sachant que B est réalisé (Terminale D).', matiere: 'Mathématiques' },
  { terme: 'Variable aléatoire', definition: 'Application qui associe un nombre réel à chaque issue d\'une expérience aléatoire ; permet de définir une loi de probabilité.', matiere: 'Mathématiques' },
  { terme: 'Intégrale', definition: 'Aire algébrique sous la courbe d\'une fonction continue ; F(b)-F(a) où F est une primitive (Terminale D).', matiere: 'Mathématiques' },
  { terme: 'Limite d\'une suite', definition: 'Valeur L vers laquelle tendent les termes uₙ quand n croît indéfiniment.', matiere: 'Mathématiques' },
  { terme: 'Théorème des valeurs intermédiaires', definition: 'Si f est continue sur [a;b], alors f prend toute valeur comprise entre f(a) et f(b).', matiere: 'Mathématiques' },
];

/**
 * Cherche le terme le plus proche (simple matcher) dans le glossaire.
 * Utilisé pour proposer une fiche quand on cherche un mot.
 */
export function chercherGlossaire(requete: string): TermeGlossaire[] {
  const q = (requete || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!q.trim()) return [];
  return GLOSSAIRE_NIGER.filter((t) =>
    t.terme.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
    t.matiere.toLowerCase().includes(q)
  );
}