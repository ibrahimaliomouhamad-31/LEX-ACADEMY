// ============================================================
// LEX ACADEMY - INJECTION MASSIVE D'EXERCICES (5 classes × 3 matières)
// Chaque exercice est rattaché à un chapitre réel de la collection "cours".
// Format : classe, matiere, chapitre, chapitre_id, difficulte,
//          enonce, bonne_reponse (variantes séparées par |),
//          indice1, indice2, explication
// ============================================================
import { initializeApp } from 'firebase/app';
import { doc, getFirestore, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC3y581S0nHqYfIX4TjvumGKLgpDj1G1dg",
  authDomain: "lex-academy-10eef.firebaseapp.com",
  projectId: "lex-academy-10eef",
  storageBucket: "lex-academy-10eef.firebasestorage.app",
  messagingSenderId: "512518959635",
  appId: "1:512518959635:web:b2463918d2633a4bea85e6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------- Outils ----------------
const EXOS = [];
const COMPTEURS = {};

function pgcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
}
function frac(a, b) {
  const g = pgcd(a, b);
  const n = a / g, d = b / g;
  if (d < 0) return frac(-a, -b);
  return d === 1 ? String(n) : `${n}/${d}`;
}

function add(prefix, classe, matiere, chapitreId, chapitreTitre, difficulte, enonce, rep, i1, i2, expl) {
  const key = prefix;
  COMPTEURS[key] = (COMPTEURS[key] || 0) + 1;
  const id = `${prefix}_exo${COMPTEURS[key]}`;
  EXOS.push({
    id, classe, matiere,
    chapitre: chapitreTitre, chapitre_id: chapitreId,
    difficulte,
    enonce, bonne_reponse: rep,
    indice1: i1, indice2: i2, explication: expl
  });
}

// Créateur de banque : mk('2nde_c_math', 'Seconde C', 'Mathématiques')
const mk = (prefix, classe, matiere) =>
  (n, titre, d, e, r, i1, i2, x) => add(prefix, classe, matiere, `${prefix}_chap${n}`, titre, d, e, r, i1, i2, x);

// ============================================================
// MATHÉMATIQUES - SECONDE C
// ============================================================
const M2 = mk('2nde_c_math', 'Seconde C', 'Mathématiques');
{
  const T = 'Calculs dans ℝ';
  [[1,2,1,3],[2,3,1,6],[3,4,1,2],[1,5,3,10],[5,6,1,4],[1,2,1,4]].forEach(([a,b,c,d]) => {
    const num = a*d + c*b, den = b*d;
    M2(1, T, 1,
      `Calcule ${a}/${b} + ${c}/${d} et donne le résultat sous forme de fraction irréductible (ex : 5/6).`,
      frac(num, den),
      `Mets les deux fractions au même dénominateur avant d'additionner.`,
      `Dénominateur commun : ${den}. Additionne les numérateurs, puis simplifie par le PGCD.`,
      ` ${a}/${b} + ${c}/${d} = ${a*d}/${den} + ${c*b}/${den} = ${num}/${den} = ${frac(num, den)}. 🎓`);
  });
  [{t:"2³ × 2⁴", v:128, r:"2³ × 2⁴ = 2³⁺⁴ = 2⁷ = 128"},
   {t:"3⁵ ÷ 3³", v:9, r:"3⁵ ÷ 3³ = 3⁵⁻³ = 3² = 9"},
   {t:"5² × 5", v:125, r:"5² × 5 = 5²⁺¹ = 5³ = 125"},
   {t:"2⁵", v:32, r:"2⁵ = 2×2×2×2×2 = 32"}].forEach(o => {
    M2(1, T, 1, `Calcule : ${o.t}.`, String(o.v),
      `Utilise les règles sur les puissances : aⁿ × aᵐ = aⁿ⁺ᵐ et aⁿ ÷ aᵐ = aⁿ⁻ᵐ.`,
      `Pour 2⁵, multiplie 2 par lui-même 5 fois.`,
      `${o.r}. ✅`);
  });
  M2(1, T, 1, "Calcule √144 + √25.", "17",
    "Cherche d'abord chaque racine carrée séparément.",
    "√144 = 12 car 12² = 144, et √25 = 5.",
    "√144 + √25 = 12 + 5 = 17. ✅");
}
{
  const T = 'Vecteurs du plan et Barycentre';
  M2(2, T, 1, "Soit A(1 ; 2) et B(4 ; 6). Donne l'abscisse du vecteur AB→.", "3",
    "Formule : AB→ a pour coordonnées (x_B − x_A ; y_B − y_A).",
    "Abscisse = x_B − x_A = 4 − 1.",
    "AB→ (4−1 ; 6−2) = (3 ; 4). Son abscisse est 3. ✅");
  M2(2, T, 1, "Soit A(−1 ; 3) et B(5 ; 1). Donne l'ordonnée du vecteur AB→.", "-2",
    "Ordonnée du vecteur = y_B − y_A.",
    "y_B − y_A = 1 − 3.",
    "AB→ (5−(−1) ; 1−3) = (6 ; −2). Son ordonnée est −2. ✅");
  M2(2, T, 2, "Soit AB→ (3 ; 4). Calcule la norme ‖AB→‖.", "5",
    "‖AB→‖ = √(x² + y²).",
    "Calcule √(3² + 4²) = √(9 + 16).",
    "‖AB→‖ = √25 = 5. (Le triangle 3-4-5 est un grand classique du BAC !) ✅");
  M2(2, T, 2, "Soit AB→ (6 ; 8). Calcule la norme ‖AB→‖.", "10",
    "‖AB→‖ = √(x² + y²).",
    "Calcule √(36 + 64) = √100.",
    "‖AB→‖ = 10. ✅");
  M2(2, T, 2, "Soit AB→ (5 ; 12). Calcule la norme ‖AB→‖.", "13",
    "‖AB→‖ = √(x² + y²).",
    "Calcule √(25 + 144) = √169.",
    "‖AB→‖ = 13. Autre triplet pythagoricien célèbre : 5-12-13. ✅");
}
{
  const T = 'Équations et inéquations du second degré';
  M2(3, T, 1, "Résous x² − 7x + 10 = 0. Donne la plus grande solution.", "5",
    "Calcule le discriminant Δ = b² − 4ac.",
    "Δ = 49 − 40 = 9 > 0 : deux solutions. x = (7 ± 3)/2.",
    "x² − 7x + 10 = 0 : Δ = 9, x₁ = (7−3)/2 = 2 et x₂ = (7+3)/2 = 5. La plus grande est 5. ✅");
  M2(3, T, 1, "Résous x² + x − 12 = 0. Donne la plus grande solution.", "3",
    "Cherche deux nombres dont le produit vaut −12 et la somme −1.",
    "3 × (−4) = −12 et 3 + (−4) = −1. Les racines sont 3 et −4.",
    "x² + x − 12 = (x − 3)(x + 4) = 0, donc x = 3 ou x = −4. La plus grande est 3. ✅");
  M2(3, T, 1, "Calcule le discriminant Δ de x² − 5x + 6 = 0.", "1",
    "Δ = b² − 4ac avec a = 1, b = −5, c = 6.",
    "Δ = (−5)² − 4×1×6 = 25 − 24.",
    "Δ = 1. Comme Δ > 0, l'équation a deux solutions (2 et 3). ✅");
  M2(3, T, 2, "Résous x² − 4x + 4 = 0. Quelle est la racine double ?", "2",
    "Calcule Δ. S'il est nul, il n'y a qu'une solution.",
    "Δ = 16 − 16 = 0, donc x = −b/(2a) = 4/2.",
    "Δ = 0 : la racine double est x = 2. En effet (x − 2)² = 0. ✅");
  M2(3, T, 1, "Résous x² − 9 = 0. Donne la plus grande solution.", "3",
    "Utilise a² − b² = (a − b)(a + b).",
    "x² − 9 = (x − 3)(x + 3) = 0.",
    "x = 3 ou x = −3. La plus grande solution est 3. ✅");
}
{
  const T = "Géométrie dans l'espace";
  M2(4, T, 1, "Un cube a pour arête 3 cm. Calcule son volume en cm³.", "27",
    "Volume du cube = arête³.",
    "Calcule 3³.",
    "V = 3³ = 27 cm³. ✅");
  M2(4, T, 1, "Un pavé droit mesure 2 cm × 3 cm × 4 cm. Calcule son volume en cm³.", "24",
    "Volume du pavé = longueur × largeur × hauteur.",
    "Calcule 2 × 3 × 4.",
    "V = 24 cm³. ✅");
  M2(4, T, 2, "Une pyramide a une base carrée de côté 3 cm et une hauteur de 4 cm. Calcule son volume en cm³.", "12",
    "V = (1/3) × aire de la base × hauteur.",
    "Aire de la base = 3 × 3 = 9. Puis V = (1/3) × 9 × 4.",
    "V = (1/3) × 9 × 4 = 12 cm³. ✅");
}
{
  const T = 'Angles orientés et trigonométrie';
  M2(5, T, 1, "Quelle est la valeur exacte de cos(π/3) ?", "0.5|1/2",
    "Pense au cercle trigonométrique et au triangle équilatéral.",
    "cos(π/3) = cos(60°). C'est la moitié de l'hypoténuse dans un triangle équilatéral de côté 1.",
    "cos(π/3) = 1/2 = 0,5. ✅");
  M2(5, T, 1, "Quelle est la valeur exacte de sin(π/6) ?", "0.5|1/2",
    "π/6 correspond à 30°.",
    "Dans le triangle rectangle associé, le côté opposé vaut la moitié de l'hypoténuse.",
    "sin(π/6) = 1/2 = 0,5. ✅");
  M2(5, T, 1, "Quelle est la valeur exacte de tan(π/4) ?", "1",
    "π/4 correspond à 45°.",
    "tan(π/4) = sin(π/4)/cos(π/4), et les deux valent la même chose.",
    "tan(π/4) = 1. ✅");
  M2(5, T, 1, "Quelle est la valeur de sin(π/2) ?", "1",
    "π/2 correspond à 90°, le point le plus haut du cercle trigonométrique.",
    "À 90°, le sinus est maximal.",
    "sin(π/2) = 1. ✅");
  M2(5, T, 2, "Quel angle du premier quadrant (en radians) a un cosinus nul ?", "pi/2|π/2",
    "Le cosinus est l'abscisse du point sur le cercle.",
    "Cherche où l'abscisse vaut 0 : c'est le point haut du cercle.",
    "cos(π/2) = 0 : la réponse est π/2. ✅");
}
{
  const T = "Fonctions numériques d'une variable réelle";
  M2(6, T, 1, "Soit f(x) = 2x + 3. Calcule f(4).", "11",
    "Remplace x par 4 dans l'expression.",
    "f(4) = 2×4 + 3.",
    "f(4) = 8 + 3 = 11. ✅");
  M2(6, T, 1, "Soit f(x) = 3x − 5. Calcule f(2).", "1",
    "Remplace x par 2.",
    "f(2) = 3×2 − 5.",
    "f(2) = 6 − 5 = 1. ✅");
  M2(6, T, 2, "Soit f(x) = 2x + 6. Quel est l'antécédent de 0 ?", "-3",
    "Cherche x tel que f(x) = 0.",
    "Résous 2x + 6 = 0, donc 2x = −6.",
    "x = −3. L'antécédent de 0 par f est −3. ✅");
  M2(6, T, 1, "Soit f(x) = 5x − 1. Calcule f(0).", "-1",
    "Remplace x par 0.",
    "f(0) = 5×0 − 1.",
    "f(0) = −1 : c'est l'ordonnée à l'origine de la droite. ✅");
}
{
  const T = 'Produit scalaire';
  M2(7, T, 1, "Soit u→(2 ; 3) et v→(1 ; 4). Calcule u→·v→.", "14",
    "u→·v→ = xx' + yy'.",
    "u→·v→ = 2×1 + 3×4.",
    "u→·v→ = 2 + 12 = 14. ✅");
  M2(7, T, 2, "Soit u→(−2 ; 5) et v→(3 ; 1). Calcule u→·v→.", "-1",
    "u→·v→ = xx' + yy'. Attention aux signes !",
    "u→·v→ = (−2)×3 + 5×1 = −6 + 5.",
    "u→·v→ = −1. Négatif : l'angle est obtus. ✅");
  M2(7, T, 1, "Soit u→(0 ; 4) et v→(5 ; 0). Calcule u→·v→.", "0",
    "Applique la formule xx' + yy'.",
    "u→·v→ = 0×5 + 4×0.",
    "u→·v→ = 0 : les vecteurs sont orthogonaux ! C'est la technique pour prouver un angle droit. ✅");
  M2(7, T, 3, "Soit u→(2 ; 3) et v→(k ; −4). Trouve k pour que u→ et v→ soient orthogonaux.", "6",
    "Orthogonaux signifie u→·v→ = 0.",
    "2k + 3×(−4) = 0, donc 2k − 12 = 0.",
    "2k = 12 donc k = 6. ✅");
}
{
  const T = 'Statistique';
  M2(8, T, 1, "Calcule la moyenne des notes : 12 ; 14 ; 16.", "14",
    "Moyenne = somme des valeurs ÷ effectif total.",
    "(12 + 14 + 16)/3 = 42/3.",
    "Moyenne = 14. ✅");
  M2(8, T, 1, "Calcule la moyenne de la série : 8 ; 10 ; 12 ; 14 ; 16.", "12",
    "Additionne tout puis divise par 5.",
    "8+10+12+14+16 = 60, et 60/5.",
    "Moyenne = 12. ✅");
  M2(8, T, 2, "Quelle est la médiane de la série ordonnée : 2 ; 5 ; 7 ; 9 ; 11 ?", "7",
    "La médiane est la valeur centrale d'une série ordonnée.",
    "Il y a 5 valeurs : la médiane est la 3ᵉ.",
    "Médiane = 7. ✅");
  M2(8, T, 2, "Notes et effectifs : 5 (2 élèves), 8 (3 élèves), 10 (5 élèves). Calcule l'effectif total.", "10",
    "L'effectif total est la somme des effectifs.",
    "2 + 3 + 5.",
    "Effectif total = 10 élèves. ✅");
}
{
  const T = 'Transformations du plan';
  M2(9, T, 2, "M(3 ; −2) et son image M' par la symétrie centrale de centre O. Donne l'abscisse de M'.", "-3",
    "La symétrie centrale de centre O renvoie chaque point à son opposé : M' = (−x ; −y).",
    "M' a pour coordonnées (−3 ; 2).",
    "L'abscisse de M' est −3. ✅");
  M2(9, T, 1, "M(3 ; −2) et son image M' par la symétrie axiale d'axe (Ox). Donne l'ordonnée de M'.", "2",
    "La symétrie par rapport à l'axe des abscisses change le signe de l'ordonnée.",
    "M' = (3 ; −(−2)) = (3 ; 2).",
    "L'ordonnée de M' est 2. ✅");
  M2(9, T, 1, "M(1 ; 1) translaté par le vecteur u→(2 ; 5). Donne l'abscisse de l'image M'.", "3",
    "Translation : M' = M + u→ (on ajoute les coordonnées).",
    "Abscisse : 1 + 2.",
    "M' = (3 ; 6), son abscisse est 3. ✅");
}
{
  const T = 'Révisions Générales';
  M2(10, T, 2, "Calcule le PGCD de 12 et 18.", "6",
    "Utilise l'algorithme d'Euclide ou liste les diviseurs communs.",
    "Diviseurs de 12 : 1,2,3,4,6,12. Diviseurs de 18 : 1,2,3,6,9,18. Le plus grand commun est 6.",
    "PGCD(12 ; 18) = 6. ✅");
  M2(10, T, 1, "Développe (x + 3)(x + 5). Quel est le coefficient de x ?", "8",
    "Double distributivité : x×x + x×5 + 3×x + 3×5.",
    "Le coefficient de x est 5 + 3.",
    "(x+3)(x+5) = x² + 8x + 15. Coefficient de x : 8. ✅");
  M2(10, T, 1, "Calcule 1/2 + 1/4 (fraction irréductible).", "3/4",
    "Mets au même dénominateur 4.",
    "1/2 = 2/4, donc 2/4 + 1/4.",
    "3/4. ✅");
}

