// ============================================================
// LEX ACADEMY - GÉNÉRATEUR PARAMÉTRIQUE MASSIF (10 000+ exercices)
// Principe : des générateurs créent des énoncés avec des paramètres
// aléatoires (RNG avec graine fixe = reproductible) et calculent la
// réponse exacte par le code. Répartition sur les vrais chapitres.
// IDs : {prefix}_g{n} pour ne jamais entrer en collision avec _exo{n}.
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

// ---------------- RNG déterministe (mulberry32) ----------------
let _seed = 20260820;
function rnd() {
  _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[ri(0, arr.length - 1)];

// ---------------- Outils maths ----------------
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const sup = (n) => String(n).split('').map(c => SUP[c] || c).join('');
function pgcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
function frac(a, b) {
  if (b < 0) { a = -a; b = -b; }
  const g = pgcd(a, b); const n = a / g, d = b / g;
  return d === 1 ? String(n) : `${n}/${d}`;
}
const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [12, 16, 20], [7, 24, 25], [20, 21, 29], [10, 24, 26], [9, 40, 41]];

// ---------------- Moteur de génération ----------------
const EXOS = [];
const COMPTEURS = {};
function push(prefix, classe, matiere, chapitreId, chapitreTitre, difficulte, e, r, i1, i2, x) {
  COMPTEURS[prefix] = (COMPTEURS[prefix] || 0) + 1;
  EXOS.push({
    id: `${prefix}_g${COMPTEURS[prefix]}`,
    classe, matiere,
    chapitre: chapitreTitre, chapitre_id: chapitreId,
    difficulte,
    enonce: e, bonne_reponse: r,
    indice1: i1, indice2: i2, explication: x
  });
}

// Un générateur : tire des paramètres, déduplique par clé, retourne {e,r,i1,i2,x} ou null si épuisé
function gen(space, maker) {
  const seen = new Set();
  return () => {
    for (let t = 0; t < 40; t++) {
      const out = maker();
      if (!out) continue;
      const key = JSON.stringify(out.k);
      if (seen.has(key)) continue;
      seen.add(key);
      return out;
    }
    return null;
  };
}

