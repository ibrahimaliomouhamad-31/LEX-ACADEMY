// FORMULAIRE MATHÉMATIQUES & PHYSIQUE-CHIMIE (CEA — Niger)
// Module 100% hors-ligne : aucune dépendance réseau ni Firebase.
// Couvre les programmes de Seconde, Première et Terminale (Ouest-Africain / CEA).

export interface Formule {
  id: string;
  matiere: 'Mathématiques' | 'Physique-Chimie';
  niveau: 'Seconde' | 'Première' | 'Terminale';
  categorie: string;
  titre: string;
  formule: string;
  explication: string;
}

export const FORMULES: Formule[] = [
  // ============================================================
  // MATHÉMATIQUES — SECONDE
  // ============================================================

  // --- Calcul littéral ---
  {
    id: 'm2-calcul-1',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Calcul littéral',
    titre: 'Carré d\u2019une somme',
    formule: '(a + b)\u00B2 = a\u00B2 + 2ab + b\u00B2',
    explication:
      'Le carré d\u2019une somme vaut la somme des carr\u00E9s plus le double produit. Exemple : (x + 3)\u00B2 = x\u00B2 + 6x + 9. Ne jamais oublier le terme 2ab !',
  },
  {
    id: 'm2-calcul-2',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Calcul littéral',
    titre: 'Carré d\u2019une diff\u00E9rence',
    formule: '(a \u2212 b)\u00B2 = a\u00B2 \u2212 2ab + b\u00B2',
    explication:
      'M\u00EAme principe que le carr\u00E9 d\u2019une somme, mais le double produit est n\u00E9gatif. Exemple : (2x \u2212 5)\u00B2 = 4x\u00B2 \u2212 20x + 25.',
  },
  {
    id: 'm2-calcul-3',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Calcul littéral',
    titre: 'Diff\u00E9rence de deux carr\u00E9s',
    formule: 'a\u00B2 \u2212 b\u00B2 = (a \u2212 b)(a + b)',
    explication:
      'Identit\u00E9 remarquable tr\u00E8s utile pour factoriser. Exemple : x\u00B2 \u2212 9 = (x \u2212 3)(x + 3). Elle sert aussi \u00E0 calculer 101\u00B2 \u2212 99\u00B2 = (101 \u2212 99)(101 + 99) = 400.',
  },
  {
    id: 'm2-calcul-4',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Calcul littéral',
    titre: 'Cube d\u2019une somme',
    formule: '(a + b)\u00B3 = a\u00B3 + 3a\u00B2b + 3ab\u00B2 + b\u00B3',
    explication:
      'D\u00E9veloppement du cube d\u2019une somme, obtenu avec le bin\u00F4me de Newton ou par double distributivit\u00E9. Version diff\u00E9rence : (a \u2212 b)\u00B3 = a\u00B3 \u2212 3a\u00B2b + 3ab\u00B2 \u2212 b\u00B3.',
  },

  // --- Nombres et arithmétique ---
  {
    id: 'm2-nomb-1',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Nombres et arithm\u00E9tique',
    titre: 'Racine d\u2019un produit',
    formule: '\u221A(ab) = \u221Aa \u00D7 \u221Ab   (a \u2265 0, b \u2265 0)',
    explication:
      'La racine du produit est le produit des racines, uniquement pour des nombres positifs. Exemple : \u221A(4 \u00D7 9) = 2 \u00D7 3 = 6. Attention : \u221A(a + b) \u2260 \u221Aa + \u221Ab.',
  },
  {
    id: 'm2-nomb-2',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Nombres et arithm\u00E9tique',
    titre: 'Racine d\u2019un quotient',
    formule: '\u221A(a/b) = \u221Aa / \u221Ab   (a \u2265 0, b > 0)',
    explication:
      'Le radical se distribue sur un quotient de nombres positifs. Sert \u00E0 simplifier des fractions avec radicaux, par exemple \u221A(3/4) = \u221A3/2.',
  },
  {
    id: 'm2-nomb-3',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Nombres et arithm\u00E9tique',
    titre: 'PGCD (algorithme d\u2019Euclide)',
    formule: 'PGCD(a ; b) = PGCD(b ; r), o\u00F9 r est le reste de la division de a par b',
    explication:
      'On remplace le couple (a ; b) par (b ; r) jusqu\u2019\u00E0 obtenir un reste nul : le dernier reste non nul est le PGCD. Exemple : PGCD(270 ; 192) : 270 = 192 \u00D7 1 + 78 ; 192 = 78 \u00D7 2 + 36 ; 78 = 36 \u00D7 2 + 6 ; 36 = 6 \u00D7 6 + 0 \u2192 PGCD = 6.',
  },
  {
    id: 'm2-nomb-4',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Nombres et arithm\u00E9tique',
    titre: 'PPCM \u00E0 partir du PGCD',
    formule: 'PPCM(a ; b) = (a \u00D7 b) / PGCD(a ; b)',
    explication:
      'Le produit de deux nombres est \u00E9gal au produit de leur PGCD par leur PPCM. Sert pour mettre des fractions au m\u00EAme d\u00E9nominateur. Exemple : PPCM(270 ; 192) = 270 \u00D7 192 / 6 = 8640.',
  },

  // --- Valeurs absolues et intervalles ---
  {
    id: 'm2-abs-1',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Valeurs absolues et intervalles',
    titre: 'D\u00E9finition de la valeur absolue',
    formule: '|x| = x si x \u2265 0   ;   |x| = \u2212x si x < 0',
    explication:
      'La valeur absolue de x est sa distance \u00E0 z\u00E9ro : c\u2019est toujours un nombre positif ou nul. Exemples : |5| = 5 et |\u22123| = 3.',
  },
  {
    id: 'm2-abs-2',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Valeurs absolues et intervalles',
    titre: 'Distance entre deux r\u00E9els',
    formule: 'd(a ; b) = |b \u2212 a|',
    explication:
      'La distance entre a et b sur la droite gradu\u00E9e est la valeur absolue de leur diff\u00E9rence. Exemple : d(3 ; \u22122) = |\u22122 \u2212 3| = 5.',
  },
  {
    id: 'm2-abs-3',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Valeurs absolues et intervalles',
    titre: 'Encadrement et intervalle',
    formule: '|x \u2212 a| \u2264 r   \u27FA   x \u2208 [a \u2212 r ; a + r]',
    explication:
      'Traduction entre distance et intervalle : les x \u00E0 moins de r du centre a. Exemple : |x \u2212 2| \u2264 3 signifie x \u2208 [\u22121 ; 5]. Avec < strict, les bornes sont ouvertes.',
  },

  // --- Géométrie ---
  {
    id: 'm2-geo-1',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'G\u00E9om\u00E9trie',
    titre: 'Th\u00E9or\u00E8me de Pythagore',
    formule: 'BC\u00B2 = AB\u00B2 + AC\u00B2   (triangle rectangle en A)',
    explication:
      'Dans un triangle rectangle, le carr\u00E9 de l\u2019hypot\u00E9nuse \u00E9gale la somme des carr\u00E9s des deux autres c\u00F4t\u00E9s. R\u00E9ciproque : si BC\u00B2 = AB\u00B2 + AC\u00B2, alors le triangle est rectangle en A.',
  },
  {
    id: 'm2-geo-2',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'G\u00E9om\u00E9trie',
    titre: 'Th\u00E9or\u00E8me de Thal\u00E8s',
    formule: '(MN) // (BC)   \u21D2   AM/AB = AN/AC = MN/BC',
    explication:
      'Deux droites parall\u00E8les coup\u00E9es par deux s\u00E9cantes d\u00E9terminent des rapports de longueurs \u00E9gaux. Sert \u00E0 calculer des longueurs par proportionnalit\u00E9. La r\u00E9ciproque sert \u00E0 prouver le parall\u00E9lisme.',
  },
  {
    id: 'm2-geo-3',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'G\u00E9om\u00E9trie',
    titre: 'Somme des angles d\u2019un triangle',
    formule: '\u00C2 + B\u0302 + \u0108 = 180\u00B0',
    explication:
      'Dans tout triangle (euclidien), la somme des trois angles int\u00E9rieurs vaut 180 degr\u00E9s. Permet de trouver un angle manquant : si \u00C2 = 50\u00B0 et B\u0302 = 60\u00B0, alors \u0108 = 70\u00B0.',
  },

  // --- Trigonométrie ---
  {
    id: 'm2-trigo-1',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Trigonom\u00E9trie',
    titre: 'sin, cos, tan dans le triangle rectangle',
    formule: 'sin \u03B1 = c\u00F4t\u00E9 oppos\u00E9 / hypot\u00E9nuse\ncos \u03B1 = c\u00F4t\u00E9 adjacent / hypot\u00E9nuse\ntan \u03B1 = c\u00F4t\u00E9 oppos\u00E9 / c\u00F4t\u00E9 adjacent',
    explication:
      'Moyen mn\u00E9motechnique SOH-CAH-TOA. Ces rapports ne d\u00E9pendent que de l\u2019angle \u03B1, pas de la taille du triangle. Permettent de calculer une longueur ou un angle avec les touches sin\u207B\u00B9, cos\u207B\u00B9, tan\u207B\u00B9 de la calculatrice.',
  },
  {
    id: 'm2-trigo-2',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Trigonom\u00E9trie',
    titre: 'Relation fondamentale',
    formule: 'sin\u00B2\u03B1 + cos\u00B2\u03B1 = 1',
    explication:
      'Pour tout angle \u03B1, le carr\u00E9 du sinus plus le carr\u00E9 du cosinus vaut 1. Sert \u00E0 trouver cos \u03B1 connaissant sin \u03B1 (et inversement), en v\u00E9rifiant le signe selon le quadrant.',
  },
  {
    id: 'm2-trigo-3',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Trigonom\u00E9trie',
    titre: 'Tangente comme quotient',
    formule: 'tan \u03B1 = sin \u03B1 / cos \u03B1   (cos \u03B1 \u2260 0)',
    explication:
      'La tangente est le quotient du sinus par le cosinus. Valeurs cl\u00E9s : tan 45\u00B0 = 1, tan 60\u00B0 = \u221A3, tan 30\u00B0 = \u221A3/3. tan 90\u00B0 n\u2019existe pas (cos 90\u00B0 = 0).',
  },

  // --- Aires et volumes ---
  {
    id: 'm2-aire-1',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Aires et volumes',
    titre: 'Aire d\u2019un triangle',
    formule: 'A = (base \u00D7 hauteur) / 2',
    explication:
      'On choisit un c\u00F4t\u00E9 comme base et on multiplie par la hauteur relative \u00E0 cette base. Pour un triangle rectangle : A = (produit des deux c\u00F4t\u00E9s de l\u2019angle droit) / 2.',
  },
  {
    id: 'm2-aire-2',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Aires et volumes',
    titre: 'Disque : aire et p\u00E9rim\u00E8tre',
    formule: 'A = \u03C0r\u00B2   ;   P = 2\u03C0r',
    explication:
      'r est le rayon du disque. Exemple : si r = 3 cm, A = 9\u03C0 \u2248 28,3 cm\u00B2 et P = 6\u03C0 \u2248 18,8 cm. Prendre \u03C0 \u2248 3,14 si la calculatrice n\u2019a pas de touche \u03C0.',
  },
  {
    id: 'm2-aire-3',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Aires et volumes',
    titre: 'Aire d\u2019un rectangle',
    formule: 'A = Longueur \u00D7 largeur',
    explication:
      'Cas particulier du parall\u00E9logramme (A = base \u00D7 hauteur). Un carr\u00E9 de c\u00F4t\u00E9 c a pour aire A = c\u00B2.',
  },
  {
    id: 'm2-aire-4',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Aires et volumes',
    titre: 'Aire d\u2019un trap\u00E8ze',
    formule: 'A = (grande base B + petite base b) \u00D7 hauteur / 2',
    explication:
      'On additionne les deux bases parall\u00E8les, on multiplie par la hauteur puis on divise par 2. Exemple : B = 8, b = 4, h = 3 \u2192 A = (8 + 4) \u00D7 3 / 2 = 18.',
  },
  {
    id: 'm2-vol-1',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Aires et volumes',
    titre: 'Volume du pav\u00E9 droit',
    formule: 'V = Longueur \u00D7 largeur \u00D7 hauteur',
    explication:
      'Le pav\u00E9 droit (parall\u00E9l\u00E9pip\u00E8de rectangle) : V = L \u00D7 l \u00D7 h. Un cube d\u2019ar\u00EAte a a pour volume V = a\u00B3.',
  },
  {
    id: 'm2-vol-2',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Aires et volumes',
    titre: 'Volume du cylindre de r\u00E9volution',
    formule: 'V = \u03C0r\u00B2h',
    explication:
      'Aire de la base disco\u00EFde (\u03C0r\u00B2) multipli\u00E9e par la hauteur h. Exemple : r = 2 cm, h = 5 cm \u2192 V = 20\u03C0 \u2248 62,8 cm\u00B3.',
  },
  {
    id: 'm2-vol-3',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Aires et volumes',
    titre: 'Volume d\u2019un prisme',
    formule: 'V = (aire de la base) \u00D7 hauteur',
    explication:
      'Valable pour tout prisme droit : on multiplie l\u2019aire de la base (triangle, hexagone\u2026) par la hauteur du prisme.',
  },
  {
    id: 'm2-vol-4',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Aires et volumes',
    titre: 'Volume d\u2019une pyramide',
    formule: 'V = (aire de la base \u00D7 hauteur) / 3',
    explication:
      'Une pyramide occupe exactement le tiers du prisme de m\u00EAme base et de m\u00EAme hauteur. La hauteur est perpendiculaire \u00E0 la base.',
  },
  {
    id: 'm2-vol-5',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Aires et volumes',
    titre: 'Volume d\u2019un c\u00F4ne de r\u00E9volution',
    formule: 'V = (\u03C0r\u00B2h) / 3',
    explication:
      'Le c\u00F4ne occupe le tiers du cylindre de m\u00EAme rayon et m\u00EAme hauteur. Exemple : r = 3, h = 6 \u2192 V = 18\u03C0 \u2248 56,5 unit\u00E9s de volume.',
  },
  {
    id: 'm2-vol-6',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Aires et volumes',
    titre: 'Sph\u00E8re : volume et aire',
    formule: 'V = (4/3)\u03C0r\u00B3   ;   A = 4\u03C0r\u00B2',
    explication:
      'r est le rayon de la sph\u00E8re. Exemple : Terre de rayon \u2248 6370 km \u2192 aire \u2248 5,1 \u00D7 10\u2078 km\u00B2. Attention \u00E0 bien cube\u00E9 r dans le volume.',
  },

  // --- Proportionnalité et pourcentages ---
  {
    id: 'm2-prop-1',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Proportionnalit\u00E9 et pourcentages',
    titre: 'Quatri\u00E8me proportionnelle (produit en croix)',
    formule: 'a/b = c/d   \u27FA   a \u00D7 d = b \u00D7 c   (b \u2260 0, d \u2260 0)',
    explication:
      'Dans un tableau de proportionnalit\u00E9, les produits en croix sont \u00E9gaux. Pour trouver d : d = b \u00D7 c / a. Exemple : si 3 kg co\u00FBtent 1500 F, alors 7 kg co\u00FBtent 1500 \u00D7 7 / 3 = 3500 F.',
  },
  {
    id: 'm2-prop-2',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Proportionnalit\u00E9 et pourcentages',
    titre: 'Coefficient multiplicateur',
    formule: 'CM = 1 + t/100\nAugmenter de t% : \u00D7 (1 + t/100)\nR\u00E9duire de t% : \u00D7 (1 \u2212 t/100)',
    explication:
      'Augmenter de 25 % revient \u00E0 multiplier par 1,25 ; r\u00E9duire de 25 % revient \u00E0 multiplier par 0,75. Deux \u00E9volutions successives se composent en multipliant les CM.',
  },
  {
    id: 'm2-prop-3',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Proportionnalit\u00E9 et pourcentages',
    titre: 'Taux d\u2019\u00E9volution',
    formule: 't = ((V_finale \u2212 V_initiale) / V_initiale) \u00D7 100',
    explication:
      'Le taux d\u2019\u00E9volution en pourcentage compare la valeur finale \u00E0 la valeur initiale. Un prix passant de 8000 F \u00E0 6000 F subit t = (6000 \u2212 8000)/8000 \u00D7 100 = \u221225 %.',
  },

  // --- Statistiques ---
  {
    id: 'm2-stat-1',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Statistiques',
    titre: 'Moyenne pond\u00E9r\u00E9e',
    formule: 'x\u0304 = (n\u2081x\u2081 + n\u2082x\u2082 + \u22EF + n\u2093x\u2093) / N',
    explication:
      'On multiplie chaque valeur par son effectif, on additionne, puis on divise par l\u2019effectif total N. Pour une moyenne de notes : (somme des notes \u00D7 coefficients) / (somme des coefficients).',
  },
  {
    id: 'm2-stat-2',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Statistiques',
    titre: 'M\u00E9diane',
    formule: 'M\u00E9diane = valeur centrale de la s\u00E9rie ordonn\u00E9e\n(effectif pair : moyenne des deux valeurs centrales)',
    explication:
      'On trie la s\u00E9rie par ordre croissant. Si l\u2019effectif est impair, la m\u00E9diane est la valeur du milieu ; s\u2019il est pair, c\u2019est la moyenne des deux valeurs centrales. Au moins 50 % des valeurs sont \u2264 m\u00E9diane et 50 % \u2265 m\u00E9diane.',
  },
  {
    id: 'm2-stat-3',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Statistiques',
    titre: '\u00C9tendue',
    formule: 'e = valeur maximale \u2212 valeur minimale',
    explication:
      'L\u2019\u00E9tendue mesure la dispersion de la s\u00E9rie : c\u2019est l\u2019\u00E9cart entre la plus grande et la plus petite valeur. Une petite \u00E9tendue signale des valeurs homog\u00E8nes.',
  },

  // --- Vecteurs et droites ---
  {
    id: 'm2-vect-1',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Vecteurs et droites',
    titre: 'Coordonn\u00E9es d\u2019un vecteur',
    formule: 'Vecteur AB (x_B \u2212 x_A ; y_B \u2212 y_A)',
    explication:
      'On soustrait coordonn\u00E9es du d\u00E9part \u00E0 coordonn\u00E9es de l\u2019arriv\u00E9e : AB(x_B \u2212 x_A ; y_B \u2212 y_A). Exemple : A(1 ; 2) et B(4 ; 6) \u2192 AB(3 ; 4).',
  },
  {
    id: 'm2-vect-2',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Vecteurs et droites',
    titre: 'Norme d\u2019un vecteur',
    formule: '\u2016u\u2016 = \u221A(x\u00B2 + y\u00B2)',
    explication:
      'Si u(x ; y), sa norme (longueur) est la racine de la somme des carr\u00E9s de ses coordonn\u00E9es. C\u2019est une cons\u00E9quence directe de Pythagore.',
  },
  {
    id: 'm2-vect-3',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Vecteurs et droites',
    titre: 'Milieu d\u2019un segment',
    formule: 'I( (x_A + x_B)/2 ; (y_A + y_B)/2 )',
    explication:
      'Le milieu a pour coordonn\u00E9es les moyennes des coordonn\u00E9es des extr\u00E9mit\u00E9s. Exemple : A(1 ; 2), B(5 ; 8) \u2192 milieu I(3 ; 5).',
  },
  {
    id: 'm2-vect-4',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Vecteurs et droites',
    titre: 'Distance entre deux points',
    formule: 'AB = \u221A( (x_B \u2212 x_A)\u00B2 + (y_B \u2212 y_A)\u00B2 )',
    explication:
      'Distance dans un rep\u00E8re orthonorm\u00E9 uniquement. Exemple : A(1 ; 2), B(4 ; 6) \u2192 AB = \u221A(9 + 16) = \u221A25 = 5.',
  },
  {
    id: 'm2-vect-5',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Vecteurs et droites',
    titre: '\u00C9quation r\u00E9duite de droite',
    formule: 'y = mx + p',
    explication:
      'm est le coefficient directeur (pente) et p l\u2019ordonn\u00E9e \u00E0 l\u2019origine (valeur de y quand x = 0). Une droite verticale a pour \u00E9quation x = c.',
  },
  {
    id: 'm2-vect-6',
    matiere: 'Mathématiques',
    niveau: 'Seconde',
    categorie: 'Vecteurs et droites',
    titre: 'Coefficient directeur',
    formule: 'm = (y_B \u2212 y_A) / (x_B \u2212 x_A)   (x_A \u2260 x_B)',
    explication:
      'Avec A(x_A ; y_A) et B(x_B ; y_B) sur la droite. m > 0 : la droite monte ; m < 0 : elle descend ; m = 0 : elle est horizontale. Deux droites sont parall\u00E8les si elles ont le m\u00EAme m.',
  },

  // ============================================================
  // MATHÉMATIQUES — PREMIÈRE
  // ============================================================

  // --- Second degré ---
  {
    id: 'm1-deg-1',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Second degr\u00E9',
    titre: 'Discriminant',
    formule: '\u0394 = b\u00B2 \u2212 4ac   (pour ax\u00B2 + bx + c, a \u2260 0)',
    explication:
      'Le discriminant annonce le nombre de racines : \u0394 > 0 \u2192 deux racines distinctes ; \u0394 = 0 \u2192 une racine double ; \u0394 < 0 \u2192 aucune racine r\u00E9elle.',
  },
  {
    id: 'm1-deg-2',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Second degr\u00E9',
    titre: 'Racines du trin\u00F4me',
    formule: 'x = (\u2212b \u00B1 \u221A\u0394) / (2a)   si \u0394 \u2265 0\n(\u0394 = 0 : racine double x\u2080 = \u2212b/(2a))',
    explication:
      'Apr\u00E8s avoir calcul\u00E9 \u0394 = b\u00B2 \u2212 4ac, les solutions de ax\u00B2 + bx + c = 0 sont (\u2212b \u2212 \u221A\u0394)/2a et (\u2212b + \u221A\u0394)/2a. Exemple : x\u00B2 \u2212 5x + 6 = 0 \u2192 \u0394 = 1, x\u2081 = 2, x\u2082 = 3.',
  },
  {
    id: 'm1-deg-3',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Second degr\u00E9',
    titre: 'Somme et produit des racines',
    formule: 'S = x\u2081 + x\u2082 = \u2212b/a\nP = x\u2081 \u00D7 x\u2082 = c/a',
    explication:
      'Sans calculer les racines, on conna\u00EEt leur somme et leur produit. R\u00E9ciproquement, deux nombres de somme S et produit P sont solutions de x\u00B2 \u2212 Sx + P = 0. Tr\u00E8s pratique pour v\u00E9rifier ses calculs.',
  },
  {
    id: 'm1-deg-4',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Second degr\u00E9',
    titre: 'Forme canonique',
    formule: 'ax\u00B2 + bx + c = a(x + b/(2a))\u00B2 \u2212 \u0394/(4a)',
    explication:
      'La forme canonique fait appara\u00EEtre le sommet S(\u2212b/(2a) ; \u2212\u0394/(4a)) de la parabole. Sert \u00E0 d\u00E9terminer les variations et l\u2019extremum du trin\u00F4me.',
  },
  {
    id: 'm1-deg-5',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Second degr\u00E9',
    titre: 'Signe du trin\u00F4me',
    formule: 'ax\u00B2 + bx + c est du signe de a \u00E0 l\u2019ext\u00E9rieur des racines,\ndu signe de \u2212a entre les racines',
    explication:
      'Si \u0394 < 0, le trin\u00F4me est du signe de a pour tout x. Cette r\u00E8gle permet de remplir le tableau de signes et de r\u00E9soudre les in\u00E9quations du second degr\u00E9.',
  },

  // --- Dérivation ---
  {
    id: 'm1-der-1',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'D\u00E9rivation',
    titre: 'D\u00E9riv\u00E9e des puissances',
    formule: '(x\u207F)\u2032 = n\u00B7x\u207F\u207B\u00B9   ;   (k)\u2032 = 0   ;   (x)\u2032 = 1',
    explication:
      'On descend l\u2019exposant en facteur et on diminue l\u2019exposant de 1. Exemple : (x\u00B3)\u2032 = 3x\u00B2. La d\u00E9riv\u00E9e d\u2019une constante est nulle (fonction constante = droite horizontale).',
  },
  {
    id: 'm1-der-2',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'D\u00E9rivation',
    titre: 'D\u00E9riv\u00E9e de la racine carr\u00E9e',
    formule: '(\u221Ax)\u2032 = 1/(2\u221Ax)   (x > 0)',
    explication:
      'La fonction racine carr\u00E9e est d\u00E9rivable sur ]0 ; +\u221E[ (mais pas en 0). On peut aussi l\u2019\u00E9crire \u221Ax/(2x) ou \u00BD\u00B7x^\u2212\u00Bd avec la formule des puissances.',
  },
  {
    id: 'm1-der-3',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'D\u00E9rivation',
    titre: 'D\u00E9riv\u00E9e de l\u2019inverse',
    formule: '(1/x)\u2032 = \u22121/x\u00B2   (x \u2260 0)',
    explication:
      'Cas particulier de la d\u00E9riv\u00E9e des puissances avec n = \u22121. Plus g\u00E9n\u00E9ralement, (1/u)\u2032 = \u2212u\u2032/u\u00B2 pour u une fonction qui ne s\u2019annule pas.',
  },
  {
    id: 'm1-der-4',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'D\u00E9rivation',
    titre: 'D\u00E9riv\u00E9e d\u2019un produit',
    formule: '(u \u00D7 v)\u2032 = u\u2032v + uv\u2032',
    explication:
      'On d\u00E9rive le premier facteur fois le second, plus le premier fois la d\u00E9riv\u00E9e du second. Exemple : (x\u00B2\u221Ax)\u2032 = 2x\u221Ax + x\u00B2/(2\u221Ax).',
  },
  {
    id: 'm1-der-5',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'D\u00E9rivation',
    titre: 'D\u00E9riv\u00E9e d\u2019un quotient',
    formule: '(u/v)\u2032 = (u\u2032v \u2212 uv\u2032) / v\u00B2   (v \u2260 0)',
    explication:
      'Attention \u00E0 l\u2019ordre : c\u2019est u\u2032v \u2212 uv\u2032 au num\u00E9rateur (le \u00AB moins \u00BB vient du bas). Le d\u00E9nominateur est toujours le carr\u00E9 de v.',
  },
  {
    id: 'm1-der-6',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'D\u00E9rivation',
    titre: 'D\u00E9riv\u00E9e d\u2019une compos\u00E9e',
    formule: '(f(u))\u2032 = u\u2032 \u00D7 f\u2032(u)',
    explication:
      'On d\u00E9rive la fonction int\u00E9rieure u, puis on multiplie par la d\u00E9riv\u00E9e de f calcul\u00E9e en u. Cas fr\u00E9quent : (f(ax + b))\u2032 = a \u00D7 f\u2032(ax + b).',
  },
  {
    id: 'm1-der-7',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'D\u00E9rivation',
    titre: '\u00C9quation de la tangente',
    formule: 'y = f\u2032(a)(x \u2212 a) + f(a)',
    explication:
      'Tangente \u00E0 la courbe de f au point d\u2019abscisse a. f\u2032(a) est le coefficient directeur (la pente). Sert aussi \u00E0 faire des approximations locales de f.',
  },

  // --- Suites ---
  {
    id: 'm1-sui-1',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Suites',
    titre: 'Suite arithm\u00E9tique',
    formule: 'u\u2099\u208A\u2081 = u\u2099 + r\nu\u2099 = u\u2080 + nr   (ou u\u2099 = u\u209A + (n \u2212 p)r)',
    explication:
      'On ajoute toujours la m\u00EAme raison r. Exemple : u\u2080 = 5, r = 3 \u2192 u\u2081\u2080 = 5 + 10 \u00D7 3 = 35. La suite est croissante si r > 0, d\u00E9croissante si r < 0.',
  },
  {
    id: 'm1-sui-2',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Suites',
    titre: 'Suite g\u00E9om\u00E9trique',
    formule: 'u\u2099\u208A\u2081 = q \u00D7 u\u2099\nu\u2099 = u\u2080 \u00D7 q\u207F   (ou u\u2099 = u\u209A \u00D7 q\u207F\u207B\u1D56)',
    explication:
      'On multiplie toujours par la m\u00EAme raison q. Exemple : u\u2080 = 2, q = 3 \u2192 u\u2084 = 2 \u00D7 81 = 162. Si |q| < 1, u\u2099 tend vers 0 ; si q > 1 et u\u2080 > 0, la suite diverge vers +\u221E.',
  },
  {
    id: 'm1-sui-3',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Suites',
    titre: 'Somme de termes arithm\u00E9tiques',
    formule: 'S = (nombre de termes) \u00D7 (premier terme + dernier terme) / 2\n1 + 2 + \u22EF + n = n(n + 1)/2',
    explication:
      'La somme de termes cons\u00E9cutifs d\u2019une suite arithm\u00E9tique est la moyenne du premier et du dernier terme multipli\u00E9e par le nombre de termes. Exemple : 1 + 2 + \u22EF + 100 = 100 \u00D7 101/2 = 5050.',
  },
  {
    id: 'm1-sui-4',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Suites',
    titre: 'Somme de termes g\u00E9om\u00E9triques',
    formule: '1 + q + q\u00B2 + \u22EF + q\u207F = (1 \u2212 q\u207F\u207A\u00B9) / (1 \u2212 q)   (q \u2260 1)',
    explication:
      'Plus g\u00E9n\u00E9ralement, u\u2080 + u\u2081 + \u22EF + u\u2099 = u\u2080(1 \u2212 q\u207F\u207A\u00B9)/(1 \u2212 q). Exemple : 1 + 2 + 4 + \u22EF + 2\u00B9\u2070 = 2\u00B9\u00B9 \u2212 1 = 2047.',
  },

  // --- Probabilités ---
  {
    id: 'm1-proba-1',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Probabilit\u00E9s',
    titre: 'Esp\u00E9rance d\u2019une loi de probabilit\u00E9',
    formule: 'E(X) = p\u2081x\u2081 + p\u2082x\u2082 + \u22EF + p\u2099x\u2099',
    explication:
      'L\u2019esp\u00E9rance est la valeur moyenne attendue de X sur un grand nombre de r\u00E9p\u00E9titions. Exemple : gain de 1000 F avec probabilit\u00E9 0,2 et 0 F sinon \u2192 E = 200 F.',
  },
  {
    id: 'm1-proba-2',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Probabilit\u00E9s',
    titre: 'Variance et \u00E9cart-type',
    formule: 'V(X) = p\u2081x\u2081\u00B2 + \u22EF + p\u2099x\u2099\u00B2 \u2212 (E(X))\u00B2\n\u03C3(X) = \u221A(V(X))',
    explication:
      'La variance mesure la dispersion autour de l\u2019esp\u00E9rance ; l\u2019\u00E9cart-type \u03C3 est sa racine carr\u00E9e, dans la m\u00EAme unit\u00E9 que X. Formule pratique : V(X) = E(X\u00B2) \u2212 (E(X))\u00B2.',
  },
  {
    id: 'm1-proba-3',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Probabilit\u00E9s',
    titre: 'Loi binomiale',
    formule: 'X \u27F8 B(n ; p) :\nP(X = k) = C(n k) \u00D7 p\u1D4F \u00D7 (1 \u2212 p)\u207F\u207B\u1D4F',
    explication:
      'On r\u00E9p\u00E8te n \u00E9preuves de Bernoulli identiques et ind\u00E9pendantes de probabilit\u00E9 de succ\u00E8s p ; C(n k) = n!/(k!(n\u2212k)!) compte les chemins donnant k succ\u00E8s. Exemple : P(exactement 2 piles sur 3 lancers) = 3 \u00D7 (1/2)\u00B3 = 3/8.',
  },

  // --- Produit scalaire ---
  {
    id: 'm1-ps-1',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Produit scalaire',
    titre: 'Expression du produit scalaire',
    formule: 'u \u00B7 v = xx\u2032 + yy\u2032 = \u2016u\u2016 \u00D7 \u2016v\u2016 \u00D7 cos(\u03B8)',
    explication:
      'Avec u(x ; y) et v(x\u2032 ; y\u2032) dans un rep\u00E8re orthonorm\u00E9, ou avec l\u2019angle \u03B8 entre les vecteurs. u \u22A5 v \u27FA u \u00B7 v = 0. Sert \u00E0 calculer des angles et prouver des orthogonalit\u00E9s.',
  },
  {
    id: 'm1-ps-2',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Produit scalaire',
    titre: 'Th\u00E9or\u00E8me d\u2019Al-Kashi',
    formule: 'BC\u00B2 = AB\u00B2 + AC\u00B2 \u2212 2 \u00D7 AB \u00D7 AC \u00D7 cos(\u00C2)',
    explication:
      'G\u00E9n\u00E9ralisation de Pythagore \u00E0 tout triangle. Si \u00C2 = 90\u00B0, on retrouve Pythagore car cos(90\u00B0) = 0. Permet de calculer le troisi\u00E8me c\u00F4t\u00E9 ou un angle connaissant les trois c\u00F4t\u00E9s.',
  },

  // --- Trigonométrie (Première) ---
  {
    id: 'm1-trigo-1',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Trigonom\u00E9trie',
    titre: 'Formules d\u2019addition : cosinus',
    formule: 'cos(a + b) = cos a \u00B7 cos b \u2212 sin a \u00B7 sin b\ncos(a \u2212 b) = cos a \u00B7 cos b + sin a \u00B7 sin b',
    explication:
      'Pour additionner ou soustraire deux angles. Exemple : cos(75\u00B0) = cos(45\u00B0 + 30\u00B0) = (\u221A6 + \u221A2)/4 \u2248 0,26. Astuce : le cosinus \u00AB n\u2019aime pas \u00BB l\u2019addition (signe \u2212 dans cos(a+b)).',
  },
  {
    id: 'm1-trigo-2',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Trigonom\u00E9trie',
    titre: 'Formules d\u2019addition : sinus',
    formule: 'sin(a + b) = sin a \u00B7 cos b + cos a \u00B7 sin b\nsin(a \u2212 b) = sin a \u00B7 cos b \u2212 cos a \u00B7 sin b',
    explication:
      'Le sinus \u00AB aime \u00BB l\u2019addition : signe + dans sin(a + b). Exemple : sin(75\u00B0) = sin(45\u00B0 + 30\u00B0) = (\u221A6 + \u221A2)/4. Sert \u00E0 lin\u00E9ariser et \u00E0 r\u00E9soudre des \u00E9quations trigonom\u00E9triques.',
  },
  {
    id: 'm1-trigo-3',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Trigonom\u00E9trie',
    titre: 'Formules de duplication',
    formule: 'cos(2a) = cos\u00B2a \u2212 sin\u00B2a = 2cos\u00B2a \u2212 1 = 1 \u2212 2sin\u00B2a\nsin(2a) = 2 \u00B7 sin a \u00B7 cos a',
    explication:
      'Cas particulier des formules d\u2019addition avec b = a. Permettent de passer de cos\u00B2a = (1 + cos 2a)/2 et sin\u00B2a = (1 \u2212 cos 2a)/2, utile en int\u00E9gration.',
  },
  {
    id: 'm1-trigo-4',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Trigonom\u00E9trie',
    titre: 'Somme de deux carr\u00E9s',
    formule: 'a\u00B2 + b\u00B2 = (a + b)\u00B2 \u2212 2ab',
    explication:
      'Identit\u00E9 utile en calcul mental et pour les sommes de carr\u00E9s type cos\u00B2 + sin\u00B2. Exemple : si a + b = 7 et ab = 10, alors a\u00B2 + b\u00B2 = 49 \u2212 20 = 29.',
  },
  {
    id: 'm1-trigo-5',
    matiere: 'Mathématiques',
    niveau: 'Premi\u00E8re',
    categorie: 'Trigonom\u00E9trie',
    titre: 'Angle inscrit et angle au centre',
    formule: 'mesure de l\u2019angle inscrit = \u00BD \u00D7 mesure de l\u2019angle au centre\n(m\u00EAme arc intercept\u00E9)',
    explication:
      'Dans un cercle, tout angle inscrit qui intercepte le m\u00EAme arc que l\u2019angle au centre vaut la moiti\u00E9 de celui-ci. Cons\u00E9quence : deux angles inscrits interceptant le m\u00EAme arc sont \u00E9gaux ; un angle inscrit dans un demi-cercle est droit.',
  },

  // ============================================================
  // MATHÉMATIQUES — TERMINALE
  // ============================================================

  // --- Limites ---
  {
    id: 'mT-lim-1',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Limites',
    titre: 'Limites usuelles',
    formule: 'lim (x\u2192+\u221E) (ln x)/x = 0\nlim (x\u21920\u207A) x\u00B7ln x = 0\nlim (x\u2192+\u221E) e\u02E3/x = +\u221E\nlim (x\u21920) sin(x)/x = 1',
    explication:
      'Limites de r\u00E9f\u00E9rence \u00E0 conna\u00EEtre par c\u0153ur : \u00AB ln va moins vite \u00E0 l\u2019infini que toute puissance de x \u00BB et \u00AB e\u02E3 va plus vite que toute puissance de x \u00BB. Elles servent \u00E0 lever les ind\u00E9terminations du type \u221E/\u221E ou 0 \u00D7 \u221E.',
  },

  // --- Logarithmes ---
  {
    id: 'mT-ln-1',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Logarithmes',
    titre: 'Logarithme d\u2019un produit',
    formule: 'ln(a \u00D7 b) = ln a + ln b   (a > 0, b > 0)',
    explication:
      'Le logarithme transforme les produits en sommes. Exemple : ln 6 = ln 2 + ln 3. R\u00E9ciproquement, ln a + ln b = ln(ab) sert \u00E0 regrouper avant de r\u00E9soudre ln x = c.',
  },
  {
    id: 'mT-ln-2',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Logarithmes',
    titre: 'Logarithme d\u2019un quotient',
    formule: 'ln(a/b) = ln a \u2212 ln b   (a > 0, b > 0)',
    explication:
      'Le logarithme transforme les quotients en diff\u00E9rences. Cas particulier : ln(1/b) = \u2212ln b. Exemple : ln(3/4) = ln 3 \u2212 ln 4.',
  },
  {
    id: 'mT-ln-3',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Logarithmes',
    titre: 'Logarithme d\u2019une puissance',
    formule: 'ln(a\u207F) = n \u00D7 ln a   (a > 0)\nln(\u221Aa) = \u00BD \u00D7 ln a',
    explication:
      'Les puissances sortent du logarithme en facteur. Exemple : ln 8 = ln 2\u00B3 = 3 ln 2. \u00C9quivalent : ln x = b \u27FA x = e\u1D47 (x > 0).',
  },
  {
    id: 'mT-ln-4',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Logarithmes',
    titre: 'D\u00E9riv\u00E9es avec ln',
    formule: '(ln x)\u2032 = 1/x\n(ln u)\u2032 = u\u2032/u   (u > 0)',
    explication:
      'La d\u00E9riv\u00E9e de ln x est 1/x sur ]0 ; +\u221E[. Pour une fonction u strictement positive, on d\u00E9rive le quotient u\u2032/u. La fonction ln est concave et croissante.',
  },
  {
    id: 'mT-ln-5',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Logarithmes',
    titre: '\u00C9quations avec ln',
    formule: 'ln x = b   \u27FA   x = e\u1D47   (x > 0)',
    explication:
      'Le logarithme n\u00E9p\u00E9rien est la bijection r\u00E9ciproque de l\u2019exponentielle. Toujours v\u00E9rifier que les solutions appartiennent \u00E0 ]0 ; +\u221E[ : ln d\u2019un nombre n\u00E9gatif n\u2019existe pas.',
  },

  // --- Exponentielle ---
  {
    id: 'mT-exp-1',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Exponentielle',
    titre: 'Propri\u00E9t\u00E9s alg\u00E9briques de exp',
    formule: 'e^(a+b) = e\u1D43 \u00D7 e\u1D47\ne^(a\u2212b) = e\u1D43 / e\u1D47\n(e\u1D43)\u207F = e^(a\u00D7n)',
    explication:
      'L\u2019exponentielle transforme les sommes en produits (le contraire de ln). Exemple : e\u00B3 \u00D7 e\u00B2 = e\u2075. Valeurs utiles : e\u2070 = 1, ln e = 1, e \u2248 2,718.',
  },
  {
    id: 'mT-exp-2',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Exponentielle',
    titre: 'D\u00E9riv\u00E9es avec exp',
    formule: '(e\u02E3)\u2032 = e\u02E3\n(e^u)\u2032 = u\u2032 \u00D7 e^u',
    explication:
      'L\u2019exponentielle est sa propre d\u00E9riv\u00E9e, toujours strictement positive : e\u02E3 est strictement croissante et convexe. Pour une compos\u00E9e, on multiplie par la d\u00E9riv\u00E9e int\u00E9rieure u\u2032.',
  },
  {
    id: 'mT-exp-3',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Exponentielle',
    titre: 'Croissance compar\u00E9e',
    formule: 'lim (x\u2192+\u221E) e\u02E3/x\u207F = +\u221E\nlim (x\u2192+\u221E) x\u207F/e\u02E3 = 0\nlim (x\u2192+\u221E) (ln x)/x\u207F = 0',
    explication:
      '\u00C0 l\u2019infini, toute puissance de x domine ln x, et l\u2019exponentielle domine toute puissance de x. C\u2019est l\u2019outil cl\u00E9 pour lever les formes ind\u00E9termin\u00E9es et \u00E9tudier les positions relatives des courbes.',
  },
  {
    id: 'mT-exp-4',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Exponentielle',
    titre: 'exp et ln : fonctions r\u00E9ciproques',
    formule: 'e^(ln x) = x   (x > 0)\nln(e\u02E3) = x   (pour tout x r\u00E9el)',
    explication:
      'exp et ln se neutralisent : leurs courbes sont sym\u00E9triques par rapport \u00E0 la droite y = x. Attention au domaine : e^(ln x) n\u2019existe que pour x > 0, alors que ln(e\u02E3) vaut x pour tout r\u00E9el.',
  },

  // --- Primitives et intégrales ---
  {
    id: 'mT-int-1',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Primitives et int\u00E9grales',
    titre: 'Primitives usuelles',
    formule: 'x\u207F \u2192 x\u207F\u207A\u00B9/(n+1)  (n \u2260 \u22121)\n1/x \u2192 ln|x|\nu\u2032\u00B7u\u207F \u2192 u\u207F\u207A\u00B9/(n+1)\nu\u2032/u \u2192 ln|u|\nu\u2032\u00B7e^u \u2192 e^u',
    explication:
      'Une primitive F v\u00E9rifie F\u2032 = f ; toutes les primitives diff\u00E8rent d\u2019une constante. Exemples : primitive de x\u00B2 = x\u00B3/3 ; primitive de e\u02E3 = e\u02E3. La ligne 1/x n\u2019est valable que sur ]0 ; +\u221E[ ou ]\u2212\u221E ; 0[.',
  },
  {
    id: 'mT-int-2',
    matiere: 'Math\u00E9matiques',
    niveau: 'Terminale',
    categorie: 'Primitives et int\u00E9grales',
    titre: 'Th\u00E9or\u00E8me fondamental de l\u2019analyse',
    formule: '\u222B[a\u2192b] f(x)dx = F(b) \u2212 F(a)',
    explication:
      'Pour F une primitive de f sur [a ; b], l\u2019int\u00E9grale vaut la diff\u00E9rence F(b) \u2212 F(a). La constante additive dispara\u00EEt. Exemple : \u222B[0\u21921] x\u00B2dx = 1/3 \u2212 0 = 1/3.',
  },
  {
    id: 'mT-int-3',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Primitives et int\u00E9grales',
    titre: 'Int\u00E9gration par parties',
    formule: '\u222B[a\u2192b] u\u2032(x)\u00B7v(x)dx = [u(x)\u00B7v(x)][a\u2192b] \u2212 \u222B[a\u2192b] u(x)\u00B7v\u2032(x)dx',
    explication:
      'On d\u00E9rive le terme qui se simplifie (souvent e\u02E3 ou polyn\u00F4me) et on int\u00E8gre l\u2019autre (souvent ln x ou trigonom\u00E9trique). Classique : \u222B x\u00B7e\u02E3dx = x\u00B7e\u02E3 \u2212 e\u02E3 + c.',
  },
  {
    id: 'mT-int-4',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Primitives et int\u00E9grales',
    titre: 'Valeur moyenne',
    formule: 'f_moy = 1/(b \u2212 a) \u00D7 \u222B[a\u2192b] f(x)dx',
    explication:
      'C\u2019est la hauteur du rectangle de base [a ; b] qui a la m\u00EAme aire que celle sous la courbe. In\u00E9galit\u00E9 de la moyenne : si m \u2264 f \u2264 M sur [a ; b], alors m(b \u2212 a) \u2264 \u222B f \u2264 M(b \u2212 a).',
  },
  {
    id: 'mT-int-5',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Primitives et int\u00E9grales',
    titre: 'Aire sous la courbe',
    formule: 'Si f \u2265 0 sur [a ; b] :\nAire = \u222B[a\u2192b] f(x)dx   (en unit\u00E9s d\u2019aire)',
    explication:
      'L\u2019int\u00E9grale mesure l\u2019aire entre la courbe, l\u2019axe des abscisses et les droites x = a et x = b. Si f \u2264 0, l\u2019aire vaut \u2212\u222B f(x)dx : une int\u00E9grale peut \u00EAtre n\u00E9gative, jamais une aire.',
  },

  // --- Équations différentielles ---
  {
    id: 'mT-ed-1',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: '\u00C9quations diff\u00E9rentielles',
    titre: '\u00C9quation homog\u00E8ne y\u2032 = ay',
    formule: 'y(x) = C \u00D7 e^(ax),   C \u2208 \u211D',
    explication:
      'Toutes les solutions sont les multiples d\u2019une exponentielle. La constante C se d\u00E9termine avec la condition initiale y(0) : alors C = y(0) et y(x) = y(0)\u00B7e^(ax).',
  },
  {
    id: 'mT-ed-2',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: '\u00C9quations diff\u00E9rentielles',
    titre: '\u00C9quation y\u2032 = ay + b',
    formule: 'y(x) = C \u00D7 e^(ax) \u2212 b/a   (a \u2260 0, C \u2208 \u211D)',
    explication:
      'Solution g\u00E9n\u00E9rale = solution homog\u00E8ne + solution particuli\u00E8re constante \u2212b/a. Avec y(0) = y\u2080 : C = y\u2080 + b/a. Mod\u00E8le la d\u00E9charge d\u2019un condensateur, la d\u00E9croissance radioactive, la croissance de population\u2026',
  },

  // --- Suites récurrentes ---
  {
    id: 'mT-sui-1',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Suites',
    titre: 'Suite arithm\u00E9tico-g\u00E9om\u00E9trique',
    formule: 'u\u2099\u208A\u2081 = a\u00B7u\u2099 + b  (a \u2260 1)\n\u21D2 u\u2099 = a\u207F\u00B7u\u2080 + b(1 \u2212 a\u207F)/(1 \u2212 a)',
    explication:
      'Point fixe L = b/(1 \u2212 a) : la suite v\u2099 = u\u2099 \u2212 L est g\u00E9om\u00E9trique de raison a. Si |a| < 1, u\u2099 converge vers L. Mod\u00E8le de la r\u00E9sorption d\u2019un livret bancaire avec retraits r\u00E9guliers.',
  },

  // --- Probabilités (Terminale) ---
  {
    id: 'mT-proba-1',
    matiere: 'Math\u00E9matiques',
    niveau: 'Terminale',
    categorie: 'Probabilit\u00E9s',
    titre: 'Probabilit\u00E9 conditionnelle',
    formule: 'P_B(A) = P(A \u2229 B) / P(B)   (P(B) \u2260 0)',
    explication:
      'Probabilit\u00E9 de A sachant que B est r\u00E9alis\u00E9 : on restreint l\u2019univers \u00E0 B. On la note P_B(A). Exemple : P(rouge sachant c\u0153ur) se calcule en ne gardant que les c\u0153urs comme univers.',
  },
  {
    id: 'mT-proba-2',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Probabilit\u00E9s',
    titre: 'Formule de Bayes (probabilit\u00E9s des causes)',
    formule: 'P_B(A) = P(A) \u00D7 P_A(B) / P(B)',
    explication:
      'Permet d\u2019inverser le conditionnement : conna\u00EEtre P(B|A) pour trouver P(A|B). Tr\u00E8s utilis\u00E9e en m\u00E9decine (fiabilit\u00E9 des tests) et avec les arbres de probabilit\u00E9s pond\u00E9r\u00E9s.',
  },
  {
    id: 'mT-proba-3',
    matiere: 'Math\u00E9matiques',
    niveau: 'Terminale',
    categorie: 'Probabilit\u00E9s',
    titre: 'Binomiale : esp\u00E9rance et variance',
    formule: 'X \u27F8 B(n ; p) :\nE(X) = n\u00D7p\nV(X) = n\u00D7p\u00D7(1 \u2212 p)\n\u03C3(X) = \u221A(n\u00D7p\u00D7(1 \u2212 p))',
    explication:
      'En moyenne, sur n \u00E9preuves de probabilit\u00E9 de succ\u00E8s p, on obtient np succ\u00E8s. Exemple : 100 lancers de d\u00E9, P(6) = 1/6 \u2192 E = 100/6 \u2248 16,7 six.',
  },
  {
    id: 'mT-proba-4',
    matiere: 'Mathématiques',
    niveau: 'Terminale',
    categorie: 'Probabilit\u00E9s',
    titre: 'Probabilit\u00E9 de l\u2019\u00E9v\u00E9nement \u00AB au moins un \u00BB',
    formule: 'P(au moins un) = 1 \u2212 P(aucun)',
    explication:
      'Passer par l\u2019\u00E9v\u00E9nement contraire \u00E9vite d\u2019additionner de nombreux cas. Pour n \u00E9preuves ind\u00E9pendantes de succ\u00E8s p : P(aucun) = (1 \u2212 p)\u207F, donc P(au moins un succ\u00E8s) = 1 \u2212 (1 \u2212 p)\u207F.',
  },

  // ============================================================
  // PHYSIQUE-CHIMIE — SECONDE
  // ============================================================

  // --- Mécanique ---
  {
    id: 'pcS-mec-1',
    matiere: 'Physique-Chimie',
    niveau: 'Seconde',
    categorie: 'M\u00E9canique',
    titre: 'Vitesse moyenne',
    formule: 'v = d / t',
    explication:
      'd distance parcourue (m), t dur\u00E9e du trajet (s), v en m/s. Conversion utile : 1 m/s = 3,6 km/h. Exemple : 100 m en 12,5 s \u2192 v = 8 m/s = 28,8 km/h.',
  },
  {
    id: 'pcS-mec-2',
    matiere: 'Physique-Chimie',
    niveau: 'Seconde',
    categorie: 'M\u00E9canique',
    titre: 'Masse volumique',
    formule: '\u03C1 = m / V',
    explication:
      'm masse (kg), V volume (m\u00B3), \u03C1 en kg/m\u00B3 (souvent g/cm\u00B3 en chimie : 1 g/cm\u00B3 = 1000 kg/m\u00B3). L\u2019eau a \u03C1 \u2248 1000 kg/m\u00B3 : un corps flotte si sa masse volumique est plus faible.',
  },
  {
    id: 'pcS-mec-3',
    matiere: 'Physique-Chimie',
    niveau: 'Seconde',
    categorie: 'M\u00E9canique',
    titre: '\u00C9nergie cin\u00E9tique',
    formule: 'Ec = \u00BD \u00D7 m \u00D7 v\u00B2',
    explication:
      'm en kg, v en m/s, Ec en joules (J). Doubler la vitesse quadruple l\u2019\u00E9nergie cin\u00E9tique : d\u2019o\u00F9 l\u2019int\u00E9r\u00EAt des limitations de vitesse pour la s\u00E9curit\u00E9 routi\u00E8re.',
  },
  {
    id: 'pcS-mec-4',
    matiere: 'Physique-Chimie',
    niveau: 'Seconde',
    categorie: 'M\u00E9canique',
    titre: 'Loi de gravitation universelle',
    formule: 'F = G \u00D7 (m\u2081 \u00D7 m\u2082) / d\u00B2\nG = 6,67 \u00D7 10\u207B\u00B9\u00B9 N\u00B7m\u00B2/kg\u00B2',
    explication:
      'Deux corps massiques s\u2019attirent proportionnellement au produit de leurs masses et inversement au carr\u00E9 de leur distance d (entre centres). La force est port\u00E9e par la droite joignant les deux centres.',
  },
  {
    id: 'pcS-mec-5',
    matiere: 'Physique-Chimie',
    niveau: 'Seconde',
    categorie: 'M\u00E9canique',
    titre: 'Poids d\u2019un corps',
    formule: 'P = m \u00D7 g   (g \u2248 9,8 N/kg)',
    explication:
      'Le poids est la force de gravitation exerc\u00E9e par la Terre : vertical, vers le bas, appliqu\u00E9 au centre de gravit\u00E9. Au Niger g \u2248 9,78 N/kg ; sur la Lune g \u2248 1,6 N/kg.',
  },

  // --- Électricité ---
  {
    id: 'pcS-elec-1',
    matiere: 'Physique-Chimie',
    niveau: 'Seconde',
    categorie: '\u00C9lectricit\u00E9',
    titre: 'Loi d\u2019Ohm',
    formule: 'U = R \u00D7 I',
    explication:
      'Pour un conducteur ohmique : U tension (V), R r\u00E9sistance (\u03A9), I intensit\u00E9 (A). \u00C0 tension fix\u00E9e, plus R est grande, plus I est petite. Le Dip\u00F4le Ohmique suit la caract\u00E9ristique lin\u00E9aire U = f(I).',
  },
  {
    id: 'pcS-elec-2',
    matiere: 'Physique-Chimie',
    niveau: 'Seconde',
    categorie: '\u00C9lectricit\u00E9',
    titre: 'Puissance \u00E9lectrique',
    formule: 'P = U \u00D7 I',
    explication:
      'P en watts (W), U en volts (V), I en amp\u00E8res (A). En courant alternatif sinuso\u00EFdal monophas\u00E9 : P = U \u00D7 I \u00D7 cos(\u03C6). Un fusible de 10 A sous 220 V supporte au plus 2200 W.',
  },
  {
    id: 'pcS-elec-3',
    matiere: 'Physique-Chimie',
    niveau: 'Seconde',
    categorie: '\u00C9lectricit\u00E9',
    titre: '\u00C9nergie \u00E9lectrique',
    formule: 'E = P \u00D7 t',
    explication:
      'E en joules si P en W et t en s ; en kilowattheures (kWh) si P en kW et t en h. Une lampe de 60 W allum\u00E9e 5 h consomme 0,3 kWh : c\u2019est ce que facture la NIGELEC.',
  },

  // --- Chimie ---
  {
    id: 'pcS-chim-1',
    matiere: 'Physique-Chimie',
    niveau: 'Seconde',
    categorie: 'Chimie',
    titre: 'Quantit\u00E9 de mati\u00E8re',
    formule: 'n = m / M',
    explication:
      'n en moles (mol), m masse (g), M masse molaire (g/mol, lue dans le tableau p\u00E9riodique). Exemple : 9 g d\u2019eau (M = 18 g/mol) \u2192 n = 0,5 mol. Nombre d\u2019Avogadro : N_A = 6,02 \u00D7 10\u00B2\u00B3/mol.',
  },
  {
    id: 'pcS-chim-2',
    matiere: 'Physique-Chimie',
    niveau: 'Seconde',
    categorie: 'Chimie',
    titre: 'Concentration molaire',
    formule: 'C = n / V',
    explication:
      'C en mol/L, n quantit\u00E9 de solut\u00E9 (mol), V volume de la solution (L). Une solution de sel de 0,2 mol dans 500 mL a C = 0,4 mol/L. Dilution : C\u2081V\u2081 = C\u2082V\u2082 (conservation de n).',
  },

  // ============================================================
  // PHYSIQUE-CHIMIE — PREMIÈRE
  // ============================================================

  // --- Mécanique ---
  {
    id: 'pcP-mec-1',
    matiere: 'Physique-Chimie',
    niveau: 'Premi\u00E8re',
    categorie: 'M\u00E9canique',
    titre: 'Deuxi\u00E8me loi de Newton',
    formule: '\u03A3F\u20D7 = m \u00D7 a\u20D7',
    explication:
      'Dans un r\u00E9f\u00E9rentiel galil\u00E9en, la somme vectorielle des forces \u00E9gale masse fois acc\u00E9l\u00E9ration (\u03A3F en N, m en kg, a en m/s\u00B2). Si \u03A3F\u20D7 = 0\u20D7, le centre d\u2019inertie est immobile ou en mouvement rectiligne uniforme (principe d\u2019inertie).',
  },
  {
    id: 'pcP-mec-2',
    matiere: 'Physique-Chimie',
    niveau: 'Premi\u00E8re',
    categorie: 'M\u00E9canique',
    titre: 'Chute libre (sans vitesse initiale)',
    formule: 'v\u00B2 = 2gh   \u21D2   v = \u221A(2gh)',
    explication:
      'Chute libre = seul le poids travaille. h hauteur de chute (m), g \u2248 9,8 m/s\u00B2. La vitesse ne d\u00E9pend pas de la masse ! Exemple : chute de 20 m \u2192 v = \u221A(2 \u00D7 9,8 \u00D7 20) \u2248 19,8 m/s.',
  },
  {
    id: 'pcP-mec-3',
    matiere: 'Physique-Chimie',
    niveau: 'Premi\u00E8re',
    categorie: 'M\u00E9canique',
    titre: 'Travail d\u2019une force constante',
    formule: 'W = F \u00D7 d \u00D7 cos(\u03B8)',
    explication:
      'F intensit\u00E9 (N), d d\u00E9placement (m), \u03B8 angle entre force et d\u00E9placement, W en joules. W > 0 (moteur) si \u03B8 < 90\u00B0 ; W < 0 (r\u00E9sistant) si \u03B8 > 90\u00B0 ; nul si la force est perpendiculaire au d\u00E9placement.',
  },
  {
    id: 'pcP-mec-4',
    matiere: 'Physique-Chimie',
    niveau: 'Premi\u00E8re',
    categorie: 'M\u00E9canique',
    titre: '\u00C9nergie potentielle de pesanteur',
    formule: 'Ep = m \u00D7 g \u00D7 h',
    explication:
      'm en kg, g \u2248 9,8 N/kg, h altitude (m) par rapport \u00E0 une r\u00E9f\u00E9rence choisie, Ep en J. L\u2019eau d\u2019un ch\u00E2teau d\u2019eau en hauteur stocke de l\u2019Ep convertie en Ec quand elle descend.',
  },
  {
    id: 'pcP-mec-5',
    matiere: 'Physique-Chimie',
    niveau: 'Premi\u00E8re',
    categorie: 'M\u00E9canique',
    titre: 'Th\u00E9or\u00E8me de l\u2019\u00E9nergie cin\u00E9tique',
    formule: '\u0394Ec = Ec(finale) \u2212 Ec(initiale) = \u03A3W(forces ext\u00E9rieures)',
    explication:
      'La variation d\u2019\u00E9nergie cin\u00E9tique d\u2019un solide \u00E9gale la somme des travaux des forces entre deux instants. Sans frottements, Ec + Ep se conserve : c\u2019est la conservation de l\u2019\u00E9nergie m\u00E9canique.',
  },

  // --- Électricité ---
  {
    id: 'pcP-elec-1',
    matiere: 'Physique-Chimie',
    niveau: 'Premi\u00E8re',
    categorie: '\u00C9lectricit\u00E9',
    titre: 'Constante de temps d\u2019un circuit RC',
    formule: '\u03C4 = R \u00D7 C',
    explication:
      '\u03C4 en secondes si R en ohms et C en farads. Au bout de t = \u03C4, le condensateur est charg\u00E9 \u00E0 63 % (d\u00E9charge : il reste 37 %). Au bout de 5\u03C4, on consid\u00E8re la charge compl\u00E8te (99 %).',
  },

  // --- Ondes ---
  {
    id: 'pcP-ond-1',
    matiere: 'Physique-Chimie',
    niveau: 'Premi\u00E8re',
    categorie: 'Ondes',
    titre: 'P\u00E9riode, longueur d\u2019onde et c\u00E9l\u00E9rit\u00E9',
    formule: '\u03BB = v \u00D7 T = v / f',
    explication:
      '\u03BB longueur d\u2019onde (m), v c\u00E9l\u00E9rit\u00E9 (m/s), T p\u00E9riode (s), f fr\u00E9quence en hertz (Hz). Pour le son dans l\u2019air v \u2248 340 m/s ; pour la lumi\u00E8re dans le vide c = 3,0 \u00D7 10\u2078 m/s.',
  },

  // --- Chimie ---
  {
    id: 'pcP-chim-1',
    matiere: 'Physique-Chimie',
    niveau: 'Premi\u00E8re',
    categorie: 'Chimie',
    titre: 'Avancement d\u2019une r\u00E9action',
    formule: 'aA + bB \u2192 cC + dD :\nn(A) = n\u2080(A) \u2212 a\u00B7x',
    explication:
      'x avancement (mol) : chaque quantit\u00E9 \u00E9volue proportionnellement \u00E0 son coefficient st\u0153chiom\u00E9trique. Le r\u00E9actif limitant est celui qui dispara\u00EEt le premier : x_max = min(n\u2080(A)/a ; n\u2080(B)/b).',
  },
  {
    id: 'pcP-chim-2',
    matiere: 'Physique-Chimie',
    niveau: 'Premi\u00E8re',
    categorie: 'Chimie',
    titre: 'Concentration massique',
    formule: 't = m / V = C \u00D7 M',
    explication:
      't (ou Cm) en g/L, m masse de solut\u00E9 (g), V volume (L). Lien avec la concentration molaire : t = C \u00D7 M. Exemple : solution de C = 0,1 mol/L en NaCl (M = 58,5 g/mol) \u2192 t = 5,85 g/L.',
  },

  // ============================================================
  // PHYSIQUE-CHIMIE — TERMINALE
  // ============================================================

  // --- Nucléaire et radioactivité ---
  {
    id: 'pcT-nuc-1',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: 'Nucl\u00E9aire et radioactivit\u00E9',
    titre: 'Loi de d\u00E9croissance radioactive',
    formule: 'N(t) = N\u2080 \u00D7 e^(\u2212\u03BBt)',
    explication:
      'N(t) nombre de noyaux restants \u00E0 l\u2019instant t, N\u2080 nombre initial, \u03BB constante radioactive (s\u207B\u00B9). La d\u00E9sint\u00E9gration est un ph\u00E9nom\u00E8ne al\u00E9atoire mais statistiquement exponentiel. Activit\u00E9 : A = \u03BBN (becquerels).',
  },
  {
    id: 'pcT-nuc-2',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: 'Nucl\u00E9aire et radioactivit\u00E9',
    titre: 'Demi-vie radioactive',
    formule: 't\u00BD = ln(2) / \u03BB',
    explication:
      'Dur\u00E9e au bout de laquelle la moiti\u00E9 des noyaux initiaux se sont d\u00E9sint\u00E9gr\u00E9s : N(t\u00BD) = N\u2080/2. Apr\u00E8s n demi-vies, il reste N\u2080/2\u207F. Datation au carbone 14 : t\u00BD \u2248 5730 ans.',
  },

  // --- Circuits RLC ---
  {
    id: 'pcT-rlc-1',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: 'Circuits RLC',
    titre: 'P\u00E9riode propre d\u2019un circuit LC',
    formule: 'T\u2080 = 2\u03C0 \u00D7 \u221A(L \u00D7 C)',
    explication:
      'L inductance de la bobine (H), C capacit\u00E9 (F), T\u2080 en secondes. C\u2019est la p\u00E9riode des oscillations libres du circuit id\u00E9al LC ; la fr\u00E9quence propre f\u2080 = 1/T\u2080. Avec une r\u00E9sistance, les oscillations sont amorties (pseudo-p\u00E9riodique).',
  },
  {
    id: 'pcT-rlc-2',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: 'Circuits RLC',
    titre: 'Tensions aux bornes de la bobine et du condensateur',
    formule: 'Bobine : u_L = L \u00D7 di/dt\nCondensateur : q = C \u00D7 u_C',
    explication:
      'La tension aux bornes d\u2019une bobine parfaite est proportionnelle \u00E0 la d\u00E9riv\u00E9e de l\u2019intensit\u00E9 ; pour un condensateur, la charge q (coulombs) est proportionnelle \u00E0 la tension. La bobine stocke de l\u2019\u00E9nergie magn\u00E9tique E = \u00BDLi\u00B2, le condensateur E = \u00BDCu\u00B2.',
  },

  // --- Énergie ---
  {
    id: 'pcT-en-1',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: '\u00C9nergie',
    titre: 'Rendement d\u2019une conversion d\u2019\u00E9nergie',
    formule: '\u03B7 = E_utile / E_re\u00E7ue = P_utile / P_re\u00E7ue   (\u03B7 \u2264 1)',
    explication:
      'Ratio entre l\u2019\u00E9nergie utile et l\u2019\u00E9nergie re\u00E7ue (souvent en %). L\u2019\u00E9nergie \u00AB perdue \u00BB est d\u00E9grad\u00E9e en chaleur. Un moteur thermique a \u03B7 \u2248 30 %, un panneau solaire 15 \u00E0 20 %.',
  },

  // --- Ondes et photons ---
  {
    id: 'pcT-phot-1',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: 'Ondes et photons',
    titre: '\u00C9nergie d\u2019un photon',
    formule: 'E = h \u00D7 \u03BD = h \u00D7 c / \u03BB\nh = 6,63 \u00D7 10\u207B\u00B3\u2074 J\u00B7s',
    explication:
      '\u03BD fr\u00E9quence (Hz), \u03BB longueur d\u2019onde (m), c = 3,0 \u00D7 10\u2078 m/s. Plus la longueur d\u2019onde est courte, plus le photon est \u00E9nerg\u00E9tique : d\u2019o\u00F9 la dangerosit\u00E9 des UV et des rayons X. Effet photo\u00E9lectrique : E = W_extraction + Ec.',
  },
  {
    id: 'pcT-phot-2',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: 'Ondes et photons',
    titre: 'Relation d\u2019Einstein (\u00E9nergie de liaison)',
    formule: 'E_l = \u0394m \u00D7 c\u00B2',
    explication:
      '\u0394m d\u00E9faut de masse (kg), c\u00B2 = 9 \u00D7 10\u00B9\u2076 m\u00B2/s\u00B2, E en joules. La masse \u00AB manquante \u00BB d\u2019un noyau est convertie en \u00E9nergie de liaison qui assure la coh\u00E9sion du noyau. Base de l\u2019\u00E9nergie nucl\u00E9aire (fission et fusion).',
  },

  // --- Acides et bases ---
  {
    id: 'pcT-ac-1',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: 'Acides et bases',
    titre: 'D\u00E9finition du pH',
    formule: 'pH = \u2212log[H\u2083O\u207A]',
    explication:
      '[H\u2083O\u207A] concentration en ions oxonium en mol/L. Solution acide : pH < 7 ; neutre : pH = 7 ; basique : pH > 7. R\u00E9ciproque : [H\u2083O\u207A] = 10^(\u2212pH). Une unit\u00E9 de pH de plus = concentration divis\u00E9e par 10.',
  },
  {
    id: 'pcT-ac-2',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: 'Acides et bases',
    titre: 'Produit ionique de l\u2019eau',
    formule: 'Ke = [H\u2083O\u207A] \u00D7 [HO\u207B] = 10\u207B\u00B9\u2074   (\u00E0 25 \u00B0C)',
    explication:
      'L\u2019eau s\u2019autoprotolyse l\u00E9g\u00E8rement : 2H\u2082O \u21CC H\u2083O\u207A + HO\u207B. \u00C0 25 \u00B0C, pKe = 14, d\u2019o\u00F9 pH + pOH = 14. Connaissant [HO\u207B], on en d\u00E9duit [H\u2083O\u207A] = Ke/[HO\u207B] puis le pH.',
  },
  {
    id: 'pcT-ac-3',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: 'Acides et bases',
    titre: 'Constante d\u2019acidit\u00E9 Ka',
    formule: 'AH \u21CC A\u207B + H\u2083O\u207A :\nKa = ([A\u207B] \u00D7 [H\u2083O\u207A]) / [AH]\npKa = \u2212log(Ka)',
    explication:
      'Ka caract\u00E9rise la force d\u2019un acide : plus Ka est grand (pKa petit), plus l\u2019acide se dissocie. Acide fort : r\u00E9action totale avec l\u2019eau ; acide faible : \u00E9quilibre d\u00E9crit par Ka.',
  },
  {
    id: 'pcT-ac-4',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: 'Acides et bases',
    titre: 'Relation pH \u2013 pKa (Henderson)',
    formule: 'pH = pKa + log([A\u207B]/[AH])',
    explication:
      'Pour un couple acide/base faible en solution. Si [A\u207B] = [AH], alors pH = pKa (demi-\u00E9quivalence du dosage). \u00C0 pH > pKa, la forme basique A\u207B domine ; \u00E0 pH < pKa, la forme acide AH domine.',
  },
  {
    id: 'pcT-ac-5',
    matiere: 'Physique-Chimie',
    niveau: 'Terminale',
    categorie: 'Acides et bases',
    titre: '\u00C9quivalence d\u2019un dosage acido-basique',
    formule: '\u00C0 l\u2019\u00E9quivalence : C_a \u00D7 V_a = C_b \u00D7 V_b\n(monoacide / monobase)',
    explication:
      'Les r\u00E9actifs ont \u00E9t\u00E9 introduits dans les proportions st\u0153chiom\u00E9triques. \u00C0 l\u2019\u00E9quivalence d\u2019un dosage d\u2019un acide faible : pH = pKa. La m\u00E9thode des tangentes parall\u00E8les ou un indicateur color\u00E9 permettent de rep\u00E9rer l\u2019\u00E9quivalence.',
  },
];