// ============================================================
// MATHÉMATIQUES - PREMIÈRE C
// ============================================================
const M1C = mk('1ere_c_math', 'Première C', 'Mathématiques');
{
  const T = 'Équations, Inéquations, Polynômes et Systèmes Linéaires';
  M1C(1, T, 1, "Résous x² − 6x + 8 = 0. Quelle est la SOMME des racines ?", "6",
    "Somme des racines = −b/a.",
    "−b/a = 6/1.",
    "Les racines sont 2 et 4 : somme = 6. (Vérifie avec x₁+x₂ = −b/a.) ✅");
  M1C(1, T, 2, "Résous x² − 2x − 8 = 0. Quel est le PRODUIT des racines ?", "-8",
    "Produit des racines = c/a.",
    "c/a = −8/1.",
    "Les racines sont 4 et −2 : produit = −8. ✅");
  M1C(1, T, 1, "Résous 2x² − 8 = 0. Donne la plus grande racine.", "2",
    "Isole x² : c'est une équation du type x² = a.",
    "2x² = 8 donc x² = 4.",
    "x = 2 ou x = −2. La plus grande racine est 2. ✅");
}
{
  const T = 'Généralités sur les Fonctions Numériques';
  M1C(2, T, 2, "Soit f(x) = x² et g(x) = x + 1. Calcule (f∘g)(2).", "9",
    "(f∘g)(2) = f(g(2)) : calcule d'abord g(2).",
    "g(2) = 3, puis f(3) = 3².",
    "(f∘g)(2) = f(3) = 9. ✅");
  M1C(2, T, 2, "Soit f(x) = 2x − 1 et g(x) = x². Calcule (g∘f)(1).", "1",
    "(g∘f)(1) = g(f(1)) : calcule d'abord f(1).",
    "f(1) = 1, puis g(1) = 1².",
    "(g∘f)(1) = g(1) = 1. ✅");
}
{
  const T = 'Applications du Produit Scalaire et du Barycentre';
  M1C(3, T, 3, "Soit u→(1 ; 0) et v→(1 ; √3). Quel est l'angle (en degrés) entre u→ et v→ ?", "60",
    "cos θ = (u→·v→)/(‖u→‖×‖v→‖).",
    "u→·v→ = 1 ; ‖u→‖ = 1 ; ‖v→‖ = 2. Donc cos θ = 1/2.",
    "cos θ = 1/2 donc θ = 60°. ✅");
  M1C(3, T, 2, "G est le barycentre de (A ; 2) et (B ; 3). Quelle est la masse totale ?", "5",
    "La masse totale est la somme des coefficients.",
    "2 + 3.",
    "Masse totale = 5. ✅");
  M1C(3, T, 1, "Calcule la norme du vecteur u→(4 ; 3).", "5",
    "‖u→‖ = √(x² + y²).",
    "√(16 + 9) = √25.",
    "‖u→‖ = 5. ✅");
}
{
  const T = 'Dénombrements';
  M1C(4, T, 1, "Calcule 4! (factorielle de 4).", "24",
    "n! = n×(n−1)×...×1.",
    "4! = 4×3×2×1.",
    "4! = 24. ✅");
  M1C(4, T, 2, "Calcule C(5 ; 2) (combinaison de 2 éléments parmi 5).", "10",
    "C(n ; 2) = n(n−1)/2.",
    "C(5 ; 2) = 5×4/2.",
    "C(5 ; 2) = 10. ✅");
  M1C(4, T, 2, "Une course compte 5 chevaux. Combien de tiercés possibles DANS L'ORDRE ?", "60",
    "Pour le 1er rang : 5 choix, 2ᵉ : 4, 3ᵉ : 3 (c'est un arrangement).",
    "5 × 4 × 3.",
    "60 tiercés dans l'ordre. ✅");
}
{
  const T = 'Angles Orientés et Trigonométrie';
  M1C(5, T, 1, "Calcule cos(π/3) + sin(π/6).", "1",
    "cos(π/3) = 0,5 et sin(π/6) = 0,5.",
    "Additionne les deux valeurs.",
    "0,5 + 0,5 = 1. ✅");
  M1C(5, T, 2, "Calcule cos²(π/4) + sin²(π/4).", "1",
    "Pense à la relation fondamentale cos²x + sin²x = ...",
    "Cette relation vaut 1 pour TOUT x.",
    "cos²(π/4) + sin²(π/4) = 1. Relation fondamentale à connaître par cœur ! ✅");
  M1C(5, T, 2, "Calcule tan(π/4) × cos(π/3).", "0.5|1/2",
    "tan(π/4) = 1 et cos(π/3) = 0,5.",
    "Multiplie les deux.",
    "1 × 0,5 = 0,5. ✅");
}
{
  const T = 'Transformations du Plan';
  M1C(6, T, 2, "Rotation de centre O et d'angle π/2 : M(2 ; 3) a pour image M'. Donne l'abscisse de M'.", "-3",
    "Rotation de π/2 (sens direct) : (x ; y) → (−y ; x).",
    "M' = (−3 ; 2).",
    "L'abscisse de M' est −3. ✅");
  M1C(6, T, 1, "Homothétie de centre O et de rapport 3 : M(2 ; −1) a pour image M'. Donne l'abscisse de M'.", "6",
    "Homothétie : on multiplie les coordonnées par le rapport.",
    "2 × 3.",
    "M' = (6 ; −3), abscisse 6. ✅");
}
{
  const T = 'Limites et Continuité';
  M1C(7, T, 1, "Calcule lim (2x + 1) quand x → +∞. (Réponds : +infini ou un nombre)", "+infini|infini",
    "Que devient 2x + 1 quand x devient très grand ?",
    "2x devient très grand, +1 ne change rien.",
    "lim = +∞. ✅");
  M1C(7, T, 1, "Calcule lim (1/x) quand x → +∞.", "0",
    "Quand on divise 1 par un nombre très grand...",
    "1/1000 = 0,001 ; 1/1000000 = 0,000001...",
    "lim = 0. ✅");
  M1C(7, T, 2, "Calcule lim (3x² + 2)/(x² + 1) quand x → +∞.", "3",
    "Compare les termes de plus haut degré.",
    "En +∞, (3x²+2)/(x²+1) se comporte comme 3x²/x².",
    "lim = 3. ✅");
}
{
  const T = 'Dérivation';
  M1C(8, T, 1, "Soit f(x) = 3x². Calcule f'(2).", "12",
    "f'(x) = 6x.",
    "f'(2) = 6×2.",
    "f'(2) = 12. ✅");
  M1C(8, T, 1, "Soit f(x) = x³. Calcule f'(1).", "3",
    "(x³)' = 3x².",
    "f'(1) = 3×1².",
    "f'(1) = 3. ✅");
  M1C(8, T, 2, "Soit f(x) = 2x³ − 3x² + 4x − 1. Calcule f'(0).", "4",
    "Dérive terme à terme : (2x³)' = 6x², (3x²)' = 6x, (4x)' = 4, (−1)' = 0.",
    "f'(x) = 6x² − 6x + 4. Remplace x par 0.",
    "f'(0) = 4. ✅");
  M1C(8, T, 2, "Soit f(x) = x² + 2x. Calcule le nombre dérivé f'(1).", "4",
    "f'(x) = 2x + 2.",
    "f'(1) = 2 + 2.",
    "f'(1) = 4. ✅");
}
{
  const T = "Exemples d'Études de Fonctions Numériques";
  M1C(9, T, 2, "Soit f(x) = x². Quelle est la pente de la tangente à la courbe au point d'abscisse 3 ?", "6",
    "La pente de la tangente en a est f'(a).",
    "f'(x) = 2x, donc f'(3) = 6.",
    "Pente = 6. ✅");
  M1C(9, T, 3, "Soit f(x) = x³ − 3x. Calcule f'(1).", "0",
    "f'(x) = 3x² − 3.",
    "f'(1) = 3 − 3.",
    "f'(1) = 0 : la tangente est horizontale, c'est un extremum local ! ✅");
}
{
  const T = 'Primitives';
  M1C(10, T, 1, "f(x) = 3x² et F est la primitive de f qui s'annule en 0. Calcule F(2).", "8",
    "Une primitive de 3x² est x³.",
    "F(x) = x³ (F(0) = 0 ✓). Calcule F(2) = 2³.",
    "F(2) = 8. ✅");
  M1C(10, T, 2, "f(x) = 2x + 1 et F est la primitive qui s'annule en 0. Calcule F(3).", "12",
    "Une primitive de 2x + 1 est x² + x.",
    "F(x) = x² + x. Calcule F(3) = 9 + 3.",
    "F(3) = 12. ✅");
  M1C(10, T, 2, "f(x) = 5x⁴ et F s'annule en 0. Calcule F(1).", "1",
    "Une primitive de x⁴ est x⁵/5.",
    "F(x) = x⁵, donc F(1) = 1⁵.",
    "F(1) = 1. ✅");
}
{
  const T = "Géométrie dans l'Espace";
  M1C(11, T, 2, "u→(1 ; 2 ; 3) et v→(2 ; 4 ; 6). Ces vecteurs sont-ils colinéaires ? (oui/non)", "oui",
    "Cherche k tel que v→ = k·u→.",
    "2 = 2×1 ; 4 = 2×2 ; 6 = 2×3.",
    "v→ = 2u→ : OUI, ils sont colinéaires. ✅");
  M1C(11, T, 2, "Une pyramide a une base d'aire 6 cm² et une hauteur de 4 cm. Calcule son volume en cm³.", "8",
    "V = (1/3) × base × hauteur.",
    "V = (1/3) × 6 × 4.",
    "V = 8 cm³. ✅");
}
{
  const T = 'Suites Numériques';
  M1C(12, T, 1, "(uₙ) arithmétique de premier terme u₀ = 3 et de raison r = 4. Calcule u₅.", "23",
    "uₙ = u₀ + nr.",
    "u₅ = 3 + 5×4.",
    "u₅ = 23. ✅");
  M1C(12, T, 2, "(uₙ) géométrique de premier terme u₀ = 2 et de raison q = 3. Calcule u₄.", "162",
    "uₙ = u₀ × qⁿ.",
    "u₄ = 2 × 3⁴ = 2 × 81.",
    "u₄ = 162. ✅");
  M1C(12, T, 2, "(uₙ) arithmétique avec u₃ = 10 et u₅ = 16. Calcule la raison r.", "3",
    "Dans une suite arithmétique, u₅ − u₃ = 2r.",
    "16 − 10 = 6 = 2r.",
    "r = 3. ✅");
}
{
  const T = 'Statistique';
  M1C(13, T, 1, "Calcule la moyenne de la série : 5 ; 10 ; 15 ; 20.", "12.5|25/2",
    "Somme ÷ effectif.",
    "(5+10+15+20)/4 = 50/4.",
    "Moyenne = 12,5. ✅");
  M1C(13, T, 3, "Série : 4 et 6 (1 fois chacun). Calcule la variance.", "1",
    "Variance = moyenne des carrés des écarts à la moyenne.",
    "Moyenne = 5. Écarts : −1 et +1. Carrés : 1 et 1. Moyenne : (1+1)/2.",
    "Variance = 1. ✅");
}
{
  const T = 'Révisions Générales';
  M1C(14, T, 1, "Calcule C(4 ; 2).", "6",
    "C(n ; 2) = n(n−1)/2.",
    "4×3/2.",
    "C(4 ; 2) = 6. ✅");
  M1C(14, T, 2, "Soit f(x) = x². Calcule f'(2).", "4",
    "f'(x) = 2x.",
    "f'(2) = 4.",
    "f'(2) = 4. ✅");
}

