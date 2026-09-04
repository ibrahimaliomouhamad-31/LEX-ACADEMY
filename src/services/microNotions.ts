// MICRO-NOTIONS : extraction automatique des notions d'un chapitre depuis son contenu.
// Objectif : plus aucun exercice ne tombe "à côté" du cours — chaque micro-notion
// a ses exercices officiels + son générateur infini dédié.

export interface MicroNotion {
  titre: string;
  extrait: string; // petit bout du contenu pour reconnaissance
}

function normaliserCle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Détecte les titres de sections dans un texte de cours :
// "I. Les nombres", "1) Définition", "A. Théorème", "Définition :", "Théorème :", etc.
export function extraireMicroNotions(texte: string): MicroNotion[] {
  if (!texte) return [];
  const lignes = texte.split(/\r?\n/);
  const notions: MicroNotion[] = [];
  const dejaVus = new Set<string>();

  const motifsTitre = [
    /^(?:[IVXLCDM]{1,4})[.)-]\s*(.{3,90})$/i, // I. Titre
    /^\d{1,2}[.)-]\s*(.{3,90})$/, // 1. Titre / 1) Titre
    /^[A-H][.)-]\s*(.{3,90})$/, // A. Titre
    /^(d[eé]finition|th[eé]or[eè]me|propri[eé]t[eé]|formule|r[eè]gle|m[eé]thode|principe|loi|notion|remarque)\s*[:：]?\s*(.{0,80})$/i,
  ];

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i].trim();
    if (ligne.length < 3 || ligne.length > 120) continue;

    let titreTrouve: string | null = null;
    for (const motif of motifsTitre) {
      const m = ligne.match(motif);
      if (m) {
        if (motif.source.startsWith('(d')) {
          // Mot-clé pédagogique : "Définition : fonction affine"
          titreTrouve = `${m[1].trim()}${m[2] ? ` — ${m[2].trim()}` : ''}`;
        } else {
          titreTrouve = m[1].trim();
        }
        break;
      }
    }

    if (!titreTrouve) continue;

    // Nettoyage : pas de notion qui finit par ":" seul, pas de doublons
    titreTrouve = titreTrouve.replace(/[:：]\s*$/, '').trim();
    if (titreTrouve.length < 3) continue;
    const cle = normaliserCle(titreTrouve);
    if (dejaVus.has(cle)) continue;
    // Évite les phrases entières prises pour des titres
    if (cle.split(' ').length > 12) continue;

    dejaVus.add(cle);
    // Extrait = les 140 caractères du contenu qui suit la ligne de titre
    const suite = lignes
      .slice(i + 1, i + 4)
      .join(' ')
      .trim()
      .slice(0, 140);
    notions.push({ titre: titreTrouve, extrait: suite });
  }

  return notions;
}

// Associe les exercices existants d'un chapitre aux micro-notions qu'ils couvrent.
// Retourne pour chaque notion le nombre d'exercices officiels trouvés.
export function couvrirNotions(
  notions: MicroNotion[],
  exercices: { enonce: string; chapitre?: string }[]
): { notion: MicroNotion; nbExercices: number }[] {
  return notions.map((notion) => {
    const cle = normaliserCle(notion.titre);
    // Mots significatifs du titre de la notion (≥ 4 lettres), avec variantes singulier/pluriel
    const mots = cle
      .split(' ')
      .filter((m) => m.length >= 4 && !['avec', 'dans', 'pour', 'les', 'des', 'une', 'est'].includes(m))
      .flatMap((m) => (m.endsWith('s') ? [m, m.slice(0, -1)] : [m, `${m}s`]));
    const nb = exercices.filter((exo) => {
      const cible = normaliserCle(`${exo.enonce} ${exo.chapitre || ''}`);
      return mots.some((m) => cible.includes(m));
    }).length;
    return { notion, nbExercices: nb };
  });
}

// Charge les micro-notions d'un chapitre : cache d'abord, Firebase ensuite.
// À utiliser depuis un écran : import { db } from '../firebaseConfig'
export async function chargerNotionsChapitre(
  chapitreId: string,
  coursCache: { theorie?: string; methode_content?: string } | null,
  contenuFirebase?: { theorie?: string; methode_content?: string } | null
): Promise<MicroNotion[]> {
  const source = contenuFirebase || coursCache;
  if (!source) return [];
  const texte = `${source.theorie || ''}\n${source.methode_content || ''}`;
  const notions = extraireMicroNotions(texte);
  // Filet de sécurité : si le cours est mal structuré, on fabrique au moins
  // une notion à partir du contenu brut pour que le générateur reste ciblé.
  if (notions.length === 0 && texte.trim().length > 40) {
    const premierMots = texte.trim().split(/\s+/).slice(0, 8).join(' ');
    return [{ titre: premierMots, extrait: texte.slice(0, 140) }];
  }
  return notions;
}