// Catégories par matière (dédoublonnées, pour les filtres de l'interface)
export const CATEGORIES: { matiere: string; categories: string[] }[] = [
  {
    matiere: 'Math\u00E9matiques',
    categories: [
      'Calcul litt\u00E9ral',
      'Nombres et arithm\u00E9tique',
      'Valeurs absolues et intervalles',
      'G\u00E9om\u00E9trie',
      'Trigonom\u00E9trie',
      'Aires et volumes',
      'Proportionnalit\u00E9 et pourcentages',
      'Statistiques',
      'Vecteurs et droites',
      'Second degr\u00E9',
      'D\u00E9rivation',
      'Suites',
      'Probabilit\u00E9s',
      'Produit scalaire',
      'Limites',
      'Logarithmes',
      'Exponentielle',
      'Primitives et int\u00E9grales',
      '\u00C9quations diff\u00E9rentielles',
    ],
  },
  {
    matiere: 'Physique-Chimie',
    categories: [
      'M\u00E9canique',
      '\u00C9lectricit\u00E9',
      'Chimie',
      'Ondes',
      'Nucl\u00E9aire et radioactivit\u00E9',
      'Circuits RLC',
      '\u00C9nergie',
      'Ondes et photons',
      'Acides et bases',
    ],
  },
];

// Normalisation : minuscules + suppression des accents (recherche tolérante)
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Recherche insensible à la casse et aux accents sur titre + formule + catégorie
export function chercherFormules(texte: string): Formule[] {
  const recherche = normaliser(texte.trim());
  if (recherche === '') {
    return FORMULES;
  }
  return FORMULES.filter((formule) =>
    normaliser(`${formule.titre} ${formule.formule} ${formule.categorie}`).includes(recherche),
  );
}