// ============================================================
// MATHÉMATIQUES - PREMIÈRE D
// ============================================================
const M1D = mk('1ere_d_math', 'Première D', 'Mathématiques');
{
  const T = 'Équations, Inéquations, Polynômes';
  M1D(1, T, 1, "Résous x² − 5x + 6 = 0. Quelle est la SOMME des racines ?", "5",
    "Somme des racines = −b/a.",
    "−b/a = 5/1.",
    "Racines 2 et 3, somme = 5. ✅");
  M1D(1, T, 2, "Résous x² + 4x − 5 = 0. Quel est le PRODUIT des racines ?", "-5",
    "Produit des racines = c/a.",
    "c/a = −5/1.",
    "Racines 1 et −5, produit = −5. ✅");
  M1D(1, T, 1, "Résous 2x² − 18 = 0. Donne la plus grande racine.", "3",
    "Isole x².",
    "x² = 9.",
    "x = 3 ou x = −3 : la plus grande est 3. ✅");
}
{
  const T = 'Généralités sur les Fonctions Numériques';
  M1D(2, T, 2, "Soit f(x) = x² et g(x) = x + 1. Calcule (f∘g)(3).", "16",
    "Calcule d'abord g(3).",
    "g(3) = 4, puis f(4) = 16.",
    "(f∘g)(3) = 16. ✅");
  M1D(2, T, 2, "Soit f(x) = 3x − 1 et g(x) = x². Calcule (g∘f)(2).", "25",
    "Calcule d'abord f(2).",
    "f(2) = 5, puis g(5) = 25.",
    "(g∘f)(2) = 25. ✅");
}
{
  const T = 'Applications du Produit Scalaire et du Barycentre';
  M1D(3, T, 1, "Calcule la norme de u→(8 ; 6).", "10",
    "‖u→‖ = √(x² + y²).",
    "√(64 + 36) = √100.",
    "‖u→‖ = 10. ✅");
  M1D(3, T, 3, "Soit u→(1 ; 0) et v→(1 ; √3). Quel est l'angle (en degrés) entre u→ et v→ ?", "60",
    "cos θ = (u→·v→)/(‖u→‖·‖v→‖).",
    "u→·v→ = 1, ‖u→‖ = 1, ‖v→‖ = 2 : cos θ = 1/2.",
    "θ = 60°. ✅");
  M1D(3, T, 2, "G barycentre de (A ; 1), (B ; 2) et (C ; 3). Quelle est la masse totale ?", "6",
    "Additionne les coefficients.",
    "1 + 2 + 3.",
    "Masse totale = 6. ✅");
}
{
  const T = 'Dénombrement';
  M1D(4, T, 2, "Calcule 5! (factorielle de 5).", "120",
    "5! = 5×4×3×2×1.",
    "5×4 = 20, ×3 = 60, ×2 = 120.",
    "5! = 120. ✅");
  M1D(4, T, 2, "Calcule C(6 ; 2).", "15",
    "C(n ; 2) = n(n−1)/2.",
    "6×5/2 = 30/2.",
    "C(6 ; 2) = 15. ✅");
  M1D(4, T, 3, "8 personnes se serrent toutes la main une fois. Combien de poignées de mains ?", "28",
    "C'est C(8 ; 2) : l'ordre ne compte pas.",
    "8×7/2.",
    "28 poignées de mains. ✅");
}
{
  const T = 'Angles Orientés et Trigonométrie';
  M1D(5, T, 1, "Quelle est la valeur exacte de cos(π/3) ?", "0.5|1/2",
    "Pense à 60°.",
    "La moitié de l'hypoténuse dans le triangle équilatéral.",
    "cos(π/3) = 0,5. ✅");
  M1D(5, T, 2, "Calcule sin(π/6) + tan(π/4).", "1.5|3/2",
    "sin(π/6) = 0,5 et tan(π/4) = 1.",
    "0,5 + 1.",
    "1,5. ✅");
}
{
  const T = 'Limites et Continuité';
  M1D(6, T, 1, "Calcule lim (1/x²) quand x → +∞.", "0",
    "On divise 1 par un nombre de plus en plus grand.",
    "1/x² → 0.",
    "lim = 0. ✅");
  M1D(6, T, 1, "Calcule lim (x + 3) quand x → +∞. (Réponds : +infini ou un nombre)", "+infini|infini",
    "x grandit sans borne.",
    "+3 ne change rien.",
    "lim = +∞. ✅");
  M1D(6, T, 2, "Calcule lim (2x² + x)/x² quand x → +∞.", "2",
    "Compare les plus hauts degrés.",
    "Se comporte comme 2x²/x².",
    "lim = 2. ✅");
}
{
  const T = 'Dérivation';
  M1D(7, T, 1, "Soit f(x) = 3x². Calcule f'(2).", "12",
    "f'(x) = 6x.",
    "f'(2) = 12.",
    "f'(2) = 12. ✅");
  M1D(7, T, 1, "Soit f(x) = x³. Calcule f'(1).", "3",
    "(x³)' = 3x².",
    "f'(1) = 3.",
    "f'(1) = 3. ✅");
  M1D(7, T, 2, "Soit f(x) = 2x³ − 3x² + 4x − 1. Calcule f'(0).", "4",
    "Dérive terme à terme.",
    "f'(x) = 6x² − 6x + 4 ; en x = 0 il reste 4.",
    "f'(0) = 4. ✅");
  M1D(7, T, 2, "Soit f(x) = x² + 2x. Calcule f'(1).", "4",
    "f'(x) = 2x + 2.",
    "f'(1) = 4.",
    "f'(1) = 4. ✅");
}
{
  const T = "Exemples d'Études de Fonctions Numériques";
  M1D(8, T, 2, "Soit f(x) = x². Pente de la tangente au point d'abscisse 3 ?", "6",
    "Pente = f'(3).",
    "f'(x) = 2x.",
    "f'(3) = 6. ✅");
  M1D(8, T, 3, "Soit f(x) = x³ − 3x. Calcule f'(1).", "0",
    "f'(x) = 3x² − 3.",
    "f'(1) = 3 − 3.",
    "f'(1) = 0 : tangente horizontale. ✅");
}
{
  const T = 'Primitives';
  M1D(9, T, 1, "f(x) = 3x², F s'annule en 0. Calcule F(2).", "8",
    "F(x) = x³.",
    "F(2) = 8.",
    "F(2) = 8. ✅");
  M1D(9, T, 2, "f(x) = 2x + 1, F s'annule en 0. Calcule F(3).", "12",
    "F(x) = x² + x.",
    "F(3) = 9 + 3.",
    "F(3) = 12. ✅");
  M1D(9, T, 2, "f(x) = 5x⁴, F s'annule en 0. Calcule F(1).", "1",
    "F(x) = x⁵.",
    "F(1) = 1.",
    "F(1) = 1. ✅");
}
{
  const T = 'Suites Numériques';
  M1D(10, T, 1, "(uₙ) arithmétique : u₀ = 3, r = 4. Calcule u₅.", "23",
    "uₙ = u₀ + nr.",
    "u₅ = 3 + 20.",
    "u₅ = 23. ✅");
  M1D(10, T, 2, "(uₙ) géométrique : u₀ = 2, q = 3. Calcule u₃.", "54",
    "uₙ = u₀·qⁿ.",
    "u₃ = 2×27.",
    "u₃ = 54. ✅");
  M1D(10, T, 2, "(uₙ) arithmétique : u₃ = 10, u₅ = 16. Calcule la raison.", "3",
    "u₅ − u₃ = 2r.",
    "6 = 2r.",
    "r = 3. ✅");
}
{
  const T = 'Transformations du Plan';
  M1D(11, T, 2, "Rotation de centre O, angle π/2 : M(2 ; 3) → M'. Donne l'abscisse de M'.", "-3",
    "(x ; y) → (−y ; x).",
    "M' = (−3 ; 2).",
    "Abscisse : −3. ✅");
  M1D(11, T, 1, "Homothétie de centre O, rapport 3 : M(2 ; −1) → M'. Donne l'abscisse de M'.", "6",
    "On multiplie par 3.",
    "2×3.",
    "Abscisse : 6. ✅");
}
{
  const T = 'Statistique';
  M1D(12, T, 1, "Calcule la moyenne de : 5 ; 10 ; 15 ; 20.", "12.5|25/2",
    "Somme ÷ 4.",
    "50/4.",
    "12,5. ✅");
  M1D(12, T, 3, "Série : 4 et 6. Calcule la variance.", "1",
    "Moyenne des carrés des écarts.",
    "Moyenne 5, écarts ±1.",
    "Variance = 1. ✅");
}
{
  const T = 'Révisions Générales';
  M1D(13, T, 1, "Calcule C(5 ; 2).", "10",
    "5×4/2.",
    "20/2.",
    "C(5 ; 2) = 10. ✅");
  M1D(13, T, 2, "Soit f(x) = x². Calcule f'(2).", "4",
    "f'(x) = 2x.",
    "2×2.",
    "f'(2) = 4. ✅");
}

// ============================================================
// MATHÉMATIQUES - TERMINALE C
// ============================================================
const MTC = mk('term_c_math', 'Terminale C', 'Mathématiques');
{
  const T = 'Arithmétique';
  MTC(1, T, 2, "Calcule le PGCD de 48 et 36.", "12",
    "Algorithme d'Euclide : PGCD(a ; b) = PGCD(b ; r).",
    "48 = 36×1 + 12 ; 36 = 12×3 + 0.",
    "PGCD(48 ; 36) = 12. ✅");
  MTC(1, T, 1, "Quel est le reste de la division euclidienne de 17 par 5 ?", "2",
    "Divise 17 par 5.",
    "17 = 5×3 + r.",
    "r = 2 (car 17 = 15 + 2). ✅");
  MTC(1, T, 2, "Quel est le reste de la division euclidienne de 100 par 7 ?", "2",
    "Cherche le plus grand multiple de 7 ≤ 100.",
    "7×14 = 98, donc 100 = 7×14 + r.",
    "r = 2. ✅");
}
{
  const T = 'Nombres complexes';
  MTC(2, T, 1, "Calcule le module de z = 3 + 4i.", "5",
    "|z| = √(a² + b²).",
    "√(9 + 16) = √25.",
    "|z| = 5. ✅");
  MTC(2, T, 2, "Calcule le module de z = 5 + 12i.", "13",
    "|z| = √(a² + b²).",
    "√(25 + 144) = √169.",
    "|z| = 13. ✅");
  MTC(2, T, 1, "Calcule la partie réelle de (2 + 3i) + (5 − i).", "7",
    "Additionne les parties réelles ensemble, les imaginaires ensemble.",
    "2 + 5.",
    "Partie réelle = 7. (La partie imaginaire vaut 2i.) ✅");
  MTC(2, T, 1, "Que vaut i² ?", "-1",
    "C'est LA définition fondamentale des complexes.",
    "i est tel que i² = −1.",
    "i² = −1. ✅");
}
{
  const T = 'Calculs Barycentriques';
  MTC(3, T, 1, "G barycentre de (A ; 2), (B ; 3) et (C ; 1). Quelle est la masse totale ?", "6",
    "Somme des coefficients.",
    "2 + 3 + 1.",
    "Masse totale = 6. ✅");
  MTC(3, T, 2, "G est l'isobarycentre de 4 points A, B, C, D. Quel coefficient porte chaque point (fraction) ?", "1/4",
    "Isobarycentre = même coefficient pour tous.",
    "Si k est le coefficient, la masse totale 4k doit être non nulle ; par convention on prend une masse totale de 1.",
    "Chaque point porte 1/4. ✅");
}
{
  const T = 'Applications affines du plan';
  MTC(4, T, 1, "Translation de vecteur u→(3 ; −2) : M(1 ; 1) → M'. Donne l'abscisse de M'.", "4",
    "Translation : on ajoute les coordonnées du vecteur.",
    "1 + 3.",
    "M' = (4 ; −1), abscisse 4. ✅");
  MTC(4, T, 2, "Homothétie de centre O, rapport −2 : M(2 ; 5) → M'. Donne l'abscisse de M'.", "-4",
    "On multiplie les coordonnées par le rapport.",
    "2 × (−2).",
    "M' = (−4 ; −10), abscisse −4. ✅");
}
{
  const T = 'Coniques';
  MTC(5, T, 2, "Ellipse : x²/25 + y²/9 = 1. Calcule le demi-grand axe a.", "5",
    "a² est le plus grand des deux dénominateurs.",
    "a² = 25.",
    "a = 5. ✅");
  MTC(5, T, 2, "Hyperbole : x²/16 − y²/9 = 1. Calcule a.", "4",
    "a² = 16.",
    "a = √16.",
    "a = 4. ✅");
}
{
  const T = "Applications affines de l'espace";
  MTC(6, T, 1, "Translation de vecteur u→(1 ; 2 ; 3) : M(0 ; 0 ; 0) → M'. Donne la cote (z) de M'.", "3",
    "On ajoute les coordonnées du vecteur.",
    "0 + 3.",
    "z = 3. ✅");
}
{
  const T = 'Suites numériques (Terminale)';
  MTC(7, T, 1, "Soit q = 1/2. Calcule lim qⁿ quand n → +∞.", "0",
    "|q| < 1 : que deviennent les puissances successives ?",
    "(1/2)¹ = 0,5 ; (1/2)² = 0,25 ; (1/2)³ = 0,125...",
    "lim = 0. ✅");
  MTC(7, T, 2, "Calcule la somme 1 + 2 + 3 + ... + 100.", "5050",
    "Formule : n(n+1)/2.",
    "100×101/2.",
    "5050. ✅");
  MTC(7, T, 2, "(uₙ) arithmétique : u₁ = 5, r = 2. Calcule u₁₀.", "23",
    "uₙ = u₁ + (n−1)r.",
    "u₁₀ = 5 + 9×2.",
    "u₁₀ = 23. ✅");
}
{
  const T = 'Fonctions logarithmes';
  MTC(8, T, 1, "Calcule ln(e³).", "3",
    "ln et exp sont des fonctions réciproques.",
    "ln(eˣ) = x.",
    "ln(e³) = 3. ✅");
  MTC(8, T, 1, "Calcule ln(1).", "0",
    "Cherche la puissance de e qui vaut 1.",
    "e⁰ = 1.",
    "ln(1) = 0. ✅");
  MTC(8, T, 1, "Calcule e^(ln 5).", "5",
    "exp et ln se compensent.",
    "e^(ln x) = x.",
    "e^(ln 5) = 5. ✅");
  MTC(8, T, 2, "Écris ln(8) = k·ln(2). Quelle est la valeur de k ?", "3",
    "8 est une puissance de 2.",
    "8 = 2³.",
    "ln 8 = 3·ln 2, donc k = 3. ✅");
}
{
  const T = 'Propriétés des fonctions continues ou dérivables';
  MTC(9, T, 1, "Soit f(x) = x² + 1. Calcule f'(2).", "5",
    "f'(x) = 2x.",
    "f'(2) = 4.",
    "f'(2) = 4. ✅");
  MTC(9, T, 2, "Soit f(x) = x³. Calcule le nombre dérivé en 1.", "3",
    "f'(x) = 3x².",
    "f'(1) = 3.",
    "f'(1) = 3. ✅");
}
{
  const T = 'Fonctions exponentielles';
  MTC(10, T, 1, "Calcule e⁰.", "1",
    "Toute puissance zéro vaut 1.",
    "e⁰ = 1.",
    "e⁰ = 1. ✅");
  MTC(10, T, 2, "(e²)³ = eⁿ. Quelle est la valeur de n ?", "6",
    "(aᵐ)ⁿ = aᵐⁿ.",
    "2 × 3.",
    "(e²)³ = e⁶, n = 6. ✅");
  MTC(10, T, 2, "e² × e³ = eⁿ. Quelle est la valeur de n ?", "5",
    "aᵐ × aⁿ = aᵐ⁺ⁿ.",
    "2 + 3.",
    "e⁵, n = 5. ✅");
}
{
  const T = "Exemples d'études de fonctions";
  MTC(11, T, 2, "Quelle est la pente de la tangente à la courbe de eˣ au point d'abscisse 0 ?", "1",
    "La dérivée de eˣ est... eˣ !",
    "f'(0) = e⁰.",
    "Pente = 1. ✅");
}
{
  const T = 'Calcul Intégral';
  MTC(12, T, 1, "Calcule l'intégrale de 0 à 1 de 2x dx.", "1",
    "Une primitive de 2x est x².",
    "[x²] de 0 à 1 = 1² − 0².",
    "∫₀¹ 2x dx = 1. ✅");
  MTC(12, T, 2, "Calcule ∫₀² 3x² dx.", "8",
    "Une primitive de 3x² est x³.",
    "[x³] de 0 à 2 = 8 − 0.",
    "∫₀² 3x² dx = 8. ✅");
  MTC(12, T, 2, "Calcule ∫₁² x dx.", "1.5|3/2",
    "Une primitive de x est x²/2.",
    "(4/2) − (1/2).",
    "∫₁² x dx = 1,5. ✅");
  MTC(12, T, 2, "Calcule ∫₀¹ x³ dx (fraction).", "1/4|0.25",
    "Une primitive de x³ est x⁴/4.",
    "(1⁴/4) − 0.",
    "1/4. ✅");
}
{
  const T = 'Équations différentielles linéaires';
  MTC(13, T, 2, "y' = 2y a pour solutions y = Ce^(kx). Quelle est la valeur de k ?", "2",
    "Injecte y = Ce^(kx) dans l'équation.",
    "y' = kCe^(kx) = ky, donc ky = 2y donne k = 2.",
    "k = 2. ✅");
  MTC(13, T, 2, "y' = 2y avec y(0) = 3. La solution est y = Ce^(2x). Quelle est la valeur de C ?", "3",
    "Remplace x par 0 dans la solution.",
    "y(0) = C·e⁰ = C.",
    "C = 3. ✅");
  MTC(13, T, 2, "y' = −3y a pour solutions y = Ce^(kx). Quelle est la valeur de k ?", "-3",
    "même technique : ky = −3y.",
    "k = −3.",
    "k = −3. ✅");
}
{
  const T = 'Probabilité sur un ensemble fini';
  MTC(14, T, 3, "On lance 2 dés. Calcule P(somme = 7) (fraction).", "1/6",
    "Compte les couples favorables sur 36.",
    "Combinaisons : (1;6)(2;5)(3;4)(4;3)(5;2)(6;1) → 6 cas.",
    "P = 6/36 = 1/6. ✅");
  MTC(14, T, 1, "On lance un dé. Calcule P(obtenir un nombre pair).", "0.5|1/2",
    "Pairs : 2, 4, 6.",
    "3 cas sur 6.",
    "P = 1/2. ✅");
  MTC(14, T, 1, "Une urne contient 3 boules rouges et 2 boules bleues. Calcule P(tirer une rouge) (fraction).", "3/5",
    "Cas favorables sur cas possibles.",
    "3 rouges sur 5 boules au total.",
    "P = 3/5. ✅");
  MTC(14, T, 2, "P(A) = 0,5 ; P(B) = 0,4 ; P(A∩B) = 0,1. Calcule P(A∪B).", "0.8",
    "Formule : P(A∪B) = P(A) + P(B) − P(A∩B).",
    "0,5 + 0,4 − 0,1.",
    "P(A∪B) = 0,8. ✅");
}
{
  const T = 'Séries statistiques à deux variables';
  MTC(15, T, 1, "Calcule la moyenne de x : 1 ; 2 ; 3.", "2",
    "Somme ÷ effectif.",
    "6/3.",
    "Moyenne = 2. ✅");
}
{
  const T = 'Variables aléatoires';
  MTC(16, T, 2, "X vaut 0 avec probabilité 0,5 et 10 avec probabilité 0,5. Calcule E(X).", "5",
    "E(X) = Σ pᵢxᵢ.",
    "0×0,5 + 10×0,5.",
    "E(X) = 5. ✅");
  MTC(16, T, 2, "X est le résultat d'un dé équilibré. Calcule E(X).", "3.5|7/2",
    "E(X) = (1+2+3+4+5+6)/6.",
    "21/6.",
    "E(X) = 3,5. ✅");
}
{
  const T = 'Encadrements et approximations';
  MTC(17, T, 1, "Quelle est la partie entière de 7,9 ?", "7",
    "C'est le plus grand entier inférieur ou égal.",
    "7 ≤ 7,9 < 8.",
    "Partie entière = 7. ✅");
}

