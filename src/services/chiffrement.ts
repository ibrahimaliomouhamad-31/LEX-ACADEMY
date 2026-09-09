// CHIFFREMENT LOCAL SIMPLE (amélioration 8) : protège le cahier de l'élève sur l'appareil.
// Format : "LEX1:<base64 du XOR>" — dechiffrer() reconnaît le préfixe et laisse
// intact tout texte non chiffré (compatibilité avec les anciennes données).

const CLE = 'LEX-ACADEMY-Tessaoua-2026';

function xor(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    out += String.fromCharCode(s.charCodeAt(i) ^ CLE.charCodeAt(i % CLE.length));
  }
  return out;
}

export function chiffrer(s: string): string {
  if (!s) return s;
  try {
    return 'LEX1:' + btoa(unescape(encodeURIComponent(xor(s))));
  } catch {
    return s;
  }
}

export function dechiffrer(s: string): string {
  if (!s || !s.startsWith('LEX1:')) return s || '';
  try {
    return xor(decodeURIComponent(escape(atob(s.slice(5)))));
  } catch {
    return '';
  }
}

export function estChiffre(s: string): boolean {
  return typeof s === 'string' && s.startsWith('LEX1:');
}