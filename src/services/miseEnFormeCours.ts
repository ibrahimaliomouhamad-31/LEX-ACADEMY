/**
 * MISE EN FORME DES COURS — style FICHE D'EXCELLENCE (inspire APC).
 * Normalise le texte brut Firestore vers le markdown de ReponseIA
 * (titres, listes, tableaux GFM, encadres auto). Fonctions pures.
 */

const LIGNE_FILET = /^\s*[━─═▬=_\-‒–—]{3,}\s*$/;
const LIGNE_ROMAL = /^\s*(#{0,3}\s*)?(I{1,3}|IV|V|VI|VII|VIII|IX|X)\.\s+(.+)$/;
const LIGNE_SOUS_TITRE = /^\s*(?:🔹|🔸|📌|📖|🧪|⚙️|🎓|✅|💡|⚠️|🎯|🧩)?\s*(\d{1,2})\.\s+(.+)$/;
const LIGNE_PUCE = /^\s*[•▪◦▪]\s+(.*)$/;
const LIGNE_DEF = /^\s*(Définition|Théorème|Propriété|Propriétés|Règle|Formule|Exemple|Remarque|Méthode|Corollaire)\s*:\s*(.*)$/i;
const LIGNE_OBJ = /^\s*(🎯\s*)?(OBJECTIF|Objectif|Compétence|Compétences)\s*(DU CHAPITRE)?\s*:\s*(.*)$/;
const LIGNE_SITU = /^\s*(🧩\s*)?(Situation\s+d'apprentissage|Situation|Problème|Activité\s+d'approche|Mise\s+en\s+situation)\s*:\s*(.*)$/i;
const LIGNE_PRE = /^\s*(📌\s*)?(Prérequis|Ce que je dois (déjà )?savoir|Rappels?)\s*:?\s*(.*)$/i;
const LIGNE_ESS = /^\s*(✅\s*)?(L'essentiel|À retenir|Points? clés?|Savoirs? et savoir-?faire|Résumé)\s*:?\s*(.*)$/i;

export interface ChapitreOfficiel {
  id: string;
  classe: string;
  matiere: string;
  titre: string;
  /**
   * Ordre pédagogique conseillé dans le sommaire (1 = premier chapitre).
   * Les chapitres sans ordre explicite (0) sont affichés après, par titre.
   */
  ordre?: number;
  /** Résumé d'une phrase affiché dans la liste des chapitres. */
  resume?: string;
  /** Situation d'apprentissage (contexte concret, question motrice). */
  situation?: string;
  /** Ce que l'élève doit déjà maîtriser avant d'attaquer le chapitre. */
  prerequis?: string[];
  /**
   * Savoirs rédigés en markdown léger (même grammaire que ReponseIA :
   * ## / ### / listes / tableaux GFM / `code` / $formules$ / > citations).
   * Définitions, théorèmes, propriétés, remarques, exemples.
   */
  savoirs: string;
  /** Méthode pas-à-pas type BAC (rédaction attendue par le correcteur). */
  methodeTitre?: string;
  methode?: string;
  /** Erreurs classiques qui coûtent des points + comment les éviter. */
  pieges?: string;
  /** Démonstration ou explication approfondie (repliée par défaut). */
  demonstration?: string;
  /** Énoncé d'exercice type BAC. */
  exerciceEnonce?: string;
  /** Corrigé détaillé étape par étape (replié par défaut). */
  exerciceCorrige?: string;
  /** L'essentiel en 3-5 puces pour réviser la veille du BAC. */
  essentiel?: string[];
}


export interface BlocOfficiel {
  cle: 'situation' | 'prerequis' | 'savoirs' | 'methode';
  titre: string;
  markdown: string;
}

/** Reserve pour l'etape 2 (contenus officiels rediges). */
export function listerBlocsOfficiels(_id: string): BlocOfficiel[] {
  return [];
}

/** Convertit une theorie brute Firestore en markdown structure lisible. */
export function coursEnMarkdown(brut: string | undefined | null): string {
  if (!brut) return '';
  const texte = String(brut).replace(/\\n/g, '\n').replace(/\r\n?/g, '\n');
  const sortie: string[] = [];
  for (const sale of texte.split('\n')) {
    const ligne = sale.replace(/\s+$/g, '');
    if (LIGNE_FILET.test(ligne)) { sortie.push('', '---', ''); continue; }
    const obj = LIGNE_OBJ.exec(ligne);
    if (obj && (obj[4] || '').trim() !== '') { sortie.push('', `🎯 **Objectif** — ${(obj[4] || '').trim()}`, ''); continue; }
    const sit = LIGNE_SITU.exec(ligne);
    if (sit) { sortie.push('', `🧩 **Situation** — ${(sit[3] || '').trim()}`, ''); continue; }
    const pre = LIGNE_PRE.exec(ligne);
    if (pre && (pre[3] || '').trim() !== '') { sortie.push('', `📌 **Prérequis** — ${(pre[3] || '').trim()}`, ''); continue; }
    const ess = LIGNE_ESS.exec(ligne);
    if (ess && (ess[3] || '').trim() !== '') { sortie.push('', `✅ **L'essentiel** — ${(ess[3] || '').trim()}`, ''); continue; }
    const rom = LIGNE_ROMAL.exec(ligne);
    if (rom) { sortie.push('', `## ${rom[2]}. ${rom[3].trim()}`, ''); continue; }
    const def = LIGNE_DEF.exec(ligne);
    if (def) { sortie.push('', `> **${def[1].trim()}**${(def[2] || '').trim() ? ` — ${(def[2] || '').trim()}` : ''}`, ''); continue; }
    const st = LIGNE_SOUS_TITRE.exec(ligne);
    if (st) { sortie.push('', `### ${st[1]}. ${st[2].trim()}`, ''); continue; }
    const puce = LIGNE_PUCE.exec(ligne);
    if (puce) { sortie.push(`- ${puce[1].trim()}`); continue; }
    sortie.push(ligne);
  }
  return sortie.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export type BlocCours =
  | { cle: 'situation'; titre: string; markdown: string }
  | { cle: 'savoirs'; titre: string; markdown: string }
  | { cle: 'methode'; titre: string; markdown: string }
  | { cle: 'pieges'; titre: string; markdown: string }
  | { cle: 'demonstration'; titre: string; markdown: string }
  | { cle: 'exercice'; titre: string; markdown: string };

/** Decoupe un cours Firestore brut en blocs pedagogiques ordonnes. */
export function decouperCoursEnBlocs(cours: {
  activite?: string;
  theorie?: string;
  methode_titre?: string;
  methode_content?: string;
  piege?: string;
  demo?: string;
  exercice_corrige?: string;
}): BlocCours[] {
  const blocs: BlocCours[] = [];
  const activite = coursEnMarkdown(cours.activite);
  if (activite !== '') blocs.push({ cle: 'situation', titre: "🧩 Situation d'apprentissage", markdown: activite });
  const theorie = coursEnMarkdown(cours.theorie);
  if (theorie !== '') blocs.push({ cle: 'savoirs', titre: '📖 Savoirs du chapitre', markdown: theorie });
  const methode = coursEnMarkdown(cours.methode_content);
  if (methode !== '') {
    const st = (cours.methode_titre || '').replace(/\\n/g, ' ').trim();
    blocs.push({ cle: 'methode', titre: '⚙️ Méthode BAC', markdown: `${st !== '' ? `**${st}**\n\n` : ''}${methode}` });
  }
  const piege = coursEnMarkdown(cours.piege);
  if (piege !== '') blocs.push({ cle: 'pieges', titre: '⚠️ Pièges classiques', markdown: piege.startsWith('⚠️') ? piege : `⚠️ ${piege}` });
  const demo = coursEnMarkdown(cours.demo);
  if (demo !== '') blocs.push({ cle: 'demonstration', titre: '🔬 Démonstration', markdown: demo });
  const exo = coursEnMarkdown(cours.exercice_corrige);
  if (exo !== '') blocs.push({ cle: 'exercice', titre: '🎓 Exercice type corrigé', markdown: exo });
  return blocs;
}