// ============================================================
// MATHÉMATIQUES - TERMINALE D
// ============================================================
const MTD = mk('term_d_math', 'Terminale D', 'Mathématiques');
{
  const T = 'Nombres complexes';
  MTD(1, T, 1, "Calcule le module de z = 8 + 6i.", "10",
    "|z| = √(a² + b²).",
    "√(64 + 36) = √100.",
    "|z| = 10. ✅");
  MTD(1, T, 2, "Que vaut i⁴ ?", "1",
    "Écris i⁴ = (i²)².",
    "(−1)².",
    "i⁴ = 1. ✅");
  MTD(1, T, 1, "Calcule la partie réelle de (1 + 2i) + (3 − i).", "4",
    "Additionne les parties réelles.",
    "1 + 3.",
    "Partie réelle = 4. ✅");
  MTD(1, T, 3, "Calcule (1 + i)².", "2i|2*i",
    "Développe avec (a+b)² = a² + 2ab + b².",
    "1 + 2i + i² = 1 + 2i − 1.",
    "(1+i)² = 2i. Résultat classique du BAC ! ✅");
}
{
  const T = 'Similitudes planes directes';
  MTD(2, T, 2, "On compose deux homothéties de rapports 2 et 3. Quel est le rapport de la composée ?", "6",
    "Les rapports se multiplient.",
    "2 × 3.",
    "Rapport = 6. ✅");
  MTD(2, T, 3, "On compose deux rotations de même centre, d'angles 30° et 60°. Quel est l'angle de la composée ?", "90",
    "Les angles s'additionnent (même centre).",
    "30 + 60.",
    "Angle = 90°. ✅");
  MTD(2, T, 2, "Une similitude de rapport 1 s'appelle une...", "isometrie|isométrie",
    "Rapport 1 = les distances sont conservées.",
    "C'est le nom d'une transformation qui conserve les distances.",
    "Une isométrie. ✅");
}
{
  const T = 'Calcul des Probabilités';
  MTD(3, T, 3, "On lance 2 dés. Calcule P(somme = 7) (fraction).", "1/6",
    "6 cas favorables sur 36.",
    "(1;6)(2;5)(3;4)(4;3)(5;2)(6;1).",
    "P = 1/6. ✅");
  MTD(3, T, 3, "On lance 2 fois une pièce. Calcule P(au moins un pile) (fraction ou décimal).", "0.75|3/4",
    "Passe par l'événement contraire : P(aucun pile) = P(2 faces).",
    "P(2 faces) = 1/2 × 1/2 = 1/4. Donc P(au moins un pile) = 1 − 1/4.",
    "P = 3/4. ✅");
  MTD(3, T, 1, "Urne : 3 rouges, 2 bleues. Calcule P(rouge) (fraction).", "3/5",
    "3 favorables sur 5.",
    "3/5.",
    "P = 3/5. ✅");
  MTD(3, T, 2, "P(A) = 0,5 ; P(B) = 0,4 ; P(A∩B) = 0,1. Calcule P(A∪B).", "0.8",
    "P(A∪B) = P(A) + P(B) − P(A∩B).",
    "0,5 + 0,4 − 0,1.",
    "0,8. ✅");
}
{
  const T = 'Fonctions logarithmes';
  MTD(4, T, 1, "Calcule ln(e).", "1",
    "ln(eˣ) = x.",
    "e = e¹.",
    "ln(e) = 1. ✅");
  MTD(4, T, 1, "Calcule ln(1).", "0",
    "e⁰ = 1.",
    "ln(1) = ln(e⁰).",
    "ln(1) = 0. ✅");
  MTD(4, T, 1, "Calcule e^(ln 7).", "7",
    "Les fonctions se compensent.",
    "e^(ln x) = x.",
    "7. ✅");
  MTD(4, T, 2, "ln(16) = k·ln(2). Trouve k.", "4",
    "16 = 2⁴.",
    "ln 2⁴ = 4 ln 2.",
    "k = 4. ✅");
}
{
  const T = 'Fonctions exponentielles';
  MTD(5, T, 1, "Calcule e⁰.", "1",
    "Puissance zéro.",
    "e⁰ = 1.",
    "1. ✅");
  MTD(5, T, 2, "(e³)² = eⁿ. Trouve n.", "6",
    "(aᵐ)ⁿ = aᵐⁿ.",
    "3 × 2.",
    "n = 6. ✅");
  MTD(5, T, 2, "e⁵ ÷ e² = eⁿ. Trouve n.", "3",
    "aᵐ ÷ aⁿ = aᵐ⁻ⁿ.",
    "5 − 2.",
    "n = 3. ✅");
}
{
  const T = 'Calcul Intégral';
  MTD(6, T, 1, "Calcule ∫₀¹ 2x dx.", "1",
    "Primitive : x².",
    "1 − 0.",
    "1. ✅");
  MTD(6, T, 1, "Calcule ∫₀¹ 3x² dx.", "1",
    "Primitive : x³.",
    "1 − 0.",
    "1. ✅");
  MTD(6, T, 2, "Calcule ∫₀₃ x² dx.", "9",
    "Primitive : x³/3.",
    "27/3 − 0.",
    "9. ✅");
  MTD(6, T, 2, "Calcule ∫₀¹ x² dx (fraction).", "1/3",
    "Primitive : x³/3.",
    "1/3 − 0.",
    "1/3. ✅");
}
{
  const T = 'Équations différentielles';
  MTD(7, T, 2, "y' = 3y avec y(0) = 2. Solution y = Ce^(3x). Calcule C.", "2",
    "Remplace x par 0.",
    "y(0) = C·e⁰ = C.",
    "C = 2. ✅");
  MTD(7, T, 3, "y' + 2y = 0 a pour solutions y = Ce^(kx). Trouve k.", "-2",
    "Réécris : y' = −2y.",
    "ky = −2y donc k = −2.",
    "k = −2. ✅");
  MTD(7, T, 2, "y' = 5y a pour solutions y = Ce^(kx). Trouve k.", "5",
    "ky = 5y.",
    "k = 5.",
    "k = 5. ✅");
}
{
  const T = 'Suites numériques';
  MTD(8, T, 1, "Soit q = 1/3. Calcule lim qⁿ quand n → +∞.", "0",
    "|q| < 1.",
    "Les puissances tendent vers 0.",
    "lim = 0. ✅");
  MTD(8, T, 2, "Calcule la somme géométrique 1 + 2 + 4 + 8 + 16.", "31",
    "Somme géométrique : (1 − qⁿ)/(1 − q) avec q = 2, n = 5 termes.",
    "(2⁵ − 1)/(2 − 1) = 32 − 1.",
    "31. ✅");
  MTD(8, T, 2, "(uₙ) arithmétique : u₁ = 5, r = 2. Calcule u₁₀.", "23",
    "uₙ = u₁ + (n−1)r.",
    "5 + 9×2.",
    "23. ✅");
}
{
  const T = 'Statistique à deux variables';
  MTD(9, T, 1, "Calcule la moyenne de x : 1 ; 2 ; 3.", "2",
    "6/3.",
    "2.",
    "2. ✅");
}
{
  const T = 'Variables aléatoires';
  MTD(10, T, 2, "X : 0 avec p = 0,5 ; 10 avec p = 0,5. Calcule E(X).", "5",
    "Σ pᵢxᵢ.",
    "0 + 5.",
    "E(X) = 5. ✅");
  MTD(10, T, 2, "X = résultat d'un dé. Calcule E(X).", "3.5|7/2",
    "21/6.",
    "3,5.",
    "E(X) = 3,5. ✅");
}
{
  const T = 'Calculs Barycentriques';
  MTD(11, T, 1, "G barycentre de (A ; 2), (B ; 3), (C ; 1). Masse totale ?", "6",
    "2+3+1.",
    "6.",
    "6. ✅");
  MTD(11, T, 2, "G isobarycentre de A, B, C, D. Quel coefficient pour chaque point (fraction) ?", "1/4",
    "Même coefficient partout, masse totale 1.",
    "4k = 1.",
    "1/4. ✅");
}
{
  const T = "Géométrie dans l'espace";
  MTD(12, T, 1, "Un cube d'arête 4 cm : calcule son volume en cm³.", "64",
    "arête³.",
    "4³ = 64.",
    "64 cm³. ✅");
  MTD(12, T, 1, "Un pavé droit 2 × 3 × 5 : calcule son volume.", "30",
    "Longueur × largeur × hauteur.",
    "2×3×5.",
    "30. ✅");
}

// ============================================================
// PHYSIQUE-CHIMIE - SECONDE C
// ============================================================
const P2 = mk('2nde_c_pc', 'Seconde C', 'Physique-Chimie');
{
  const T = 'La force';
  P2(1, T, 1, "Un objet de masse 5 kg subit une accélération de 2 m/s². Calcule la force résultante en newtons.", "10",
    "2ᵉ loi de Newton : F = m×a.",
    "F = 5 × 2.",
    "F = 10 N. ✅");
  P2(1, T, 1, "m = 3 kg et a = 4 m/s². Calcule F en newtons.", "12",
    "F = ma.",
    "3 × 4.",
    "F = 12 N. ✅");
  P2(1, T, 1, "Quelle est l'unité de la force ?", "newton|n|N",
    "Elle rend hommage à un physicien célèbre.",
    "Symbole : N.",
    "Le newton (N). ✅");
}
{
  const T = "Équilibre d'un solide soumis à 3 forces non parallèles";
  P2(2, T, 1, "Un solide immobile subit 3 forces. Que vaut la somme vectorielle des forces ?", "0",
    "Condition d'équilibre de translation.",
    "ΣF→ = 0→ (les forces se compensent).",
    "La somme vaut 0. ✅");
  P2(2, T, 2, "Un livre posé sur une table a un poids P = 20 N. Calcule la réaction R de la table en newtons.", "20",
    "Équilibre : P→ et R→ se compensent.",
    "R = P.",
    "R = 20 N. ✅");
}
{
  const T = "Équilibre d'un solide en rotation autour d'un axe fixe";
  P2(3, T, 1, "Une force de 10 N s'applique à 0,5 m de l'axe. Calcule le moment en N·m.", "5",
    "M = F × d (bras de levier).",
    "10 × 0,5.",
    "M = 5 N·m. ✅");
  P2(3, T, 3, "Un moment moteur de 20 N·m est équilibré par une force F située à 0,4 m de l'axe. Calcule F en newtons.", "50",
    "À l'équilibre : M₁ = M₂.",
    "20 = F × 0,4.",
    "F = 50 N. ✅");
}
{
  const T = 'Statique des fluides';
  P2(4, T, 1, "Une force de 200 N s'exerce sur une surface de 2 m². Calcule la pression en pascals.", "100",
    "P = F/S.",
    "200/2.",
    "P = 100 Pa. ✅");
  P2(4, T, 2, "Calcule la pression au fond d'une piscine : ρ = 1000 kg/m³, g = 10 N/kg, h = 5 m (en pascals).", "50000",
    "P = ρ×g×h.",
    "1000 × 10 × 5.",
    "P = 50 000 Pa. ✅");
  P2(4, T, 1, "Quelle est l'unité de la pression ?", "pascal|pa|Pa",
    "Symbole Pa.",
    "1 Pa = 1 N/m².",
    "Le pascal (Pa). ✅");
}
{
  const T = 'Tension continue';
  P2(5, T, 1, "R = 10 Ω et I = 2 A. Calcule la tension U en volts.", "20",
    "Loi d'Ohm : U = R×I.",
    "10 × 2.",
    "U = 20 V. ✅");
  P2(5, T, 2, "U = 12 V et I = 3 A. Calcule la résistance R en ohms.", "4",
    "U = RI donc R = U/I.",
    "12/3.",
    "R = 4 Ω. ✅");
}
{
  const T = 'Tensions variables';
  P2(6, T, 2, "Une tension périodique a une période T = 0,002 s. Calcule la fréquence en hertz.", "500",
    "f = 1/T.",
    "1/0,002 = 1000/2.",
    "f = 500 Hz. ✅");
}
{
  const T = 'Dipôles';
  P2(7, T, 1, "Deux résistances R₁ = 10 Ω et R₂ = 20 Ω en SÉRIE. Calcule la résistance équivalente.", "30",
    "En série, les résistances s'additionnent.",
    "10 + 20.",
    "R = 30 Ω. ✅");
  P2(7, T, 2, "R₁ = 6 Ω et R₂ = 3 Ω en PARALLÈLE. Calcule la résistance équivalente.", "2",
    "1/R = 1/R₁ + 1/R₂, ou R = R₁R₂/(R₁+R₂).",
    "(6×3)/(6+3) = 18/9.",
    "R = 2 Ω. ✅");
  P2(7, T, 2, "R₁ = 12 Ω et R₂ = 4 Ω en PARALLÈLE. Calcule la résistance équivalente.", "3",
    "R = R₁R₂/(R₁+R₂).",
    "(12×4)/(12+4) = 48/16.",
    "R = 3 Ω. ✅");
}
{
  const T = 'Dipôles non linéaires';
  P2(8, T, 2, "Quel composant non linéaire ne laisse passer le courant que dans un seul sens ?", "diode|la diode",
    "Il faut le polariser dans le bon sens pour qu'il conduise.",
    "Ses bornes s'appellent anode et cathode.",
    "La diode. ✅");
}
{
  const T = 'Transistor';
  P2(9, T, 2, "Le transistor bipolaire possède trois pattes : émetteur, base et...", "collecteur|le collecteur",
    "E, B, C.",
    "La troisième patte collecte les porteurs.",
    "Le collecteur. ✅");
}
{
  const T = 'Amplificateur opérationnel';
  P2(10, T, 2, "Combien d'entrées possède un amplificateur opérationnel ?", "2|deux",
    "Il y a une entrée inverseuse et une entrée...",
    "Non inverseuse.",
    "Deux entrées (+ et −). ✅");
}
{
  const T = "Structure de l'atome";
  P2(11, T, 1, "Le carbone a Z = 6. Combien de protons dans son noyau ?", "6",
    "Z = nombre de protons.",
    "Z = 6.",
    "6 protons. ✅");
  P2(11, T, 1, "Un isotope a A = 12 et Z = 6. Calcule le nombre de neutrons.", "6",
    "Nombre de neutrons = A − Z.",
    "12 − 6.",
    "6 neutrons. ✅");
  P2(11, T, 2, "Le sodium a A = 23 et Z = 11. Calcule le nombre de neutrons.", "12",
    "N = A − Z.",
    "23 − 11.",
    "12 neutrons. ✅");
}
{
  const T = 'Classification périodique';
  P2(12, T, 2, "Le numéro atomique Z d'un atome est égal au nombre de...", "protons|protons|de protons",
    "C'est ce qui définit l'élément chimique.",
    "Il est aussi égal au nombre d'électrons dans l'atome neutre.",
    "Le nombre de protons. ✅");
  P2(12, T, 2, "Dans quelle famille se trouvent l'hélium, le néon et l'argon ?", "gaz rares|gaz nobles|rares|nobles",
    "Ce sont des gaz très peu réactifs.",
    "Ils ont leur dernière couche remplie.",
    "Les gaz rares (ou nobles). ✅");
}
{
  const T = 'Liaison covalente dans une molécule';
  P2(13, T, 2, "Dans la molécule H₂O, combien de liaisons covalentes forme l'atome d'oxygène ?", "2",
    "L'oxygène a 6 électrons de valence.",
    "Il lui manque 2 électrons pour l'octet.",
    "2 liaisons (avec les 2 H). ✅");
  P2(13, T, 1, "Dans CH₄, combien de liaisons covalentes forme le carbone ?", "4",
    "Le carbone a 4 électrons de valence.",
    "Il forme 4 liaisons simples.",
    "4 liaisons. ✅");
}
{
  const T = 'Ions monoatomiques et ions polyatomiques';
  P2(14, T, 2, "L'ion Na⁺ vient du sodium (Z = 11). Combien d'électrons reste-t-il ?", "10",
    "Na⁺ a perdu 1 électron.",
    "11 − 1.",
    "10 électrons. ✅");
  P2(14, T, 2, "L'ion O²⁻ vient de l'oxygène (Z = 8). Combien d'électrons ?", "10",
    "O²⁻ a gagné 2 électrons.",
    "8 + 2.",
    "10 électrons. ✅");
}
{
  const T = 'Loi de Lavoisier';
  P2(15, T, 1, "« Rien ne se perd, rien ne se crée » : quelle grandeur se conserve lors d'une transformation chimique ?", "masse|la masse",
    "Lavoisier a pesé avant et après.",
    "La somme des masses des réactifs = celle des produits.",
    "La masse. ✅");
}
{
  const T = 'Chlorure de sodium';
  P2(16, T, 1, "Quelle est la formule chimique du chlorure de sodium (sel de cuisine) ?", "NaCl|nacl",
    "Un ion sodium + un ion chlorure.",
    "Na⁺ et Cl⁻.",
    "NaCl. ✅");
}
{
  const T = "Rôle du solvant lors de la dissolution d'un composé ionique dans l'eau";
  P2(17, T, 2, "Dissous dans l'eau, NaCl se dissocie en ions Na⁺ et quels autres ions ?", "Cl-|Cl−|chlorure|cl-",
    "C'est l'anion du sel.",
    "Il porte une charge négative.",
    "Les ions chlorure Cl⁻. ✅");
}
{
  const T = 'Solutions aqueuses acides, solutions aqueuses basiques';
  P2(18, T, 1, "Une solution a un pH de 9. Est-elle acide, basique ou neutre ?", "basique",
    "Compare à 7.",
    "pH > 7.",
    "Basique. ✅");
  P2(18, T, 1, "Une solution a un pH de 3. Est-elle acide, basique ou neutre ?", "acide",
    "Compare à 7.",
    "pH < 7.",
    "Acide. ✅");
}