// ============================================================
// GÉNÉRATEURS MATHÉMATIQUES
// ============================================================
const M = {
  fracAdd: gen(999, () => {
    const b = ri(2, 12), d = ri(2, 12), a = ri(1, 9), c = ri(1, 9);
    const num = a * d + c * b, den = b * d;
    return { k: ['fa', a, b, c, d], e: `Calcule ${a}/${b} + ${c}/${d} et donne la fraction irréductible (ex : 5/6).`, r: frac(num, den), i1: "Mets les fractions au même dénominateur.", i2: `Dénominateur commun : ${den}. Additionne les numérateurs puis simplifie.`, x: `${a}/${b} + ${c}/${d} = ${a * d}/${den} + ${c * b}/${den} = ${frac(num, den)}. ✅` };
  }),
  fracSub: gen(999, () => {
    const b = ri(2, 10), d = ri(2, 10), a = ri(1, 9), c = ri(1, 9);
    const num = a * d - c * b, den = b * d;
    if (num <= 0) return null;
    return { k: ['fs', a, b, c, d], e: `Calcule ${a}/${b} − ${c}/${d} et donne la fraction irréductible (le résultat est positif).`, r: frac(num, den), i1: "Mets au même dénominateur avant de soustraire.", i2: `Dénominateur commun : ${den}. Soustrais les numérateurs.`, x: `${a}/${b} − ${c}/${d} = ${frac(num, den)}. ✅` };
  }),
  powMul: gen(999, () => {
    const a = ri(2, 5), n = ri(2, 4), m = ri(2, 4);
    if (a ** (n + m) > 600000) return null;
    return { k: ['pm', a, n, m], e: `Calcule : ${a}${sup(n)} × ${a}${sup(m)}.`, r: String(a ** (n + m)), i1: "aⁿ × aᵐ = aⁿ⁺ᵐ.", i2: `Les exposants s'additionnent : ${a}${sup(n + m)}.`, x: `${a}${sup(n)} × ${a}${sup(m)} = ${a}${sup(n + m)} = ${a ** (n + m)}. ✅` };
  }),
  powDiv: gen(999, () => {
    const a = ri(2, 5), n = ri(3, 6), m = ri(1, n - 1);
    if (a ** n > 600000) return null;
    return { k: ['pd', a, n, m], e: `Calcule : ${a}${sup(n)} ÷ ${a}${sup(m)}.`, r: String(a ** (n - m)), i1: "aⁿ ÷ aᵐ = aⁿ⁻ᵐ.", i2: `Les exposants se soustraient : ${a}${sup(n - m)}.`, x: `${a}${sup(n)} ÷ ${a}${sup(m)} = ${a}${sup(n - m)} = ${a ** (n - m)}. ✅` };
  }),
  sqrtSum: gen(999, () => {
    const p = ri(1, 15), q = ri(1, 15);
    return { k: ['ss', p, q], e: `Calcule √${p * p} + √${q * q}.`, r: String(p + q), i1: "Cherche chaque racine carrée séparément.", i2: `√${p * p} = ${p} et √${q * q} = ${q}.`, x: `√${p * p} + √${q * q} = ${p} + ${q} = ${p + q}. ✅` };
  }),
  quadLargest: gen(999, () => {
    const p = ri(-9, 9), q = ri(-9, 9);
    if (p === q) return null;
    const b = -(p + q), c = p * q;
    const bs = b >= 0 ? `+ ${b}` : `− ${-b}`, cs = c >= 0 ? `+ ${c}` : `− ${-c}`;
    return { k: ['ql', p, q], e: `Résous x² ${bs} x ${cs} = 0 et donne la PLUS GRANDE solution.`, r: String(Math.max(p, q)), i1: "Calcule Δ = b² − 4ac puis les racines.", i2: `Δ = ${b * b - 4 * c}. Racines : cherche deux nombres de somme ${-b} et de produit ${c}.`, x: `Les racines sont ${Math.min(p, q)} et ${Math.max(p, q)} (somme ${-b}, produit ${c}). La plus grande est ${Math.max(p, q)}. ✅` };
  }),
  quadSum: gen(999, () => {
    const p = ri(-9, 9), q = ri(-8, 8);
    if (p === q) return null;
    const b = -(p + q), c = p * q;
    const bs = b >= 0 ? `+ ${b}` : `− ${-b}`, cs = c >= 0 ? `+ ${c}` : `− ${-c}`;
    return { k: ['qs', p, q], e: `Pour l'équation x² ${bs} x ${cs} = 0, calcule la SOMME des racines.`, r: String(p + q), i1: "Somme des racines = −b/a.", i2: `−b/a = ${p + q}.`, x: `Somme = ${p + q} (les racines ${p} et ${q} le confirment). ✅` };
  }),
  quadProd: gen(999, () => {
    const p = ri(-9, 9), q = ri(-8, 8);
    if (p === q) return null;
    const b = -(p + q), c = p * q;
    const bs = b >= 0 ? `+ ${b}` : `− ${-b}`, cs = c >= 0 ? `+ ${c}` : `− ${-c}`;
    return { k: ['qp', p, q], e: `Pour l'équation x² ${bs} x ${cs} = 0, calcule le PRODUIT des racines.`, r: String(p * q), i1: "Produit des racines = c/a.", i2: `c/a = ${p * q}.`, x: `Produit = ${p * q}. ✅` };
  }),
  quadDelta: gen(999, () => {
    const p = ri(-9, 9), q = ri(-8, 8);
    if (Math.abs(p - q) > 12) return null;
    const b = -(p + q), c = p * q;
    const bs = b >= 0 ? `+ ${b}` : `− ${-b}`, cs = c >= 0 ? `+ ${c}` : `− ${-c}`;
    return { k: ['qd', p, q], e: `Calcule le discriminant Δ de : x² ${bs} x ${cs} = 0.`, r: String((p - q) ** 2), i1: "Δ = b² − 4ac.", i2: `Δ = ${b}² − 4×${c} = ${(p - q) ** 2}.`, x: `Δ = ${(p - q) ** 2}. ✅` };
  }),
  vecCoord: gen(999, () => {
    const xa = ri(-9, 9), ya = ri(-9, 9), u = ri(-9, 9), v = ri(-9, 9);
    const xb = xa + u, yb = ya + v;
    const askX = rnd() < 0.5;
    const val = askX ? u : v;
    return { k: ['vc', xa, ya, xb, yb, askX], e: `Soit A(${xa} ; ${ya}) et B(${xb} ; ${yb}). Donne ${askX ? "l'abscisse" : "l'ordonnée"} du vecteur AB→.`, r: String(val), i1: "AB→ = (x_B − x_A ; y_B − y_A).", i2: askX ? `x_B − x_A = ${xb} − (${xa}).` : `y_B − y_A = ${yb} − (${ya}).`, x: `AB→ (${xb - xa} ; ${yb - ya}). ${askX ? 'Abscisse' : 'Ordonnée'} = ${val}. ✅` };
  }),
  vecNorm: gen(999, () => {
    const t = pick(TRIPLES), s = ri(1, 3);
    const [x, y, n] = [t[0] * s, t[1] * s, t[2] * s];
    return { k: ['vn', x, y], e: `Soit AB→ (${x} ; ${y}). Calcule la norme ‖AB→‖.`, r: String(n), i1: "‖AB→‖ = √(x² + y²).", i2: `√(${x * x} + ${y * y}) = √${x * x + y * y}.`, x: `‖AB→‖ = √${x * x + y * y} = ${n}. ✅` };
  }),
  dotProduct: gen(999, () => {
    const x = ri(-9, 9), y = ri(-9, 9), z = ri(-9, 9), w = ri(-9, 9);
    return { k: ['dp', x, y, z, w], e: `Soit u→(${x} ; ${y}) et v→(${z} ; ${w}). Calcule le produit scalaire u→·v→.`, r: String(x * z + y * w), i1: "u→·v→ = xx' + yy'.", i2: `${x}×${z} + ${y}×${w}.`, x: `u→·v→ = ${x * z} + ${y * w} = ${x * z + y * w}. ✅` };
  }),
  orthK: gen(999, () => {
    const x = ri(1, 4), t = ri(1, 4), y = ri(-6, 6);
    const w = x * t, k = -y * t;
    return { k: ['ok', x, y, w], e: `Soit u→(${x} ; ${y}) et v→(k ; ${w}). Trouve k pour que u→ et v→ soient orthogonaux.`, r: String(k), i1: "Orthogonaux ⟺ u→·v→ = 0.", i2: `${x}k + ${y * w} = 0.`, x: `${x}k = ${-y * w} donc k = ${k}. ✅` };
  }),
  linImg: gen(999, () => {
    const a = ri(-9, 9) || 4, b = ri(-9, 9), k = ri(-9, 9);
    return { k: ['li', a, b, k], e: `Soit f(x) = ${a}x ${b >= 0 ? '+ ' + b : '− ' + -b}. Calcule f(${k}).`, r: String(a * k + b), i1: "Remplace x par la valeur.", i2: `${a}×${k} ${b >= 0 ? '+ ' + b : '− ' + -b}.`, x: `f(${k}) = ${a * k + b}. ✅` };
  }),
  linAntecedent: gen(999, () => {
    const a = ri(2, 8), b = ri(-15, 15), x0 = ri(-9, 9);
    const y0 = a * x0 + b;
    return { k: ['la', a, b, x0], e: `Soit f(x) = ${a}x ${b >= 0 ? '+ ' + b : '− ' + -b}. Quel est l'antécédent de ${y0} ?`, r: String(x0), i1: "Résous f(x) = y.", i2: `${a}x = ${y0 - b}.`, x: `x = ${y0 - b}/${a} = ${x0}. ✅` };
  }),
  meanList: gen(999, () => {
    const n = ri(3, 6), m0 = ri(4, 16);
    const vals = [];
    let somme = 0;
    for (let j = 0; j < n - 1; j++) { const v = ri(0, 20); vals.push(v); somme += v; }
    const last = n * m0 - somme;
    if (last < -20 || last > 40) return null;
    vals.push(last);
    return { k: ['ml', n, m0, ...vals], e: `Calcule la moyenne de la série : ${vals.join(' ; ')}. (Tu peux donner un décimal, ex : 12.5)`, r: frac(vals.reduce((s, v) => s + v, 0), n), i1: "Moyenne = somme ÷ effectif.", i2: `Somme = ${vals.reduce((s, v) => s + v, 0)} ; effectif = ${n}.`, x: `Moyenne = ${vals.reduce((s, v) => s + v, 0)}/${n} = ${frac(vals.reduce((s, v) => s + v, 0), n)}. ✅` };
  }),
  medianList: gen(999, () => {
    const vals = new Set();
    while (vals.size < 5) vals.add(ri(0, 30));
    const arr = [...vals].sort((x, y) => x - y);
    return { k: ['md', ...arr], e: `Quelle est la médiane de la série ordonnée : ${arr.join(' ; ')} ?`, r: String(arr[2]), i1: "Valeur centrale de la série ordonnée.", i2: "5 valeurs → la 3ᵉ est la médiane.", x: `Médiane = ${arr[2]}. ✅` };
  }),
  symCentrale: gen(999, () => {
    const x = ri(-9, 9), y = ri(-9, 9);
    const askX = rnd() < 0.5;
    return { k: ['sc', x, y, askX], e: `M(${x} ; ${y}) et son image M' par la symétrie centrale de centre O. Donne ${askX ? "l'abscisse" : "l'ordonnée"} de M'.`, r: String(askX ? -x : -y), i1: "M' = (−x ; −y).", i2: `M' = (${-x} ; ${-y}).`, x: `M' = (${-x} ; ${-y}) donc ${askX ? 'abscisse' : 'ordonnée'} = ${askX ? -x : -y}. ✅` };
  }),
  symAxe: gen(999, () => {
    const x = ri(-9, 9), y = ri(-9, 0);
    return { k: ['sa', x, y], e: `M(${x} ; ${y}) et son image M' par la symétrie axiale d'axe (Ox). Donne l'ordonnée de M'.`, r: String(-y), i1: "La symétrie d'axe (Ox) change le signe de l'ordonnée.", i2: `M' = (${x} ; ${-y}).`, x: `Ordonnée de M' = ${-y}. ✅` };
  }),
  translation: gen(999, () => {
    const x = ri(-8, 8), y = ri(-8, 8), u = ri(-5, 5), v = ri(-5, 5);
    return { k: ['tr', x, y, u, v], e: `M(${x} ; ${y}) est translaté par le vecteur u→(${u} ; ${v}). Donne l'abscisse de l'image M'.`, r: String(x + u), i1: "Translation : M' = M + u→.", i2: `Abscisse : ${x} + (${u}).`, x: `M' = (${x + u} ; ${y + v}), abscisse = ${x + u}. ✅` };
  }),
  homothetie: gen(999, () => {
    const x = ri(-8, 8), y = ri(-8, 8), k = pick([-3, -2, 2, 3, 4]);
    return { k: ['ho', x, y, k], e: `Homothétie de centre O et de rapport ${k} : M(${x} ; ${y}) → M'. Donne l'abscisse de M'.`, r: String(k * x), i1: "On multiplie les coordonnées par le rapport.", i2: `${x} × ${k}.`, x: `M' = (${k * x} ; ${k * y}), abscisse = ${k * x}. ✅` };
  }),
  rotationQuart: gen(999, () => {
    const x = ri(-9, 9), y = ri(-9, 9);
    return { k: ['rq', x, y], e: `Rotation de centre O et d'angle π/2 : M(${x} ; ${y}) → M'. Donne l'abscisse de M'.`, r: String(-y), i1: "Rotation de π/2 (sens direct) : (x ; y) → (−y ; x).", i2: `M' = (${-y} ; ${x}).`, x: `M' = (${-y} ; ${x}), abscisse = ${-y}. ✅` };
  }),
  pgcdEu: gen(999, () => {
    const a = ri(10, 400), b = ri(2, 200);
    const g = pgcd(a, b);
    if (g === a || g === b) return null;
    return { k: ['pg', a, b], e: `Calcule le PGCD de ${a} et ${b}.`, r: String(g), i1: "Algorithme d'Euclide : PGCD(a ; b) = PGCD(b ; reste).", i2: `Divise ${a} par ${b} et continue avec le reste.`, x: `PGCD(${a} ; ${b}) = ${g}. ✅` };
  }),
  volCube: gen(999, () => {
    const a = ri(2, 9);
    return { k: ['vc2', a], e: `Un cube a pour arête ${a} cm. Calcule son volume en cm³.`, r: String(a ** 3), i1: "V = arête³.", i2: `${a}³.`, x: `V = ${a}³ = ${a ** 3} cm³. ✅` };
  }),
  volPave: gen(999, () => {
    const L = ri(2, 9), l = ri(2, 9), h = ri(2, 9);
    return { k: ['vp', L, l, h], e: `Un pavé droit mesure ${L} × ${l} × ${h} cm. Calcule son volume en cm³.`, r: String(L * l * h), i1: "V = L × l × h.", i2: `${L}×${l}×${h}.`, x: `V = ${L * l * h} cm³. ✅` };
  }),
  volPyramide: gen(999, () => {
    const B = ri(2, 15) * 3, h = ri(2, 9);
    return { k: ['vy', B, h], e: `Une pyramide a une base d'aire ${B} cm² et une hauteur de ${h} cm. Calcule son volume en cm³.`, r: String(B * h / 3), i1: "V = (1/3) × base × hauteur.", i2: `${B}×${h}/3.`, x: `V = ${B * h / 3} cm³. ✅` };
  }),
  devCoeff: gen(999, () => {
    const a = ri(-9, 9), b = ri(-9, 9);
    return { k: ['dc', a, b], e: `Développe (x ${a >= 0 ? '+ ' + a : '− ' + -a})(x ${b >= 0 ? '+ ' + b : '− ' + -b}). Quel est le coefficient de x ?`, r: String(a + b), i1: "Double distributivité.", i2: `Coefficient de x = ${a} + ${b}.`, x: `(x ${a >= 0 ? '+ ' + a : '− ' + -a})(x ${b >= 0 ? '+ ' + b : '− ' + -b}) = x² ${a + b >= 0 ? '+ ' + (a + b) : '− ' + -(a + b)}x ${a * b >= 0 ? '+ ' + a * b : '− ' + -a * b}. Coefficient de x : ${a + b}. ✅` };
  }),
  suiteArith: gen(999, () => {
    const u0 = ri(-10, 10), r = ri(-9, 9) || 4, n = ri(3, 8);
    return { k: ['sa2', u0, r, n], e: `(uₙ) est arithmétique de premier terme u₀ = ${u0} et de raison r = ${r}. Calcule u${n === 1 ? '₁' : n === 2 ? '₂' : n === 3 ? '₃' : n === 4 ? '₄' : n === 5 ? '₅' : n === 6 ? '₆' : n === 7 ? '₇' : '₈'}.`, r: String(u0 + n * r), i1: "uₙ = u₀ + n×r.", i2: `${u0} + ${n}×${r}.`, x: `u${n} = ${u0 + n * r}. ✅` };
  }),
  suiteGeom: gen(999, () => {
    const u0 = ri(1, 5), q = pick([2, 3]), n = ri(3, 5);
    return { k: ['sg', u0, q, n], e: `(uₙ) est géométrique de premier terme u₀ = ${u0} et de raison q = ${q}. Calcule u${n === 3 ? '₃' : n === 4 ? '₄' : '₅'}.`, r: String(u0 * q ** n), i1: "uₙ = u₀ × qⁿ.", i2: `${u0} × ${q}${sup(n)}.`, x: `u${n} = ${u0} × ${q ** n} = ${u0 * q ** n}. ✅` };
  }),
  raisonArit: gen(999, () => {
    const u1 = ri(-10, 10), r = ri(-8, 8) || 3;
    const u3 = u1 + 2 * r;
    return { k: ['ra', u1, u3], e: `(uₙ) est arithmétique avec u₁ = ${u1} et u₃ = ${u3}. Calcule la raison r.`, r: String(r), i1: "u₃ − u₁ = 2r.", i2: `${u3} − (${u1}) = ${u3 - u1} = 2r.`, x: `r = ${r}. ✅` };
  }),
  derivePoly: gen(999, () => {
    const a = ri(-4, 4) || 2, b = ri(-6, 6), c = ri(-9, 9), k = pick([-1, 0, 1, 2]);
    const fp = (x) => 3 * a * x * x + 2 * b * x + c;
    const terme = (co, deg) => deg === 0 ? (co === 0 ? '' : (co > 0 ? '+ ' + co : '− ' + -co)) : `${co === 1 ? '' : co === -1 ? '−' : co}x${deg > 1 ? sup(deg) : ''}`;
    const fx = `f(x) = ${terme(a, 3)} ${b ? (b > 0 ? '+ ' + terme(b, 2) : '− ' + terme(-b, 2)) : ''} ${c ? (c > 0 ? '+ ' + c : '− ' + -c) : ''}`;
    return { k: ['dpo', a, b, c, k], e: `Soit ${fx}. Calcule f'(${k}).`, r: String(fp(k)), i1: "Dérivée : (ax³)' = 3ax², (bx²)' = 2bx, (cx)' = c, constante → 0.", i2: `f'(x) = ${3 * a}x² ${2 * b >= 0 ? '+ ' + 2 * b : '− ' + -2 * b}x ${c >= 0 ? '+ ' + c : '− ' + -c}, puis remplace x = ${k}.`, x: `f'(${k}) = ${fp(k)}. ✅` };
  }),
  tangenteCarre: gen(999, () => {
    const a = ri(1, 5), k = ri(-6, 6);
    return { k: ['tc', a, k], e: `Soit f(x) = ${a}x². Quelle est la pente de la tangente à la courbe au point d'abscisse ${k} ?`, r: String(2 * a * k), i1: "Pente = f'(k).", i2: `f'(x) = ${2 * a}x.`, x: `f'(${k}) = ${2 * a * k}. ✅` };
  }),
  composees: gen(999, () => {
    const m = ri(-5, 5), k = ri(-5, 7);
    return { k: ['co', m, k], e: `Soit f(x) = x² et g(x) = x ${m >= 0 ? '+ ' + m : '− ' + -m}. Calcule (f∘g)(${k}).`, r: String((k + m) ** 2), i1: "(f∘g)(k) = f(g(k)).", i2: `g(${k}) = ${k + m}, puis élève au carré.`, x: `(f∘g)(${k}) = f(${k + m}) = ${(k + m) ** 2}. ✅` };
  }),
  limiteInfini: gen(999, () => {
    const a = ri(2, 9), b = ri(-9, 9);
    return { k: ['linf', a, b], e: `Calcule lim (${a}x ${b >= 0 ? '+ ' + b : '− ' + -b}) quand x → +∞. (Réponds : +infini ou un nombre)`, r: "+infini|infini", i1: "Le terme dominant est ax.", i2: `${a}x devient très grand.`, x: "lim = +∞. ✅" };
  }),
  limiteZero: gen(999, () => {
    const k = ri(2, 5), n = ri(1, k);
    return { k: ['lz', k, n], e: `Calcule lim 1/x${n > 1 ? sup(n) : ''} quand x → +∞.`, r: "0", i1: "On divise 1 par un nombre de plus en plus grand.", i2: "1/10, 1/100, 1/1000... → 0.", x: "lim = 0. ✅" };
  }),
  limiteRatio: gen(999, () => {
    const k = ri(2, 9), c = ri(1, 9), a = k * c;
    return { k: ['lr', a, c], e: `Calcule lim (${a}x² + 1)/(${c}x² + x) quand x → +∞.`, r: String(k), i1: "Compare les termes de plus haut degré.", i2: `En +∞, se comporte comme ${a}x²/${c}x².`, x: `lim = ${a}/${c} = ${k}. ✅` };
  }),
  factorielle: gen(999, () => {
    const n = ri(3, 6);
    let f = 1; for (let j = 2; j <= n; j++) f *= j;
    return { k: ['fa2', n], e: `Calcule ${n}! (factorielle de ${n}).`, r: String(f), i1: "n! = n×(n−1)×...×1.", i2: `${n}! = ${Array.from({ length: n }, (_, j) => n - j).join('×')}.`, x: `${n}! = ${f}. ✅` };
  }),
  combinaison2: gen(999, () => {
    const n = ri(4, 15);
    return { k: ['c2', n], e: `Calcule C(${n} ; 2).`, r: String(n * (n - 1) / 2), i1: "C(n ; 2) = n(n−1)/2.", i2: `${n}×${n - 1}/2.`, x: `C(${n} ; 2) = ${n * (n - 1) / 2}. ✅` };
  }),
  arrangement3: gen(999, () => {
    const n = ri(4, 9);
    return { k: ['a3', n], e: `Une course compte ${n} coureurs. Combien de podiums possibles DANS L'ORDRE (3 premiers) ?`, r: String(n * (n - 1) * (n - 2)), i1: "C'est un arrangement : n×(n−1)×(n−2).", i2: `${n}×${n - 1}×${n - 2}.`, x: `${n * (n - 1) * (n - 2)} podiums. ✅` };
  }),
  primitiveVal: gen(999, () => {
    const n = ri(1, 4), c = ri(1, 5), k = ri(1, 4);
    const co = (n + 1) * c;
    return { k: ['pv', n, c, k], e: `f(x) = ${co}x${n > 1 ? sup(n) : ''} et F est la primitive de f qui s'annule en 0. Calcule F(${k}).`, r: String(c * k ** (n + 1)), i1: `Une primitive de x${n > 1 ? sup(n) : ''} est x${sup(n + 1)}/${n + 1}.`, i2: `F(x) = ${c}x${sup(n + 1)}.`, x: `F(${k}) = ${c}×${k}${sup(n + 1)} = ${c * k ** (n + 1)}. ✅` };
  }),
  baryMasse: gen(999, () => {
    const a = ri(1, 6), b = ri(1, 6), c = ri(1, 6);
    return { k: ['bm', a, b, c], e: `G est le barycentre de (A ; ${a}), (B ; ${b}) et (C ; ${c}). Calcule la masse totale.`, r: String(a + b + c), i1: "Somme des coefficients.", i2: `${a} + ${b} + ${c}.`, x: `Masse totale = ${a + b + c}. ✅` };
  }),
  complexeMod: gen(999, () => {
    const t = pick(TRIPLES), s = ri(1, 2);
    const [a, b, n] = [t[0] * s, t[1] * s, t[2] * s];
    const sa = rnd() < 0.3 ? -a : a, sb = rnd() < 0.3 ? -b : b;
    return { k: ['cm', sa, sb], e: `Calcule le module du nombre complexe z = ${sa} ${sb >= 0 ? '+ ' + sb : '− ' + -sb}i.`, r: String(n), i1: "|z| = √(a² + b²).", i2: `√(${sa * sa} + ${sb * sb}) = √${sa * sa + sb * sb}.`, x: `|z| = ${n}. ✅` };
  }),
  complexeRe: gen(999, () => {
    const a = ri(-9, 9), b = ri(-9, 9), c = ri(-9, 9), d = ri(-9, 9);
    return { k: ['cr', a, b, c, d], e: `Calcule la partie réelle de (${a} ${b >= 0 ? '+ ' + b : '− ' + -b}i) + (${c} ${d >= 0 ? '+ ' + d : '− ' + -d}i).`, r: String(a + c), i1: "Additionne les parties réelles entre elles.", i2: `${a} + (${c}).`, x: `Partie réelle = ${a + c}. (Partie imaginaire : ${b + d}i.) ✅` };
  }),
  iPuiss: gen(999, () => {
    const n = ri(2, 9);
    const cycle = { 0: '1', 1: 'i', 2: '-1', 3: '-i' };
    const r = cycle[n % 4];
    return { k: ['ip', n], e: `Calcule i${sup(n)}.`, r: r, i1: "Les puissances de i sont cycliques de période 4 : i, −1, −i, 1.", i2: `Regarde le reste de ${n} dans la division par 4.`, x: `${n} = 4×${Math.floor(n / 4)} + ${n % 4}, donc i${sup(n)} = ${r}. ✅` };
  }),
  lnExp: gen(999, () => {
    const kind = ri(1, 5);
    if (kind === 1) { const k = ri(-5, 8); return { k: ['le1', k], e: `Calcule ln(e${k >= 0 ? sup(k) : sup(k)}).`, r: String(k), i1: "ln(eˣ) = x.", i2: "Les fonctions ln et exp sont réciproques.", x: `ln(e${sup(k)}) = ${k}. ✅` }; }
    if (kind === 2) { const k = ri(2, 15); return { k: ['le2', k], e: `Calcule e^(ln ${k}).`, r: String(k), i1: "e^(ln x) = x.", i2: "Les fonctions se compensent.", x: `e^(ln ${k}) = ${k}. ✅` }; }
    if (kind === 3) { const a = ri(2, 4); return { k: ['le3', a], e: `Calcule ln(1).`, r: "0", i1: "Cherche la puissance de e qui vaut 1.", i2: "e⁰ = 1.", x: "ln(1) = 0. ✅" }; }
    if (kind === 4) { const a = ri(2, 5), b = ri(2, 3); return { k: ['le4', a, b], e: `(e${sup(a)})${sup(b)} = eⁿ. Quelle est la valeur de n ?`, r: String(a * b), i1: "(aᵐ)ⁿ = aᵐⁿ.", i2: `${a} × ${b}.`, x: `(e${sup(a)})${sup(b)} = e${sup(a * b)}, n = ${a * b}. ✅` }; }
    const a = ri(2, 5), b = ri(2, 4); return { k: ['le5', a, b], e: `e${sup(a)} × e${sup(b)} = eⁿ. Quelle est la valeur de n ?`, r: String(a + b), i1: "aᵐ × aⁿ = aᵐ⁺ⁿ.", i2: `${a} + ${b}.`, x: `n = ${a + b}. ✅` };
  }),
  lnPuissance: gen(999, () => {
    const a = pick([2, 3, 5]), k = ri(2, 5);
    return { k: ['lp', a, k], e: `ln(${a ** k}) = k·ln(${a}). Quelle est la valeur de k ?`, r: String(k), i1: `${a ** k} est une puissance de ${a}.`, i2: `${a ** k} = ${a}${sup(k)}.`, x: `ln(${a ** k}) = ${k}·ln(${a}), donc k = ${k}. ✅` };
  }),
  integralePoly: gen(999, () => {
    const n = ri(1, 3), c = ri(1, 5), m = ri(1, 4);
    const co = (n + 1) * c;
    return { k: ['in', n, c, m], e: `Calcule ∫₀${m === 1 ? '¹' : m === 2 ? '²' : m === 3 ? '³' : '⁴'} ${co}x${n > 1 ? sup(n) : ''} dx.`, r: String(c * m ** (n + 1)), i1: `Une primitive de x${n > 1 ? sup(n) : ''} est x${sup(n + 1)}/${n + 1}.`, i2: `Primitive : ${c}x${sup(n + 1)}. Évalue entre 0 et ${m}.`, x: `∫ = ${c}×${m}${sup(n + 1)} = ${c * m ** (n + 1)}. ✅` };
  }),
  integraleUn: gen(999, () => {
    const n = ri(1, 5);
    return { k: ['iu', n], e: `Calcule ∫₀¹ x${n > 1 ? sup(n) : ''} dx (fraction irréductible).`, r: `1/${n + 1}`, i1: `Primitive de x${n > 1 ? sup(n) : ''} : x${sup(n + 1)}/${n + 1}.`, i2: `(1${sup(n + 1)} − 0)/${n + 1}.`, x: `∫₀¹ x${sup(n)} dx = 1/${n + 1}. ✅` };
  }),
  equaDiffK: gen(999, () => {
    const a = ri(-6, 6) || 3;
    return { k: ['edk', a], e: `y' = ${a}y a pour solutions y = Ce^(kx). Quelle est la valeur de k ?`, r: String(a), i1: "Injecte y = Ce^(kx) : y' = kCe^(kx) = ky.", i2: `ky = ${a}y donne k = ${a}.`, x: `k = ${a}. ✅` };
  }),
  equaDiffC: gen(999, () => {
    const a = ri(1, 5), C = ri(1, 9);
    return { k: ['edc', a, C], e: `y' = ${a}y avec y(0) = ${C}. La solution est y = Ce^(${a}x). Quelle est la valeur de la constante C ?`, r: String(C), i1: "Remplace x par 0.", i2: `y(0) = C·e⁰ = C.`, x: `C = ${C}. ✅` };
  }),
  probaDes: gen(999, () => {
    const s = pick([2, 6, 7, 8, 12]);
    const favorables = { 2: 1, 6: 5, 7: 6, 8: 5, 12: 1 }[s];
    return { k: ['pd2', s], e: `On lance 2 dés équilibrés. Calcule P(la somme = ${s}) (fraction irréductible).`, r: frac(favorables, 36), i1: "Compte les couples favorables parmi 36.", i2: `${favorables} cas favorables.`, x: `P = ${favorables}/36 = ${frac(favorables, 36)}. ✅` };
  }),
  probaUrne: gen(999, () => {
    const r = ri(1, 9), b = ri(1, 9);
    return { k: ['pu', r, b], e: `Une urne contient ${r} boules rouges et ${b} boules bleues. Calcule P(tirer une boule rouge) (fraction irréductible).`, r: frac(r, r + b), i1: "Cas favorables ÷ cas possibles.", i2: `${r} rouges sur ${r + b} boules.`, x: `P = ${frac(r, r + b)}. ✅` };
  }),
  probaUnion: gen(999, () => {
    const p1 = ri(1, 8) / 10, p2 = ri(1, 9 - p1 * 10 + 1) / 10, p12 = ri(1, Math.min(p1, p2) * 10) / 10;
    const res = Math.round((p1 + p2 - p12) * 10) / 10;
    return { k: ['pun', p1, p2, p12], e: `P(A) = ${p1} ; P(B) = ${p2} ; P(A∩B) = ${p12}. Calcule P(A∪B). (Décimal, ex : 0.8)`, r: String(res), i1: "P(A∪B) = P(A) + P(B) − P(A∩B).", i2: `${p1} + ${p2} − ${p12}.`, x: `P(A∪B) = ${res}. ✅` };
  }),
  esperance2: gen(999, () => {
    const v = ri(2, 10) * 2;
    return { k: ['es2', v], e: `X vaut 0 avec probabilité 0,5 et ${v} avec probabilité 0,5. Calcule E(X).`, r: String(v / 2), i1: "E(X) = Σ pᵢxᵢ.", i2: `0×0,5 + ${v}×0,5.`, x: `E(X) = ${v / 2}. ✅` };
  }),
  modEnt: gen(999, () => {
    const b = ri(3, 9), q = ri(3, 12), r = ri(0, b - 1);
    const a = b * q + r;
    return { k: ['me', a, b], e: `Quel est le reste de la division euclidienne de ${a} par ${b} ?`, r: String(r), i1: `Cherche le plus grand multiple de ${b} ≤ ${a}.`, i2: `${a} = ${b}×${q} + ${r}.`, x: `Reste = ${r}. ✅` };
  }),
  partieEnt: gen(999, () => {
    const a = ri(0, 50), d = ri(1, 9);
    return { k: ['pe', a, d], e: `Quelle est la partie entière de ${a},${d} ?`, r: String(a), i1: "Plus grand entier ≤ au nombre.", i2: `${a} ≤ ${a},${d} < ${a + 1}.`, x: `Partie entière = ${a}. ✅` };
  }),
  sommeEntiers: gen(999, () => {
    const n = ri(5, 40);
    return { k: ['se', n], e: `Calcule la somme 1 + 2 + 3 + ... + ${n}.`, r: String(n * (n + 1) / 2), i1: "Formule : n(n+1)/2.", i2: `${n}×${n + 1}/2.`, x: `Somme = ${n * (n + 1) / 2}. ✅` };
  }),
  sommeGeo2: gen(999, () => {
    const k = ri(3, 6);
    let s = 0, termes = [];
    for (let j = 0; j <= k; j++) { s += 2 ** j; termes.push(j === 0 ? '1' : '2' + (j > 1 ? sup(j) : '')); }
    return { k: ['sg2', k], e: `Calcule la somme géométrique ${termes.join(' + ')}.`, r: String(s), i1: "Somme des puissances de 2 : 2ⁿ⁺¹ − 1.", i2: `2${sup(k + 1)} − 1.`, x: `Somme = ${s}. ✅` };
  }),
  suiteLimiteQ: gen(999, () => {
    const d = ri(2, 6), kind = ri(0, 1);
    if (kind === 0) return { k: ['slq', d, 0], e: `Soit q = 1/${d}. Calcule lim qⁿ quand n → +∞.`, r: "0", i1: "|q| < 1.", i2: "Les puissances successives tendent vers 0.", x: "lim = 0. ✅" };
    return { k: ['slq', d, 1], e: `Soit q = 1/${d}. Calcule lim ${d}ⁿ quand n → +∞. (Réponds : +infini ou un nombre)`, r: "+infini|infini", i1: "q > 1.", i2: "Les puissances croissent sans borne.", x: "lim = +∞. ✅" };
  }),
  simRapport: gen(999, () => {
    const a = ri(2, 6), b = ri(2, 6);
    return { k: ['sr', a, b], e: `On compose deux homothéties de rapports ${a} et ${b}. Quel est le rapport de la composée ?`, r: String(a * b), i1: "Les rapports se multiplient.", i2: `${a} × ${b}.`, x: `Rapport = ${a * b}. ✅` };
  }),
  simAngle: gen(999, () => {
    const a = ri(1, 5), b = ri(1, 5);
    if (a + b > 11) return null;
    return { k: ['sa3', a, b], e: `On compose deux rotations de même centre, d'angles ${30 * a}° et ${30 * b}°. Quel est l'angle de la composée (en degrés) ?`, r: String(30 * (a + b)), i1: "Les angles s'additionnent (même centre).", i2: `${30 * a} + ${30 * b}.`, x: `Angle = ${30 * (a + b)}°. ✅` };
  }),
  coniqueA: gen(999, () => {
    const a = ri(2, 12), b = ri(1, a - 1);
    return { k: ['ca', a, b], e: `Ellipse : x²/${a * a} + y²/${b * b} = 1. Calcule le demi-grand axe a.`, r: String(a), i1: "a² est le plus grand dénominateur.", i2: `a² = ${a * a}.`, x: `a = ${a}. ✅` };
  }),
  trigoVal: gen(999, () => {
    const t = pick([
      ["cos(π/3)", "0.5|1/2", "Pense à 60°."],
      ["sin(π/6)", "0.5|1/2", "Pense à 30°."],
      ["tan(π/4)", "1", "Pense à 45°."],
      ["sin(π/2)", "1", "90° : point haut du cercle."],
      ["cos(π)", "-1", "180°."],
      ["cos(0)", "1", "0°."],
      ["sin(0)", "0", "0°."],
      ["tan(0)", "0", "0°."]
    ]);
    return { k: ['tv', t[0]], e: `Quelle est la valeur exacte de ${t[0]} ? (Décimal ou fraction)`, r: t[1], i1: t[2], i2: "Utilise le cercle trigonométrique.", x: `${t[0]} = ${t[1].split('|')[0]}. ✅` };
  }),
  angleScalaire: gen(999, () => {
    const t = pick([
      ["u→(1 ; 0) et v→(1 ; √3)", "60", "cos θ = 1/2"],
      ["u→(1 ; 0) et v→(0 ; 1)", "90", "Produit scalaire nul"],
      ["u→(1 ; 0) et v→(−1 ; √3)", "120", "cos θ = −1/2"],
      ["u→(1 ; 0) et v→(√3 ; 1)", "30", "cos θ = √3/2"]
    ]);
    return { k: ['as', t[0]], e: `Quel est l'angle (en degrés) entre ${t[0]} ?`, r: t[1], i1: "cos θ = (u→·v→)/(‖u→‖·‖v→‖).", i2: t[2] + ".", x: `θ = ${t[1]}°. ✅` };
  })
};

