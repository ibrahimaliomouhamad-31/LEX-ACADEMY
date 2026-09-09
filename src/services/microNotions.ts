// MICRO-NOTIONS : extraction et gestion des notions d'un chapitre.
// Chaque chapitre est découpé en micro-notions (>13) pour un apprentissage efficace.
// Chaque micro-notion a ses exercices infinis qui ciblent spécifiquement cette notion.

export interface MicroNotion {
  id: string;
  titre: string;
  extrait: string;
  motsCles: string[];
  ordre: number;
  maitrise: number;
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

export function extraireMicroNotions(texte: string): MicroNotion[] {
  if (!texte) return [];
  const lignes = texte.split(/\r?\n/);
  const notions: MicroNotion[] = [];
  const dejaVus = new Set<string>();

  const motifsTitre = [
    /^(?:[IVXLCDM]{1,4})[.)-]\s*(.{3,100})$/i,
    /^\d{1,2}[.)-]\s*(.{3,100})$/,
    /^[A-H][.)-]\s*(.{3,100})$/,
    /^(d[eé]finition|th[eé]or[eè]me|propri[eé]t[eé]|formule|r[eè]gle|m[eé]thode|principe|loi|notion|remarque|exemple|application|corrig[eé]|exercice)\s*[:：]?\s*(.{0,100})$/i,
    /^[-•▪▸►]\s*(.{3,100})$/,
    /^(.{3,60})\s*[:：]$/,
  ];

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i].trim();
    if (ligne.length < 3 || ligne.length > 150) continue;

    let titreTrouve: string | null = null;
    for (const motif of motifsTitre) {
      const m = ligne.match(motif);
      if (m) {
        if (motif.source.startsWith('(d') || motif.source.startsWith('^(.{3,60})')) {
          titreTrouve = `${m[1].trim()}${m[2] ? ` - ${m[2].trim()}` : ''}`;
        } else {
          titreTrouve = m[1].trim();
        }
        break;
      }
    }

    if (!titreTrouve) continue;
    titreTrouve = titreTrouve.replace(/[:：]\s*$/, '').trim();
    if (titreTrouve.length < 3) continue;
    
    const cle = normaliserCle(titreTrouve);
    if (dejaVus.has(cle)) continue;
    if (cle.split(' ').length > 15) continue;

    dejaVus.add(cle);
    
    const suite = lignes.slice(i + 1, i + 5).join(' ').trim().slice(0, 200);
    const motsCles = cle.split(' ').filter(m => m.length >= 3 && !['avec', 'dans', 'pour', 'les', 'des', 'une', 'est', 'que', 'qui', 'sur', 'par'].includes(m));

    notions.push({
      id: `notion_${notions.length}`,
      titre: titreTrouve,
      extrait: suite,
      motsCles,
      ordre: notions.length,
      maitrise: 0,
    });
  }

  return notions;
}

export function motsClesPourNotion(notion: MicroNotion): string[] {
  const base = [...notion.motsCles];
  const titre = normaliserCle(notion.titre);
  
  if (titre.includes('equat')) base.push('equation', 'inconnue', 'resolution');
  if (titre.includes('derive') || titre.includes('derivation')) base.push('derivee', 'pente', 'taux');
  if (titre.includes('suite')) base.push('terme', 'raison', 'convergence');
  if (titre.includes('probab')) base.push('probabilite', 'evenement', 'favorable');
  if (titre.includes('geometr') || titre.includes('pythagore')) base.push('triangle', 'aire', 'perimetre');
  if (titre.includes('trigonometr')) base.push('sinus', 'cosinus', 'tangente', 'angle');
  if (titre.includes('logarithme') || titre.includes('expo')) base.push('log', 'ln', 'exponentielle');
  if (titre.includes('complexe') || titre.includes('imaginaire')) base.push('reel', 'imaginaire', 'module');
  if (titre.includes('matrice') || titre.includes('determinant')) base.push('matrice', 'determinant', 'systeme');
  if (titre.includes('integr')) base.push('integrale', 'primitive', 'aire');
  if (titre.includes('limite') || titre.includes('continu')) base.push('limite', 'continuite', 'asymptote');
  if (titre.includes('vecteur') || titre.includes('vectoriel')) base.push('vecteur', 'norme', 'projection');
  
  return [...new Set(base)];
}

export async function chargerNotionsChapitre(
  chapitreId: string,
  coursCache: { theorie?: string; methode_content?: string } | null,
  contenuFirebase?: { theorie?: string; methode_content?: string } | null
): Promise<MicroNotion[]> {
  const source = contenuFirebase || coursCache;
  if (!source) return [];
  const texte = `${source.theorie || ''}\n${source.methode_content || ''}`;
  const notions = extraireMicroNotions(texte);
  
  if (notions.length === 0 && texte.trim().length > 40) {
    const morceaux = texte.trim().split(/\n\n|\.\s+/).filter(m => m.trim().length > 20);
    return morceaux.slice(0, 15).map((m, i) => ({
      id: `notion_${i}`,
      titre: m.trim().split(' ').slice(0, 6).join(' '),
      extrait: m.trim().slice(0, 200),
      motsCles: m.trim().toLowerCase().split(' ').filter(w => w.length >= 3).slice(0, 5),
      ordre: i,
      maitrise: 0,
    }));
  }
  
  return notions;
}

export function couvrirNotions(
  notions: MicroNotion[],
  exercices: { enonce: string; chapitre?: string }[]
): { notion: MicroNotion; nbExercices: number }[] {
  return notions.map((notion) => {
    const mots = notion.motsCles.filter((m) => m.length >= 3);
    const nb = exercices.filter((exo) => {
      const cible = normaliserCle(`${exo.enonce} ${exo.chapitre || ''}`);
      return mots.some((m) => cible.includes(m));
    }).length;
    return { notion, nbExercices: nb };
  });
}