// ============================================================
// PHYSIQUE-CHIMIE - PREMIÈRE C et PREMIÈRE D (mêmes chapitres)
// ============================================================
function banquePC1ere(prefix, classe) {
  const P = mk(prefix, classe, 'Physique-Chimie');
  {
    const T = 'Mouvement';
    P(1, T, 1, "Une voiture parcourt 100 km en 2 h. Calcule sa vitesse moyenne en km/h.", "50",
      "v = d/t.",
      "100/2.",
      "v = 50 km/h. ✅");
    P(1, T, 2, "Convertis 72 km/h en m/s.", "20",
      "Divise par 3,6.",
      "72/3,6.",
      "20 m/s. ✅");
    P(1, T, 2, "Convertis 108 km/h en m/s.", "30",
      "Divise par 3,6.",
      "108/3,6.",
      "30 m/s. ✅");
  }
  {
    const T = 'Centre d\'inertie';
    P(2, T, 1, "Le mouvement d'ensemble d'un solide est décrit par celui de son...", "centre d\'inertie|centre d inertie|centre dinertie",
      "Point particulier du solide.",
      "On l'appelle aussi centre de gravité.",
      "Le centre d'inertie. ✅");
  }
  {
    const T = 'Quantité de mouvement';
    P(3, T, 1, "p = mv avec m = 2 kg et v = 3 m/s. Calcule p en kg·m/s.", "6",
      "p = m×v.",
      "2×3.",
      "p = 6 kg·m/s. ✅");
    P(3, T, 1, "m = 4 kg et v = 5 m/s. Calcule la quantité de mouvement.", "20",
      "p = mv.",
      "4×5.",
      "p = 20 kg·m/s. ✅");
  }
  {
    const T = 'Travail et puissance';
    P(4, T, 1, "Une force de 10 N déplace son point d'application de 5 m dans son sens. Calcule le travail en joules.", "50",
      "W = F×d (même direction).",
      "10×5.",
      "W = 50 J. ✅");
    P(4, T, 1, "Un moteur fournit 100 J en 4 s. Calcule sa puissance en watts.", "25",
      "P = W/t.",
      "100/4.",
      "P = 25 W. ✅");
    P(4, T, 2, "W = 300 J en t = 10 s. Calcule la puissance en watts.", "30",
      "P = W/t.",
      "300/10.",
      "P = 30 W. ✅");
  }
  {
    const T = 'Énergie cinétique';
    P(5, T, 1, "Calcule Ec = ½mv² avec m = 2 kg et v = 3 m/s (en joules).", "9",
      "Ec = ½ × m × v².",
      "0,5 × 2 × 9.",
      "Ec = 9 J. ✅");
    P(5, T, 2, "m = 4 kg et v = 5 m/s. Calcule Ec en joules.", "50",
      "Ec = ½mv².",
      "0,5 × 4 × 25.",
      "Ec = 50 J. ✅");
  }
  {
    const T = 'Énergie potentielle';
    P(6, T, 1, "Calcule Ep = mgh avec m = 2 kg, g = 10 N/kg, h = 5 m (en joules).", "100",
      "Ep = m×g×h.",
      "2×10×5.",
      "Ep = 100 J. ✅");
    P(6, T, 2, "m = 3 kg, g = 10 N/kg, h = 4 m. Calcule Ep en joules.", "120",
      "Ep = mgh.",
      "3×10×4.",
      "Ep = 120 J. ✅");
  }
  {
    const T = 'Énergie mécanique';
    P(7, T, 1, "Un solide a Ec = 50 J et Ep = 150 J. Calcule son énergie mécanique Em en joules.", "200",
      "Em = Ec + Ep.",
      "50 + 150.",
      "Em = 200 J. ✅");
    P(7, T, 2, "Sans frottements, que devient l'énergie mécanique d'un solide en chute libre ? (Réponds : constante, augmente ou diminue)", "constante",
      "L'énergie se transforme mais se conserve.",
      "Ep se convertit en Ec.",
      "Elle reste constante (conservation). ✅");
  }
  {
    const T = 'Énergie électrique';
    P(8, T, 2, "Calcule E = UIt avec U = 6 V, I = 2 A, t = 5 s (en joules).", "60",
      "E = U×I×t.",
      "6×2×5.",
      "E = 60 J. ✅");
    P(8, T, 2, "U = 12 V, I = 2 A, t = 10 s. Calcule l'énergie en joules.", "240",
      "E = UIt.",
      "12×2×10.",
      "E = 240 J. ✅");
  }
  {
    const T = "Loi d'Ohm pour un récepteur non ohmique";
    P(9, T, 3, "Un moteur (fcem E' = 6 V, résistance r = 1 Ω) est traversé par I = 3 A. Calcule la tension U = E' + rI en volts.", "9",
      "U = E' + rI pour un récepteur.",
      "6 + 1×3.",
      "U = 9 V. ✅");
  }
  {
    const T = 'Condensateurs';
    P(10, T, 2, "Calcule l'énergie E = ½CU² avec C = 2 F et U = 3 V (en joules).", "9",
      "E = ½CU².",
      "0,5×2×9.",
      "E = 9 J. ✅");
    P(10, T, 2, "C = 1 F et U = 4 V. Calcule E en joules.", "8",
      "E = ½CU².",
      "0,5×1×16.",
      "E = 8 J. ✅");
  }
  {
    const T = 'Réfraction de la lumière';
    P(11, T, 2, "L'indice de réfraction n = c/v. Si c = 3×10⁸ m/s et v = 2×10⁸ m/s, calcule n.", "1.5",
      "n = c/v.",
      "(3×10⁸)/(2×10⁸) = 3/2.",
      "n = 1,5. ✅");
    P(11, T, 2, "La réfraction est le changement de ... de la lumière à la traversée de la surface de séparation de deux milieux.", "direction",
      "La lumière est déviée en changeant de milieu.",
      "Snell-Descartes relie les angles par n₁sin(i) = n₂sin(r).",
      "Le changement de direction. ✅");
  }
  {
    const T = 'Lentilles minces';
    P(12, T, 2, "Une lentille convergente a une distance focale f = 0,5 m. Calcule sa vergence en dioptries.", "2",
      "V = 1/f.",
      "1/0,5.",
      "V = 2 δ. ✅");
    P(12, T, 2, "f = 0,25 m. Calcule la vergence en dioptries.", "4",
      "V = 1/f.",
      "1/0,25.",
      "V = 4 δ. ✅");
  }
  {
    const T = 'Dispersion - Diffraction de la lumière';
    P(13, T, 2, "Le prisme décompose la lumière blanche en couleurs : comment s'appelle ce phénomène ?", "dispersion|la dispersion",
      "L'indice du verre dépend de la couleur.",
      "Le violet est plus dévié que le rouge.",
      "La dispersion. ✅");
  }
  {
    const T = 'Alcanes';
    [[4,10],[3,8],[5,12],[6,14]].forEach(([n, h]) => {
      P(14, T, 1,
        `Un alcane a pour formule générale CₙH₂ₙ₊₂. Combien d'atomes d'hydrogène pour n = ${n} ?`,
        String(h),
        `Applique CₙH₂ₙ₊₂.`,
        `H = 2×${n} + 2.`,
        `C${n}H${h}. ✅`);
    });
  }
  {
    const T = 'Dérivés insaturés : Alcènes. Alcynes';
    P(15, T, 1, "Un alcène a pour formule CₙH₂ₙ. Combien d'atomes H pour n = 4 ?", "8",
      "Applique CₙH₂ₙ.",
      "2×4.",
      "C₄H₈. ✅");
    P(15, T, 2, "Combien de liaisons doubles contient un alcène entre deux carbones ?", "1|une",
      "C'est ce qui le distingue de l'alcane.",
      "CnH2n = une insaturation C=C.",
      "Une double liaison. ✅");
  }
  {
    const T = 'Composés aromatiques';
    P(16, T, 2, "Quelle est la forme du cycle du benzène C₆H₆ ?", "hexagonal|hexagone",
      "6 atomes de carbone.",
      "Cycle à 6 côtés.",
      "Hexagonal. ✅");
  }
  {
    const T = 'Combustibles fossiles';
    P(17, T, 1, "Le gaz naturel est composé principalement de quel alcane ?", "methane|méthane",
      "Le plus simple des alcanes.",
      "CH₄.",
      "Le méthane. ✅");
  }
  {
    const T = 'Couples oxydant-réducteur';
    P(18, T, 1, "Cu²⁺ + 2e⁻ → Cu. Combien d'électrons sont échangés ?", "2",
      "Compte les e⁻ dans la demi-équation.",
      "Le coefficient devant e⁻.",
      "2 électrons. ✅");
    P(18, T, 1, "Al³⁺ + 3e⁻ → Al. Combien d'électrons sont échangés ?", "3",
      "Compte les e⁻.",
      "Coefficient 3.",
      "3 électrons. ✅");
  }
  {
    const T = 'Piles et potentiels d\'oxydoréduction';
    P(19, T, 3, "Dans une pile, l'oxydation se produit à l'électrode négative dont le nom est l'...", "anode|anode|lanode",
      "Oxydation = ANode (les deux ont un O).",
      "L'autre électrode (réduction) est la cathode.",
      "L'anode, borne négative. ✅");
  }
  {
    const T = 'Généralisation de l\'oxydoréduction';
    P(20, T, 2, "L'oxydation est une perte d'électrons ; la réduction est un ... d'électrons.", "gain",
      "Moyen mnémotechnique : « Réduction = Récupération d'électrons ».",
      "Le réducteur cède, l'oxydant capte.",
      "Un gain d'électrons. ✅");
  }
}
banquePC1ere('1ere_c_pc', 'Première C');
banquePC1ere('1ere_d_pc', 'Première D');