// ============================================================
// GÉNÉRATEURS PHYSIQUE-CHIMIE
// ============================================================
const P = {
  fma: gen(999, () => {
    const m = ri(1, 20), a = ri(1, 10);
    return { k: ['fma', m, a], e: `Un objet de masse ${m} kg subit une accélération de ${a} m/s². Calcule la force résultante en newtons.`, r: String(m * a), i1: "2ᵉ loi de Newton : F = m×a.", i2: `${m} × ${a}.`, x: `F = ${m * a} N. ✅` };
  }),
  poids: gen(999, () => {
    const m = ri(1, 50);
    return { k: ['pmg', m], e: `Calcule le poids d'un objet de masse ${m} kg (on prend g = 10 N/kg). Réponse en newtons.`, r: String(m * 10), i1: "P = m×g.", i2: `${m} × 10.`, x: `P = ${m * 10} N. ✅` };
  }),
  pressionFS: gen(999, () => {
    const S = ri(1, 10), p = ri(2, 60), F = S * p;
    return { k: ['pfs', F, S], e: `Une force de ${F} N s'exerce sur une surface de ${S} m². Calcule la pression en pascals.`, r: String(p), i1: "P = F/S.", i2: `${F}/${S}.`, x: `P = ${p} Pa. ✅` };
  }),
  pressionRho: gen(999, () => {
    const h = ri(1, 12);
    return { k: ['prh', h], e: `Calcule la pression au fond d'un lac : ρ = 1000 kg/m³, g = 10 N/kg, h = ${h} m. Réponse en pascals.`, r: String(10000 * h), i1: "P = ρ×g×h.", i2: `1000 × 10 × ${h}.`, x: `P = ${10000 * h} Pa. ✅` };
  }),
  ohmU: gen(999, () => {
    const R = ri(2, 30), I = ri(1, 6);
    return { k: ['ohu', R, I], e: `R = ${R} Ω et I = ${I} A. Calcule la tension U en volts.`, r: String(R * I), i1: "Loi d'Ohm : U = R×I.", i2: `${R} × ${I}.`, x: `U = ${R * I} V. ✅` };
  }),
  ohmR: gen(999, () => {
    const I = ri(1, 6), R = ri(2, 30), U = R * I;
    return { k: ['ohr', U, I], e: `U = ${U} V et I = ${I} A. Calcule la résistance R en ohms.`, r: String(R), i1: "R = U/I.", i2: `${U}/${I}.`, x: `R = ${R} Ω. ✅` };
  }),
  serieR: gen(999, () => {
    const r1 = ri(2, 40), r2 = ri(2, 40);
    return { k: ['ser', r1, r2], e: `Deux résistances R₁ = ${r1} Ω et R₂ = ${r2} Ω sont montées en SÉRIE. Calcule la résistance équivalente.`, r: String(r1 + r2), i1: "En série, les résistances s'additionnent.", i2: `${r1} + ${r2}.`, x: `R = ${r1 + r2} Ω. ✅` };
  }),
  parallelR: gen(999, () => {
    const t = pick([[6, 3, 2], [12, 4, 3], [10, 10, 5], [20, 5, 4], [12, 6, 4], [24, 8, 6], [15, 10, 6], [30, 6, 5], [8, 8, 4], [9, 18, 6], [10, 40, 8], [12, 36, 9], [15, 60, 12], [16, 48, 12], [40, 8, 20 / 3]]);
    if (!Number.isInteger(t[2])) return null;
    return { k: ['par', t[0], t[1]], e: `Deux résistances R₁ = ${t[0]} Ω et R₂ = ${t[1]} Ω sont montées en PARALLÈLE. Calcule la résistance équivalente.`, r: String(t[2]), i1: "R = R₁R₂/(R₁+R₂).", i2: `(${t[0]}×${t[1]})/(${t[0]}+${t[1]}).`, x: `R = ${t[2]} Ω. ✅` };
  }),
  periodeFreq: gen(999, () => {
    const f = pick([2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 125, 200, 250, 500]);
    return { k: ['pf', f], e: `Une tension périodique a une fréquence de ${f} Hz. Calcule sa période en secondes (ex : 0.005).`, r: String(1 / f), i1: "T = 1/f.", i2: `1/${f}.`, x: `T = ${1 / f} s. ✅` };
  }),
  neutrons: gen(999, () => {
    const Z = ri(1, 30), N = ri(1, 30), A = Z + N;
    return { k: ['ne', A, Z], e: `Un noyau a A = ${A} et Z = ${Z}. Calcule son nombre de neutrons.`, r: String(N), i1: "N = A − Z.", i2: `${A} − ${Z}.`, x: `N = ${N} neutrons. ✅` };
  }),
  moleNM: gen(999, () => {
    const M = pick([12, 16, 18, 28, 32, 44]), n = ri(1, 5), m = M * n;
    return { k: ['mnm', m, M], e: `Un échantillon de masse ${m} g a une masse molaire M = ${M} g/mol. Calcule la quantité de matière en moles.`, r: String(n), i1: "n = m/M.", i2: `${m}/${M}.`, x: `n = ${n} mol. ✅` };
  }),
  vitesseDT: gen(999, () => {
    const t = ri(1, 6), v = ri(10, 130), d = t * v;
    return { k: ['vdt', d, t], e: `Un mobile parcourt ${d} km en ${t} h. Calcule sa vitesse moyenne en km/h.`, r: String(v), i1: "v = d/t.", i2: `${d}/${t}.`, x: `v = ${v} km/h. ✅` };
  }),
  convKmh: gen(999, () => {
    const v = pick([18, 36, 54, 72, 90, 108, 126, 144]);
    return { k: ['ck', v], e: `Convertis ${v} km/h en m/s.`, r: String(v / 3.6), i1: "Divise par 3,6.", i2: `${v}/3,6.`, x: `${v / 3.6} m/s. ✅` };
  }),
  qdmMV: gen(999, () => {
    const m = ri(1, 12), v = ri(1, 10);
    return { k: ['qdm', m, v], e: `Calcule la quantité de mouvement p = mv avec m = ${m} kg et v = ${v} m/s (en kg·m/s).`, r: String(m * v), i1: "p = m×v.", i2: `${m}×${v}.`, x: `p = ${m * v} kg·m/s. ✅` };
  }),
  travailFD: gen(999, () => {
    const F = ri(2, 40), d = ri(1, 15);
    return { k: ['tfd', F, d], e: `Une force de ${F} N déplace son point d'application de ${d} m dans son sens. Calcule le travail en joules.`, r: String(F * d), i1: "W = F×d.", i2: `${F}×${d}.`, x: `W = ${F * d} J. ✅` };
  }),
  puissanceWT: gen(999, () => {
    const t = ri(2, 20), p2 = ri(2, 60), W = t * p2;
    return { k: ['pwt', W, t], e: `Un moteur fournit ${W} J en ${t} s. Calcule sa puissance en watts.`, r: String(p2), i1: "P = W/t.", i2: `${W}/${t}.`, x: `P = ${p2} W. ✅` };
  }),
  ecin: gen(999, () => {
    const m = pick([2, 4, 6, 8, 10]), v = pick([2, 4, 6]);
    return { k: ['ec', m, v], e: `Calcule l'énergie cinétique Ec = ½mv² avec m = ${m} kg et v = ${v} m/s (en joules).`, r: String(m * v * v / 2), i1: "Ec = ½×m×v².", i2: `0,5 × ${m} × ${v * v}.`, x: `Ec = ${m * v * v / 2} J. ✅` };
  }),
  epot: gen(999, () => {
    const m = ri(1, 15), h = ri(1, 12);
    return { k: ['ep', m, h], e: `Calcule l'énergie potentielle Ep = mgh avec m = ${m} kg, g = 10 N/kg, h = ${h} m (en joules).`, r: String(m * 10 * h), i1: "Ep = m×g×h.", i2: `${m}×10×${h}.`, x: `Ep = ${m * 10 * h} J. ✅` };
  }),
  emEcEp: gen(999, () => {
    const Ec = ri(2, 20) * 5, Ep = ri(2, 20) * 5;
    return { k: ['em', Ec, Ep], e: `Un solide a Ec = ${Ec} J et Ep = ${Ep} J. Calcule son énergie mécanique en joules.`, r: String(Ec + Ep), i1: "Em = Ec + Ep.", i2: `${Ec} + ${Ep}.`, x: `Em = ${Ec + Ep} J. ✅` };
  }),
  energieUIt: gen(999, () => {
    const U = ri(2, 20), I = ri(1, 6), t = ri(2, 20);
    return { k: ['eit', U, I, t], e: `Calcule l'énergie E = UIt avec U = ${U} V, I = ${I} A, t = ${t} s (en joules).`, r: String(U * I * t), i1: "E = U×I×t.", i2: `${U}×${I}×${t}.`, x: `E = ${U * I * t} J. ✅` };
  }),
  moteurU: gen(999, () => {
    const E2 = ri(2, 12), r = ri(1, 4), I = ri(1, 6);
    return { k: ['mu', E2, r, I], e: `Un moteur (fcem E' = ${E2} V, résistance r = ${r} Ω) est traversé par I = ${I} A. Calcule la tension U = E' + rI en volts.`, r: String(E2 + r * I), i1: "Pour un récepteur : U = E' + rI.", i2: `${E2} + ${r}×${I}.`, x: `U = ${E2 + r * I} V. ✅` };
  }),
  condE: gen(999, () => {
    const C = ri(1, 6), U = pick([2, 4, 6, 8]);
    if ((C * U * U) % 2 !== 0) return null;
    return { k: ['ce', C, U], e: `Calcule l'énergie stockée E = ½CU² avec C = ${C} F et U = ${U} V (en joules).`, r: String(C * U * U / 2), i1: "E = ½CU².", i2: `0,5 × ${C} × ${U * U}.`, x: `E = ${C * U * U / 2} J. ✅` };
  }),
  vergence: gen(999, () => {
    const t = pick([[0.5, 2], [0.25, 4], [0.2, 5], [0.1, 10], [0.05, 20], [2, 0.5], [4, 0.25]]);
    return { k: ['vg', t[0]], e: `Une lentille convergente a une distance focale f = ${t[0]} m. Calcule sa vergence en dioptries.`, r: String(t[1]), i1: "V = 1/f.", i2: `1/${t[0]}.`, x: `V = ${t[1]} δ. ✅` };
  }),
  indiceCV: gen(999, () => {
    const t = pick([["2×10⁸", 1.5], ["1×10⁸", 3], ["1,5×10⁸", 2], ["2,5×10⁸", 1.2]]);
    return { k: ['icv', t[0]], e: `L'indice de réfraction n = c/v avec c = 3×10⁸ m/s. Si v = ${t[0]} m/s, calcule n.`, r: String(t[1]), i1: "n = c/v.", i2: "(3×10⁸)/(" + t[0] + ").", x: `n = ${t[1]}. ✅` };
  }),
  alcaneH: gen(999, () => {
    const n = ri(1, 8);
    return { k: ['al', n], e: `Un alcane suit la formule CₙH₂ₙ₊₂. Combien d'atomes d'hydrogène pour n = ${n} ?`, r: String(2 * n + 2), i1: "Applique H = 2n + 2.", i2: `2×${n} + 2.`, x: `C${n}H${2 * n + 2}. ✅` };
  }),
  alceneH: gen(999, () => {
    const n = ri(2, 8);
    return { k: ['ae', n], e: `Un alcène suit la formule CₙH₂ₙ. Combien d'atomes d'hydrogène pour n = ${n} ?`, r: String(2 * n), i1: "Applique H = 2n.", i2: `2×${n}.`, x: `C${n}H${2 * n}. ✅` };
  }),
  electronsRedox: gen(999, () => {
    const t = pick([["Cu²⁺ + ne⁻ → Cu", 2], ["Al³⁺ + ne⁻ → Al", 3], ["Fe³⁺ + ne⁻ → Fe", 3], ["Zn²⁺ + ne⁻ → Zn", 2], ["Ag⁺ + ne⁻ → Ag", 1]]);
    return { k: ['er', t[0]], e: `Combien d'électrons sont échangés dans la demi-équation : ${t[0]} ?`, r: String(t[1]), i1: "Compte la charge à équilibrer.", i2: "Le coefficient devant e⁻.", x: `${t[1]} électron(s). ✅` };
  }),
  momentFd: gen(999, () => {
    const F = ri(2, 30), d = pick([0.5, 1, 1.5, 2, 2.5, 3]);
    return { k: ['mf', F, d], e: `Une force de ${F} N s'applique à ${d} m de l'axe de rotation. Calcule le moment en N·m.`, r: String(F * d), i1: "M = F×d.", i2: `${F}×${d}.`, x: `M = ${F * d} N·m. ✅` };
  }),
  equilibreF: gen(999, () => {
    const M = ri(2, 40), d = pick([0.2, 0.25, 0.4, 0.5, 1, 2]);
    const F = M / d;
    if (!Number.isInteger(F)) return null;
    return { k: ['ef', M, d], e: `Un moment moteur de ${M} N·m est équilibré par une force F appliquée à ${d} m de l'axe. Calcule F en newtons.`, r: String(F), i1: "À l'équilibre : M = F×d.", i2: `F = ${M}/${d}.`, x: `F = ${F} N. ✅` };
  }),
  cinVat: gen(999, () => {
    const v0 = ri(0, 10), a = ri(1, 8), t = ri(1, 6);
    return { k: ['vat', v0, a, t], e: `v = v₀ + at avec v₀ = ${v0} m/s, a = ${a} m/s², t = ${t} s. Calcule v en m/s.`, r: String(v0 + a * t), i1: "La vitesse croît linéairement.", i2: `${v0} + ${a}×${t}.`, x: `v = ${v0 + a * t} m/s. ✅` };
  }),
  cinXat: gen(999, () => {
    const a = ri(1, 4) * 2, t = ri(1, 4);
    return { k: ['xat', a, t], e: `Un mobile part du repos avec a = ${a} m/s². Calcule la distance parcourue x = ½at² après ${t} s (en mètres).`, r: String(a * t * t / 2), i1: "x = ½×a×t².", i2: `0,5 × ${a} × ${t * t}.`, x: `x = ${a * t * t / 2} m. ✅` };
  }),
  chuteV: gen(999, () => {
    const t = ri(1, 6);
    return { k: ['chv', t], e: `Chute libre sans vitesse initiale : v = gt avec g = 10 m/s² et t = ${t} s. Calcule v en m/s.`, r: String(10 * t), i1: "v = g×t.", i2: `10 × ${t}.`, x: `v = ${10 * t} m/s. ✅` };
  }),
  chuteH: gen(999, () => {
    const t = ri(1, 5);
    return { k: ['chh', t], e: `Chute libre sans vitesse initiale : h = ½gt² avec g = 10 m/s² et t = ${t} s. Calcule h en mètres.`, r: String(5 * t * t), i1: "h = ½gt².", i2: `0,5 × 10 × ${t * t}.`, x: `h = ${5 * t * t} m. ✅` };
  }),
  champEUd: gen(999, () => {
    const d = ri(1, 10), E = ri(2, 60), U = d * E;
    return { k: ['eud', U, d], e: `Entre deux plaques distantes de ${d} m, on applique U = ${U} V. Calcule le champ E = U/d en V/m.`, r: String(E), i1: "E = U/d.", i2: `${U}/${d}.`, x: `E = ${E} V/m. ✅` };
  }),
  forceQE: gen(999, () => {
    const q = ri(1, 5), E = ri(2, 20);
    return { k: ['fqe', q, E], e: `F = qE avec q = ${q} C et E = ${E} V/m. Calcule F en newtons.`, r: String(q * E), i1: "Force électrique.", i2: `${q}×${E}.`, x: `F = ${q * E} N. ✅` };
  }),
  freqFT: gen(999, () => {
    const f = pick([2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 125, 200, 250, 500]);
    return { k: ['fft', f], e: `Un phénomène périodique a une période T = ${1 / f} s. Calcule la fréquence en hertz.`, r: String(f), i1: "f = 1/T.", i2: `1/${1 / f}.`, x: `f = ${f} Hz. ✅` };
  }),
  vitesseLF: gen(999, () => {
    const l = ri(1, 8), f = ri(2, 20);
    return { k: ['vlf', l, f], e: `Une onde a λ = ${l} m et f = ${f} Hz. Calcule sa vitesse v = λf en m/s.`, r: String(l * f), i1: "v = λ×f.", i2: `${l}×${f}.`, x: `v = ${l * f} m/s. ✅` };
  }),
  laplaceBIL: gen(999, () => {
    const B = ri(1, 4), I = ri(1, 5), L = pick([0.5, 1, 1.5, 2, 4]);
    return { k: ['bil', B, I, L], e: `F = BIL avec B = ${B} T, I = ${I} A, L = ${L} m. Calcule F en newtons.`, r: String(B * I * L), i1: "Force de Laplace.", i2: `${B}×${I}×${L}.`, x: `F = ${B * I * L} N. ✅` };
  }),
  lorentzQVB: gen(999, () => {
    const q = ri(1, 3), v = ri(1, 5), B = ri(1, 6);
    return { k: ['qvb', q, v, B], e: `F = qvB (v ⊥ B) avec q = ${q} C, v = ${v} m/s, B = ${B} T. Calcule F en newtons.`, r: String(q * v * B), i1: "Force de Lorentz.", i2: `${q}×${v}×${B}.`, x: `F = ${q * v * B} N. ✅` };
  }),
  demiVieMasse: gen(999, () => {
    const k = ri(1, 4), reste = ri(2, 50);
    const m = reste * 2 ** k;
    const annees = ri(2, 10), t12 = annees / 1;
    return { k: ['dvm', reste, k], e: `Un isotope a une demi-vie de ${annees} ans. On part de ${m} g. Quelle masse reste-t-il après ${annees * k} ans ?`, r: String(reste), i1: `${annees * k} ans = combien de demi-vies ?`, i2: `${k} demi-vies : divise ${k} fois par 2.`, x: `${m} → ${m / 2} → ... → ${reste} g. ✅` };
  }),
  phFort: gen(999, () => {
    const k = ri(1, 5);
    return { k: ['phf', k], e: `Acide fort : [H⁺] = 10⁻${k} mol/L. Calcule le pH.`, r: String(k), i1: "pH = −log[H⁺].", i2: `−log(10⁻${k}) = ${k}.`, x: `pH = ${k}. ✅` };
  }),
  phBase: gen(999, () => {
    const k = ri(1, 4);
    return { k: ['phb', k], e: `Base forte : [OH⁻] = 10⁻${k} mol/L. Calcule le pH (pKe = 14).`, r: String(14 - k), i1: "pH = 14 − pOH.", i2: `pOH = ${k}, donc pH = 14 − ${k}.`, x: `pH = ${14 - k}. ✅` };
  }),
  impedanceZ: gen(999, () => {
    const t = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [12, 16, 20]]);
    const s = ri(1, 3);
    return { k: ['imz', t[0] * s, t[1] * s], e: `Circuit RLC série : R = ${t[0] * s} Ω et X_L = ${t[1] * s} Ω. Calcule l'impédance Z = √(R² + X_L²) en ohms.`, r: String(t[2] * s), i1: "Triangle d'impédance.", i2: `√(${(t[0] * s) ** 2} + ${(t[1] * s) ** 2}) = √${(t[0] * s) ** 2 + (t[1] * s) ** 2}.`, x: `Z = ${t[2] * s} Ω. ✅` };
  }),
  uniteQ: gen(999, () => {
    const t = pick([
      ["la force", "newton|le newton|n|N"], ["la pression", "pascal|le pascal|pa|Pa"],
      ["l'énergie", "joule|le joule|j|J"], ["la puissance", "watt|le watt|w|W"],
      ["la tension électrique", "volt|le volt|v|V"], ["l'intensité du courant", "ampere|ampère|l'ampere|l'ampère|a|A"],
      ["la résistance électrique", "ohm|l'ohm|ω|Ω"], ["la fréquence", "hertz|le hertz|hz|Hz"],
      ["le champ magnétique", "tesla|le tesla|t|T"], ["la capacité d'un condensateur", "farad|le farad|f|F"],
      ["la charge électrique", "coulomb|le coulomb|c|C"], ["la quantité de matière", "mole|la mole|mol"],
      ["la vergence d'une lentille", "dioptrie|la dioptrie|δ"], ["le moment d'une force", "newton-metre|newton-mètre|le newton-metre|le newton-mètre|nm|N·m"]
    ]);
    return { k: ['uq', t[0]], e: `Quelle est l'unité de ${t[0]} (nom ou symbole) ?`, r: t[1], i1: "Une unité du Système International.", i2: "Rappelle-toi le symbole utilisé dans les formules.", x: `L'unité de ${t[0]} est le ${t[1].split('|')[0]}. ✅` };
  }),
  symboleQ: gen(999, () => {
    const t = pick([
      ["Fe", "fer|le fer"], ["Cu", "cuivre|le cuivre"], ["Na", "sodium|le sodium"], ["Cl", "chlore|le chlore"],
      ["O", "oxygene|oxygène|l'oxygene|l'oxygène"], ["H", "hydrogene|hydrogène|l'hydrogene|l'hydrogène"],
      ["C", "carbone|le carbone"], ["N", "azote|l'azote"], ["S", "soufre|le soufre"],
      ["Ca", "calcium|le calcium"], ["Al", "aluminium|l'aluminium"], ["K", "potassium|le potassium"],
      ["Ag", "argent|l'argent"], ["Au", "or|l'or"], ["He", "helium|hélium|l'helium|l'hélium"],
      ["Zn", "zinc|le zinc"], ["Mg", "magnesium|magnésium|le magnesium|le magnésium"], ["U", "uranium|l'uranium"]
    ]);
    if (rnd() < 0.5) return { k: ['sq1', t[0]], e: `Quel élément chimique correspond au symbole ${t[0]} ?`, r: t[1], i1: "Tableau périodique.", i2: "Nom français de l'élément.", x: `${t[0]} = ${t[1].split('|')[0]}. ✅` };
    return { k: ['sq2', t[0]], e: `Quel est le symbole chimique de : ${t[1].split('|')[0]} ?`, r: t[0] + '|' + t[0].toLowerCase(), i1: "Une ou deux lettres.", i2: "La première est toujours une majuscule.", x: `Le symbole est ${t[0]}. ✅` };
  }),
  liaisonCount: gen(999, () => {
    const t = pick([["H₂O (l'oxygène)", 2], ["CH₄ (le carbone)", 4], ["NH₃ (l'azote)", 3], ["CO₂ (le carbone)", 2], ["HCl (le chlore)", 1]]);
    return { k: ['lc', t[0]], e: `Dans la molécule ${t[0]}, combien de liaisons covalentes l'atome central forme-t-il ?`, r: String(t[1]), i1: "Regarde le nombre d'atomes liés à l'atome central.", i2: "Chaque liaison = un doublet partagé.", x: `${t[1]} liaison(s). ✅` };
  }),
  electronsIon: gen(999, () => {
    const t = pick([["Na⁺ (Na : Z = 11)", 10], ["O²⁻ (O : Z = 8)", 10], ["Al³⁺ (Al : Z = 13)", 10], ["Cl⁻ (Cl : Z = 17)", 18], ["Ca²⁺ (Ca : Z = 20)", 18], ["Mg²⁺ (Mg : Z = 12)", 10]]);
    return { k: ['ei', t[0]], e: `Combien d'électrons possède l'ion ${t[0]} ?`, r: String(t[1]), i1: "Part du nombre de protons (Z).", i2: "Retire la charge positive, ajoute la charge négative.", x: `${t[1]} électrons. ✅` };
  }),
  phClassify: gen(999, () => {
    const ph = ri(0, 14);
    const rep = ph < 7 ? "acide" : ph > 7 ? "basique" : "neutre";
    if (ph === 7) return null;
    return { k: ['phc', ph], e: `Une solution a un pH de ${ph}. Est-elle acide, basique ou neutre ?`, r: rep, i1: "Compare le pH à 7.", i2: ph < 7 ? "pH < 7." : "pH > 7.", x: `La solution est ${rep}. ✅` };
  })
};

