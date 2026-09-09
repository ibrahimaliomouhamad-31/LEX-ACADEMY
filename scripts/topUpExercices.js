// Complément : ~210 exercices pour dépasser les 10 000 ajoutés
import { initializeApp } from 'firebase/app';
import { doc, getFirestore, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC3y581S0nHqYfIX4TjvumGKLgpDj1G1dg",
  projectId: "lex-academy-10eef"
};
const db = getFirestore(initializeApp(firebaseConfig));

let _seed = 777001;
function rnd() { _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0; let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[ri(0, arr.length - 1)];

const EXOS = [];
const CLASSES = [
  ['2nde_c_math', 'Seconde C', 10, 'Révisions Générales'],
  ['1ere_c_math', 'Première C', 14, 'Révisions Générales'],
  ['1ere_d_math', 'Première D', 13, 'Révisions Générales'],
  ['term_c_math', 'Terminale C', 17, 'Encadrements et approximations'],
  ['term_d_math', 'Terminale D', 12, "Géométrie dans l'espace"]
];
let n = 0;
for (const [prefix, classe, chapN, chapT] of CLASSES) {
  for (let i = 0; i < 42; i++) {
    const kind = ri(1, 4);
    let e, r, i1, i2, x;
    if (kind === 1) {
      const pc2 = pick([5, 10, 20, 25, 50, 75]);
      const val = ri(1, 20) * (100 / pc2);
      e = `Calcule ${pc2}% de ${val}.`; r = String(val * pc2 / 100);
      i1 = "Pourcentage = (pourcentage × valeur)/100."; i2 = `${pc2} × ${val} / 100.`; x = `${pc2}% de ${val} = ${val * pc2 / 100}. ✅`;
    } else if (kind === 2) {
      const L = ri(2, 15), l = ri(2, 15);
      e = `Un rectangle mesure ${L} cm sur ${l} cm. Calcule son aire en cm².`; r = String(L * l);
      i1 = "Aire = longueur × largeur."; i2 = `${L} × ${l}.`; x = `Aire = ${L * l} cm². ✅`;
    } else if (kind === 3) {
      const a = ri(2, 9), x0 = ri(-9, 9), b = ri(-15, 15);
      const c = a * x0 + b;
      e = `Résous : ${a}x ${b >= 0 ? '+ ' + b : '− ' + -b} = ${c}.`; r = String(x0);
      i1 = "Isole x."; i2 = `${a}x = ${c - b}, donc x = ${c - b}/${a}.`; x = `x = ${x0}. ✅`;
    } else {
      const a = ri(-9, 9), b = ri(-9, 9);
      e = `Développe (x ${a >= 0 ? '+ ' + a : '− ' + -a})(x ${b >= 0 ? '+ ' + b : '− ' + -b}). Quel est le terme CONSTANT ?`; r = String(a * b);
      i1 = "Double distributivité."; i2 = `Constante = ${a} × ${b}.`; x = `Terme constant = ${a * b}. ✅`;
    }
    n++;
    EXOS.push({ id: `${prefix}_g_sup${n}`, classe, matiere: 'Mathématiques', chapitre: chapT, chapitre_id: `${prefix}_chap${chapN}`, difficulte: ri(1, 2), enonce: e, bonne_reponse: r, indice1: i1, indice2: i2, explication: x });
  }
}

async function injecter() {
  console.log('Injection de ' + EXOS.length + ' exercices complémentaires...');
  const batch = writeBatch(db);
  for (const ex of EXOS) batch.set(doc(db, 'exercices', ex.id), ex);
  await batch.commit();
  console.log('✅ Terminé.');
  process.exit(0);
}
injecter().catch(err => { console.error(err); process.exit(1); });
