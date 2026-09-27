/**
 * 📝 MARKDOWN LÉGER POUR LEX.AI (0 dépendance, 100 % hors-ligne)
 *
 * Les réponses de LEX.AI arrivent en markdown « parlé » par le modèle :
 * titres, listes, tableaux GFM, code, citations, gras/italique, formules.
 * Plutôt que d'ajouter une librairie markdown (aucune n'est compatible
 * React 19 / RN 0.86 sans risque), on analyse ici le texte en BLOCS typés que
 * `components/ReponseIA.tsx` sait dessiner (couleurs, vrais tableaux, effets).
 *
 * Contrat : `analyserMarkdown` ne throw JAMAIS (texte vide, markdown cassé,
 * tableau incomplet, emoji seuls... → blocs valides ou liste vide).
 */

export type Bloc =
  | { type: 'titre'; niveau: 1 | 2 | 3; texte: string }
  | { type: 'paragraphe'; texte: string }
  | { type: 'liste'; ordonnee: boolean; items: string[] }
  | { type: 'code'; langage: string; contenu: string }
  | { type: 'citation'; texte: string }
  | { type: 'tableau'; entetes: string[]; lignes: string[][] }
  | { type: 'separateur' };

export type Segment =
  | { type: 'texte'; valeur: string }
  | { type: 'gras'; valeur: string }
  | { type: 'italique'; valeur: string }
  | { type: 'code'; valeur: string }
  | { type: 'formule'; valeur: string };

/** Encadrés automatiques : un paragraphe qui commence par ces emojis devient
 *  un « callout » coloré (conseil, piège, validation, objectif). */
export const EMOJIS_ENCADRE: Record<string, 'info' | 'attention' | 'succes' | 'objectif'> = {
  '💡': 'info',
  'ℹ️': 'info',
  '📌': 'info',
  '⚠️': 'attention',
  '❌': 'attention',
  '🚫': 'attention',
  '✅': 'succes',
  '🎯': 'objectif',
};

const LIGNE_SEPARATEUR = /^\s*(?:[-*_]\s*){3,}$|^\s*[━─═▬]{3,}\s*$/;
const LIGNE_TITRE = /^\s*(#{1,6})\s+(.*)$/;
const LIGNE_CITATION = /^\s*>\s?(.*)$/;
const LIGNE_PUCE = /^\s*[-*•]\s+(.*)$/;
const LIGNE_NUMERO = /^\s*\d{1,3}[.)]\s+(.*)$/;
const LIGNE_TABLEAU = /^\s*\|.*\|\s*$/;
const LIGNE_CLOTURE = /^\s*(`{3,}|~{3,})\s*([A-Za-z0-9+#-]*)\s*$/;
const CELLULE_SEPARATRICE = /^\s*:?-{2,}:?\s*$/;

/** Découpe une ligne de tableau `| a | b |` en cellules propres. */
export function decouperCellules(ligne: string): string[] {
  const brut = ligne.trim().replace(/^\|/, '').replace(/\|$/, '');
  return brut.split('|').map((c) => c.trim());
}

/**
 * Vrai si la ligne suivante est la ligne `|---|---|` d'un tableau GFM.
 * (Sans elle, `| a | b |` reste du texte : un simple usage décoratif du
 * caractère « | » ne doit pas fabriquer un faux tableau.)
 */
export function estSeparateurTableau(ligne: string | undefined): boolean {
  if (!ligne || !LIGNE_TABLEAU.test(ligne)) return false;
  const cellules = decouperCellules(ligne);
  return cellules.length > 0 && cellules.every((c) => CELLULE_SEPARATRICE.test(c));
}

/** Analyse inline : gras, italique, code, formules `$...$` (et `\(...\)`). */
export function segmentsInline(texte: string): Segment[] {
  const segments: Segment[] = [];
  const motif = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|\$[^$\n]+\$|\\\([^)\n]+\\\))/g;
  let curseur = 0;
  let correspondance: RegExpExecArray | null;
  while ((correspondance = motif.exec(texte)) !== null) {
    if (correspondance.index > curseur) {
      segments.push({ type: 'texte', valeur: texte.slice(curseur, correspondance.index) });
    }
    const brut = correspondance[0];
    const interieur = brut
      .replace(/^\*\*|\*\*$/g, '') // **gras**
      .replace(/^__|__$/g, '')
      .replace(/^\*|\*$/g, '') // *italique*
      .replace(/^_|_$/g, '')
      .replace(/^`|`$/g, '') // `code`
      .replace(/^\$|\$$/g, '') // $formule$
      .replace(/^\\\(|\\\)$/g, '') // \(formule\)
      .trim();
    if (brut.startsWith('**') || brut.startsWith('__')) segments.push({ type: 'gras', valeur: interieur });
    else if (brut.startsWith('`')) segments.push({ type: 'code', valeur: interieur });
    else if (brut.startsWith('$') || brut.startsWith('\\(')) segments.push({ type: 'formule', valeur: interieur });
    else segments.push({ type: 'italique', valeur: interieur });
    curseur = correspondance.index + brut.length;
  }
  if (curseur < texte.length) segments.push({ type: 'texte', valeur: texte.slice(curseur) });
  return segments.filter((s) => s.valeur !== '');
}