// ============================================================
// FAITS SVT (rédigés) — 2 questions × 3 formulations par fait
// ============================================================
function faitsSVT(prefix, classe, faits) {
  const PREFIXES = ["", "Question flash : ", "Objectif BAC : "];
  faits.forEach((f, fi) => {
    const questions = [f.q, ...(f.q2 ? [f.q2] : [])];
    questions.forEach((q, qi) => {
      PREFIXES.forEach((pf, pi) => {
        push(prefix, classe, "SVT", f.chapId, f.chap, ri(1, 3), pf + q, f.r, f.i, f.i2 || "Concentre-toi sur le mot-clé du cours.", f.x);
      });
    });
  });
}

// ---------------- SVT SECONDE C ----------------
faitsSVT('2nde_c_svt', 'Seconde C', [
  { chap: "Constituants de l'environnement", chapId: '2nde_c_svt_chap1', q: "Comment s'appelle l'enveloppe gazeuse de la Terre ?", r: "atmosphere|atmosphère|l'atmosphere|l'atmosphère", i: "C'est l'un des trois grands réservoirs (avec lithosphère et hydrosphère).", x: "L'atmosphère, enveloppe gazeuse de la Terre. ✅" },
  { chap: "Constituants de l'environnement", chapId: '2nde_c_svt_chap1', q: "Le sol contient des éléments minéraux et quelle autre catégorie d'éléments ?", q2: "Les restes d'êtres vivants en décomposition forment quelle catégorie d'éléments du sol ?", r: "organiques", i: "Pense à l'humus.", x: "Les éléments organiques (matière organique = humus). ✅" },
  { chap: "Constituants de l'environnement", chapId: '2nde_c_svt_chap1', q: "Quelle est l'enveloppe liquide de la Terre (océans, lacs, rivières) ?", r: "hydrosphere|hydrosphère|l'hydrosphere|l'hydrosphère", i: "hydro = eau.", x: "L'hydrosphère. ✅" },
  { chap: "Constituants de l'environnement", chapId: '2nde_c_svt_chap1', q: "Comment s'appelle l'enveloppe rocheuse externe de la Terre ?", r: "lithosphere|lithosphère|la lithosphere|la lithosphère", i: "litho = pierre.", x: "La lithosphère. ✅" },
  { chap: "Dégradations de l'environnement", chapId: '2nde_c_svt_chap2', q: "Quels sont les deux agents principaux de l'érosion du sol ?", r: "eau et vent|l'eau et le vent|eau|vent", i: "L'un coule, l'autre souffle.", x: "L'eau et le vent. ✅" },
  { chap: "Dégradations de l'environnement", chapId: '2nde_c_svt_chap2', q: "Comment appelle-t-on la transformation progressive des terres fertiles en désert ?", r: "desertification|désertification|la desertification|la désertification", i: "Le Sahel en est menacé.", x: "La désertification. ✅" },
  { chap: "Dégradations de l'environnement", chapId: '2nde_c_svt_chap2', q: "Le surpâturage, la déforestation et les mauvaises pratiques agricoles sont des activités de quel type ?", r: "humaines|humaine|activites humaines|activités humaines", i: "Elles dépendent de l'homme.", x: "Des activités humaines. ✅" },
  { chap: "Gestion de l'environnement", chapId: '2nde_c_svt_chap3', q: "Comment appelle-t-on l'action de replanter des arbres pour restaurer un milieu dégradé ?", r: "reforestation|reboisement|la reforestation|le reboisement", i: "Re- = de nouveau.", x: "La reforestation (reboisement). ✅" },
  { chap: "Gestion de l'environnement", chapId: '2nde_c_svt_chap3', q: "Les digues et les fascines sont des aménagements qui luttent contre quel phénomène ?", r: "erosion|érosion|l'erosion|l'érosion", i: "Elles retiennent la terre.", x: "L'érosion. ✅" },
  { chap: "Gestion de l'environnement", chapId: '2nde_c_svt_chap3', q: "Comment appelle-t-on le développement qui répond aux besoins du présent sans compromettre l'avenir ?", r: "durable|developpement durable|développement durable", i: "Concept à 3 piliers.", x: "Le développement durable. ✅" },
  { chap: "Relations trophiques", chapId: '2nde_c_svt_chap4', q: "Comment appelle-t-on les êtres vivants qui fabriquent leur propre matière organique ?", q2: "Les végétaux chlorophylliens sont appelés les...", r: "producteurs|les producteurs|producteurs primaires", i: "Base de toute chaîne alimentaire.", x: "Les producteurs primaires. ✅" },
  { chap: "Relations trophiques", chapId: '2nde_c_svt_chap4', q: "Un animal qui mange les producteurs est un consommateur...", r: "primaire|primaire|1|premier", i: "Premier niveau après les producteurs.", x: "Primaire (herbivore). ✅" },
  { chap: "Relations trophiques", chapId: '2nde_c_svt_chap4', q: "Comment appelle-t-on les organismes (bactéries, champignons) qui recyclent la matière organique en matière minérale ?", r: "decomposeurs|décomposeurs|les decomposeurs|les décomposeurs", i: "Les recycleurs de l'écosystème.", x: "Les décomposeurs. ✅" },
  { chap: "Relations trophiques", chapId: '2nde_c_svt_chap4', q: "Dans la chaîne herbe → sauterelle → crapaud, quel est le niveau trophique du crapaud ?", r: "consommateur secondaire|secondaire|2|deuxieme|deuxième", i: "Il mange un herbivore.", x: "Consommateur secondaire. ✅" },
  { chap: "Relations trophiques", chapId: '2nde_c_svt_chap4', q: "Une suite linéaire d'êtres vivants où chacun mange le précédent s'appelle une chaîne...", r: "alimentaire|trophique|alimentaire|trophique", i: "Qui mange qui.", x: "Une chaîne alimentaire (trophique). ✅" },
  { chap: "Formation, évolution et propriétés d'un sol", chapId: '2nde_c_svt_chap5', q: "Comment s'appelle la dégradation progressive de la roche-mère ?", r: "alteration|altération|l'alteration|l'altération", i: "Première étape de la formation d'un sol.", x: "L'altération. ✅" },
  { chap: "Formation, évolution et propriétés d'un sol", chapId: '2nde_c_svt_chap5', q: "Quelle est la matière noire du sol issue de la décomposition des êtres vivants ?", r: "humus|l'humus", i: "Riche et fertile.", x: "L'humus. ✅" },
  { chap: "Formation, évolution et propriétés d'un sol", chapId: '2nde_c_svt_chap5', q: "Quels êtres vivants transforment la matière organique du sol en matière minérale ?", r: "decomposeurs|décomposeurs|bacteries|bactéries|champignons", i: "Les recycleurs.", x: "Les décomposeurs (bactéries, champignons). ✅" },
  { chap: "La gestion des sols", chapId: '2nde_c_svt_chap6', q: "Comment appelle-t-on la pratique qui consiste à laisser le sol au repos sans culture ?", r: "jachere|jachère|la jachere|la jachère", i: "Le sol récupère.", x: "La jachère. ✅" },
  { chap: "La gestion des sols", chapId: '2nde_c_svt_chap6', q: "Les engrais améliorent quelle propriété du sol ?", r: "fertilite|fertilité|la fertilite|la fertilité", i: "Un sol riche nourrit mieux les plantes.", x: "La fertilité. ✅" },
  { chap: "La gestion des sols", chapId: '2nde_c_svt_chap6', q: "Quels sont les trois nutriments principaux apportés par les engrais NPK ?", r: "azote phosphore potassium|n p k|azote|n", i: "N, P, K.", x: "Azote (N), phosphore (P), potassium (K). ✅" },
  { chap: "Énergie fossile : charbon d'Anou-Araren", chapId: '2nde_c_svt_chap7', q: "Le charbon est une source d'énergie de quel type ?", r: "fossile|fossile", i: "Formé il y a des millions d'années.", x: "Une énergie fossile. ✅" },
  { chap: "Énergie fossile : charbon d'Anou-Araren", chapId: '2nde_c_svt_chap7', q: "Le charbon provient de la fossilisation de quels êtres vivants ?", r: "vegetaux|végétaux|plantes|de vegetaux|de végétaux", i: "D'anciennes forêts enfouies.", x: "Des végétaux. ✅" },
  { chap: "Énergie fossile : charbon d'Anou-Araren", chapId: '2nde_c_svt_chap7', q: "Dans quelle région du Niger se trouve le gisement de charbon d'Anou-Araren ?", r: "tahoua|tahoua|region de tahoua|région de Tahoua", i: "Région au centre du Niger.", x: "La région de Tahoua. ✅" },
  { chap: "Uranium d'Arlit", chapId: '2nde_c_svt_chap8', q: "L'uranium permet de produire de l'énergie de quel type ?", r: "nucleaire|nucléaire|nuclear", i: "Fission des noyaux.", x: "Nucléaire. ✅" },
  { chap: "Uranium d'Arlit", chapId: '2nde_c_svt_chap8', q: "Quelle ville du Niger est le cœur de l'extraction d'uranium ?", r: "arlit|Arlit", i: "Région d'Agadez.", x: "Arlit. ✅" },
  { chap: "Uranium d'Arlit", chapId: '2nde_c_svt_chap8', q: "Quel est le symbole chimique de l'uranium ?", r: "U|u", i: "Première lettre du nom.", x: "U. ✅" },
  { chap: "Calcaire et gypse", chapId: '2nde_c_svt_chap9', q: "Quelle est la formule chimique du calcaire ?", r: "caco3|CaCO3", i: "Carbonate de calcium.", x: "CaCO₃. ✅" },
  { chap: "Calcaire et gypse", chapId: '2nde_c_svt_chap9', q: "Le gypse est un sulfate de quel métal ?", r: "calcium|de calcium", i: "Même cation que le calcaire.", x: "Le calcium (CaSO₄·2H₂O). ✅" },
  { chap: "Calcaire et gypse", chapId: '2nde_c_svt_chap9', q: "Le calcaire est du carbonate de...", r: "calcium|de calcium", i: "Ca.", x: "Calcium. ✅" },
  { chap: "Production primaire et productivité de l'écosystème", chapId: '2nde_c_svt_chap10', q: "Quels êtres vivants assurent la production primaire d'un écosystème ?", r: "producteurs|les producteurs|vegetaux|végétaux|plantes", i: "Ils fabriquent la matière organique.", x: "Les producteurs (végétaux chlorophylliens). ✅" },
  { chap: "Production primaire et productivité de l'écosystème", chapId: '2nde_c_svt_chap10', q: "La photosynthèse utilise le CO₂, l'eau et quelle source d'énergie ?", r: "lumiere|lumière|soleil|solaire|l'energie solaire|l'énergie solaire", i: "Captée par la chlorophylle.", x: "La lumière solaire. ✅" },
  { chap: "Production primaire et productivité de l'écosystème", chapId: '2nde_c_svt_chap10', q: "Quel gaz la photosynthèse libère-t-elle ?", r: "oxygene|oxygène|o2|O2|dioxygene|dioxygène", i: "Indispensable à la respiration.", x: "Le dioxygène (O₂). ✅" },
  { chap: "Rôles des végétaux dans l'écosystème", chapId: '2nde_c_svt_chap11', q: "Grâce à quel processus les végétaux libèrent-ils du dioxygène ?", r: "photosynthese|photosynthèse|la photosynthese|la photosynthèse", i: "CO₂ + H₂O + lumière.", x: "La photosynthèse. ✅" },
  { chap: "Rôles des végétaux dans l'écosystème", chapId: '2nde_c_svt_chap11', q: "Les végétaux forment la base de quelles chaînes ?", r: "alimentaires|alimentaire", i: "Tout commence par eux.", x: "Les chaînes alimentaires. ✅" },
  { chap: "Rôles des végétaux dans l'écosystème", chapId: '2nde_c_svt_chap11', q: "Les végétaux protègent le sol contre quel phénomène de dégradation ?", r: "erosion|érosion|l'erosion|l'érosion", i: "Leurs racines retiennent la terre.", x: "L'érosion. ✅" }
]);

