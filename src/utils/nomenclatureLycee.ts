/**
 * 🎓 NOMENCLATURE DU LYCÉE — logique PURE (aucune dépendance Firebase).
 *
 * Le LEX est un lycée d'excellence : il n'y a AUCUNE classe de collège
 * (6e/5e/4e/3e). Toute classe hors de cette liste est refusée, jamais
 * « devinée » : un élève mal classé serait introuvable dans le classement.
 *
 * Module isolé volontairement : il est ainsi testable sans Firebase et
 * réutilisable par l'écran d'inscription, le filtre du classement et le
 * miroir `classement_public` (une seule source de vérité).
 */

export interface ClasseOption {
  label: string;
  valeur: string;
  niveau: '2nde' | '1ere' | 'terminale';
  branche?: 'C' | 'D';
}

// 🗂️ Liste des classes proposées dans l'inscription + filtres
export const CLASSES: ClasseOption[] = [
  { label: 'Seconde',     valeur: '2nde',        niveau: '2nde' },
  { label: 'Première C',  valeur: '1ère C',      niveau: '1ere', branche: 'C' },
  { label: 'Première D',  valeur: '1ère D',      niveau: '1ere', branche: 'D' },
  { label: 'Terminale C', valeur: 'Terminale C', niveau: 'terminale', branche: 'C' },
  { label: 'Terminale D', valeur: 'Terminale D', niveau: 'terminale', branche: 'D' },
];

/** Minuscules, sans accents, sans séparateurs : « 1ère C » → « 1erec ». */
const aplatir = (texte: string): string =>
  texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s.°_-]/g, '');

// 🎯 Extrait le niveau scolaire à partir d'une chaîne de classe.
// 🔁 MÊME logique que `functions/classement.js` : le miroir publié par l'app
// et la migration serveur doivent produire la MÊME valeur, sinon un élève
// migré disparaîtrait du filtre.
export function niveauPourClasse(classe: string | undefined): string {
  const canonique = classeCanonique(classe);
  if (canonique === '2nde') return '2nde';
  if (canonique && canonique.startsWith('1ère')) return '1ere';
  if (canonique && canonique.startsWith('Terminale')) return 'terminale';
  // Anciens profils SANS branche : niveau déduit, branche jamais inventée.
  const c = aplatir(classe || '');
  if (/^(1ere|1re|premiere)$/.test(c)) return '1ere';
  if (/^(terminale|term|tle)$/.test(c)) return 'terminale';
  return 'inconnu';
}

// 💡 Niveau lisible depuis sa valeur technique
export function libelleNiveau(niveau: string): string {
  const map: { [k: string]: string } = {
    '2nde': 'Seconde', '1ere': 'Premières', 'terminale': 'Terminale',
  };
  return map[niveau] || niveau;
}

// 🔠 Niveaux disponibles pour le filtre par niveau
export const NIVEAUX_FILTRAGE = [
  { valeur: '2nde',      label: 'Seconde' },
  { valeur: '1ere',      label: '1ère' },
  { valeur: 'terminale', label: 'Terminale' },
];

/**
 * 🧽 Normalise une classe saisie vers la nomenclature officielle du lycée.
 * Retourne `null` si la classe n'existe pas au LEX (classe de collège, faute
 * de frappe) : on n'invente JAMAIS une branche C/D.
 *
 * Sert au miroir `classement_public` : la fiche publiée doit porter la même
 * valeur que celle utilisée par le filtre, sinon l'élève serait introuvable.
 */
export function classeCanonique(classe: string | undefined): string | null {
  if (!classe) return null;
  const propre = aplatir(classe + '');
  if (/^(2nde|2de|2e|seconde)$/.test(propre)) return '2nde';
  const premiere = /^(?:1ere|1re|premiere)([cd])$/.exec(propre);
  if (premiere) return `1ère ${premiere[1].toUpperCase()}`;
  const terminale = /^(?:terminale|term|tle|t)([cd])$/.exec(propre);
  if (terminale) return `Terminale ${terminale[1].toUpperCase()}`;
  return null;
}