/** Vrai si la réponse contient du markdown digne du rendu riche. */
export function contientMarkdown(texte: string): boolean {
  return /(^|\n)\s*(#{1,6}\s|\||[-*•]\s|\d{1,3}[.)]\s|```|>\s)|(\*\*[^*\n]+\*\*)/.test(texte ?? '');
}


/** Analyse un texte markdown complet en blocs typés. */
export function analyserMarkdown(texte: string): Bloc[] {
  const blocs: Bloc[] = [];
  const lignes = (texte ?? '').replace(/\r\n?/g, '\n').split('\n');
  const tampon: string[] = [];
  let i = 0;

  const viderParagraphe = () => {
    const contenu = tampon.join('\n').trim();
    if (contenu !== '') blocs.push({ type: 'paragraphe', texte: contenu });
    tampon.length = 0;
  };

  while (i < lignes.length) {
    const ligne = lignes[i];

    // --- Bloc de code clôturé par ``` -------------------------------
    const cloture = LIGNE_CLOTURE.exec(ligne);
    if (cloture) {
      viderParagraphe();
      const langage = cloture[2] || '';
      const code: string[] = [];
      i++;
      while (i < lignes.length && !LIGNE_CLOTURE.test(lignes[i])) {
        code.push(lignes[i]);
        i++;
      }
      i++; // saute la clôture (ou la fin du texte si non fermée)
      blocs.push({ type: 'code', langage, contenu: code.join('\n').replace(/\s+$/, '') });
      continue;
    }

    // --- Tableau GFM ------------------------------------------------
    if (LIGNE_TABLEAU.test(ligne) && estSeparateurTableau(lignes[i + 1])) {
      viderParagraphe();
      const entetes = decouperCellules(ligne);
      const lignesTableau: string[][] = [];
      i += 2;
      while (i < lignes.length && LIGNE_TABLEAU.test(lignes[i])) {
        const cellules = decouperCellules(lignes[i]);
        // On aligne sur les colonnes des en-têtes : cellules manquantes
        // complétées à vide, cellules en trop ignorées (jamais de crash).
        lignesTableau.push(entetes.map((_, c) => cellules[c] ?? ''));
        i++;
      }
      blocs.push({ type: 'tableau', entetes, lignes: lignesTableau });
      continue;
    }

    // --- Titre ------------------------------------------------------
    const titre = LIGNE_TITRE.exec(ligne);
    if (titre) {
      viderParagraphe();
      const niveau = Math.min(3, titre[1].length) as 1 | 2 | 3;
      const texteTitre = titre[2].trim();
      if (texteTitre !== '') blocs.push({ type: 'titre', niveau, texte: texteTitre });
      i++;
      continue;
    }

    // --- Séparateur (--- ou ━━━━━━ des cours du programme) ----------
    if (LIGNE_SEPARATEUR.test(ligne)) {
      viderParagraphe();
      blocs.push({ type: 'separateur' });
      i++;
      continue;
    }

    // --- Citation ---------------------------------------------------
    const citation = LIGNE_CITATION.exec(ligne);
    if (citation) {
      viderParagraphe();
      const morceaux: string[] = [citation[1]];
      i++;
      let suite = LIGNE_CITATION.exec(lignes[i] ?? '');
      while (suite) {
        morceaux.push(suite[1]);
        i++;
        suite = LIGNE_CITATION.exec(lignes[i] ?? '');
      }
      blocs.push({ type: 'citation', texte: morceaux.join(' ').trim() });
      continue;
    }

    // --- Liste (puces ou numérotée) ---------------------------------
    const puce = LIGNE_PUCE.exec(ligne);
    const numero = LIGNE_NUMERO.exec(ligne);
    if (puce || numero) {
      viderParagraphe();
      const ordonnee = numero !== null;
      const items: string[] = [];
      while (i < lignes.length) {
        const p = LIGNE_PUCE.exec(lignes[i]);
        const n = LIGNE_NUMERO.exec(lignes[i]);
        const trouve = p ?? n;
        if (!trouve) break;
        // Une liste numérotée ne se poursuit pas en liste à puces (et
        // inversement) : deux listes distinctes, plus lisible à l'écran.
        if ((n !== null) !== ordonnee) break;
        items.push(trouve[1].trim());
        i++;
      }
      if (items.length > 0) blocs.push({ type: 'liste', ordonnee, items });
      continue;
    }

    // --- Ligne vide : fin de paragraphe -----------------------------
    if (ligne.trim() === '') {
      viderParagraphe();
      i++;
      continue;
    }

    // --- Texte courant (les lignes collées forment UN paragraphe) ---
    tampon.push(ligne.trim());
    i++;
  }

  viderParagraphe();
  return blocs;
}

