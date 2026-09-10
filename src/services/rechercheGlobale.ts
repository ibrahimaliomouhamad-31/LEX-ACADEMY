// RECHERCHE GLOBALE — un mot-clé → exercices en cache, formules, cours et
// olympiades. Stratégique : c'est LE point d'entrée unique de tout le contenu.

import { getAllCoursCache, getAllCachedChapterIds, getExercices } from './cacheHorsLigne';
import { FORMULES, type Formule } from './formulaire';
import { OLYMPIADES, type ProblemeOlympiade } from './olympiades';
import { chercherGlossaire, type TermeGlossaire } from './programmeOfficiel';

export interface ResultatRecherche {
  exercices: { id: string; enonce: string; chapitre: string }[];
  formules: Formule[];
  cours: { id: string; titre: string; matiere?: string }[];
  olympiades: ProblemeOlympiade[];
  glossaire: TermeGlossaire[];
}

function normaliserCle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export async function rechercher(texte: string): Promise<ResultatRecherche> {
  const resultat: ResultatRecherche = { exercices: [], formules: [], cours: [], olympiades: [], glossaire: [] };
  const cle = normaliserCle(texte);
  if (cle.length < 2) return resultat;

  // 1) Exercices en cache (parcourt les chapitres téléchargés)
  try {
    for (const chapitreId of await getAllCachedChapterIds()) {
      const exos = (await getExercices(chapitreId)) || [];
      for (const e of exos) {
        if (resultat.exercices.length >= 30) break;
        if (normaliserCle(`${e.enonce} ${e.chapitre || ''}`).includes(cle)) {
          resultat.exercices.push({ id: e.id, enonce: e.enonce, chapitre: e.chapitre || '' });
        }
      }
      if (resultat.exercices.length >= 30) break;
    }
  } catch {
    // ignore
  }

  // 2) Formules (toujours disponibles, intégrées dans l'app)
  resultat.formules = FORMULES.filter((f) =>
    normaliserCle(`${f.titre} ${f.formule} ${f.categorie} ${f.explication}`).includes(cle)
  ).slice(0, 20);

  // 3) Cours téléchargés
  try {
    const cours = await getAllCoursCache();
    resultat.cours = cours
      .filter((c) => normaliserCle(`${c.titre} ${c.theorie || ''} ${c.methode_content || ''}`).includes(cle))
      .slice(0, 10)
      .map((c) => ({ id: c.id, titre: c.titre, matiere: c.matiere }));
  } catch {
    // ignore
  }

  // 4) Olympiades
  resultat.olympiades = OLYMPIADES.filter((p) =>
    normaliserCle(`${p.theme} ${p.enonce}`).includes(cle)
  ).slice(0, 10);

  // 5) Glossaire scientifique (recherche dans les termes, définitions et matières)
  resultat.glossaire = chercherGlossaire(texte).slice(0, 20);

  return resultat;
}