// ============================================================
// PHYSIQUE-CHIMIE - TERMINALE C et TERMINALE D
// ============================================================
function banquePCTerm(prefix, classe, opts = {}) {
  const P = mk(prefix, classe, 'Physique-Chimie');
  {
    const T = 'Cinématique';
    P(1, T, 1, "v = v₀ + at avec v₀ = 0, a = 3 m/s², t = 4 s. Calcule v en m/s.", "12",
      "MRUA : la vitesse croît linéairement.",
      "0 + 3×4.",
      "v = 12 m/s. ✅");
    P(1, T, 2, "v₀ = 5 m/s, a = 2 m/s², t = 3 s. Calcule v en m/s.", "11",
      "v = v₀ + at.",
      "5 + 2×3.",
      "v = 11 m/s. ✅");
    P(1, T, 2, "x = ½at² avec a = 2 m/s² et t = 3 s (départ au repos). Calcule x en mètres.", "9",
      "x = ½×a×t².",
      "0,5×2×9.",
      "x = 9 m. ✅");
  }
  {
    const T = "Mouvement du centre d'inertie d'un solide";
    P(2, T, 1, "F = 20 N s'applique à un solide de masse 4 kg. Calcule l'accélération en m/s².", "5",
      "2ᵉ loi de Newton : a = F/m.",
      "20/4.",
      "a = 5 m/s². ✅");
    P(2, T, 1, "m = 2 kg et a = 6 m/s². Calcule la force résultante en newtons.", "12",
      "F = ma.",
      "2×6.",
      "F = 12 N. ✅");
  }
  {
    const T = "Mouvement dans le champ de pesanteur terrestre";
    P(3, T, 1, "Chute libre sans vitesse initiale : v = gt avec g = 10 m/s² et t = 3 s. Calcule v en m/s.", "30",
      "La vitesse croît comme gt.",
      "10×3.",
      "v = 30 m/s. ✅");
    P(3, T, 2, "Chute libre : h = ½gt² avec g = 10 et t = 2 s. Calcule h en mètres.", "20",
      "h = ½gt².",
      "0,5×10×4.",
      "h = 20 m. ✅");
    P(3, T, 2, "Chute libre : h = ½gt² avec g = 10 et t = 3 s. Calcule h en mètres.", "45",
      "h = ½gt².",
      "0,5×10×9.",
      "h = 45 m. ✅");
  }
  {
    const T = "Mouvement de particules chargées dans le champ électrique uniforme";
    P(4, T, 2, "E = U/d avec U = 100 V et d = 2 m. Calcule E en V/m.", "50",
      "Le champ est le quotient tension/distance.",
      "100/2.",
      "E = 50 V/m. ✅");
    P(4, T, 2, "F = qE avec q = 2 C et E = 5 V/m. Calcule F en newtons.", "10",
      "Force électrique sur une charge.",
      "2×5.",
      "F = 10 N. ✅");
  }
  {
    const T = 'Oscillateurs mécaniques de translation';
    P(5, T, 2, "Dans un oscillateur amorti, que devient l'amplitude des oscillations au cours du temps ? (augmente, diminue ou reste constante)", "diminue",
      "Les frottements dissipent l'énergie.",
      "Régime pseudo-périodique.",
      "Elle diminue. ✅");
  }
  {
    const T = 'Généralités sur les phénomènes vibratoires';
    P(6, T, 1, "T = 0,01 s. Calcule la fréquence f en hertz.", "100",
      "f = 1/T.",
      "1/0,01.",
      "f = 100 Hz. ✅");
    P(6, T, 2, "T = 0,002 s. Calcule f en hertz.", "500",
      "f = 1/T.",
      "1/0,002.",
      "f = 500 Hz. ✅");
  }
  {
    const T = "Propagation d'un phénomène vibratoire";
    P(7, T, 2, "v = λf avec λ = 2 m et f = 5 Hz. Calcule v en m/s.", "10",
      "Longueur d'onde × fréquence.",
      "2×5.",
      "v = 10 m/s. ✅");
    P(7, T, 2, "λ = 0,5 m et f = 20 Hz. Calcule v en m/s.", "10",
      "v = λf.",
      "0,5×20.",
      "v = 10 m/s. ✅");
  }
  {
    const T = 'Superposition de deux phénomènes vibratoires';
    P(8, T, 2, "Deux ondes en phase se superposent : l'amplitude résultante est plus ... (grande ou petite)", "grande",
      "Les élongations s'ajoutent.",
      "Interférence constructive.",
      "Plus grande. ✅");
  }
  if (opts.interferences) {
    const T = 'Interférences d\'ondes lumineuses';
    P(9, T, 3, "Les franges sombres correspondent à une interférence... (constructive ou destructive)", "destructive",
      "Les ondes s'opposent (opposition de phase).",
      "Amplitude nulle.",
      "Destructive. ✅");
  }
  {
    const T = 'Champ magnétique';
    P(opts.champBNum, T, 1, "Quelle est l'unité du champ magnétique ?", "tesla|le tesla",
      "Symbole : T.",
      "Elle rend hommage à Nikola Tesla.",
      "Le tesla (T). ✅");
  }
  {
    const T = 'Force de Lorentz';
    P(opts.lorentzNum, T, 2, "F = qvB (mouvement perpendiculaire au champ) avec q = 2 C, v = 3 m/s, B = 5 T. Calcule F en newtons.", "30",
      "F = q×v×B.",
      "2×3×5.",
      "F = 30 N. ✅");
  }
  {
    const T = 'Force de Laplace';
    P(opts.laplaceNum, T, 2, "F = BIL avec B = 2 T, I = 3 A, L = 0,5 m. Calcule F en newtons.", "3",
      "F = B×I×L.",
      "2×3×0,5.",
      "F = 3 N. ✅");
    P(opts.laplaceNum, T, 2, "B = 1 T, I = 2 A, L = 4 m. Calcule F = BIL en newtons.", "8",
      "F = BIL.",
      "1×2×4.",
      "F = 8 N. ✅");
  }
  {
    const T = 'Induction électromagnétique';
    P(opts.inductionNum, T, 2, "Qui a découvert l'induction électromagnétique en 1831 ?", "faraday",
      "Physicien anglais célèbre pour son travail sur l'électricité.",
      "Il a aussi introduit la notion de champ.",
      "Michael Faraday. ✅");
  }
  {
    const T = 'Auto-induction';
    P(opts.autoinductionNum, T, 2, "Une bobine s'oppose aux variations de quel grandeur électrique dans son circuit ?", "courant|intensite|intensité|intensité du courant",
      "C'est la loi de Lenz : effet d'opposition.",
      "La bobine crée une f.c.e.m. qui freine la variation.",
      "Le courant (l'intensité). ✅");
  }
  {
    const T = 'Circuit oscillant LC';
    P(opts.lcNum, T, 2, "Dans un circuit LC, l'énergie oscille entre forme électrique (condensateur) et forme...", "magnetique|magnétique",
      "Quelle énergie stocke la bobine ?",
      "Énergie magnétique.",
      "Magnétique. ✅");
    P(opts.lcNum, T, 3, "T = 2π√(LC). Si on multiplie L et C par 4, par combien est multipliée T ?", "4",
      "Regarde ce que devient LC.",
      "LC est multiplié par 16, donc √(LC) par 4.",
      "T est multipliée par 4. ✅");
  }
  {
    const T = 'Circuit en régime sinusoïdal forcé';
    P(opts.sinusNum, T, 3, "Circuit RLC série : R = 30 Ω et X_L = 40 Ω. Calcule l'impédance Z = √(R² + X_L²) en ohms.", "50",
      "Triangle d'impédance (3-4-5 !).",
      "√(900 + 1600) = √2500.",
      "Z = 50 Ω. ✅");
  }
  {
    const T = 'Effet photoélectrique';
    P(opts.photoNum, T, 2, "L'effet photoélectrique est l'éjection d'électrons d'un métal sous l'effet de la...", "lumiere|lumière",
      "Éclairons un métal avec une lumière adaptée.",
      "Chaque photon apporte hν.",
      "La lumière. ✅");
    P(opts.photoNum, T, 2, "Quel scientifique a expliqué l'effet photoélectrique (prix Nobel 1921) ?", "einstein",
      "Il a introduit le photon.",
      "E = hν.",
      "Albert Einstein. ✅");
  }
  {
    const T = 'Noyau atomique';
    P(opts.noyauNum, T, 2, "Uranium 235 : A = 235, Z = 92. Calcule le nombre de neutrons.", "143",
      "N = A − Z.",
      "235 − 92.",
      "N = 143. ✅");
    P(opts.noyauNum, T, 2, "Azote 14 : A = 14, Z = 7. Calcule le nombre de neutrons.", "7",
      "N = A − Z.",
      "14 − 7.",
      "N = 7. ✅");
  }
  {
    const T = 'Réactions nucléaires';
    P(opts.reactionsNum, T, 2, "Un isotope a une demi-vie de 5 ans. On part de 100 g. Quelle masse reste-t-il après 15 ans ?", "12.5|12,5",
      "15 ans = combien de demi-vies ?",
      "3 demi-vies : 100 → 50 → 25 → 12,5.",
      "12,5 g. ✅");
    P(opts.reactionsNum, T, 2, "Après 2 demi-vies, quelle fraction de l'isotope initial reste-t-il ?", "1/4",
      "Chaque demi-vie divise par 2.",
      "1/2 puis 1/4.",
      "1/4. ✅");
    P(opts.reactionsNum, T, 2, "Le Soleil produit son énergie par fusion ou par fission ?", "fusion",
      "Assemblage de noyaux légers.",
      "Les noyaux d'hydrogène fusionnent en hélium.",
      "La fusion. ✅");
  }
  {
    const T = opts.phNum === 20 ? 'Solutions aqueuses (Acide/Base et pH)' : "Solutions aqueuses d'acide chlorhydrique et d'hydroxyde de sodium";
    P(opts.phNum, T, 2, "Acide fort : [H⁺] = 10⁻³ mol/L. Calcule le pH.", "3",
      "pH = −log[H⁺].",
      "−log(10⁻³) = 3.",
      "pH = 3. ✅");
    P(opts.phNum, T, 2, "Acide fort : [H⁺] = 0,01 mol/L. Calcule le pH.", "2",
      "pH = −log[H⁺].",
      "0,01 = 10⁻².",
      "pH = 2. ✅");
  }
  if (opts.couplesAB) {
    const T = 'Couples acide base';
    P(22, T, 3, "L'eau peut jouer le rôle d'un acide ET d'une base : on dit qu'elle est...", "amphotere|amphotère|ampholyte",
      "Un seul mot pour les deux rôles.",
      "H₂O ⇌ H⁺ + OH⁻.",
      "Ampholyte (ou amphotère). ✅");
  }
  if (opts.hclNaoh) {
    const T = "Solutions aqueuses d'acide chlorhydrique et d'hydroxyde de sodium";
    P(21, T, 2, "HCl dissous dans l'eau libère H⁺ et quel anion ?", "Cl-|Cl−|chlorure|cl-",
      "Regarde la formule HCl.",
      "L'ion chlorure.",
      "Cl⁻. ✅");
  }
  if (opts.redoxGen) {
    const T = "Généralisation de l'oxydoréduction";
    P(21, T, 2, "L'oxydation d'une espèce chimique correspond à une perte d'...", "electrons|électrons",
      "Moyen mnémotechnique : oxydation = perte.",
      "Le réducteur s'oxyde.",
      "Électrons. ✅");
  }
}
banquePCTerm('term_c_pc', 'Terminale C', {
  interferences: true, champBNum: 10, lorentzNum: 11, laplaceNum: 12,
  inductionNum: 13, autoinductionNum: 14, lcNum: 15, sinusNum: 16,
  photoNum: 17, noyauNum: 18, reactionsNum: 19, phNum: 20,
  couplesAB: true, hclNaoh: true
});
banquePCTerm('term_d_pc', 'Terminale D', {
  champBNum: 9, lorentzNum: 10, laplaceNum: 11,
  inductionNum: 12, autoinductionNum: 13, lcNum: 14, sinusNum: 15,
  photoNum: 16, noyauNum: 17, reactionsNum: 18, phNum: 19,
  couplesAB: true, redoxGen: true
});

// ============================================================
// SVT - SECONDE C
// ============================================================
const S2 = mk('2nde_c_svt', 'Seconde C', 'SVT');
{
  const T = 'Constituants de l\'environnement';
  S2(1, T, 1, "Le sol est composé d'éléments minéraux et d'éléments... (un mot)", "organiques",
    "Pense aux débris vivants en décomposition.",
    "Restes de végétaux et d'animaux = matière organique (humus).",
    "Les éléments organiques. ✅");
  S2(1, T, 1, "Les trois grandes composantes de l'environnement sont la lithosphère, l'hydrosphère et l'...", "atmosphere|atmosphère",
    "L'enveloppe gazeuse.",
    "C'est là que se trouve le CO₂ et l'oxygène.",
    "L'atmosphère. ✅");
}
{
  const T = 'Dégradations de l\'environnement';
  S2(2, T, 1, "La désertification au Sahel est principalement accélérée par les activités...", "humaines|humaine",
    "Surpâturage, déforestation, agriculture intensive...",
    "Le climat seul n'explique pas la vitesse actuelle.",
    "Les activités humaines. ✅");
  S2(2, T, 1, "L'érosion du sol est provoquée par l'eau et le...", "vent",
    "Deux agents de transport.",
    "Le vent déplace les particules sèches.",
    "Le vent. ✅");
}
{
  const T = 'Gestion de l\'environnement';
  S2(3, T, 1, "Pour lutter contre la désertification, on replante des arbres : c'est le reboisement ou la...", "reforestation|reforestation|reboisement",
    "Re = de nouveau, forestation = planter.",
    "Technique verte de restauration.",
    "La reforestation. ✅");
  S2(3, T, 2, "Les aménagements anti-érosifs (digues, fascines) servent à retenir l'...", "eau|leau|l'eau",
    "L'eau qui ruisselle emporte la terre.",
    "En la ralentissant, le sol reste en place.",
    "L'eau. ✅");
}
{
  const T = 'Relations trophiques';
  S2(4, T, 1, "Dans la chaîne herbe → sauterelle → crapaud, le crapaud est un consommateur secondaire. Et la sauterelle est un consommateur...", "primaire",
    "Il mange directement le producteur.",
    "Herbivore = 1er niveau après les producteurs.",
    "Primaire. ✅");
  S2(4, T, 2, "Les végétaux chlorophylliens sont les producteurs... (un mot)", "primaires",
    "Ils créent la matière organique de base.",
    "Tout part d'eux dans la chaîne alimentaire.",
    "Primaires. ✅");
}
{
  const T = "Formation, évolution et propriétés d'un sol";
  S2(5, T, 2, "La roche-mère se dégrade progressivement : c'est l'...", "alteration|altération",
    "Désagrégation physique et chimique.",
    "Elle donne les éléments minéraux du sol.",
    "L'altération. ✅");
  S2(5, T, 1, "L'humus du sol provient de la décomposition de la matière...", "organique",
    "Débris végétaux et animaux transformés.",
    "Travail des décomposeurs (bactéries, vers).",
    "Organique. ✅");
}
{
  const T = 'La gestion des sols';
  S2(6, T, 1, "La jachère consiste à laisser le sol se...", "reposer|regenerer|régénérer",
    "On ne cultive pas pendant une période.",
    "Cela restaure la fertilité naturellement.",
    "Reposer (se régénérer). ✅");
  S2(6, T, 1, "Les engrais améliorent la... du sol", "fertilite|fertilité",
    "Ils apportent N, P, K.",
    "Un sol fertile nourrit mieux les plantes.",
    "La fertilité. ✅");
}
{
  const T = "Énergie fossile : charbon d'Anou-Araren";
  S2(7, T, 1, "Le charbon est une source d'énergie...", "fossile",
    "Il s'est formé il y a des millions d'années.",
    "Comme le pétrole et le gaz.",
    "Fossile. ✅");
  S2(7, T, 2, "Le charbon provient de la fossilisation de...", "vegetaux|végétaux|plantes",
    "Forêts enfouies et comprimées.",
    "Transformation anaérobie de la matière végétale.",
    "Des végétaux. ✅");
}
{
  const T = "Uranium d'Arlit";
  S2(8, T, 1, "L'uranium sert principalement à produire de l'énergie...", "nucleaire|nucléaire",
    "Fission des noyaux d'uranium.",
    "Centrale nucléaire de Kandi ? Non : l'uranium nigérien est surtout exporté.",
    "Nucléaire. ✅");
  S2(8, T, 1, "Quelle ville du Niger est le centre de l'extraction d'uranium ?", "arlit",
    "Région d'Agadez.",
    "Mines exploitées depuis les années 1970.",
    "Arlit. ✅");
}
{
  const T = 'Calcaire et gypse';
  S2(9, T, 2, "Quelle est la formule chimique du calcaire ?", "caco3|CaCO3",
    "Carbonate de calcium.",
    "Ca-C-O₃.",
    "CaCO₃. ✅");
  S2(9, T, 2, "Le gypse est un sulfate de... (quel métal ?)", "calcium",
    "Formule : CaSO₄·2H₂O.",
    "Même cation que le calcaire.",
    "Calcium. ✅");
}
{
  const T = "Production primaire et productivité de l'écosystème";
  S2(10, T, 1, "La production primaire d'un écosystème est assurée par les...", "producteurs|vegetaux|végétaux|plantes",
    "Ils fabriquent la matière organique.",
    "Grâce à la photosynthèse.",
    "Les producteurs (végétaux chlorophylliens). ✅");
  S2(10, T, 2, "La photosynthèse nécessite le CO₂, l'eau et l'énergie...", "solaire|lumineuse",
    "Quelle source d'énergie capte la chlorophylle ?",
    "Le soleil, source primaire de tout écosystème.",
    "Solaire (lumineuse). ✅");
}
{
  const T = "Rôles des végétaux dans l'écosystème";
  S2(11, T, 1, "Les végétaux libèrent du dioxygène grâce à quel processus ?", "photosynthese|photosynthèse",
    "Processus qui fabrique la matière organique.",
    "CO₂ + H₂O + lumière → glucose + O₂.",
    "La photosynthèse. ✅");
  S2(11, T, 2, "Les végétaux forment la base des chaînes...", "alimentaires|alimentaire",
    "Qui mange qui, depuis le soleil.",
    "Producteurs → consommateurs → décomposeurs.",
    "Alimentaires. ✅");
}

