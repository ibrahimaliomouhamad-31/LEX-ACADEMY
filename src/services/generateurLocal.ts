// GÉNÉRATEUR LOCAL D'EXERCICES — 100% hors-ligne, niveaux 1 à 100.
// Chaque appel produit un exercice NOUVEAU avec réponse calculée exactement par le code.

export interface ExoGenere {
  enonce: string;
  bonne_reponse: string; // variantes séparées par "|"
  indice1: string;
  indice2: string;
  explication: string;
}

type GenFonction = (rng: () => number, niveau: number) => ExoGenere;

// ---------- RNG déterministe (mulberry32) ----------
let compteurGlobal = 0;
export function creerRng(graine?: number): () => number {
  let a =
    (graine !== undefined ? graine : Date.now() + compteurGlobal++ * 9301 + 49297) >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Petits helpers ----------
function entier(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function choix<T>(rng: () => number, arr: T[]): T {
  return arr[entier(rng, 0, arr.length - 1)];
}
function pgcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}
// Formate "+ k" / "- k" pour un terme algébrique
function terme(k: number): string {
  return k < 0 ? `- ${-k}` : `+ ${k}`;
}
// Coefficient devant x : "1x" → "x", "-1x" → "-x", sinon le nombre
function coefTxt(k: number): string {
  if (k === 1) return '';
  if (k === -1) return '-';
  return String(k);
}
// Terme algébrique en x : "+ x", "- x", "+ 3x", "- 2x²"...
function termeX(k: number, puiss: string = 'x'): string {
  return k < 0 ? `- ${coefTxt(-k)}${puiss}` : `+ ${coefTxt(k)}${puiss}`;
}
function fraction(a: number, b: number): string {
  const g = pgcd(a, b) || 1;
  let n = a / g;
  let d = b / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  if (d === 1) return `${n}`;
  return `${n}/${d}`;
}
// Amplitude des nombres selon le niveau (1 → petit, 100 → grand)
function amplitude(niveau: number): number {
  return 4 + Math.round((niveau / 100) * 60); // 5 .. 64
}

// ---------- GÉNÉRATEURS (Mathématiques) ----------

function eqPremierDegre(rng: () => number, n: number): ExoGenere {
  const a = entier(rng, 1, Math.min(2 + Math.floor(n / 25), 9));
  const x0 = entier(rng, -amplitude(n), amplitude(n));
  const b = entier(rng, -amplitude(n), amplitude(n));
  const c = a * x0 + b;
  const deuxEtapes = n > 40;
  if (deuxEtapes) {
    // a(x + b) = a·(x0 + b) : le membre de droite assure la solution x0
    const rhs = a * (x0 + b);
    return {
      enonce: `Résous l'équation : ${a}(x ${terme(b)}) = ${rhs}`,
      bonne_reponse: String(x0),
      indice1: 'Divise d\'abord les deux membres par le coefficient de la parenthèse.',
      indice2: `Tu obtiens x ${terme(b)} = ${x0 + b}, puis isole x.`,
      explication: `${a}(x ${terme(b)}) = ${rhs} ⟹ x ${terme(b)} = ${rhs}/${a} = ${x0 + b} ⟹ x = ${x0}.`,
    };
  }
  return {
    enonce: `Résous l'équation : ${coefTxt(a)}x ${terme(b)} = ${c}`,
    bonne_reponse: String(x0),
    indice1: 'Isole le terme en x d\'un côté, les nombres de l\'autre.',
    indice2: 'Divise ensuite les deux membres par le coefficient de x.',
    explication: `${coefTxt(a)}x ${terme(b)} = ${c} ⟹ ${coefTxt(a)}x = ${c} ${terme(-b)} = ${c - b} ⟹ x = ${c - b}/${a} = ${x0}.`,
  };
}

function eqSecondDegre(rng: () => number, n: number): ExoGenere {
  const amp = amplitude(n);
  let r1 = entier(rng, -amp, amp);
  let r2 = entier(rng, -amp, amp);
  if (r1 === r2) r2 = r2 + 1;
  const S = r1 + r2;
  const P = r1 * r2;
  const demandeSomme = rng() < 0.5;
  const enonce =
    `Résous x² ${termeX(-S)} ${terme(P)} = 0 puis donne ` +
    (demandeSomme ? 'la SOMME des deux solutions.' : 'la plus GRANDE des deux solutions.');
  return {
    enonce,
    bonne_reponse: demandeSomme ? String(S) : String(Math.max(r1, r2)),
    indice1: 'Cherche deux nombres dont tu connais facilement la somme et le produit.',
    indice2: `Somme S = ${S} et produit P = ${P} (relations de Viète : S = -b/a, P = c/a).`,
    explication: `Les solutions r₁ et r₂ vérifient r₁ + r₂ = ${S} et r₁ × r₂ = ${P}, donc r₁ = ${r1} et r₂ = ${r2}. ${demandeSomme ? `Somme = ${S}.` : `La plus grande est ${Math.max(r1, r2)}.`}`,
  };
}

function eqProduit(rng: () => number, n: number): ExoGenere {
  const amp = amplitude(n);
  const r1 = entier(rng, -amp, amp);
  let r2 = entier(rng, -amp, amp);
  if (r2 === r1) r2 = r1 + 2;
  const grand = Math.max(r1, r2);
  return {
    enonce: `Résous l'équation produit : (x ${terme(-r1)})(x ${terme(-r2)}) = 0 et donne la plus grande solution.`,
    bonne_reponse: String(grand),
    indice1: 'Un produit est nul si et seulement si l\'un de ses facteurs est nul.',
    indice2: 'Résous chaque facteur : x = r₁ ou x = r₂.',
    explication: `x ${terme(-r1)} = 0 donne x = ${r1} ; x ${terme(-r2)} = 0 donne x = ${r2}. Solutions : ${r1} et ${r2}. La plus grande : ${grand}.`,
  };
}

function racineCarreeEq(rng: () => number, n: number): ExoGenere {
  const c = entier(rng, 2, 3 + Math.floor(n / 20));
  const a = entier(rng, 1, Math.min(2 + Math.floor(n / 30), 6));
  const x0 = entier(rng, -amplitude(n), amplitude(n));
  const b = c * c - a * x0;
  return {
    enonce: `Résous l'équation : √(${a}x ${terme(b)}) = ${c}`,
    bonne_reponse: String(x0),
    indice1: 'Élève les deux membres au carré (les deux membres sont positifs).',
    indice2: `Tu obtiens ${a}x ${terme(b)} = ${c * c}, une équation du premier degré.`,
    explication: `√(${a}x ${terme(b)}) = ${c} ⟹ ${a}x ${terme(b)} = ${c * c} ⟹ ${a}x = ${c * c} ${terme(-b)} = ${a * x0} ⟹ x = ${x0}. (Vérification : le membre ${a}x ${terme(b)} = ${c * c} ≥ 0, donc x = ${x0} est valide.)`,
  };
}

function deriveePolynome(rng: () => number, n: number): ExoGenere {
  const deg = n > 50 ? 3 : choix(rng, [2, 3]);
  const a = entier(rng, 1, 2 + Math.floor(n / 25));
  const b = entier(rng, -6, 6);
  const c = entier(rng, -8, 8);
  const x0 = deg === 3 ? entier(rng, 0, 2) : entier(rng, -2, 2);
  // f(x) = a x^deg + b x^2 (si deg 3) + c x + d ; f'(x) selon deg
  let fTxt: string;
  let fPrimeTxt: string;
  let val: number;
  if (deg === 3) {
    const d = entier(rng, -9, 9);
    fTxt = `f(x) = ${coefTxt(a)}x³ ${termeX(b, 'x²')} ${termeX(c)} ${terme(d)}`;
    fPrimeTxt = `f'(x) = ${coefTxt(3 * a)}x² ${termeX(2 * b)} ${termeX(c)}`;
    val = 3 * a * x0 * x0 + 2 * b * x0 + c;
  } else {
    const d = entier(rng, -9, 9);
    fTxt = `f(x) = ${coefTxt(a)}x² ${termeX(c)} ${terme(d)}`;
    fPrimeTxt = `f'(x) = ${coefTxt(2 * a)}x ${termeX(c)}`;
    val = 2 * a * x0 + c;
  }
  return {
    enonce: `Soit ${fTxt}. Calcule f'(${x0}).`,
    bonne_reponse: String(val),
    indice1: 'Dérive terme à terme : (xⁿ)\' = n·xⁿ⁻¹ et la dérivée d\'une constante est 0.',
    indice2: `Ici, ${fPrimeTxt}. Remplace ensuite x par ${x0}.`,
    explication: `${fPrimeTxt}. Donc f'(${x0}) = ${val}.`,
  };
}

function primitivePuissance(rng: () => number, n: number): ExoGenere {
  const e = entier(rng, 2, Math.min(2 + Math.floor(n / 20), 6));
  const coef = entier(rng, 1, 2 + Math.floor(n / 25));
  const k = coef * (e + 1); // multiple de e+1 pour une primitive à coefficients entiers
  return {
    enonce: `Soit f(x) = ${k}x^${e}. Donne le coefficient dominant d'une primitive F de f (F(x) = ?x^${e + 1} + C).`,
    bonne_reponse: String(coef),
    indice1: 'Une primitive de xⁿ est xⁿ⁺¹/(n+1).',
    indice2: `Divise ${k} par ${e + 1}.`,
    explication: `F(x) = ${k}/(${e + 1}) · x^${e + 1} + C = ${coef}x^${e + 1} + C. Le coefficient dominant est ${coef}.`,
  };
}

function limiteRationnelle(rng: () => number, n: number): ExoGenere {
  const maxAc = Math.min(2 + Math.floor(n / 15), 12);
  const a = entier(rng, 1, maxAc);
  let c = entier(rng, 1, maxAc);
  if (c === a) c = c === 1 ? 2 : c - 1;
  const b = entier(rng, -amplitude(n), amplitude(n));
  const d = entier(rng, -amplitude(n), amplitude(n));
  const rep = fraction(a, c);
  const repDecimale = String(Number((a / c).toFixed(3)));
  return {
    enonce: `Calcule la limite : lim (x → +∞) de (${coefTxt(a)}x² ${terme(b)}) / (${coefTxt(c)}x² ${terme(d)}).`,
    bonne_reponse: `${rep}|${repDecimale}`,
    indice1: 'En ±∞, garde uniquement les termes de plus haut degré.',
    indice2: 'La limite est le rapport des coefficients de x².',
    explication: `lim = ${a}x²/(${c}x²) = ${a}/${c} = ${rep}.`,
  };
}

function pgcdExo(rng: () => number, n: number): ExoGenere {
  const g = entier(rng, 2, Math.min(3 + Math.floor(n / 10), 40));
  let m = entier(rng, 2, 9);
  let k = entier(rng, 2, 9);
  while (pgcd(m, k) !== 1) {
    k = entier(rng, 2, 9);
    if (m === k) m = m + 1;
  }
  const A = g * m;
  const B = g * k;
  return {
    enonce: `Calcule PGCD(${Math.max(A, B)}, ${Math.min(A, B)}).`,
    bonne_reponse: String(g),
    indice1: 'Utilise l\'algorithme d\'Euclide (divisions successives).',
    indice2: `PGCD(${A}, ${B}) est le plus grand diviseur commun ; décompose en facteurs premiers si besoin.`,
    explication: `${Math.max(A, B)} = ${g} × ${Math.max(m, k)} et ${Math.min(A, B)} = ${g} × ${Math.min(m, k)}. Comme ${m} et ${k} sont premiers entre eux, PGCD = ${g}.`,
  };
}

function ppcmExo(rng: () => number, n: number): ExoGenere {
  const g = entier(rng, 2, Math.min(3 + Math.floor(n / 15), 20));
  let m = entier(rng, 2, 7);
  let k = entier(rng, 2, 7);
  while (pgcd(m, k) !== 1 || m === k) {
    k = entier(rng, 2, 7);
  }
  const A = g * m;
  const B = g * k;
  const p = g * m * k;
  return {
    enonce: `Calcule PPCM(${A}, ${B}).`,
    bonne_reponse: String(p),
    indice1: 'PPCM(a, b) = a × b / PGCD(a, b).',
    indice2: `Commence par trouver PGCD(${A}, ${B}).`,
    explication: `PGCD(${A}, ${B}) = ${g}, donc PPCM = (${A} × ${B})/${g} = ${p}.`,
  };
}

function pythagore(rng: () => number, n: number): ExoGenere {
  const triple = choix(rng, [
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
    [7, 24, 25],
  ]);
  const k = entier(rng, 1, Math.min(1 + Math.floor(n / 15), 12));
  const hypo = triple[2] * k;
  return {
    enonce: `Un triangle rectangle a pour côtés de l'angle droit ${triple[0] * k} cm et ${triple[1] * k} cm. Calcule l'hypoténuse (en cm).`,
    bonne_reponse: String(hypo),
    indice1: 'Théorème de Pythagore : hypoténuse² = somme des carrés des deux autres côtés.',
    indice2: `Calcule (${triple[0] * k})² + (${triple[1] * k})² puis prends la racine carrée.`,
    explication: `h² = (${triple[0] * k})² + (${triple[1] * k})² = ${triple[0] * k * triple[0] * k} + ${triple[1] * k * triple[1] * k} = ${hypo * hypo} ⟹ h = ${hypo} cm.`,
  };
}

function suiteArithmetique(rng: () => number, n: number): ExoGenere {
  const u0 = entier(rng, -10, 20);
  let r = entier(rng, -6, 10);
  if (r === 0) r = 3;
  const k = Math.min(5 + Math.floor(n / 10), 15);
  const uk = u0 + k * r;
  return {
    enonce: `(uₙ) est arithmétique de premier terme u₀ = ${u0} et de raison r = ${r}. Calcule u${k}.`,
    bonne_reponse: String(uk),
    indice1: 'Formule : uₙ = u₀ + n × r.',
    indice2: `Remplace n par ${k}.`,
    explication: `u${k} = ${u0} + ${k} × ${r < 0 ? `(${r})` : r} = ${uk}.`,
  };
}

function suiteGeometrique(rng: () => number, n: number): ExoGenere {
  const q = choix(rng, [2, 3]);
  const u0 = entier(rng, 1, 6);
  const k = n > 60 ? 6 : 5;
  const uk = u0 * Math.pow(q, k);
  return {
    enonce: `(uₙ) est géométrique de premier terme u₀ = ${u0} et de raison q = ${q}. Calcule u${k}.`,
    bonne_reponse: String(uk),
    indice1: 'Formule : uₙ = u₀ × qⁿ.',
    indice2: `Calcule ${q}^${k} puis multiplie par ${u0}.`,
    explication: `u${k} = ${u0} × ${q}^${k} = ${u0} × ${Math.pow(q, k)} = ${uk}.`,
  };
}

function pourcentageExo(rng: () => number, n: number): ExoGenere {
  const gros = n > 50 ? [12, 15, 35, 45, 65, 85] : [5, 10, 20, 25, 50];
  const p = choix(rng, gros);
  const k = entier(rng, 2, Math.min(2 + Math.floor(n / 10), 20));
  const N = 100 * k;
  const res = (p * N) / 100;
  return {
    enonce: `Un article coûte ${N} FCFA. Une remise de ${p}% est appliquée. Calcule le montant de la remise (en FCFA).`,
    bonne_reponse: String(res),
    indice1: 'Prendre p% d\'une quantité, c\'est multiplier par p/100.',
    indice2: `Calcule ${N} × ${p}/100.`,
    explication: `Remise = ${N} × ${p}/100 = ${res} FCFA.`,
  };
}

function puissanceExo(rng: () => number, n: number): ExoGenere {
  const a = entier(rng, 2, 5);
  const m = entier(rng, 2, 6);
  const k = entier(rng, 2, 5);
  if (n > 50) {
    const expo = m * k;
    return {
      enonce: `Simplifie (${a}^${m})^${k} sous la forme ${a}^n et donne l'exposant n.`,
      bonne_reponse: String(expo),
      indice1: '(aᵐ)ⁿ = aᵐˣⁿ.',
      indice2: `Multiplie les exposants : ${m} × ${k}.`,
      explication: `(${a}^${m})^${k} = ${a}^${m * k}. L'exposant est ${expo}.`,
    };
  }
  const s = m + k;
  return {
    enonce: `Simplifie ${a}^${m} × ${a}^${k} sous la forme ${a}^n et donne l'exposant n.`,
    bonne_reponse: String(s),
    indice1: 'aᵐ × aⁿ = aᵐ⁺ⁿ (même base : on additionne les exposants).',
    indice2: `Additionne ${m} et ${k}.`,
    explication: `${a}^${m} × ${a}^${k} = ${a}^${m + k}. L'exposant est ${s}.`,
  };
}

function trigoValeur(rng: () => number, _n: number): ExoGenere {
  const table: { q: string; rep: string; indice: string }[] = [
    { q: 'sin(π/6)', rep: '1/2|0.5', indice: 'Valeur remarquable : sin(30°).' },
    { q: 'cos(π/3)', rep: '1/2|0.5', indice: 'Valeur remarquable : cos(60°).' },
    { q: 'sin(π/2)', rep: '1', indice: 'Le sinus atteint son maximum en π/2.' },
    { q: 'cos(0)', rep: '1', indice: 'En 0, le cosinus vaut son maximum.' },
    { q: 'tan(π/4)', rep: '1', indice: 'tan(π/4) = sin(π/4)/cos(π/4).' },
    { q: 'sin(0)', rep: '0', indice: 'Le sinus de 0 est nul.' },
    { q: 'cos(π/2)', rep: '0', indice: 'Le cosinus de π/2 est nul.' },
    { q: 'cos(π/6)', rep: 'racine(3)/2|√3/2', indice: 'Valeur remarquable : cos(30°).' },
    { q: 'sin(π/3)', rep: 'racine(3)/2|√3/2', indice: 'Valeur remarquable : sin(60°).' },
  ];
  const t = choix(rng, table);
  return {
    enonce: `Donne la valeur exacte de ${t.q}.`,
    bonne_reponse: t.rep,
    indice1: t.indice,
    indice2: 'Apprends le cercle trigonométrique par cœur : c\'est un réflexe gagnant au BAC.',
    explication: `${t.q} = ${t.rep.split('|')[0]}.`,
  };
}

function probabiliteDe(rng: () => number, n: number): ExoGenere {
  if (n > 50) {
    // Urne
    const R = entier(rng, 2, 8);
    const B = entier(rng, 2, 8);
    const V = entier(rng, 1, 5);
    const total = R + B + V;
    const rep = fraction(R, total);
    return {
      enonce: `Une urne contient ${R} boules rouges, ${B} bleues et ${V} ${V > 1 ? 'vertes' : 'verte'}, indiscernables au toucher. On tire une boule au hasard. Quelle est la probabilité (fraction irréductible) qu'elle soit rouge ?`,
      bonne_reponse: `${rep}|${Number((R / total).toFixed(3))}`,
      indice1: 'P = (nombre de cas favorables) / (nombre de cas possibles).',
      indice2: `Total = ${total} boules, favorables = ${R}.`,
      explication: `P = ${R}/${total} = ${rep} après simplification.`,
    };
  }
  const cas = choix<string[][]>(rng, [
    [["d'obtenir un 6"], ['1/6']],
    [["d'obtenir un nombre pair"], ['1/2']],
    [["d'obtenir un nombre strictement plus grand que 4"], ['1/3']],
    [["d'obtenir un multiple de 3"], ['1/3']],
  ]);
  const p = cas[1][0];
  const num = Number(p.split('/')[0]);
  const den = Number(p.split('/')[1]);
  return {
    enonce: `On lance un dé équilibré à 6 faces. Quelle est la probabilité (fraction) ${cas[0][0]} ?`,
    bonne_reponse: `${p}|${Number((num / den).toFixed(3))}`,
    indice1: 'P = cas favorables / 6 cas possibles (dé équilibré).',
    indice2: `Compte les faces qui conviennent puis écris la fraction.`,
    explication: `P = ${p} (soit ${num} face(s) favorable(s) sur 6).`,
  };
}

function factorisationIdentite(rng: () => number, n: number): ExoGenere {
  const a = entier(rng, -amplitude(n), amplitude(n));
  const equation = `x² ${terme(2 * a)}x ${terme(a * a)} = 0`;
  return {
    enonce: `Résous l'équation ${equation} (donne la solution double).`,
    bonne_reponse: String(-a),
    indice1: 'Reconnais une identité remarquable : x² + 2ax + a² = (x + a)².',
    indice2: `Ici a = ${a}, donc l'équation devient (x ${terme(a)})² = 0.`,
    explication: `${equation} ⟺ (x ${terme(a)})² = 0 ⟺ x ${terme(a)} = 0 ⟺ x = ${-a}.`,
  };
}

function logarithmeExo(rng: () => number, n: number): ExoGenere {
  if (n > 50 && rng() < 0.5) {
    const k = entier(rng, 2, 5);
    return {
      enonce: `Résous l'équation : e^(2x) = e^${2 * k}`,
      bonne_reponse: String(k),
      indice1: 'La fonction exponentielle est une bijection : e^A = e^B ⟺ A = B.',
      indice2: `Donc 2x = ${2 * k}.`,
      explication: `e^(2x) = e^${2 * k} ⟺ 2x = ${2 * k} ⟺ x = ${k}.`,
    };
  }
  const k = entier(rng, 1, 4);
  const x = Math.pow(10, k);
  return {
    enonce: `Résous l'équation : log(x) = ${k} (logarithme décimal).`,
    bonne_reponse: String(x),
    indice1: 'log(x) = k ⟺ x = 10^k.',
    indice2: `Calcule 10^${k}.`,
    explication: `log(x) = ${k} ⟺ x = 10^${k} = ${x}.`,
  };
}

function exponentielleExo(rng: () => number, n: number): ExoGenere {
  const k = entier(rng, 1, 6);
  if (n > 60) {
    // e^(x) * e^(2) = e^(5) type
    const m = entier(rng, 1, 4);
    return {
      enonce: `Résous : e^x × e^${m} = e^${k + m}`,
      bonne_reponse: String(k),
      indice1: 'e^a × e^b = e^(a+b).',
      indice2: `Donc e^(x+${m}) = e^${k + m} ⟹ compare les exposants.`,
      explication: `e^x × e^${m} = e^(x+${m}) = e^${k + m} ⟹ x + ${m} = ${k + m} ⟹ x = ${k}.`,
    };
  }
  return {
    enonce: `Calcule e^(ln ${k}).`,
    bonne_reponse: String(k),
    indice1: 'exp et ln sont des fonctions réciproques : e^(ln x) = x pour x > 0.',
    indice2: 'Applique directement la réciproque.',
    explication: `e^(ln ${k}) = ${k}.`,
  };
}

function airePerimetre(rng: () => number, n: number): ExoGenere {
  const L = entier(rng, 2, 5 + Math.floor(n / 5));
  const l = entier(rng, 2, L);
  const aire = rng() < 0.5;
  const rep = aire ? L * l : 2 * (L + l);
  return {
    enonce: `Un rectangle mesure ${L} cm sur ${l} cm. Calcule son ${aire ? 'aire' : 'périmètre'} (en cm${aire ? '²' : ''}).`,
    bonne_reponse: String(rep),
    indice1: aire ? 'Aire = Longueur × largeur.' : 'Périmètre = 2 × (Longueur + largeur).',
    indice2: `Remplace L = ${L} et l = ${l} dans la formule.`,
    explication: aire
      ? `Aire = ${L} × ${l} = ${rep} cm².`
      : `Périmètre = 2 × (${L} + ${l}) = ${rep} cm.`,
  };
}

function calculMental(rng: () => number, n: number): ExoGenere {
  const amp = amplitude(n);
  const a = entier(rng, 2, amp + 6);
  const b = entier(rng, 2, amp + 6);
  const op = choix(rng, ['+', '-', '×']);
  let rep: number;
  if (op === '+') rep = a + b;
  else if (op === '-') rep = a - b;
  else rep = a * b;
  return {
    enonce: `Calcule sans calculatrice : ${a} ${op} ${b}`,
    bonne_reponse: String(rep),
    indice1: op === '×' ? 'Décompose : (dizaines × b) + (unités × b).' : 'Pose l\'opération si nécessaire.',
    indice2: 'Prends ton temps, la vitesse viendra avec la pratique.',
    explication: `${a} ${op} ${b} = ${rep}.`,
  };
}

// ---------- GÉNÉRATEURS (Physique-Chimie) ----------

function loiOhm(rng: () => number, n: number): ExoGenere {
  const R = entier(rng, 1, Math.min(2 + Math.floor(n / 10), 50)) * 10;
  const I = entier(rng, 1, Math.min(2 + Math.floor(n / 25), 5));
  const U = R * I;
  return {
    enonce: `Un conducteur ohmique de résistance R = ${R} Ω est traversé par un courant d'intensité I = ${I} A. Calcule la tension U à ses bornes (en volts).`,
    bonne_reponse: String(U),
    indice1: 'Loi d\'Ohm : U = R × I.',
    indice2: `U = ${R} × ${I}.`,
    explication: `U = R × I = ${R} × ${I} = ${U} V.`,
  };
}

function vitesseExo(rng: () => number, n: number): ExoGenere {
  const v = entier(rng, 10, 20 + Math.floor(n / 2));
  const t = entier(rng, 2, 8);
  const d = v * t;
  return {
    enonce: `Une moto parcourt ${d} km en ${t} heures. Calcule sa vitesse moyenne (en km/h).`,
    bonne_reponse: String(v),
    indice1: 'v = d / t (distance divisée par durée).',
    indice2: `v = ${d} / ${t}.`,
    explication: `v = d/t = ${d}/${t} = ${v} km/h.`,
  };
}

function concentrationExo(rng: () => number, n: number): ExoGenere {
  // C = n / V ; n en mol (demi-entier), V en L
  const nMoles = entier(rng, 1, 2 + Math.floor(n / 25)) * 0.5;
  const V = entier(rng, 1, 5);
  const C = nMoles / V;
  const repStr = String(Number(C.toFixed(3)));
  const repFraction = fraction(Math.round(nMoles * 2), Math.round(V * 2)); // n et V ×2 pour des entiers
  return {
    enonce: `On dissout n = ${nMoles} mol de sel dans V = ${V} L d'eau. Calcule la concentration molaire C (en mol/L).`,
    bonne_reponse: `${repStr}|${repFraction}`,
    indice1: 'C = n / V.',
    indice2: `C = ${nMoles} / ${V}.`,
    explication: `C = n/V = ${nMoles}/${V} = ${repStr} mol/L.`,
  };
}

function masseVolumique(rng: () => number, n: number): ExoGenere {
  const m = entier(rng, 2, 10 + Math.floor(n / 5)); // kg
  const V = entier(rng, 1, Math.min(m, 8)); // L, choisi pour que ρ soit un entier ou simple
  const rho = m / V;
  const repStr = String(Number(rho.toFixed(3)));
  return {
    enonce: `Un objet de masse m = ${m} kg occupe un volume V = ${V} L. Calcule sa masse volumique ρ (en kg/L).`,
    bonne_reponse: repStr,
    indice1: 'ρ = m / V.',
    indice2: `ρ = ${m} / ${V}.`,
    explication: `ρ = m/V = ${m}/${V} = ${repStr} kg/L.`,
  };
}

function energieCinetique(rng: () => number, n: number): ExoGenere {
  // Ec = ½ m v² ; masse réaliste (multiple de 100 kg) → Ec entier en J
  const m = entier(rng, 1, Math.min(2 + Math.floor(n / 15), 12)) * 100;
  const v = entier(rng, 2, Math.min(4 + Math.floor(n / 12), 20));
  const Ec = 0.5 * m * v * v;
  return {
    enonce: `Un véhicule de masse m = ${m} kg roule à v = ${v} m/s. Calcule son énergie cinétique Ec (en joules).`,
    bonne_reponse: String(Ec),
    indice1: 'Ec = ½ × m × v².',
    indice2: `Ec = 0,5 × ${m} × ${v}².`,
    explication: `Ec = ½ × ${m} × ${v * v} = ${Ec} J.`,
  };
}
// ⚗️ CHIMIE : quantité de matière et dilution (programme BAC C/D)
function moleQuantite(rng: () => number, n: number): ExoGenere {
  const M = choix(rng, [18, 44, 58, 98, 160]);
  const nExo = entier(rng, 1, 4);
  const m = nExo * M;
  return {
    enonce: `Quelle est la quantité de matière (en mol) contenue dans m = ${m} g d'une espèce de masse molaire M = ${M} g/mol ?`,
    bonne_reponse: `${nExo}|${nExo}.0`,
    indice1: 'La quantité de matière vaut n = m / M.',
    indice2: `n = ${m} / ${M}.`,
    explication: `n = m / M = ${m} / ${M} = ${nExo} mol.`,
  };
}

function dilutionExo(rng: () => number, n: number): ExoGenere {
  const CF = entier(rng, 1, 5); // concentration fille (g/L ou mol/L)
  const VF = entier(rng, 2, 8); // volume fille final (L)
  const coeff = entier(rng, 2, 10); // facteur de dilution
  const CM = CF * coeff;
  const VM = VF / coeff; // volume mère à prélever
  return {
    enonce: `On veut préparer V = ${VF} L d'une solution de concentration C = ${CF} mol/L par dilution d'une solution mère de concentration Cₘ = ${CM} mol/L. Quel volume (en L) de solution mère faut-il prélever ?`,
    bonne_reponse: `${VM}|${Math.round(VM)}L`,
    indice1: 'Loi de dilution : Cₘ × Vₘ = C × V.',
    indice2: `Vₘ = C × V / Cₘ = ${CF} × ${VF} / ${CM}.`,
    explication: `Vₘ = ${CF} × ${VF} / ${CM} = ${VM} L.`,
  };
}

// 🔭 PHYSIQUE : poids / pesanteur
function poidsPesanteur(rng: () => number, n: number): ExoGenere {
  const m = entier(rng, 1, 50);
  const g = 10;
  const P = m * g;
  return {
    enonce: `Un corps a une masse m = ${m} kg. Calcule son poids P (en N) en prenant g = ${g} N/kg.`,
    bonne_reponse: String(P),
    indice1: 'P = m × g.',
    indice2: `P = ${m} × ${g}.`,
    explication: `P = m × g = ${m} × ${g} = ${P} N.`,
  };
}

// 🧬 SVT : transmission du patrimoine génétique (croisement / pourcentage)
function svtADN(rng: () => number, n: number): ExoGenere {
  const cas = choix<string[]>(rng, [
    [
      "Chez l'homme, une cellule (2n=46) subit une division. Combien de chromosomes contient une cellule-fille issue d'une mitose ?",
      '46', 'La mitose conserve le nombre de chromosomes (2n).', 'Mitose ⟹ 2 cellules identiques à la cellule mère, donc 46 chromosomes chacun.',
    ],
    [
      "Un gamète (cellule reproductrice) humain contient 23 chromosomes. Combien en contiendrait après une fécondation (cellule-œuf) ?",
      '46', 'La fécondation additionne les deux gamètes : 23 + 23 = 46.', 'Cellule-œuf = 23 + 23 = 46 chromosomes (2n).',
    ],
    [
      "Une molécule d'ADN contient 30% de bases A (adénine). Quel est le pourcentage de bases T (thymine) par complémentarité ?",
      '30', 'Règle de Chargaff : A = T et G = C.', 'A = T, donc si A = 30%, alors T = 30%.',
    ],
  ]);
  return {
    enonce: cas[0],
    bonne_reponse: cas[1],
    indice1: cas[2],
    indice2: 'Applique l\'information du cours.',
    explication: cas[3],
  };
}

// Système 2x2 à solutions entières : ax+by=e, cx+dy=f
function systemeDeuxEquations(rng: () => number, n: number): ExoGenere {
  const amp = amplitude(n);
  const x0 = entier(rng, -amp, amp);
  const y0 = entier(rng, -amp, amp);
  const a = entier(rng, 1, 4); const b = entier(rng, 1, 4);
  const c = entier(rng, 1, 4); const d = entier(rng, 1, 4);
  const e = a * x0 + b * y0;
  const f = c * x0 + d * y0;
  return {
    enonce: `Résous le système : { ${a}x + ${b}y = ${e} ; ${c}x + ${d}y = ${f} } et donne la valeur de x.`,
    bonne_reponse: String(x0),
    indice1: 'Élimine y : multiplie chaque équation pour avoir le même coefficient en y, puis soustrais.',
    indice2: `Après élimination, tu obtiens une équation en x seule. (x, y) = (${x0}, ...).`,
    explication: `Vérification : ${a}×${x0} + ${b}×${y0} = ${e} et ${c}×${x0} + ${d}×${y0} = ${f}. Donc x = ${x0}.`,
  };
}

// Inéquation : ax + b < c (réponse = borne, entière)
function inequationSimple(rng: () => number, n: number): ExoGenere {
  const a = entier(rng, 1, Math.min(2 + Math.floor(n / 25), 9));
  const x0 = entier(rng, -amplitude(n), amplitude(n));
  const b = entier(rng, -10, 10);
  const c = a * x0 + b;
  const sens = choix(rng, ['<', '≤', '>', '≥']);
  const inverse = sens === '<' ? '>' : sens === '≤' ? '≥' : sens === '>' ? '<' : '≤';
  return {
    enonce: `Résous l'inéquation : ${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} ${sens} ${c}`,
    bonne_reponse: `x ${inverse} ${x0}|x${inverse}${x0}`,
    indice1: 'Isole x comme une équation. ATTENTION au sens !',
    indice2: `Si tu divises par un nombre NÉGATIF, le sens change. Ici a = ${a} > 0 : le sens ne change pas.`,
    explication: `${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)} ${sens} ${c} ⟹ ${a}x ${sens} ${c - b} ⟹ x ${inverse} ${x0}.`,
  };
}

// ---------- MAPPING chapitre → générateurs ----------

interface Sujet {
  motsCles: string[];
  generateurs: GenFonction[];
}

const SUJETS: Sujet[] = [
  {
    motsCles: ['equation', 'inéquation', 'polynome', 'second degre', 'systeme'],
    generateurs: [eqPremierDegre, eqSecondDegre, eqProduit, racineCarreeEq, factorisationIdentite, systemeDeuxEquations, inequationSimple],
  },
  {
    motsCles: ['deriv', 'differ'], // couvre dérive, dérivation, dérivée, différentielle
    generateurs: [deriveePolynome],
  },
  {
    motsCles: ['primitive', 'integrale', 'intÉgrale'],
    generateurs: [primitivePuissance, deriveePolynome],
  },
  {
    motsCles: ['limite', 'continuite'],
    generateurs: [limiteRationnelle],
  },
  {
    motsCles: ['logarithme', 'ln ', ' neperien'],
    generateurs: [logarithmeExo, exponentielleExo],
  },
  {
    motsCles: ['exponentiel'],
    generateurs: [exponentielleExo, logarithmeExo],
  },
  {
    motsCles: ['suite'],
    generateurs: [suiteArithmetique, suiteGeometrique],
  },
  {
    motsCles: ['probabil', 'statistiq', 'denombrement', 'arrangement', 'combinaison'],
    generateurs: [probabiliteDe, arrangementCombinaison],
  },
  {
    motsCles: ['trigonometri', 'angles oriente', 'cosinus', 'sinus'],
    generateurs: [trigoValeur],
  },
  {
    motsCles: ['pgcd', 'ppcm', 'arithmetique', 'divisibilite', 'nombre premier'],
    generateurs: [pgcdExo, ppcmExo],
  },
  {
    motsCles: ['puissance', 'exposant', 'radicaux', 'racine carree'],
    generateurs: [puissanceExo, racineCarreeEq],
  },
  {
    motsCles: ['pourcentage', 'proportion', 'taux'],
    generateurs: [pourcentageExo],
  },
  {
    motsCles: ['pythagore', 'geometrie', 'triangle', 'rectangle', 'aire', 'perimetre', 'espace', 'vector'],
    generateurs: [pythagore, airePerimetre],
  },
  {
    motsCles: ['calcul', 'numerique', 'ensemble', 'ordre', 'algebrique'],
    generateurs: [calculMental, eqPremierDegre, puissanceExo],
  },
  {
    motsCles: ['electricite', 'courant', 'tension', 'resistance', 'ohm', 'electrique', 'circuit'],
    generateurs: [loiOhm],
  },
  {
    motsCles: ['mecanique', 'mouvement', 'vitesse', 'force', 'energie', 'cinetique', 'dynamique', 'newton'],
    generateurs: [vitesseExo, energieCinetique],
  },
  {
    motsCles: ['poids', 'pesanteur', 'gravite', 'poids et masse'],
    generateurs: [poidsPesanteur],
  },
  {
    motsCles: ['chimie', 'solution', 'concentration', 'mole', 'matiere', 'atome', 'reaction'],
    generateurs: [concentrationExo, moleQuantite, dilutionExo],
  },
  {
    motsCles: ['quantite de matiere', 'masse molaire', 'mole', 'n=m/m'],
    generateurs: [moleQuantite, concentrationExo],
  },
  {
    motsCles: ['dilution', 'diluer', 'concentration fille', 'facteur de dilution'],
    generateurs: [dilutionExo, concentrationExo],
  },
  {
    motsCles: ['svt', 'biologie', 'adn', 'chromosome', 'gene', 'mitose', 'cellule', 'patrimoine', 'genetique', 'heredite'],
    generateurs: [svtADN],
  },
  {
    motsCles: ['masse', 'volumique', 'densite'],
    generateurs: [masseVolumique, concentrationExo],
  },
];

function arrangementCombinaison(rng: () => number, n: number): ExoGenere {
  const factorielle = (x: number): number => {
    let r = 1;
    for (let i = 2; i <= x; i++) r *= i;
    return r;
  };

  if (n > 45) {
    const k = 2;
    const totalB = entier(rng, 8, 15);
    const totalA = entier(rng, 6, 10);
    const nb = choix<string[]>(rng, [
      [`Dans une classe de ${totalB} élèves, combien de comités de ${k} élèves peut-on former ? (ordre sans importance)`, `${factorielle(totalB) / (factorielle(k) * factorielle(totalB - k))}`, 'C(n,k) = n! / (k!·(n-k)!). Le comité n\'est pas ordonné.', `C(${totalB},${k}) = ${factorielle(totalB) / (factorielle(k) * factorielle(totalB - k))}.`],
      [`Sur le podium d'un concours, combien de classements possibles pour ${k} médaillés parmi ${totalA} candidats ? (ordre important)`, `${factorielle(totalA) / factorielle(totalA - k)}`, 'A(n,k) = n! / (n-k)!. L\'ordre des médailles compte.', `A(${totalA},${k}) = ${factorielle(totalA) / factorielle(totalA - k)}.`],
    ]);
    return { enonce: nb[0], bonne_reponse: nb[1], indice1: nb[2], indice2: `Formule : ${nb[2].includes('n\'est pas ordonné') ? 'C(n,k)' : 'A(n,k)'}.`, explication: nb[3] };
  }

  const total = entier(rng, 6, 12);
  const k = 2;
  const useArrangement = rng() < 0.4;
  const rep = useArrangement
    ? factorielle(total) / factorielle(total - k)
    : factorielle(total) / (factorielle(k) * factorielle(total - k));
  return {
    enonce: (useArrangement
      ? `Combien de mots de ${k} lettres (sans répétition) peut-on écrire avec ${total} lettres distinctes ?`
      : `De combien de façons peut-on choisir un comité de ${k} personnes parmi ${total} ? (ordre sans importance)`),
    bonne_reponse: String(rep),
    indice1: useArrangement
      ? 'C\'est un arrangement : A(n,k) = n! / (n-k)! (l\'ordre compte).'
      : 'C\'est une combinaison : C(n,k) = n! / (k!·(n-k)!  (l\'ordre ne compte pas).',
    indice2: isFinite(rep) ? `Formule appliquée avec n=${total}, k=${k}.` : 'Attention au calcul factoriel.',
    explication: `Résultat : ${rep} possibilités.`,
  };
}

// POOL COMPLET : couvre TOUTES les notions du programme BAC C/D (>13 notions)
const POOL_DEFAUT: GenFonction[] = [
  // Algèbre (6 notions)
  eqPremierDegre,        // Équations du 1er degré
  eqSecondDegre,         // Équations du 2de degré
  systemeDeuxEquations,  // Systèmes d'équations
  inequationSimple,      // Inéquations
  pgcdExo,               // Divisibilité et PGCD
  puissanceExo,          // Puissances et exposants

  // Analyse (4 notions)
  suiteArithmetique,     // Suites arithmétiques
  suiteGeometrique,      // Suites géométriques
  deriveePolynome,       // Dérivées
  racineCarreeEq,        // Racines carrées

  // Géométrie (2 notions)
  pythagore,             // Théorème de Pythagore
  airePerimetre,         // Aires et périmètres

  // Probabilités & Dénombrement (2 notions)
  probabiliteDe,         // Probabilités (dés)
  arrangementCombinaison,// Arrangements et combinaisons

  // Physique (3 notions)
  vitesseExo,            // Vitesse et mouvement
  loiOhm,                // Loi d'Ohm (électricité)
  energieCinetique,      // Énergie cinétique
  poidsPesanteur,        // Poids et pesanteur

  // Chimie (2 notions)
  concentrationExo,      // Concentrations
  masseVolumique,        // Masse volumique
  moleQuantite,          // Quantité de matière
  dilutionExo,           // Dilution

  // SVT (1 notion)
  svtADN,                // Transmission du patrimoine génétique

  // Calcul & Applications (2 notions)
  calculMental,          // Calcul rapide
  pourcentageExo,        // Pourcentages
];

function normaliserCle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function poolPourChapitre(chapitreId: string, titre: string): GenFonction[] {
  const cle = normaliserCle(`${chapitreId} ${titre}`);
  for (const sujet of SUJETS) {
    if (sujet.motsCles.some((mot) => cle.includes(normaliserCle(mot)))) {
      return sujet.generateurs;
    }
  }
  return POOL_DEFAUT;
}

// ---------- API PUBLIQUE ----------

export function genererExercice(chapitreId: string, titreChapitre: string, niveau: number): ExoGenere {
  const n = Math.max(1, Math.min(100, Math.round(niveau)));
  const pool = poolPourChapitre(chapitreId, titreChapitre);
  const rng = creerRng();
  const gen = choix(rng, pool);
  return gen(rng, n);
}

// Version DÉTERMINISTE : même graine ⟹ même exercice (utilisée par le Défi du
// Jour pour que toute la classe ait exactement les mêmes questions).
export function genererExerciceSeede(chapitreId: string, titreChapitre: string, niveau: number, graine: number): ExoGenere {
  const n = Math.max(1, Math.min(100, Math.round(niveau)));
  const pool = poolPourChapitre(chapitreId, titreChapitre);
  const rng = creerRng(graine >>> 0);
  const gen = choix(rng, pool);
  return gen(rng, n);
}

export function niveauLabel(niveau: number): string {
  if (niveau <= 10) return '🌱 Base';
  if (niveau <= 25) return '⭐ Facile';
  if (niveau <= 40) return '⭐⭐ Intermédiaire';
  if (niveau <= 55) return '🔥 Avancé';
  if (niveau <= 70) return '⚡ Difficile';
  if (niveau <= 85) return '🏆 Expert (BAC)';
  return '🧠 Génie / Olympiade';
}

export function generateurDisponible(matiere: string): boolean {
  const m = normaliserCle(matiere);
  return m.includes('math') || m.includes('physique') || m.includes('mecanique')
    || m.includes('chimie') || m.includes('svt') || m.includes('biologie');
}

// Génère un exercice ciblé sur une micro-notion spécifique.
// C'est la fonction principale pour les exercices infinis par micro-notion.
export function genererExercicePourNotion(
  microNotion: { titre: string; motsCles: string[]; extrait: string },
  niveau: number,
  graine?: number
): ExoGenere {
  const n = Math.max(1, Math.min(100, Math.round(niveau)));
  const rng = creerRng(graine);
  
  // Cherche le meilleur générateur basé sur les mots-clés de la micro-notion
  const cleNormalisee = normaliserCle(microNotion.titre + ' ' + microNotion.motsCles.join(' '));
  
  for (const sujet of SUJETS) {
    if (sujet.motsCles.some((mot) => cleNormalisee.includes(normaliserCle(mot)))) {
      const gen = choix(rng, sujet.generateurs);
      return gen(rng, n);
    }
  }
  
  // Fallback : utilise le pool par défaut avec les mots-clés de la notion
  const gen = choix(rng, POOL_DEFAUT);
  return gen(rng, n);
}