// ---------------- SVT PREMIÈRE C ----------------
faitsSVT('1ere_c_svt', 'Première C', [
  { chap: 'Organisation de la cellule vivante', chapId: '1ere_c_svt_chap1', q: "Quel organite est le siège de la respiration cellulaire ?", q2: "Quelle structure produit l'ATP dans la cellule ?", r: "mitochondrie|mitochondries|la mitochondrie", i: "La « centrale énergétique ».", x: "La mitochondrie. ✅" },
  { chap: 'Organisation de la cellule vivante', chapId: '1ere_c_svt_chap1', q: "Quel organite est le siège de la photosynthèse ?", r: "chloroplaste|chloroplastes|le chloroplaste", i: "Il contient la chlorophylle.", x: "Le chloroplaste. ✅" },
  { chap: 'Organisation de la cellule vivante', chapId: '1ere_c_svt_chap1', q: "Quel organite renferme l'ADN ?", r: "noyau|le noyau", i: "Il contient les chromosomes.", x: "Le noyau. ✅" },
  { chap: 'Organisation de la cellule vivante', chapId: '1ere_c_svt_chap1', q: "La membrane plasmique est faite d'une bicouche de quoi ?", r: "lipides|lipidique|lipidiques|de lipides", i: "Modèle en mosaïque fluide.", x: "De lipides (bicouche lipidique). ✅" },
  { chap: "Nutrition minérale d'un végétal chlorophyllien", chapId: '1ere_c_svt_chap2', q: "Outre l'eau, que prélèvent les racines dans le sol ?", r: "sels mineraux|sels minéraux|mineraux|minéraux|les sels mineraux|les sels minéraux", i: "N, P, K...", x: "Les sels minéraux. ✅" },
  { chap: "Nutrition minérale d'un végétal chlorophyllien", chapId: '1ere_c_svt_chap2', q: "Dans quel vaisseau la sève brute monte-t-elle des racines aux feuilles ?", r: "xyleme|xylème|le xyleme|le xylème", i: "Vaisseau conducteur montant.", x: "Le xylème. ✅" },
  { chap: "Nutrition minérale d'un végétal chlorophyllien", chapId: '1ere_c_svt_chap2', q: "Par quelle structure la racine absorbe-t-elle l'eau ?", r: "poils absorbants|les poils absorbants|racines|par les racines", i: "Zones microscopiques de la racine.", x: "Les poils absorbants. ✅" },
  { chap: "Nutrition carbonée d'un végétal chlorophyllien", chapId: '1ere_c_svt_chap3', q: "Quel gaz la plante absorbe-t-elle pour la photosynthèse ?", r: "co2|CO2|dioxyde de carbone|le co2|le CO2", i: "Il entre par les stomates.", x: "Le CO₂. ✅" },
  { chap: "Nutrition carbonée d'un végétal chlorophyllien", chapId: '1ere_c_svt_chap3', q: "Quel sucre est fabriqué par la photosynthèse ?", r: "glucose|le glucose", i: "Sucre simple C₆H₁₂O₆.", x: "Le glucose. ✅" },
  { chap: "Nutrition carbonée d'un végétal chlorophyllien", chapId: '1ere_c_svt_chap3', q: "Quel pigment vert capte l'énergie lumineuse ?", r: "chlorophylle|la chlorophylle", i: "Chloro = vert.", x: "La chlorophylle. ✅" },
  { chap: "Devenir des substances synthétisées", chapId: '1ere_c_svt_chap4', q: "Dans quel vaisseau la sève élaborée circule-t-elle ?", r: "phloeme|phloème|le phloeme|le phloème", i: "Vaisseau répartiteur.", x: "Le phloème. ✅" },
  { chap: "Devenir des substances synthétisées", chapId: '1ere_c_svt_chap4', q: "L'amidon est une forme de quoi pour la plante ?", r: "stockage|reserve|réserve|de stockage|de reserve|de réserve", i: "Le glucose est mis de côté.", x: "De stockage (réserve). ✅" },
  { chap: "Devenir des substances synthétisées", chapId: '1ere_c_svt_chap4', q: "Quelle est la différence de composition entre sève brute et sève élaborée ?", r: "la seve elaboree contient du sucre|seve elaboree|sève élaborée|la sève élaborée contient des substances organiques", i: "L'une est montante, l'autre répartit les sucres.", x: "La sève élaborée contient les substances organiques (sucres) fabriquées. ✅" },
  { chap: 'Respiration et Fermentations', chapId: '1ere_c_svt_chap5', q: "Quel gaz est consommé par la respiration cellulaire ?", r: "oxygene|oxygène|o2|O2|dioxygene|dioxygène", i: "Voie aérobie.", x: "Le dioxygène (O₂). ✅" },
  { chap: 'Respiration et Fermentations', chapId: '1ere_c_svt_chap5', q: "La fermentation alcoolique produit de l'éthanol et quel gaz ?", r: "co2|CO2", i: "Il fait gonfler le pain.", x: "Le CO₂. ✅" },
  { chap: 'Respiration et Fermentations', chapId: '1ere_c_svt_chap5', q: "Combien d'ATP la fermentation produit-elle par mole de glucose ?", r: "2|deux", i: "Bien moins que la respiration.", x: "2 ATP. ✅" },
  { chap: 'Respiration et Fermentations', chapId: '1ere_c_svt_chap5', q: "La fermentation lactique produit quel acide ?", r: "lactique|acide lactique|l'acide lactique", i: "Crampe musculaire.", x: "L'acide lactique. ✅" },
  { chap: 'Respiration et Fermentations', chapId: '1ere_c_svt_chap5', q: "Dans quel organite se déroule la respiration cellulaire ?", r: "mitochondrie|mitochondries|la mitochondrie", i: "Centrale énergétique.", x: "La mitochondrie. ✅" },
  { chap: 'Séisme et structure interne de la Terre', chapId: '1ere_c_svt_chap6', q: "Quels appareils enregistrent les ondes sismiques ?", r: "sismographes|sismographe|les sismographes|le sismographe", i: "Ils tracent les sismogrammes.", x: "Les sismographes. ✅" },
  { chap: 'Séisme et structure interne de la Terre', chapId: '1ere_c_svt_chap6', q: "La discontinuité de Moho sépare la croûte de quelle enveloppe ?", r: "manteau|le manteau", i: "Enveloppe intermédiaire.", x: "Le manteau. ✅" },
  { chap: 'Séisme et structure interne de la Terre', chapId: '1ere_c_svt_chap6', q: "Où naissent les séismes (point de départ de la rupture) ?", r: "foyer|hypocentre|le foyer", i: "En profondeur.", x: "Le foyer (hypocentre). ✅" },
  { chap: 'Principes de stratigraphie et méthodes de datation', chapId: '1ere_c_svt_chap7', q: "Selon le principe de superposition, la couche la plus jeune se trouve où ?", r: "en haut|au dessus|au-dessus|superieure|supérieure|la plus superieure|la plus supérieure", i: "Les sédiments s'empilent.", x: "En haut (la plus superficielle). ✅" },
  { chap: 'Principes de stratigraphie et méthodes de datation', chapId: '1ere_c_svt_chap7', q: "Sur quel phénomène physique repose la datation absolue ?", r: "radioactivite|radioactivité|la radioactivite|la radioactivité", i: "Horloge des isotopes.", x: "La radioactivité. ✅" },
  { chap: "L'échelle des temps géologiques", chapId: '1ere_c_svt_chap8', q: "Dans quelle ère ont vécu les dinosaures ?", r: "secondaire|le secondaire|mesozoique|mésozoïque", i: "Jurassique, Crétacé...", x: "L'ère secondaire. ✅" },
  { chap: "L'échelle des temps géologiques", chapId: '1ere_c_svt_chap8', q: "Quel est l'âge approximatif de la Terre (en milliards d'années) ?", r: "4.5|4,5|4.6|4,6", i: "Entre 4,5 et 4,6.", x: "≈ 4,5 milliards d'années. ✅" },
  { chap: 'La carte géologique - La coupe géologique', chapId: '1ere_c_svt_chap11', q: "Une coupe géologique montre la disposition des couches en...", r: "profondeur|en profondeur", i: "Tranchée verticale imaginaire.", x: "En profondeur. ✅" },
  { chap: 'La carte géologique - La coupe géologique', chapId: '1ere_c_svt_chap11', q: "Qu'est-ce qu'une faille ?", r: "cassure|une cassure|une cassure avec decalage|une cassure avec décalage", i: "Déformation cassante avec décalage.", x: "Une cassure des couches avec décalage. ✅" }
]);