// ============================================================
// SVT - PREMIÈRE C (chapitres 1 à 9 et 11)
// ============================================================
const S1C = mk('1ere_c_svt', 'Première C', 'SVT');
{
  const T = 'Organisation de la cellule vivante';
  S1C(1, T, 1, "Quel organite est le siège de la respiration cellulaire ?", "mitochondrie|mitochondries|la mitochondrie",
    "C'est la « centrale énergétique ».",
    "Elle produit l'ATP.",
    "La mitochondrie. ✅");
  S1C(1, T, 1, "Quel organite est le siège de la photosynthèse ?", "chloroplaste|chloroplastes|le chloroplaste",
    "Il contient la chlorophylle.",
    "Présent uniquement dans les cellules végétales.",
    "Le chloroplaste. ✅");
  S1C(1, T, 2, "La membrane plasmique est constituée d'une bicouche...", "lipidique|lipidique|lipidique (lipides)",
    "Modèle en mosaïque fluide.",
    "Des lipides dans lesquels flottent des protéines.",
    "Lipidique. ✅");
}
{
  const T = "Nutrition minérale d'un végétal chlorophyllien";
  S1C(2, T, 1, "Les racines absorbent l'eau du sol et les sels...", "mineraux|minéraux",
    "Ils viennent du sol.",
    "N, P, K... nécessaires à la plante.",
    "Minéraux. ✅");
  S1C(2, T, 2, "La sève brute circule dans le xylème, des racines vers les...", "feuilles|les feuilles",
    "Colonne montante.",
    "C'est là que se fait la photosynthèse.",
    "Les feuilles. ✅");
}
{
  const T = "Nutrition carbonée d'un végétal chlorophyllien";
  S1C(3, T, 1, "Le glucose est fabriqué à partir du CO₂ et de l'eau grâce à l'énergie...", "solaire|lumineuse",
    "Source externe captée par la chlorophylle.",
    "Le soleil !",
    "Solaire. ✅");
  S1C(3, T, 1, "Quel gaz la photosynthèse libère-t-elle ?", "oxygene|oxygène|o2|O2",
    "Indispensable à la respiration.",
    "Coché vert : O₂.",
    "Le dioxygène (O₂). ✅");
}
{
  const T = 'Devenir des substances synthétisées';
  S1C(4, T, 2, "La sève élaborée (riche en glucose) circule dans quel vaisseau ?", "phloeme|phloème|le phloème",
    "Vaisseau descendant et répartiteur.",
    "Du xylème monte, du ___ descend.",
    "Le phloème. ✅");
  S1C(4, T, 2, "L'amidon est une forme de ... du glucose dans la plante", "stockage|reserve|réserve",
    "Le glucose est transformé et entreposé.",
    "Dans les amyloplastes (racines, tubercules, graines).",
    "Le stockage (réserve). ✅");
}
{
  const T = 'Respiration et Fermentations';
  S1C(5, T, 2, "Bilan de la respiration : C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6... ?", "eau|h2o|H2O",
    "Produit final de la respiration.",
    "Equation inverse de la photosynthèse.",
    "6H₂O (l'eau). ✅");
  S1C(5, T, 1, "La fermentation alcoolique produit de l'éthanol et du...", "co2|CO2",
    "Gaz qui fait gonfler le pain.",
    "C₆H₁₂O₆ → 2 C₂H₅OH + 2 CO₂.",
    "CO₂. ✅");
  S1C(5, T, 3, "Combien d'ATP produit la fermentation par mole de glucose ?", "2",
    "Compare à la respiration (36-38).",
    "Seule la glycolyse fonctionne.",
    "2 ATP. ✅");
}
{
  const T = 'Séisme et structure interne de la Terre';
  S1C(6, T, 1, "Quels appareils enregistrent les ondes sismiques ?", "sismographes|sismographe|le sismographe",
    "Ils tracent les sismogrammes.",
    "Sismique vient du grec « seismos » (tremblement).",
    "Les sismographes. ✅");
  S1C(6, T, 2, "La discontinuité de Moho sépare la croûte du...", "manteau|le manteau",
    "Les ondes P et S changent de vitesse à cette frontière.",
    "Enveloppe intermédiaire de la Terre.",
    "Le manteau. ✅");
}
{
  const T = 'Principes de stratigraphie et méthodes de datation';
  S1C(7, T, 1, "D'après le principe de superposition, la couche la plus jeune est celle qui est...", "superieure|supérieure",
    "Sauf si les couches sont renversées.",
    "Les sédiments se déposent couche après couche.",
    "Supérieure. ✅");
  S1C(7, T, 2, "La datation absolue utilise la ... de certains éléments", "radioactivite|radioactivité",
    "Les isotopes se désintègrent régulièrement.",
    "Demi-vie : carbone 14, potassium-argon...",
    "La radioactivité. ✅");
}
{
  const T = "L'échelle des temps géologiques";
  S1C(8, T, 2, "Dans quelle ère ont vécu les dinosaures ?", "secondaire|mesozoique|mésozoïque",
    "Ils ont disparu il y a 65 millions d'années.",
    "L'ère qui suit le primaire.",
    "L'ère secondaire (Mésozoïque). ✅");
  S1C(8, T, 2, "Dans quelle ère l'homme apparaît-il ?", "quaternaire",
    "L'ère la plus récente.",
    "Après le tertiaire.",
    "Le quaternaire. ✅");
}
{
  const T = 'Principes de stratigraphie et méthodes de datation';
  S1C(9, T, 1, "Les fossiles sont des restes ou des traces d'êtres...", "vivants",
    "Coquilles, os, empreintes...",
    "Conservés dans les roches sédimentaires.",
    "Vivants. ✅");
  S1C(9, T, 3, "Un bon fossile stratigraphique a une durée de vie...", "courte",
    "Pour dater précisément, il faut une référence brève.",
    "Répartition géographique large + durée courte.",
    "Courte. ✅");
}
{
  const T = 'La carte géologique - La coupe géologique';
  S1C(11, T, 2, "Une coupe géologique montre la disposition des couches en...", "profondeur",
    "Coupe verticale du sous-sol.",
    "On y voit failles, plis, couches.",
    "Profondeur. ✅");
  S1C(11, T, 3, "Une faille correspond à une ... des couches", "cassure",
    "Bloc basculé, décalé...",
    "Mouvement tectonique cassant.",
    "Cassure (avec décalage). ✅");
}

// ============================================================
// SVT - PREMIÈRE D
// ============================================================
const S1D = mk('1ere_d_svt', 'Première D', 'SVT');
{
  const T = 'Structure interne de la Terre';
  S1D(1, T, 2, "Le noyau terrestre est principalement composé de fer et de...", "nickel",
    "Deux métaux lourds (symboles Fe et Ni).",
    "Densité élevée du noyau.",
    "Nickel. ✅");
  S1D(1, T, 1, "L'enveloppe superficielle et solide de la Terre s'appelle la...", "croute|croûte",
    "Elle « flotte » sur le manteau.",
    "Océanique ou continentale.",
    "La croûte. ✅");
  S1D(1, T, 1, "Le manteau est situé entre la croûte et le...", "noyau|le noyau",
    "Enveloppe la plus volumineuse.",
    "Ordre : croûte → manteau → noyau.",
    "Le noyau. ✅");
}
{
  const T = 'Tectonique des plaques';
  S1D(2, T, 1, "Wegener a proposé la théorie de la dérive des...", "continents",
    "Les continents se déplacent.",
    "L'Amérique et l'Afrique étaient soudées.",
    "Continents. ✅");
  S1D(2, T, 2, "Au niveau des dorsales océaniques, les plaques s'écartent : c'est la...", "divergence",
    "Naissance de croûte océanique.",
    "L'inverse : la convergence (fosses, collisions).",
    "Divergence. ✅");
  S1D(2, T, 1, "Les séismes et les volcans se concentrent aux limites des...", "plaques|plaques tectoniques",
    "Zones actives de la planète.",
    "Les plaques se déplacent de quelques cm/an.",
    "Plaques (tectoniques). ✅");
}
{
  const T = 'Conséquences de la tectonique des plaques';
  S1D(3, T, 1, "La collision de deux plaques continentales forme des chaînes de...", "montagnes",
    "Exemple : l'Himalaya.",
    "Épaississement de la croûte.",
    "Montagnes. ✅");
  S1D(3, T, 2, "Quelle chaîne de montagnes résulte de la collision Inde-Eurasie ?", "himalaya|l'himalaya",
    "Le toit du monde.",
    "Encore en surrection.",
    "L'Himalaya. ✅");
}
{
  const T = 'Principes de stratigraphie et méthodes de datation';
  S1D(4, T, 1, "Principe de superposition : la couche la plus jeune est celle du...", "haut|dessus|superieure|supérieure",
    "Les couches s'empilent avec le temps.",
    "La plus récente recouvre les autres.",
    "Haut (supérieure). ✅");
  S1D(4, T, 2, "La datation absolue repose sur quel phénomène physique ?", "radioactivite|radioactivité",
    "Horloge des isotopes.",
    "Carbone 14 pour les 50 000 dernières années.",
    "La radioactivité. ✅");
}
{
  const T = "L'échelle des temps géologiques";
  S1D(5, T, 2, "Dans quelle ère ont vécu les dinosaures ?", "secondaire",
    "Jurassique, Crétacé...",
    "Ils disparaissent à la fin du crétacé.",
    "Secondaire. ✅");
  S1D(5, T, 2, "Quel âge a la Terre (en milliards d'années) ?", "4.5|4,5|4.6|4,6",
    "Entre 4,5 et 4,6 milliards d'années.",
    "Datation des plus vieilles roches et météorites.",
    "≈ 4,5 milliards d'années. ✅");
}
{
  const T = 'La carte géologique - La coupe géologique';
  S1D(6, T, 2, "Une coupe géologique représente le sous-sol en...", "profondeur",
    "Tranchée verticale imaginaire.",
    "Indispensable aux géologues et au BAC.",
    "Profondeur. ✅");
  S1D(6, T, 2, "Une faille est une ... de la roche avec décalage", "cassure",
    "Déformation cassante.",
    "Les blocs glissent l'un contre l'autre.",
    "Cassure. ✅");
}
{
  const T = 'Organisation de la cellule vivante';
  S1D(7, T, 1, "Quel organite contient l'information génétique ?", "noyau|le noyau",
    "Il renferme les chromosomes.",
    "ADN = support de l'hérédité.",
    "Le noyau. ✅");
  S1D(7, T, 2, "Quel organite est le siège de la photosynthèse ?", "chloroplaste|chloroplastes|le chloroplaste",
    "Vert grâce à la chlorophylle.",
    "Cellules végétales uniquement.",
    "Le chloroplaste. ✅");
}
{
  const T = "Nutrition minérale d'un végétal chlorophyllien";
  S1D(8, T, 1, "Les racines prélèvent dans le sol l'eau et les sels...", "mineraux|minéraux",
    "N, P, K...",
    "Transportés par la sève brute.",
    "Minéraux. ✅");
  S1D(8, T, 2, "La sève brute circule du xylème vers les...", "feuilles|les feuilles",
    "Les feuilles = usines photosynthétiques.",
    "La sève brute monte.",
    "Les feuilles. ✅");
}
{
  const T = "Nutrition carbonée d'un végétal chlorophyllien";
  S1D(9, T, 1, "La photosynthèse utilise le CO₂, l'eau et l'énergie...", "solaire|lumineuse",
    "Chlorophylle = capteur.",
    "Le soleil alimente tout l'écosystème.",
    "Solaire. ✅");
  S1D(9, T, 1, "Quel gaz est libéré par la photosynthèse ?", "oxygene|oxygène|o2|O2",
    "O₂.",
    "Grâce à la photolyse de l'eau.",
    "Le dioxygène. ✅");
}
{
  const T = 'Devenir des substances synthétisées';
  S1D(10, T, 2, "La sève élaborée circule dans le...", "phloeme|phloème|le phloème",
    "Elle répartit les sucres.",
    "Montée : xylème ; répartition : ___.",
    "Phloème. ✅");
  S1D(10, T, 2, "L'amidon est une molécule de ... du glucose", "stockage|reserve|réserve",
    "Polymère de glucose.",
    "Stocké dans racines, graines, tubercules.",
    "Stockage (réserve). ✅");
}

