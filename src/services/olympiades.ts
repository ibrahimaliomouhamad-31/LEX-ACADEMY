// BANQUE OLYMPIADES / CONCOURS — problèmes classiques de compétition avec
// solutions vérifiées. Pour les génies du LEX qui trouvent tout trop facile.

export interface ProblemeOlympiade {
  id: string;
  theme: string;
  difficulte: 1 | 2 | 3; // 1 = régional, 2 = national, 3 = olympiade internationale
  enonce: string;
  indice1: string;
  indice2: string;
  solution: string;
  reponse: string; // résultat final court, si auto-vérifiable (sinon vide)
}

export const OLYMPIADES: ProblemeOlympiade[] = [
  {
    id: 'o1', theme: 'Arithmétique', difficulte: 1,
    enonce: 'Quel est le plus grand nombre entier n tel que n² + 5n + 6 soit un nombre premier ?',
    indice1: 'Factorise l\'expression : cherche deux nombres dont la somme vaut 5 et le produit 6.',
    indice2: 'Si n+1 = 1 ou n+2 = 1, que vaut le produit ? Sinon le produit est composé.',
    solution: 'n² + 5n + 6 = (n+1)(n+2). Un produit de deux entiers est premier seulement si l\'un vaut 1. Si n+1 = 1 alors n = 0 et le produit vaut 1×2 = 2, premier. Si n+2 = 1 alors n = -1, produit 0×1 = 0, non premier. Pour tout n ≥ 1, le produit a deux facteurs > 1 donc est composé. Réponse : n = 0.',
    reponse: '0',
  },
  {
    id: 'o2', theme: 'Inégalités', difficulte: 2,
    enonce: 'Montre que pour tous réels positifs a et b : (a+b)/2 ≥ √(ab). À quel cas y a-t-il égalité ?',
    indice1: 'Développe (√a − √b)² : quel est son signe ?',
    indice2: ' (√a − √b)² ≥ 0 donne a − 2√(ab) + b ≥ 0.',
    solution: '(√a − √b)² ≥ 0 donc a + b ≥ 2√(ab), d\'où (a+b)/2 ≥ √(ab) (moyenne arithmétique ≥ moyenne géométrique, cas particulier de AM-GM). Égalité si et seulement si √a = √b, c\'est-à-dire a = b.',
    reponse: 'a=b',
  },
  {
    id: 'o3', theme: 'Théorie des nombres', difficulte: 2,
    enonce: 'Trouve le reste de la division de 2^2024 par 7.',
    indice1: 'Calcule 2^1, 2^2, 2^3... modulo 7 : que remarques-tu ?',
    indice2: 'Les puissances de 2 modulo 7 cycle avec période 3 : 2, 4, 1, 2, 4, 1...',
    solution: '2³ = 8 ≡ 1 (mod 7). Donc 2^2024 = 2^(3×674+2) = (2³)^674 × 2² ≡ 1 × 4 ≡ 4 (mod 7). Réponse : 4.',
    reponse: '4',
  },
  {
    id: 'o4', theme: 'Combinatoire', difficulte: 2,
    enonce: 'Dans une classe de 30 élèves, montre qu\'au moins deux élèves ont leur anniversaire le même mois.',
    indice1: 'Principe des tiroirs : 30 pigeons, combien de tiroirs ?',
    indice2: 'Il n\'y a que 12 mois possibles.',
    solution: 'Principe des tiroirs : si chaque mois contenait au plus 1 anniversaire, il y aurait au plus 12 élèves. Or 30 > 12, donc au moins un mois contient les anniversaires de deux élèves (ou plus).',
    reponse: '',
  },
  {
    id: 'o5', theme: 'Géométrie', difficulte: 2,
    enonce: 'Un triangle a pour côtés 13, 14 et 15. Calcule son aire.',
    indice1: 'Formule de Héron : A = √(p(p−a)(p−b)(p−c)) avec p le demi-périmètre.',
    indice2: 'p = (13+14+15)/2 = 21.',
    solution: 'p = 21. A = √(21×8×7×6) = √7056 = 84. Réponse : 84.',
    reponse: '84',
  },
  {
    id: 'o6', theme: 'Algèbre', difficulte: 3,
    enonce: 'Résous dans les réels : x² + y² = 7 et x³ + y³ = 10 (avec x + y = S, exprime puis résous).',
    indice1: 'Pose S = x + y et P = xy. Exprime x² + y² et x³ + y³ avec S et P.',
    indice2: 'x²+y² = S² − 2P = 7 et x³+y³ = S³ − 3PS = 10.',
    solution: 'De S² − 2P = 7 on tire P = (S²−7)/2. En injectant : S³ − 3S(S²−7)/2 = 10 ⟹ 2S³ − 3S³ + 21S = 20 ⟹ −S³ + 21S = 20 ⟹ S³ − 21S + 20 = 0 ⟹ (S−1)(S−4)(S+5) = 0. Pour S = 4 : P = (16−7)/2 = 4.5, discriminant de t² − 4t + 4.5 = 16 − 18 < 0 : pas de solution réelle. Pour S = −5 : P = 9, t² + 5t + 9 a Δ = 25 − 36 < 0 : rejeté. Pour S = 1 : P = −3, t² − t − 3 = 0, Δ = 13 > 0 : x, y = (1±√13)/2. Vérification : x²+y² = 1 − 2(−3) = 7 ✓. Réponse : x = (1+√13)/2, y = (1−√13)/2 (et symétrique).',
    reponse: '',
  },
  {
    id: 'o7', theme: 'Sommes', difficulte: 2,
    enonce: 'Calcule la somme 1/(1×2) + 1/(2×3) + 1/(3×4) + ... + 1/(99×100).',
    indice1: 'Décompose 1/(n(n+1)) en éléments simples.',
    indice2: '1/(n(n+1)) = 1/n − 1/(n+1) : la somme est télescopique.',
    solution: 'La somme télescopique vaut 1 − 1/100 = 99/100 = 0,99. Réponse : 99/100.',
    reponse: '99/100|0.99',
  },
  {
    id: 'o8', theme: 'Logique', difficulte: 1,
    enonce: 'Trois amis ont 24 bonbons au total. Ali en a deux fois plus que Boubacar, et Chaïbou en a autant qu\'Ali et Boubacar réunis. Combien chacun a-t-il de bonbons ?',
    indice1: 'Pose B = b, alors A = 2b et C = 3b.',
    indice2: 'b + 2b + 3b = 24.',
    solution: '6b = 24 donc b = 4 : Boubacar 4, Ali 8, Chaïbou 12. Réponse : Ali 8, Boubacar 4, Chaïbou 12.',
    reponse: '8',
  },
  {
    id: 'o9', theme: 'Théorie des nombres', difficulte: 3,
    enonce: 'Montre que √2 est irrationnel.',
    indice1: 'Raisonne par l\'absurde : suppose √2 = p/q irréductible.',
    indice2: 'Alors p² = 2q² : que peux-tu dire de la parité de p ?',
    solution: 'Si √2 = p/q (fraction irréductible), alors p² = 2q². Donc p² est pair, donc p est pair : p = 2k. Alors 4k² = 2q² donne q² = 2k², donc q est pair aussi. p et q tous deux pairs contredit la fraction irréductible. Absurde : √2 est irrationnel.',
    reponse: '',
  },
  {
    id: 'o10', theme: 'Optimisation', difficulte: 3,
    enonce: 'Parmi tous les rectangles de périmètre 40, lequel a la plus grande aire ? Donne ses dimensions.',
    indice1: 'Si les côtés sont x et 20 − x, exprime l\'aire A(x).',
    indice2: 'A(x) = x(20−x) = −(x−10)² + 100 : forme canonique.',
    solution: 'A(x) = x(20 − x) est maximale en x = 10 (sommet de la parabole) : A_max = 100. C\'est le carré 10 × 10. Réponse : le carré de côté 10.',
    reponse: '10',
  },
  {
    id: 'o11', theme: 'Combinatoire', difficulte: 2,
    enonce: 'Combien y a-t-il de façons de choisir 3 nombres distincts parmi {1, 2, ..., 10} dont la somme est paire ?',
    indice1: 'Compte les entiers pairs (5) et impairs (5) de 1 à 10.',
    indice2: 'Somme paire = soit 3 pairs, soit 1 pair et 2 impairs.',
    solution: 'C(5,3) + C(5,1)×C(5,2) = 10 + 5×10 = 60. Réponse : 60.',
    reponse: '60',
  },
  {
    id: 'o12', theme: 'Arithmétique', difficulte: 1,
    enonce: 'Quel est le plus petit entier strictement positif qui laisse un reste de 1 dans la division par 2, 3 et 4 ?',
    indice1: 'n − 1 est divisible par 2, 3 et 4.',
    indice2: 'Cherche le plus petit commun multiple de 2, 3, 4.',
    solution: 'PPCM(2,3,4) = 12, donc n = 12 + 1 = 13. Vérification : 13 = 6×2+1 = 4×3+1 = 3×4+1 ✓. Réponse : 13.',
    reponse: '13',
  },
  {
    id: 'o13', theme: 'Arithmétique', difficulte: 1,
    enonce: 'Par quels chiffres un carré parfait peut-il se terminer ?',
    indice1: 'Calcule les unités de 0² à 9².',
    indice2: 'Le motif se répète tous les 10.',
    solution: 'Carrés de 0 à 9 : 0, 1, 4, 9, 6, 5, 6, 9, 4, 1. Chiffres possibles : 0, 1, 4, 5, 6, 9 — jamais 2, 3, 7 ni 8 !',
    reponse: '0,1,4,5,6,9',
  },
  {
    id: 'o14', theme: 'Inégalités', difficulte: 2,
    enonce: 'Si a + b = 1 avec a et b strictement positifs, que vaut le minimum de 1/a + 1/b ?',
    indice1: 'Réduis au même dénominateur : (a+b)/(ab).',
    indice2: 'Maximise ab : ab est au plus ((a+b)/2)² = 1/4.',
    solution: '1/a + 1/b = 1/(ab) ≥ 4, égalité pour a = b = 1/2. Réponse : 4.',
    reponse: '4',
  },
  {
    id: 'o15', theme: 'Théorie des nombres', difficulte: 3,
    enonce: 'Montre que la somme de 5 entiers consécutifs est toujours divisible par 5.',
    indice1: 'Note-les n-2, n-1, n, n+1, n+2.',
    indice2: 'Additionne : tout se télescope.',
    solution: 'La somme vaut 5n, multiple de 5 pour tout entier n. CQFD.',
    reponse: '',
  },
  {
    id: 'o16', theme: 'Combinatoire', difficulte: 2,
    enonce: 'Combien de nombres de 3 chiffres sont divisibles par 9 ?',
    indice1: 'Premier : 108. Dernier : 999.',
    indice2: 'Compte les multiples de 9 de 108 à 999.',
    solution: 'Les multiples de 9 a 3 chiffres vont de 108 (9x12) a 999 (9x111) : 111 - 12 + 1 = 100. Reponse : 100.',
    reponse: '100',
  },
  {
    id: 'o17', theme: 'Géométrie', difficulte: 3,
    enonce: 'Aire d\'un triangle équilatéral inscrit dans un cercle de rayon 5 ?',
    indice1: 'Côté c = R × √3.',
    indice2: 'Aire = c² × √3 / 4.',
    solution: 'c = 5√3, aire = 75√3/4.',
    reponse: '',
  },
  {
    id: 'o18', theme: 'Logique', difficulte: 1,
    enonce: 'Une bactérie double chaque minute ; le pot est plein à minuit. Quand était-il à moitié plein ?',
    indice1: 'Réfléchis à l\'envers.',
    indice2: 'Une minute avant d\'être plein, il était à moitié.',
    solution: 'À 23h59.',
    reponse: '23h59',
  },
  {
    id: 'o19', theme: 'Sommes', difficulte: 2,
    enonce: 'Calcule 1 + 2 + 3 + ... + 100.',
    indice1: 'Groupe les termes deux à deux : 1+100, 2+99...',
    indice2: 'Combien de paires de somme 101 ?',
    solution: '50 paires × 101 = 5050 (méthode de Gauss).',
    reponse: '5050',
  },
  {
    id: 'o20', theme: 'Théorie des nombres', difficulte: 3,
    enonce: 'Trouve tous les couples d\'entiers positifs (a, b) tels que a × b = a + b.',
    indice1: 'ab − a − b = 0 : ajoute 1 des deux côtés.',
    indice2: '(a-1)(b-1) = 1.',
    solution: 'Seule possibilité entière : a−1 = b−1 = 1, donc a = b = 2. Vérification : 2 × 2 = 4 = 2 + 2. Réponse : (2, 2).',
    reponse: '(2,2)|2 et 2',
  },
];

export function olympiadesParTheme(): { theme: string; problemes: ProblemeOlympiade[] }[] {
  const themes: { [t: string]: ProblemeOlympiade[] } = {};
  for (const p of OLYMPIADES) {
    (themes[p.theme] = themes[p.theme] || []).push(p);
  }
  return Object.entries(themes).map(([theme, problemes]) => ({ theme, problemes }));
}