// ---------------- SVT PREMIÈRE D ----------------
faitsSVT('1ere_d_svt', 'Première D', [
  { chap: 'Structure interne de la Terre', chapId: '1ere_d_svt_chap1', q: "De quels métaux le noyau terrestre est-il principalement constitué ?", r: "fer et nickel|fer nickel|fe et ni", i: "Deux métaux lourds.", x: "Le fer et le nickel. ✅" },
  { chap: 'Structure interne de la Terre', chapId: '1ere_d_svt_chap1', q: "Comment s'appelle l'enveloppe superficielle solide de la Terre ?", r: "croute|croûte|la croute|la croûte", i: "Océanique ou continentale.", x: "La croûte. ✅" },
  { chap: 'Structure interne de la Terre', chapId: '1ere_d_svt_chap1', q: "Quelle enveloppe sépare la croûte du noyau ?", r: "manteau|le manteau", i: "La plus volumineuse.", x: "Le manteau. ✅" },
  { chap: 'Tectonique des plaques', chapId: '1ere_d_svt_chap2', q: "Qui a proposé la théorie de la dérive des continents ?", r: "wegener|Wegener|alfred wegener", i: "Début du XXᵉ siècle.", x: "Alfred Wegener. ✅" },
  { chap: 'Tectonique des plaques', chapId: '1ere_d_svt_chap2', q: "Comment s'appellent les zones où les plaques s'écartent (création de croûte) ?", r: "dorsales|dorsales oceaniques|dorsales océaniques|les dorsales", i: "Sous les océans.", x: "Les dorsales océaniques. ✅" },
  { chap: 'Tectonique des plaques', chapId: '1ere_d_svt_chap2', q: "Où se concentrent les séismes et les volcans ?", r: "aux limites des plaques|limites de plaques|bords des plaques", i: "Zones actives.", x: "Aux limites des plaques. ✅" },
  { chap: 'Conséquences de la tectonique des plaques', chapId: '1ere_d_svt_chap3', q: "La collision de deux plaques continentales forme quel relief ?", r: "montagnes|chaines de montagnes|chaînes de montagnes|des montagnes", i: "Exemple : l'Himalaya.", x: "Des chaînes de montagnes. ✅" },
  { chap: 'Conséquences de la tectonique des plaques', chapId: '1ere_d_svt_chap3', q: "Quelle chaîne est née de la collision Inde-Eurasie ?", r: "himalaya|l'himalaya|Himalaya", i: "Le toit du monde.", x: "L'Himalaya. ✅" },
  { chap: 'Principes de stratigraphie et méthodes de datation', chapId: '1ere_d_svt_chap4', q: "Datation absolue : sur quel phénomène repose-t-elle ?", r: "radioactivite|radioactivité|la radioactivite|la radioactivité", i: "Isotopes et demi-vie.", x: "La radioactivité. ✅" },
  { chap: "L'échelle des temps géologiques", chapId: '1ere_d_svt_chap5', q: "Dans quelle ère apparaît l'homme ?", r: "quaternaire|le quaternaire", i: "L'ère la plus récente.", x: "Le quaternaire. ✅" },
  { chap: "L'échelle des temps géologiques", chapId: '1ere_d_svt_chap5', q: "Quel est l'âge de la Terre ?", r: "4.5|4,5|4.6|4,6", i: "Milliards d'années.", x: "≈ 4,5 milliards d'années. ✅" },
  { chap: 'La carte géologique - La coupe géologique', chapId: '1ere_d_svt_chap6', q: "Une faille correspond à quoi ?", r: "cassure|une cassure|cassure avec decalage|cassure avec décalage", i: "Roches cassées et décalées.", x: "Une cassure avec décalage. ✅" },
  { chap: 'Organisation de la cellule vivante', chapId: '1ere_d_svt_chap7', q: "Quel organite contient l'information génétique ?", r: "noyau|le noyau", i: "Siège de l'ADN.", x: "Le noyau. ✅" },
  { chap: 'Organisation de la cellule vivante', chapId: '1ere_d_svt_chap7', q: "Quel organite permet la photosynthèse ?", r: "chloroplaste|chloroplastes|le chloroplaste", i: "Contient la chlorophylle.", x: "Le chloroplaste. ✅" },
  { chap: 'Organisation de la cellule vivante', chapId: '1ere_d_svt_chap7', q: "Quelle structure est le siège de la respiration cellulaire ?", r: "mitochondrie|mitochondries|la mitochondrie", i: "Productrice d'ATP.", x: "La mitochondrie. ✅" },
  { chap: "Nutrition minérale d'un végétal chlorophyllien", chapId: '1ere_d_svt_chap8', q: "Que prélèvent les racines en plus de l'eau ?", r: "sels mineraux|sels minéraux|mineraux|minéraux", i: "N, P, K...", x: "Les sels minéraux. ✅" },
  { chap: "Nutrition carbonée d'un végétal chlorophyllien", chapId: '1ere_d_svt_chap9', q: "Quelle énergie alimente la photosynthèse ?", r: "lumiere|lumière|soleil|solaire", i: "Captée par la chlorophylle.", x: "La lumière (énergie solaire). ✅" },
  { chap: "Nutrition carbonée d'un végétal chlorophyllien", chapId: '1ere_d_svt_chap9', q: "Quel gaz est rejeté par la photosynthèse ?", r: "oxygene|oxygène|o2|O2", i: "Indispensable à la vie.", x: "Le dioxygène. ✅" },
  { chap: 'Devenir des substances synthétisées', chapId: '1ere_d_svt_chap10', q: "La sève élaborée circule dans quel vaisseau ?", r: "phloeme|phloème|le phloeme|le phloème", i: "Répartiteur des sucres.", x: "Le phloème. ✅" },
  { chap: 'Devenir des substances synthétisées', chapId: '1ere_d_svt_chap10', q: "L'amidon sert à quoi pour la plante ?", r: "stockage|reserve|réserve|au stockage", i: "Mise en réserve du glucose.", x: "Au stockage (réserve). ✅" }
]);

// ---------------- SVT TERMINALE C ----------------
faitsSVT('term_c_svt', 'Terminale C', [
  { chap: 'Altération et sédimentation', chapId: 'term_c_svt_chap1', q: "Comment s'appelle un dépôt de sédiments disposé en couche ?", r: "strate|une strate|couche", i: "Stratigraphie.", x: "Une strate. ✅" },
  { chap: 'Altération et sédimentation', chapId: 'term_c_svt_chap1', q: "Quelle est la première étape du cycle sédimentaire (p fragmentation de la roche) ?", r: "alteration|altération|l'alteration|l'altération|erosion|érosion", i: "La roche se désagrège.", x: "L'altération (puis l'érosion transporte). ✅" },
  { chap: 'Les ressources géologiques exploitées au Niger', chapId: 'term_c_svt_chap2', q: "Où extrait-on l'uranium au Niger ?", r: "arlit|Arlit|a arlit|à arlit", i: "Région d'Agadez.", x: "À Arlit. ✅" },
  { chap: 'Les ressources géologiques exploitées au Niger', chapId: 'term_c_svt_chap2', q: "Où se trouve le charbon d'Anou-Araren ?", r: "anou araren|anou-araren|Anou-Araren", i: "Région de Tahoua.", x: "Anou-Araren. ✅" },
  { chap: 'Les ressources géologiques exploitées au Niger', chapId: 'term_c_svt_chap2', q: "Dans quel bloc exploite-t-on le pétrole nigérien ?", r: "agadem|Agadem", i: "Région de Diffa.", x: "Le bloc d'Agadem. ✅" },
  { chap: "Le fonctionnement des appareils génitaux et leur régulation", chapId: 'term_c_svt_chap3', q: "Quelle est l'hormone sexuelle masculine principale ?", r: "testosterone|testostérone|la testosterone|la testostérone", i: "Produite par les testicules.", x: "La testostérone. ✅" },
  { chap: "Le fonctionnement des appareils génitaux et leur régulation", chapId: 'term_c_svt_chap3', q: "Quelle est la durée moyenne du cycle menstruel (en jours) ?", r: "28", i: "Cycle utérin + ovarien.", x: "28 jours. ✅" },
  { chap: "Le fonctionnement des appareils génitaux et leur régulation", chapId: 'term_c_svt_chap3', q: "Quelles hormones contrôlent le cycle féminin ?", r: "oestrogenes et progestatives|œstrogènes et progestatifs|oestrogenes|œstrogènes|progestatifs|progestatives", i: "Deux familles hormonales.", x: "Les œstrogènes et la progestérone (progestatifs). ✅" },
  { chap: 'De la fécondation à la nidation', chapId: 'term_c_svt_chap4', q: "Où a lieu la fécondation ?", r: "trompe|trompe de fallope|la trompe|dans la trompe", i: "Pas dans l'utérus !", x: "Dans la trompe de Fallope. ✅" },
  { chap: 'De la fécondation à la nidation', chapId: 'term_c_svt_chap4', q: "Comment s'appelle l'implantation de l'embryon dans l'utérus ?", r: "nidation|la nidation", i: "≈ 7 jours après la fécondation.", x: "La nidation. ✅" },
  { chap: 'La régulation des naissances', chapId: 'term_c_svt_chap5', q: "La pilule contraceptive contient quelles substances ?", r: "hormones|des hormones", i: "Elles bloquent l'ovulation.", x: "Des hormones. ✅" },
  { chap: 'La régulation des naissances', chapId: 'term_c_svt_chap5', q: "Quelle méthode contraceptive protège aussi du VIH ?", r: "preservatif|préservatif|le preservatif|le préservatif", i: "Barrière mécanique.", x: "Le préservatif. ✅" },
  { chap: 'La régulation de la glycémie', chapId: 'term_c_svt_chap6', q: "Quelle hormone fait baisser la glycémie ?", r: "insuline|l'insuline|la insuline", i: "Hypoglycémiante.", x: "L'insuline. ✅" },
  { chap: 'La régulation de la glycémie', chapId: 'term_c_svt_chap6', q: "Quelle hormone fait monter la glycémie ?", r: "glucagon|le glucagon", i: "Hyperglycémiant.", x: "Le glucagon. ✅" },
  { chap: 'La régulation de la glycémie', chapId: 'term_c_svt_chap6', q: "Quel organe sécrète l'insuline et le glucagon ?", r: "pancreas|pancréas|le pancreas|le pancréas", i: "Îlots de Langerhans.", x: "Le pancréas. ✅" },
  { chap: 'Tissu nerveux et notions de reflexes', chapId: 'term_c_svt_chap7', q: "Quelle est l'unité structurelle et fonctionnelle du système nerveux ?", r: "neurone|le neurone", i: "Corps + dendrites + axone.", x: "Le neurone. ✅" },
  { chap: 'Tissu nerveux et notions de reflexes', chapId: 'term_c_svt_chap7', q: "Comment s'appelle le message électrique qui se propage le long de l'axone ?", r: "potentiel d'action|pa|le potentiel d'action", i: "Codage en fréquence.", x: "Le potentiel d'action. ✅" },
  { chap: 'Messages nerveux et synapses', chapId: 'term_c_svt_chap8', q: "Quelle est la zone de communication entre deux neurones ?", r: "synapse|la synapse", i: "Fente synaptique.", x: "La synapse. ✅" },
  { chap: 'Messages nerveux et synapses', chapId: 'term_c_svt_chap8', q: "Quel neurotransmetteur est libéré à la synapse neuromusculaire ?", r: "acetylcholine|acétylcholine|l'acetylcholine|l'acétylcholine|ach|ACh", i: "Dégradé par l'acétylcholinestérase.", x: "L'acétylcholine. ✅" },
  { chap: "Mécanismes de l'immunité", chapId: 'term_c_svt_chap9', q: "Quels lymphocytes produisent les anticorps ?", r: "lymphocytes b|lb|les lymphocytes b|les lb", i: "Réponse humorale.", x: "Les lymphocytes B. ✅" },
  { chap: "Mécanismes de l'immunité", chapId: 'term_c_svt_chap9', q: "Quels lymphocytes détruisent les cellules infectées ?", r: "lymphocytes t8|lt8|les lt8|les lymphocytes t8|t8", i: "Cytotoxiques.", x: "Les LT8. ✅" },
  { chap: "Mécanismes de l'immunité", chapId: 'term_c_svt_chap9', q: "Le VIH détruit quels lymphocytes ?", r: "lt4|lymphocytes t4|les lt4|les lymphocytes t4|t4", i: "Chefs d'orchestre.", x: "Les LT4. ✅" }
]);