// ============================================================
// SVT - TERMINALE C
// ============================================================
const STC = mk('term_c_svt', 'Terminale C', 'SVT');
{
  const T = 'Altération et sédimentation';
  STC(1, T, 2, "L'érosion transporte les fragments de roche après l'... de celle-ci", "alteration|altération",
    "Désagrégation physique et chimique.",
    "Première étape du cycle sédimentaire.",
    "Altération. ✅");
  STC(1, T, 1, "Un dépôt de sédiments disposé en couche s'appelle une...", "strate|couche",
    "Stratigraphie = étude des strates.",
    "Les strates s'empilent dans le temps.",
    "Strate. ✅");
}
{
  const T = 'Les ressources géologiques exploitées au Niger';
  STC(2, T, 1, "Dans quelle ville du Niger extrait-on l'uranium ?", "arlit",
    "Région d'Agadez.",
    "Premier producteur du continent avec le Niger.",
    "Arlit. ✅");
  STC(2, T, 2, "Où se trouve le gisement de charbon d'Anou-Araren ?", "anou-araren|anou araren",
    "Bassin de lullemmeden (Tahoua).",
    "Charbon utilisé pour la centrale de Tassawa.",
    "Anou-Araren. ✅");
  STC(2, T, 2, "Le pétrole nigérien est exploité dans le bloc d'...", "agadem",
    "Région de Diffa.",
    "La raffinerie de Soraz est à Zinder.",
    "Agadem. ✅");
}
{
  const T = "Le fonctionnement des appareils génitaux et leur régulation";
  STC(3, T, 1, "Quelle est l'hormone sexuelle masculine principale ?", "testosterone|testostérone",
    "Produite par les testicules.",
    "Elle déclenche les caractères sexuels secondaires.",
    "Testostérone. ✅");
  STC(3, T, 1, "Où sont produits les spermatozoïdes ?", "testicules|les testicules",
    "Dans les tubes séminifères.",
    "Production continue dès la puberté.",
    "Les testicules. ✅");
  STC(3, T, 1, "Quelle est la durée moyenne du cycle menstruel (en jours) ?", "28",
    "Cycle ovarien + utérin.",
    "Entre 21 et 35 jours selon les femmes, moyenne classique.",
    "28 jours. ✅");
}
{
  const T = 'De la fécondation à la nidation';
  STC(4, T, 2, "La fécondation a lieu dans la trompe de...", "fallope|la fallope|trompe de fallope",
    "Trompes utérines.",
    "Rencontre ovocyte-spermatozoïde.",
    "Fallope. ✅");
  STC(4, T, 2, "La nidation de l'embryon a lieu dans l'...", "uterus|utérus",
    "Muqueuse utérine (endomètre).",
    "≈ 7 jours après la fécondation.",
    "Utérus. ✅");
}
{
  const T = 'La régulation des naissances';
  STC(5, T, 1, "La pilule contraceptive contient des...", "hormones",
    "Œstrogènes et progestatifs.",
    "Elles bloquent l'ovulation.",
    "Des hormones. ✅");
  STC(5, T, 1, "Le préservatif protège des grossesses et aussi des...", "ist|mst|maladies",
    "Seule méthode contraceptive qui protège du VIH.",
    "Infections Sexuellement Transmissibles.",
    "IST/MST. ✅");
}
{
  const T = 'La régulation de la glycémie';
  STC(6, T, 1, "Quelle hormone fait BAISSER la glycémie ?", "insuline|l'insuline",
    "Sécrétée par le pancréas.",
    "Favorise le stockage du glucose.",
    "Insuline. ✅");
  STC(6, T, 2, "Quelle hormone fait MONTER la glycémie ?", "glucagon|le glucagon",
    "Aussi sécrétée par le pancréas.",
    "Mobilise le glycogène du foie.",
    "Glucagon. ✅");
  STC(6, T, 1, "Quel organe sécrète l'insuline et le glucagon ?", "pancreas|pancréas",
    "Glandes mixtes.",
    "Îlots de Langerhans.",
    "Le pancréas. ✅");
}
{
  const T = 'Tissu nerveux et notions de reflexes';
  STC(7, T, 2, "Le message nerveux se propage sous forme de potentiel d'...", "action",
    "Codage électrique en fréquence.",
    "PA = inversion brève de polarité.",
    "Action. ✅");
  STC(7, T, 1, "La synapse est la zone de communication entre deux...", "neurones",
    "Neurone-neurone ou neurone-muscle.",
    "Communication chimique (neurotransmetteur).",
    "Neurones. ✅");
}
{
  const T = 'Messages nerveux et synapses';
  STC(8, T, 3, "Quel neurotransmetteur classique est libéré à la synapse neuromusculaire ?", "acetylcholine|acétylcholine",
    "Premier neurotransmetteur découvert.",
    "Dégradée par l'acétylcholinestérase.",
    "Acétylcholine. ✅");
  STC(8, T, 2, "Le message nerveux est électrique dans l'axone et chimique dans la...", "synapse",
    "Deux codages complémentaires.",
    "Vésicules synaptiques → neurotransmetteurs.",
    "Synapse. ✅");
}
{
  const T = "Mécanismes de l'immunité";
  STC(9, T, 1, "Les lymphocytes B produisent des...", "anticorps",
    "Immunoglobulines.",
    "Ils neutralisent les antigènes.",
    "Anticorps. ✅");
  STC(9, T, 2, "Les lymphocytes T8 détruisent les cellules...", "infectees|infectées",
    "LT8 = lymphocytes cytotoxiques.",
    "Par contact (perforine).",
    "Infectées. ✅");
  STC(9, T, 3, "Le VIH détruit surtout les lymphocytes...", "lt4|lymphocytes t4|t4",
    "Chef d'orchestre immunitaire.",
    "LT4 = auxiliaires (helper).",
    "LT4. ✅");
}

// ============================================================
// SVT - TERMINALE D
// ============================================================
const STD = mk('term_d_svt', 'Terminale D', 'SVT');
{
  const T = 'Information génétique et clonage';
  STD(1, T, 2, "Le clonage est une reproduction...", "asexuee|asexuée",
    "Un seul parent, pas de méiose.",
    "Le clone est génétiquement identique.",
    "Asexuée. ✅");
  STD(1, T, 3, "Un organisme transgénique possède un gène...", "etranger|étranger|transfere|transféré",
    "Gène ajouté d'une autre espèce.",
    "Ex : bactéries productrices d'insuline humaine.",
    "Étranger (transféré). ✅");
}
{
  const T = 'Transmission de l\'information génétique (Mitose)';
  STD(2, T, 2, "Pendant la mitose, la duplication de l'ADN a lieu en phase...", "s|synthese|synthèse",
    "Avant la division.",
    "Chaque chromosome devient double (2 chromatides).",
    "Phase S (synthèse). ✅");
  STD(2, T, 1, "La mitose conserve-t-elle le nombre de chromosomes ? (oui/non)", "oui",
    "Division conservatrice.",
    "2 cellules filles identiques à la mère.",
    "Oui. ✅");
}
{
  const T = "Expression de l'information génétique";
  STD(3, T, 1, "Le dogme central : ADN → ARNm → ...", "proteine|protéine|protéines",
    "Synthèse des protéines.",
    "Traduction dans le ribosome.",
    "Protéine. ✅");
  STD(3, T, 2, "Un codon est formé de combien de nucléotides ?", "3|trois",
    "Code pour un acide aminé.",
    "4³ = 64 codons possibles.",
    "3. ✅");
}
{
  const T = 'Reproduction sexuée et brassage génétique';
  STD(4, T, 3, "Le crossing-over a lieu pendant la phase de la méiose appelée...", "prophase|prophase 1|prophase i",
    "Échange de fragments entre chromatides.",
    "Première division de méiose.",
    "Prophase I. ✅");
  STD(4, T, 2, "La méiose produit des cellules à n chromosomes dites...", "haploides|haploïdes",
    "Gamètes.",
    "La fécondation restaure 2n.",
    "Haploïdes. ✅");
}
{
  const T = 'Hérédité et génétique humaine';
  STD(5, T, 2, "Le daltonisme est porté par quel chromosome sexuel ?", "x",
    "Hérédité liée au sexe.",
    "Maladie récessive plus fréquente chez les garçons (XY).",
    "Le chromosome X. ✅");
  STD(5, T, 3, "Le groupe sanguin ABO est un cas de polyallélie : combien d'allèles principaux ?", "3|trois",
    "A, B et O.",
    "6 génotypes, 4 groupes.",
    "3. ✅");
}
{
  const T = 'Anomalies chromosomiques';
  STD(6, T, 1, "La trisomie 21 : combien de chromosomes 21 ?", "3|trois",
    "2n + 1.",
    "Erreur de répartition en méiose (non-disjonction).",
    "3. ✅");
  STD(6, T, 3, "Un caryotype anormal peut résulter d'une erreur de...", "meiose|méiose",
    "Non-disjonction de chromosomes.",
    "Anaphase I ou II.",
    "Méiose. ✅");
}
{
  const T = 'La régulation de la glycémie';
  STD(7, T, 1, "Quelle hormone fait baisser la glycémie ?", "insuline|l'insuline",
    "Hypoglycémiante.",
    "Sécrétée par les cellules β du pancréas.",
    "Insuline. ✅");
  STD(7, T, 2, "Quelle hormone hyperglycémiante sécrète le pancréas ?", "glucagon|le glucagon",
    "Antagoniste de l'insuline.",
    "Cellules α des îlots de Langerhans.",
    "Glucagon. ✅");
}
{
  const T = 'Tissu nerveux et notions de reflexes';
  STD(8, T, 2, "Le potentiel d'action est un message de nature...", "electrique|électrique",
    "Il se propage le long de l'axone.",
    "Tout ou rien.",
    "Électrique. ✅");
  STD(8, T, 1, "L'unité structurelle du tissu nerveux est le...", "neurone",
    "Corps cellulaire + dendrites + axone.",
    "≈ 100 milliards chez l'homme.",
    "Neurone. ✅");
}
{
  const T = 'Messages nerveux et synapses';
  STD(9, T, 2, "Quel neurotransmetteur est libéré à la synapse neuromusculaire ?", "acetylcholine|acétylcholine",
    "ACh.",
    "Bloquée par le curare.",
    "Acétylcholine. ✅");
  STD(9, T, 2, "Dans la synapse, le message électrique est converti en message...", "chimique",
    "Neurotransmetteurs libérés par exocytose.",
    "Puis reconverti en électrique postsynaptique.",
    "Chimique. ✅");
}
{
  const T = 'La régulation des naissances';
  STD(10, T, 1, "La pilule contraceptive bloque l'...", "ovulation",
    "Via les hormones.",
    "Pas d'ovocyte = pas de fécondation.",
    "Ovulation. ✅");
  STD(10, T, 1, "Quelle méthode contraceptive protège du VIH ?", "preservatif|préservatif",
    "Barrière mécanique.",
    "Les autres méthodes ne protègent pas des IST.",
    "Le préservatif. ✅");
}
{
  const T = 'Le Système Immunitaire (Le soi et le non-soi)';
  STD(11, T, 3, "Le « soi » est défini par les molécules du...", "cmh|CMH",
    "Complexe Majeur d'Histocompatibilité.",
    "HLA chez l'homme.",
    "CMH. ✅");
  STD(11, T, 1, "Une molécule étrangère déclenchant une réponse immunitaire est un...", "antigene|antigène",
    "Reconnu comme non-soi.",
    "Protéines, glucides... étrangers.",
    "Antigène. ✅");
}
{
  const T = 'Les Réponses Immunitaires';
  STD(12, T, 1, "Les lymphocytes B se transforment en plasmocytes qui sécrètent des...", "anticorps",
    "Réponse humorale.",
    "Anticorps = immunoglobulines.",
    "Anticorps. ✅");
  STD(12, T, 2, "Quels lymphocytes détruisent directement les cellules infectées ?", "lt8|lymphocytes t8|t8",
    "Cytotoxiques.",
    "Réponse cellulaire.",
    "LT8. ✅");
}
{
  const T = 'Le VIH/SIDA et le dysfonctionnement du système immunitaire';
  STD(13, T, 2, "Le VIH détruit quels lymphocytes ?", "lt4|lymphocytes t4|t4",
    "Chefs d'orchestre.",
    "Sans LT4 : effondrement immunitaire.",
    "LT4. ✅");
  STD(13, T, 3, "Le VIH est un rétrovirus : son ARN est recopié en ADN par quelle enzyme ?", "transcriptase|transcriptase inverse",
    "Cible des trithérapies.",
    "Sens inverse : ARN → ADN.",
    "La transcriptase inverse. ✅");
}
{
  const T = 'Le Système Nerveux Central';
  STD(14, T, 2, "Le cortex cérébral est constitué de matière...", "grise",
    "Corps des neurones.",
    "La blanche est formée d'axones.",
    "Grise. ✅");
  STD(14, T, 1, "Quel organe contrôle l'équilibre et la coordination des mouvements ?", "cervelet|le cervelet",
    "Situé sous le cerveau.",
    "Son atteinte : troubles de l'équilibre.",
    "Le cervelet. ✅");
}
{
  const T = 'Le Muscle et sa Contraction';
  STD(15, T, 2, "La contraction musculaire résulte du glissement de l'actine sur la...", "myosine",
    "Théorie des filaments glissants.",
    "Têtes de myosine = rames.",
    "Myosine. ✅");
  STD(15, T, 2, "Le glissement actine-myosine nécessite des ions Ca²⁺ et de l'...", "atp|ATP",
    "Énergie cellulaire.",
    "Hydrolyse de l'ATP par les têtes de myosine.",
    "ATP. ✅");
}
{
  const T = 'Respiration et Fermentations';
  STD(16, T, 2, "La respiration produit environ 36-38 ATP ; la fermentation n'en produit que...", "2",
    "Glycolyse seule.",
    "Dégradation incomplète du glucose.",
    "2 ATP. ✅");
  STD(16, T, 1, "La chaîne respiratoire se situe dans quelle organite ?", "mitochondrie|mitochondries",
    "Sur les crêtes mitochondriales.",
    "L'ATP-synthase est la « turbine ».",
    "Mitochondrie. ✅");
}
{
  const T = 'Les Écosystèmes et Relations Trophiques';
  STD(17, T, 2, "Règle des 10% : quel pourcentage d'énergie passe d'un niveau trophique au suivant ?", "10",
    "90% sont perdus.",
    "Respiration, chaleur, déchets.",
    "10%. ✅");
  STD(17, T, 1, "Quel niveau trophique est à la base de tout écosystème ?", "producteurs|producteur|les producteurs",
    "Ils captent l'énergie solaire.",
    "Végétaux chlorophylliens.",
    "Les producteurs. ✅");
}
{
  const T = 'Flux de matière et d\'énergie';
  STD(18, T, 2, "La matière se recycle, mais l'énergie ... l'écosystème", "traverse",
    "Elle se dissipe en chaleur.",
    "Besoin d'apport continu : le Soleil.",
    "Traverse. ✅");
  STD(18, T, 3, "Quel gaz la déforestation libère-t-elle massivement ?", "co2|CO2",
    "Les arbres stockent le carbone.",
    "Effet de serre accentué.",
    "CO₂. ✅");
}
{
  const T = 'Biodiversité et Impacts Humains';
  STD(19, T, 2, "Combien de piliers compte le développement durable ?", "3|trois",
    "Économique, social, environnemental.",
    "Un triangle équilibré.",
    "3. ✅");
  STD(19, T, 2, "L'accumulation des toxiques le long de la chaîne alimentaire s'appelle la bio...", "bioamplification|amplification",
    "Les prédateurs au sommet sont les plus touchés.",
    "≠ bioaccumulation (dans UN organisme).",
    "Bioamplification. ✅");
}
{
  const T = 'Révisions Générales du BAC';
  STD(20, T, 2, "Quelle hormone fait baisser la glycémie ? (grande classique du BAC)", "insuline|l'insuline",
    "Pancréas, cellules β.",
    "Antagoniste du glucagon.",
    "Insuline. ✅");
  STD(20, T, 2, "Le VIH détruit quel type de lymphocytes ?", "lt4|lymphocytes t4|t4",
    "SIDA = effondrement immunitaire.",
    "Transcriptase inverse = cible des traitements.",
    "LT4. ✅");
}

// ============================================================
// INJECTION DANS FIRESTORE
// ============================================================
async function injecter() {
  console.log("Début de l'injection de " + EXOS.length + " exercices...");
  const parClasse = {};
  EXOS.forEach(e => { parClasse[e.classe + ' - ' + e.matiere] = (parClasse[e.classe + ' - ' + e.matiere] || 0) + 1; });
  console.log("Répartition :", JSON.stringify(parClasse, null, 2));

  for (let i = 0; i < EXOS.length; i += 300) {
    const lot = EXOS.slice(i, i + 300);
    const batch = writeBatch(db);
    for (const e of lot) {
      batch.set(doc(db, "exercices", e.id), e);
    }
    await batch.commit();
    console.log("Lot injecté : " + Math.min(i + 300, EXOS.length) + "/" + EXOS.length);
  }
  console.log("✅ TERMINÉ ! " + EXOS.length + " exercices sont maintenant dans Firebase.");
  process.exit(0);
}

injecter().catch(err => {
  console.error("❌ Erreur d'injection :", err);
  process.exit(1);
});
