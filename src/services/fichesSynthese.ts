// FICHES DE SYNTHÈSE : résumé révisable par chapitre, exportable (amélioration 4)
import { genererSectionsCours } from './enrichirCours';

export interface FicheSynthese {
  titre: string;
  matiere: string;
  lignes: string[];
  genereeLe: number;
}

/** Construit une fiche compacte (1 écran) à partir du cours + enrichissement local. */
export function construireFiche(titreChapitre: string, matiere: string, contenuCours: string): FicheSynthese {
  const sections = genererSectionsCours(titreChapitre, matiere, contenuCours || titreChapitre);
  const lignes: string[] = [`📌 FICHE — ${titreChapitre}`, `Matière : ${matiere}`, ''];
  for (const s of sections) {
    lignes.push(`▸ ${s.titre}`);
    for (const l of s.lignes.slice(0, 3)) {
      lignes.push(`  ${l.replace(/^[-•]\s*/, '· ')}`);
    }
    lignes.push('');
  }
  lignes.push('💡 Relis cette fiche 10 min avant chaque cours pour ancrer la mémoire.');
  return { titre: titreChapitre, matiere, lignes, genereeLe: Date.now() };
}

/** Export "partage" en texte brut (WhatsApp, sauvegarde locale, etc.). */
export function ficheEnTexte(f: FicheSynthese): string {
  return f.lignes.join('\n');
}