// ---------------- SVT TERMINALE D ----------------
faitsSVT('term_d_svt', 'Terminale D', [
  { chap: 'Information génétique et clonage', chapId: 'term_d_svt_chap1', q: "Le clonage est une reproduction de quel type ?", r: "assexuee|assexuée|asexuee|asexuée", i: "Un seul parent.", x: "Asexuée. ✅" },
  { chap: "Transmission de l'information génétique (Mitose)", chapId: 'term_d_svt_chap2', q: "Pendant quelle phase la duplication de l'ADN a-t-elle lieu ?", r: "phase s|synthese|synthèse|s|la phase s", i: "Avant la division.", x: "La phase S (de synthèse). ✅" },
  { chap: "Transmission de l'information génétique (Mitose)", chapId: 'term_d_svt_chap2', q: "La mitose conserve-t-elle le nombre de chromosomes ? (oui/non)", r: "oui", i: "Division conservatrice.", x: "Oui. ✅" },
  { chap: "Transmission de l'information génétique (Mitose)", chapId: 'term_d_svt_chap2', q: "Combien de cellules filles produit une mitose ?", r: "2|deux", i: "Identiques à la mère.", x: "2 cellules filles. ✅" },
  { chap: "Expression de l'information génétique", chapId: 'term_d_svt_chap3', q: "Quel est le dogme central de la génétique ? (ADN → ? → protéine)", r: "arnm|arn|ARNm|ARN", i: "Intermédiaire copié de l'ADN.", x: "ADN → ARNm → Protéine. ✅" },
  { chap: "Expression de l'information génétique", chapId: 'term_d_svt_chap3', q: "De combien de nucléotides est constitué un codon ?", r: "3|trois", i: "Code un acide aminé.", x: "3 nucléotides. ✅" },
  { chap: "Expression de l'information génétique", chapId: 'term_d_svt_chap3', q: "Où se déroule la traduction de l'ARNm en protéine ?", r: "ribosome|le ribosome|ribosomes", i: "Usine à protéines.", x: "Le ribosome. ✅" },
  { chap: 'Reproduction sexuée et brassage génétique', chapId: 'term_d_svt_chap4', q: "Pendant quelle phase de la méiose le crossing-over a-t-il lieu ?", r: "prophase|prophase 1|prophase i|la prophase 1", i: "Début de la 1ʳᵉ division.", x: "La prophase I. ✅" },
  { chap: 'Reproduction sexuée et brassage génétique', chapId: 'term_d_svt_chap4', q: "Les gamètes produits par la méiose sont-ils haploïdes ou diploïdes ?", r: "haploides|haploïdes|haploide|haploïde", i: "n chromosomes.", x: "Haploïdes (n). ✅" },
  { chap: 'Hérédité et génétique humaine', chapId: 'term_d_svt_chap5', q: "Le daltonisme est porté par quel chromosome ?", r: "x|le chromosome x|chromosome x", i: "Hérédité liée au sexe.", x: "Le chromosome X. ✅" },
  { chap: 'Hérédité et génétique humaine', chapId: 'term_d_svt_chap5', q: "Combien d'allèles principaux pour le système ABO ?", r: "3|trois", i: "A, B, O.", x: "3. ✅" },
  { chap: 'Anomalies chromosomiques', chapId: 'term_d_svt_chap6', q: "La trisomie 21 : combien de chromosomes 21 ?", r: "3|trois", i: "2n + 1.", x: "3. ✅" },
  { chap: 'Anomalies chromosomiques', chapId: 'term_d_svt_chap6', q: "Quelle division, quand elle échoue, provoque une trisomie ?", r: "meiose|méiose|la meiose|la méiose", i: "Non-disjonction des chromosomes.", x: "La méiose. ✅" },
  { chap: 'La régulation de la glycémie', chapId: 'term_d_svt_chap7', q: "Quelle hormone hypoglycémiante ?", r: "insuline|l'insuline", i: "Fait baisser le sucre.", x: "L'insuline. ✅" },
  { chap: 'La régulation de la glycémie', chapId: 'term_d_svt_chap7', q: "Quelle organe sécrète le glucagon ?", r: "pancreas|pancréas|le pancreas|le pancréas", i: "Îlots de Langerhans.", x: "Le pancréas. ✅" },
  { chap: 'Tissu nerveux et notions de reflexes', chapId: 'term_d_svt_chap8', q: "Quelle est l'unité du tissu nerveux ?", r: "neurone|le neurone", i: "Corps + prolongements.", x: "Le neurone. ✅" },
  { chap: 'Messages nerveux et synapses', chapId: 'term_d_svt_chap9', q: "Le message synaptique est de quelle nature ?", r: "chimique|de nature chimique", i: "Neurotransmetteurs.", x: "Chimique. ✅" },
  { chap: 'Messages nerveux et synapses', chapId: 'term_d_svt_chap9', q: "Quel neurotransmetteur agit à la synapse neuromusculaire ?", r: "acetylcholine|acétylcholine|l'acetylcholine|l'acétylcholine", i: "ACh.", x: "L'acétylcholine. ✅" },
  { chap: 'La régulation des naissances', chapId: 'term_d_svt_chap10', q: "Que bloque la pilule contraceptive ?", r: "ovulation|l'ovulation", i: "Pas d'ovocyte = pas de fécondation.", x: "L'ovulation. ✅" },
  { chap: 'Le Système Immunitaire (Le soi et le non-soi)', chapId: 'term_d_svt_chap11', q: "Quelles molécules définissent le « soi » ?", r: "cmh|CMH|le cmh", i: "Complexe Majeur d'Histocompatibilité.", x: "Les molécules CMH. ✅" },
  { chap: 'Le Système Immunitaire (Le soi et le non-soi)', chapId: 'term_d_svt_chap11', q: "Comment appelle-t-on toute substance étrangère déclenchant une réponse immunitaire ?", r: "antigene|antigène|un antigene|un antigène", i: "Reconnu comme non-soi.", x: "Un antigène. ✅" },
  { chap: 'Les Réponses Immunitaires', chapId: 'term_d_svt_chap12', q: "Quels lymphocytes sécrètent des anticorps ?", r: "lymphocytes b|lb|les lb|les lymphocytes b", i: "Ils deviennent des plasmocytes.", x: "Les lymphocytes B. ✅" },
  { chap: 'Les Réponses Immunitaires', chapId: 'term_d_svt_chap12', q: "Quels lymphocytes cytotoxiques détruisent les cellules infectées ?", r: "lt8|lymphocytes t8|t8|les lt8", i: "Réponse cellulaire.", x: "Les LT8. ✅" },
  { chap: 'Le VIH/SIDA et le dysfonctionnement du système immunitaire', chapId: 'term_d_svt_chap13', q: "Quels lymphocytes le VIH détruit-il ?", r: "lt4|lymphocytes t4|t4|les lt4", i: "Chefs d'orchestre.", x: "Les LT4. ✅" },
  { chap: 'Le VIH/SIDA et le dysfonctionnement du système immunitaire', chapId: 'term_d_svt_chap13', q: "Quelle enzyme du VIH recopie son ARN en ADN ?", r: "transcriptase inverse|la transcriptase inverse|transcriptase", i: "Cible des trithérapies.", x: "La transcriptase inverse. ✅" },
  { chap: 'Le Système Nerveux Central', chapId: 'term_d_svt_chap14', q: "Le cortex cérébral est fait de matière grise ou blanche ?", r: "grise|grise|de matiere grise|de matière grise", i: "Corps des neurones en surface.", x: "Matière grise. ✅" },
  { chap: 'Le Système Nerveux Central', chapId: 'term_d_svt_chap14', q: "Quel organe coordonne l'équilibre et les mouvements ?", r: "cervelet|le cervelet", i: "Sous le cerveau.", x: "Le cervelet. ✅" },
  { chap: 'Le Muscle et sa Contraction', chapId: 'term_d_svt_chap15', q: "Sur quel filament glisse l'actine lors de la contraction ?", r: "myosine|la myosine|sur la myosine", i: "Têtes de myosine = rames.", x: "La myosine. ✅" },
  { chap: 'Le Muscle et sa Contraction', chapId: 'term_d_svt_chap15', q: "Quelle molécule fournit l'énergie de la contraction ?", r: "atp|ATP|l'atp|l'ATP", i: "Énergie cellulaire.", x: "L'ATP. ✅" },
  { chap: 'Respiration et Fermentations', chapId: 'term_d_svt_chap16', q: "Combien d'ATP produit la fermentation par mole de glucose ?", r: "2|deux", i: "Glycolyse seule.", x: "2 ATP. ✅" },
  { chap: 'Respiration et Fermentations', chapId: 'term_d_svt_chap16', q: "Où se trouve la chaîne respiratoire ?", r: "mitochondrie|mitochondries|la mitochondrie|dans la mitochondrie|sur les cretes mitochondriales|crêtes", i: "Sur les crêtes.", x: "Dans la mitochondrie (crêtes mitochondriales). ✅" },
  { chap: 'Les Écosystèmes et Relations Trophiques', chapId: 'term_d_svt_chap17', q: "Quel pourcentage d'énergie passe d'un niveau trophique au suivant ?", r: "10|10%|10 pourcent", i: "Règle des 10%.", x: "10%. ✅" },
  { chap: "Flux de matière et d'énergie", chapId: 'term_d_svt_chap18', q: "La matière se recycle ; que fait l'énergie dans l'écosystème ?", r: "traverse|elle traverse|se dissipe|dissipe", i: "Elle ne revient jamais au soleil.", x: "Elle traverse (et se dissipe en chaleur). ✅" },
  { chap: 'Biodiversité et Impacts Humains', chapId: 'term_d_svt_chap19', q: "Combien de piliers pour le développement durable ?", r: "3|trois", i: "Économique, social, environnemental.", x: "3. ✅" },
  { chap: 'Biodiversité et Impacts Humains', chapId: 'term_d_svt_chap19', q: "Quel gaz la déforestation libère-t-elle massivement ?", r: "co2|CO2", i: "Les arbres stockent le carbone.", x: "Le CO₂. ✅" }
]);

// ============================================================
// PLANS DE CHAPITRES (maths et PC) : [numéro, titre, [générateurs]]
// ============================================================
function produire(prefix, classe, matiere, plan, cible) {
  let produits = 0;
  const index = new Map();
  const eteints = new Set();
  let tourSansProgres = 0;
  while (produits < cible && tourSansProgres < 3) {
    let progres = false;
    for (const chap of plan) {
      if (produits >= cible) break;
      let essais = 0;
      while (essais < chap.gens.length) {
        essais++;
        let gi = (index.get(chap) || 0);
        index.set(chap, gi + 1);
        const gkey = chap.gens[gi % chap.gens.length];
        const g = GENS_MAP[gkey];
        const item = g ? g() : null;
        if (item) {
          push(prefix, classe, matiere, `${prefix}_chap${chap.n}`, chap.t, ri(1, 3), item.e, item.r, item.i1, item.i2, item.x);
          produits++; progres = true;
          break;
        } else {
          eteints.add(gkey);
        }
      }
    }
    if (!progres) tourSansProgres++;
  }
  return produits;
}

const GENS_MAP = { ...M, ...P };

