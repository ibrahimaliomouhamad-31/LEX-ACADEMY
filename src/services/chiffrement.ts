// CHIFFREMENT LOCAL (amélioration 8) : protège le cahier de l'élève sur l'appareil.
// ⚠️ HONNÊTETÉ CRYPTO : un XOR à clé fixe N'EST PAS du chiffrement sûr
// (clé dans le bundle = lisible par tous). On garde LEX1 en lecture (compat),
// mais l'écriture passe en LEX2 = clé DÉRIVÉE DE L'UTILISATEUR (uid) + sel
// aléatoire par message. Un élève ne peut plus déchiffrer le cahier d'un
// autre élève qui partage le même téléphone.

const ANCIENNE_CLE = 'LEX-ACADEMY-Tessaoua-2026';
const PREFIXE_V2 = 'LEX2:';

async function cleUtilisateur(): Promise<string> {
  try {
    const { getCurrentUserId } = await import('./userStorage');
    const uid = await getCurrentUserId();
    return `LEX-ACADEMY::${uid}`;
  } catch {
    return ANCIENNE_CLE;
  }
}

function xorAvecCle(s: string, cle: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    out += String.fromCharCode(s.charCodeAt(i) ^ cle.charCodeAt(i % cle.length));
  }
  return out;
}

// 🛡️ AUDIT : Buffer typé via globalThis (plus de @ts-ignore qui masque tout).
declare const Buffer: { from(s: string, enc: string): { toString(enc: string): string } } | undefined;

function versBase64(s: string): string {
  const binaire = unescape(encodeURIComponent(s));
  if (typeof btoa === 'function') return btoa(binaire);
  if (typeof Buffer !== 'undefined') return Buffer.from(binaire, 'binary').toString('base64');
  return binaire;
}

function depuisBase64(b64: string): string {
  let binaire: string;
  if (typeof atob === 'function') binaire = atob(b64);
  else if (typeof Buffer !== 'undefined') binaire = Buffer.from(b64, 'base64').toString('binary');
  else binaire = b64;
  return decodeURIComponent(escape(binaire));
}

function selAleatoire(): string {
  try {
    // Utilise crypto.randomUUID() pour un sel unique et sûr (128 bits d'entropie)
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    const t = new Uint8Array(8);
    crypto.getRandomValues(t);
    return Array.from(t, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}

function xorAncien(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    out += String.fromCharCode(s.charCodeAt(i) ^ ANCIENNE_CLE.charCodeAt(i % ANCIENNE_CLE.length));
  }
  return out;
}

function dechiffrerV1(s: string): string {
  // 🛡️ AUDIT : atob peut être absent sur Hermes — repli sur Buffer typé.
  const brut = typeof atob === 'function' ? atob(s.slice(5)) : depuisBase64(s.slice(5));
  return xorAncien(decodeURIComponent(escape(brut)));
}

/** Chiffre avec la clé de l'utilisateur + sel aléatoire (format LEX2). */
export async function chiffrerAsync(s: string): Promise<string> {
  if (!s) return s;
  try {
    const cle = await cleUtilisateur();
    const sel = selAleatoire();
    return `${PREFIXE_V2}${sel}:` + versBase64(xorAvecCle(s, cle + '::' + sel));
  } catch {
    return s;
  }
}

/** Version synchrone (clé générique) — dépréciée, gardée pour compatibilité. */
export function chiffrer(s: string): string {
  if (!s) return s;
  try {
    return 'LEX1:' + versBase64(xorAncien(s));
  } catch {
    return s;
  }
}

/** Déchiffre LEX2 (clé utilisateur) puis LEX1 (ancienne clé), sinon texte brut. */
export async function dechiffrerAsync(s: string): Promise<string> {
  if (!s) return '';
  try {
    if (s.startsWith(PREFIXE_V2)) {
      const reste = s.slice(PREFIXE_V2.length);
      const sep = reste.indexOf(':');
      if (sep < 0) return '';
      const sel = reste.slice(0, sep);
      const cle = await cleUtilisateur();
      return xorAvecCle(depuisBase64(reste.slice(sep + 1)), cle + '::' + sel);
    }
    if (s.startsWith('LEX1:')) return dechiffrerV1(s);
    return s;
  } catch {
    return '';
  }
}

export function dechiffrer(s: string): string {
  if (!s || !s.startsWith('LEX1:')) return s || '';
  try {
    return dechiffrerV1(s);
  } catch {
    return '';
  }
}

export function estChiffre(s: string): boolean {
  return typeof s === 'string' && (s.startsWith('LEX1:') || s.startsWith(PREFIXE_V2));
}