// ---------------- PLANS MATHS ----------------
const PLAN_M2 = [
  { n: 1, t: 'Calculs dans ℝ', gens: ['fracAdd', 'fracSub', 'powMul', 'powDiv', 'sqrtSum', 'pgcdEu', 'devCoeff'] },
  { n: 2, t: 'Vecteurs du plan et Barycentre', gens: ['vecCoord', 'vecNorm'] },
  { n: 3, t: 'Équations et inéquations du second degré', gens: ['quadLargest', 'quadDelta', 'quadSum', 'quadProd'] },
  { n: 4, t: "Géométrie dans l'espace", gens: ['volCube', 'volPave', 'volPyramide'] },
  { n: 5, t: 'Angles orientés et trigonométrie', gens: ['trigoVal'] },
  { n: 6, t: "Fonctions numériques d'une variable réelle", gens: ['linImg', 'linAntecedent'] },
  { n: 7, t: 'Produit scalaire', gens: ['dotProduct', 'orthK', 'vecNorm'] },
  { n: 8, t: 'Statistique', gens: ['meanList', 'medianList'] },
  { n: 9, t: 'Transformations du plan', gens: ['symCentrale', 'symAxe', 'translation', 'homothetie', 'rotationQuart'] },
  { n: 10, t: 'Révisions Générales', gens: ['fracAdd', 'quadLargest', 'meanList', 'pgcdEu'] }
];
const PLAN_M1C = [
  { n: 1, t: 'Équations, Inéquations, Polynômes et Systèmes Linéaires', gens: ['quadLargest', 'quadSum', 'quadProd', 'quadDelta'] },
  { n: 2, t: 'Généralités sur les Fonctions Numériques', gens: ['composees', 'linImg'] },
  { n: 3, t: 'Applications du Produit Scalaire et du Barycentre', gens: ['dotProduct', 'orthK', 'baryMasse', 'angleScalaire'] },
  { n: 4, t: 'Dénombrements', gens: ['factorielle', 'combinaison2', 'arrangement3'] },
  { n: 5, t: 'Angles Orientés et Trigonométrie', gens: ['trigoVal'] },
  { n: 6, t: 'Transformations du Plan', gens: ['rotationQuart', 'homothetie', 'translation', 'symCentrale'] },
  { n: 7, t: 'Limites et Continuité', gens: ['limiteInfini', 'limiteZero', 'limiteRatio'] },
  { n: 8, t: 'Dérivation', gens: ['derivePoly', 'tangenteCarre'] },
  { n: 9, t: "Exemples d'Études de Fonctions Numériques", gens: ['tangenteCarre', 'derivePoly'] },
  { n: 10, t: 'Primitives', gens: ['primitiveVal'] },
  { n: 11, t: "Géométrie dans l'Espace", gens: ['volPyramide', 'volPave'] },
  { n: 12, t: 'Suites Numériques', gens: ['suiteArith', 'suiteGeom', 'raisonArit'] },
  { n: 13, t: 'Statistique', gens: ['meanList', 'medianList'] },
  { n: 14, t: 'Révisions Générales', gens: ['derivePoly', 'suiteArith', 'combinaison2'] }
];
const PLAN_M1D = [
  { n: 1, t: 'Équations, Inéquations, Polynômes', gens: ['quadLargest', 'quadSum', 'quadDelta'] },
  { n: 2, t: 'Généralités sur les Fonctions Numériques', gens: ['composees', 'linImg'] },
  { n: 3, t: 'Applications du Produit Scalaire et du Barycentre', gens: ['dotProduct', 'baryMasse', 'angleScalaire'] },
  { n: 4, t: 'Dénombrement', gens: ['factorielle', 'combinaison2', 'arrangement3'] },
  { n: 5, t: 'Angles Orientés et Trigonométrie', gens: ['trigoVal'] },
  { n: 6, t: 'Limites et Continuité', gens: ['limiteInfini', 'limiteZero', 'limiteRatio'] },
  { n: 7, t: 'Dérivation', gens: ['derivePoly', 'tangenteCarre'] },
  { n: 8, t: "Exemples d'Études de Fonctions Numériques", gens: ['tangenteCarre'] },
  { n: 9, t: 'Primitives', gens: ['primitiveVal'] },
  { n: 10, t: 'Suites Numériques', gens: ['suiteArith', 'suiteGeom', 'raisonArit'] },
  { n: 11, t: 'Transformations du Plan', gens: ['rotationQuart', 'homothetie'] },
  { n: 12, t: 'Statistique', gens: ['meanList', 'medianList'] },
  { n: 13, t: 'Révisions Générales', gens: ['derivePoly', 'suiteArith'] }
];
const PLAN_MTC = [
  { n: 1, t: 'Arithmétique', gens: ['modEnt', 'pgcdEu'] },
  { n: 2, t: 'Nombres complexes', gens: ['complexeMod', 'complexeRe', 'iPuiss'] },
  { n: 3, t: 'Calculs Barycentriques', gens: ['baryMasse'] },
  { n: 4, t: 'Applications affines du plan', gens: ['translation', 'homothetie'] },
  { n: 5, t: 'Coniques', gens: ['coniqueA'] },
  { n: 7, t: 'Suites numériques (Terminale)', gens: ['suiteArith', 'sommeEntiers', 'sommeGeo2', 'suiteLimiteQ'] },
  { n: 8, t: 'Fonctions logarithmes', gens: ['lnExp', 'lnPuissance'] },
  { n: 9, t: 'Propriétés des fonctions continues ou dérivables', gens: ['derivePoly', 'tangenteCarre'] },
  { n: 10, t: 'Fonctions exponentielles', gens: ['lnExp'] },
  { n: 12, t: 'Calcul Intégral', gens: ['integralePoly', 'integraleUn'] },
  { n: 13, t: 'Équations différentielles linéaires', gens: ['equaDiffK', 'equaDiffC'] },
  { n: 14, t: 'Probabilité sur un ensemble fini', gens: ['probaDes', 'probaUrne', 'probaUnion'] },
  { n: 15, t: 'Séries statistiques à deux variables', gens: ['meanList'] },
  { n: 16, t: 'Variables aléatoires', gens: ['esperance2'] },
  { n: 17, t: 'Encadrements et approximations', gens: ['partieEnt'] }
];
const PLAN_MTD = [
  { n: 1, t: 'Nombres complexes', gens: ['complexeMod', 'complexeRe', 'iPuiss'] },
  { n: 2, t: 'Similitudes planes directes', gens: ['simRapport', 'simAngle'] },
  { n: 3, t: 'Calcul des Probabilités', gens: ['probaDes', 'probaUrne', 'probaUnion'] },
  { n: 4, t: 'Fonctions logarithmes', gens: ['lnExp', 'lnPuissance'] },
  { n: 5, t: 'Fonctions exponentielles', gens: ['lnExp'] },
  { n: 6, t: 'Calcul Intégral', gens: ['integralePoly', 'integraleUn'] },
  { n: 7, t: 'Équations différentielles', gens: ['equaDiffK', 'equaDiffC'] },
  { n: 8, t: 'Suites numériques', gens: ['suiteArith', 'sommeEntiers', 'sommeGeo2', 'suiteLimiteQ'] },
  { n: 9, t: 'Statistique à deux variables', gens: ['meanList'] },
  { n: 10, t: 'Variables aléatoires', gens: ['esperance2'] },
  { n: 11, t: 'Calculs Barycentriques', gens: ['baryMasse'] },
  { n: 12, t: "Géométrie dans l'espace", gens: ['volCube', 'volPave'] }
];

// ---------------- PLANS PHYSIQUE-CHIMIE ----------------
const PLAN_P2 = [
  { n: 1, t: 'La force', gens: ['fma', 'poids', 'uniteQ'] },
  { n: 2, t: "Équilibre d'un solide soumis à 3 forces non parallèles", gens: ['poids'] },
  { n: 3, t: "Équilibre d'un solide en rotation autour d'un axe fixe", gens: ['momentFd', 'equilibreF'] },
  { n: 4, t: 'Statique des fluides', gens: ['pressionFS', 'pressionRho', 'uniteQ'] },
  { n: 5, t: 'Tension continue', gens: ['ohmU', 'ohmR'] },
  { n: 6, t: 'Tensions variables', gens: ['periodeFreq'] },
  { n: 7, t: 'Dipôles', gens: ['serieR', 'parallelR'] },
  { n: 11, t: "Structure de l'atome", gens: ['neutrons'] },
  { n: 13, t: 'Liaison covalente dans une molécule', gens: ['liaisonCount'] },
  { n: 14, t: 'Ions monoatomiques et ions polyatomiques', gens: ['electronsIon'] },
  { n: 16, t: 'Chlorure de sodium', gens: ['symboleQ'] },
  { n: 17, t: "Rôle du solvant lors de la dissolution d'un composé ionique dans l'eau", gens: ['moleNM'] },
  { n: 18, t: 'Solutions aqueuses acides, solutions aqueuses basiques', gens: ['phClassify', 'phFort'] }
];
const PLAN_P1 = [
  { n: 1, t: 'Mouvement', gens: ['vitesseDT', 'convKmh'] },
  { n: 3, t: 'Quantité de mouvement', gens: ['qdmMV'] },
  { n: 4, t: 'Travail et puissance', gens: ['travailFD', 'puissanceWT', 'uniteQ'] },
  { n: 5, t: 'Énergie cinétique', gens: ['ecin'] },
  { n: 6, t: 'Énergie potentielle', gens: ['epot'] },
  { n: 7, t: 'Énergie mécanique', gens: ['emEcEp', 'ecin', 'epot'] },
  { n: 8, t: 'Énergie électrique', gens: ['energieUIt'] },
  { n: 9, t: "Loi d'Ohm pour un récepteur non ohmique", gens: ['moteurU'] },
  { n: 10, t: 'Condensateurs', gens: ['condE'] },
  { n: 11, t: 'Réfraction de la lumière', gens: ['indiceCV'] },
  { n: 12, t: 'Lentilles minces', gens: ['vergence', 'uniteQ'] },
  { n: 14, t: 'Alcanes', gens: ['alcaneH'] },
  { n: 15, t: 'Dérivés insaturés : Alcènes. Alcynes', gens: ['alceneH'] },
  { n: 18, t: 'Couples oxydant-réducteur', gens: ['electronsRedox'] },
  { n: 20, t: "Généralisation de l'oxydoréduction", gens: ['electronsRedox'] }
];
const PLAN_PTC = [
  { n: 1, t: 'Cinématique', gens: ['cinVat', 'cinXat'] },
  { n: 2, t: "Mouvement du centre d'inertie d'un solide", gens: ['fma'] },
  { n: 3, t: "Mouvement dans le champ de pesanteur terrestre", gens: ['chuteV', 'chuteH'] },
  { n: 4, t: "Mouvement de particules chargées dans un champ électrique uniforme", gens: ['champEUd', 'forceQE'] },
  { n: 6, t: 'Généralités sur les phénomènes vibratoires', gens: ['freqFT'] },
  { n: 7, t: "Propagation d'un phénomène vibratoire", gens: ['vitesseLF'] },
  { n: 10, t: 'Champ magnétique', gens: ['uniteQ'] },
  { n: 11, t: 'Force de Lorentz', gens: ['lorentzQVB'] },
  { n: 12, t: 'Force de Laplace', gens: ['laplaceBIL'] },
  { n: 15, t: 'Circuit oscillant LC', gens: ['uniteQ'] },
  { n: 16, t: 'Circuit en régime sinusoïdal forcé', gens: ['impedanceZ'] },
  { n: 17, t: 'Effet photoélectrique', gens: ['uniteQ'] },
  { n: 18, t: 'Noyau atomique', gens: ['neutrons'] },
  { n: 19, t: 'Réactions nucléaires', gens: ['demiVieMasse'] },
  { n: 20, t: 'Solutions aqueuses (Acide/Base et pH)', gens: ['phFort', 'phBase'] },
  { n: 21, t: "Solutions aqueuses d'acide chlorhydrique et d'hydroxyde de sodium", gens: ['phFort', 'phBase'] },
  { n: 22, t: 'Couples acide base', gens: ['phClassify'] }
];
const PLAN_PTD = [
  { n: 1, t: 'Cinématique', gens: ['cinVat', 'cinXat'] },
  { n: 2, t: "Mouvement du centre d'inertie d'un solide", gens: ['fma'] },
  { n: 3, t: "Mouvement dans le champ de pesanteur terrestre", gens: ['chuteV', 'chuteH'] },
  { n: 4, t: "Mouvement de particules chargées dans un champ électrique uniforme", gens: ['champEUd', 'forceQE'] },
  { n: 6, t: 'Généralités sur les phénomènes vibratoires', gens: ['freqFT'] },
  { n: 7, t: "Propagation d'un phénomène vibratoire", gens: ['vitesseLF'] },
  { n: 9, t: 'Champ magnétique', gens: ['uniteQ'] },
  { n: 10, t: 'Force de Lorentz', gens: ['lorentzQVB'] },
  { n: 11, t: 'Force de Laplace', gens: ['laplaceBIL'] },
  { n: 14, t: 'Circuit oscillant LC', gens: ['uniteQ'] },
  { n: 15, t: 'Circuit en régime sinusoïdal forcé', gens: ['impedanceZ'] },
  { n: 17, t: 'Noyau atomique', gens: ['neutrons'] },
  { n: 18, t: 'Réactions nucléaires', gens: ['demiVieMasse'] },
  { n: 19, t: "Solutions aqueuses d'acide chlorhydrique et d'hydroxyde de sodium", gens: ['phFort', 'phBase'] },
  { n: 20, t: 'Couples acide base', gens: ['phClassify'] },
  { n: 21, t: "Généralisation de l'oxydoréduction", gens: ['electronsRedox'] }
];

// ---------------- LANCEMENT ----------------
const t0 = Date.now();
const res = [];
res.push(['Mathématiques', produire('2nde_c_math', 'Seconde C', 'Mathématiques', PLAN_M2, 1100)]);
res.push(['Mathématiques', produire('1ere_c_math', 'Première C', 'Mathématiques', PLAN_M1C, 1150)]);
res.push(['Mathématiques', produire('1ere_d_math', 'Première D', 'Mathématiques', PLAN_M1D, 1150)]);
res.push(['Mathématiques', produire('term_c_math', 'Terminale C', 'Mathématiques', PLAN_MTC, 1150)]);
res.push(['Mathématiques', produire('term_d_math', 'Terminale D', 'Mathématiques', PLAN_MTD, 1150)]);
res.push(['Physique-Chimie', produire('2nde_c_pc', 'Seconde C', 'Physique-Chimie', PLAN_P2, 750)]);
res.push(['Physique-Chimie', produire('1ere_c_pc', 'Première C', 'Physique-Chimie', PLAN_P1, 750)]);
res.push(['Physique-Chimie', produire('1ere_d_pc', 'Première D', 'Physique-Chimie', PLAN_P1, 750)]);
res.push(['Physique-Chimie', produire('term_c_pc', 'Terminale C', 'Physique-Chimie', PLAN_PTC, 800)]);
res.push(['Physique-Chimie', produire('term_d_pc', 'Terminale D', 'Physique-Chimie', PLAN_PTD, 800)]);
console.log('Générés en ' + ((Date.now() - t0) / 1000).toFixed(1) + 's :');
res.forEach(r => console.log('  ' + r[0] + ' : ' + r[1]));
console.log('SVT (faits) : ' + (EXOS.length - res.reduce((s, r) => s + r[1], 0)));
console.log('TOTAL À INJECTER : ' + EXOS.length);

// Auto-contrôle : réponses numériques/fractions valides
let anomalies = 0;
for (const e of EXOS) {
  if (!e.bonne_reponse || !e.enonce || !e.indice1 || !e.indice2 || !e.explication) { anomalies++; console.log('CHAMPS MANQUANTS : ' + e.id); }
  e.bonne_reponse.split('|').forEach(v => {
    const f = v.match(/^(-?\d+)\/(\d+)$/);
    if (f && pgcd(parseInt(f[1]), parseInt(f[2])) !== 1) { anomalies++; console.log('FRACTION NON RÉDUITE : ' + e.id + ' -> ' + v); }
  });
}
console.log('Anomalies détectées : ' + anomalies);

// ---------------- INJECTION PAR LOTS ----------------
async function injecter() {
  console.log('Début de l\'injection de ' + EXOS.length + ' exercices...');
  for (let i = 0; i < EXOS.length; i += 400) {
    const lot = EXOS.slice(i, i + 400);
    const batch = writeBatch(db);
    for (const e of lot) batch.set(doc(db, 'exercices', e.id), e);
    await batch.commit();
    if ((i / 400) % 5 === 0 || i + 400 >= EXOS.length) console.log('Lot injecté : ' + Math.min(i + 400, EXOS.length) + '/' + EXOS.length);
  }
  console.log('✅ TERMINÉ ! ' + EXOS.length + ' exercices générés sont dans Firebase.');
  process.exit(0);
}
injecter().catch(err => { console.error('❌ Erreur :', err); process.exit(1); });
