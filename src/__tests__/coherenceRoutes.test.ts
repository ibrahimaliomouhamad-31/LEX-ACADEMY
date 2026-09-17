/**
 * 🧪 CYCLE K — Garde-fou de cohérence : aucun écran orphelin, aucun service
 * sans consommateur.
 *
 * Motivation : plusieurs fonctionnalités mortes ont vécu des mois dans la base
 * (écran de récompenses dont les jetons n'étaient jamais crédités, module de
 * rôles jamais branché, écran de statistiques inaccessible) parce que la
 * détection reposait sur des `grep` manuels — fragiles dès que les guillemets
 * changent (' vs ") ou qu'un import se fait sans extension.
 *
 * Ce test parcourt l'ARBRE RÉEL du dépôt (fs) et échoue si :
 *   1. un fichier de src/app/*.tsx n'est référencé nulle part ailleurs ;
 *   2. un fichier de src/services/*.ts n'est importé nulle part.
 *
 * `_layout.tsx` est exclu des DEUX côtés : c'est la table de routage, pas une
 * preuve d'accessibilité (déclarer une route ne prouve pas qu'un élève peut
 * l'atteindre — c'est exactement ce qui a masqué `admin_roles`).
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RACINE = path.resolve(__dirname, '..'); // -> src/
const DOSSIER_APP = path.join(RACINE, 'app');
const DOSSIER_SERVICES = path.join(RACINE, 'services');

/**
 * Écrans connus comme inatteignables, KEPT volontairement (décision produit).
 * Tout NOUVEL orphelin fera échouer le test : c'est le but.
 */
const ECRANS_TOLERES: readonly string[] = [];
function fichiers(dir: string, extensions: readonly string[]): string[] {
  const sortie: string[] = [];
  for (const entree of fs.readdirSync(dir, { withFileTypes: true })) {
    const complet = path.join(dir, entree.name);
    if (entree.isDirectory()) {
      sortie.push(...fichiers(complet, extensions));
    } else if (extensions.some((e) => entree.name.endsWith(e))) {
      sortie.push(complet);
    }
  }
  return sortie;
}

/**
 * Contenu des sources de src/, indexé par chemin absolu.
 * `avecLayout` = inclut `_layout.tsx` (utile pour les SERVICES : un service
 * initialisé dans le layout racine, comme `appCheck`, est bien consommé).
 * `sansLayout` = l'exclut (utile pour les ÉCRANS : déclarer une route ne
 * prouve pas qu'un élève peut l'atteindre).
 */
function sources(): { avecLayout: Map<string, string>; sansLayout: Map<string, string> } {
  const avecLayout = new Map<string, string>();
  const sansLayout = new Map<string, string>();
  for (const f of fichiers(RACINE, ['.ts', '.tsx'])) {
    const contenu = fs.readFileSync(f, 'utf8');
    avecLayout.set(f, contenu);
    if (path.basename(f) !== '_layout.tsx') sansLayout.set(f, contenu);
  }
  return { avecLayout, sansLayout };
}

/**
 * Un fichier est « référencé » si son nom nu apparaît dans un autre fichier,
 * sous n'importe quelle forme : import relatif ('./x', "../x"), route
 * ('/x'), nom de route ("x"), ou même mention en commentaire. Volontairement
 * permissif : on traque les ORPHELINS TOTAUX, pas les imports implicites.
 */
function orphelins(cibles: string[], tous: Map<string, string>): string[] {
  return cibles.filter((chemin) => {
    const nom = path.basename(chemin).replace(/\.tsx?$/, '');
    for (const [autreChemin, contenu] of tous) {
      if (autreChemin === chemin) continue;
      if (contenu.includes(`/${nom}`)) return false;
      if (contenu.includes(`'${nom}'`) || contenu.includes(`"${nom}"`)) return false;
    }
    return true;
  });
}

describe('Cohérence des routes et des services (cycle K)', () => {
  const { avecLayout, sansLayout } = sources();

  it("aucun écran de src/app/ n'est orphelin", () => {
    const ecrans = fichiers(DOSSIER_APP, ['.tsx'])
      .map((f) => f.replace(/\.tsx$/, ''))
      .filter((f) => path.basename(f) !== '_layout')
      .filter((f) => !ECRANS_TOLERES.includes(path.basename(f)));

    // Garde-fou du garde-fou : si le scan ne trouve rien, le test ne prouve rien.
    expect(ecrans.length).toBeGreaterThan(20);
    expect(orphelins(ecrans, sansLayout).map((f) => path.basename(f))).toEqual([]);
  });

  it("aucun service de src/services/ n'a zéro consommateur", () => {
    const services = fichiers(DOSSIER_SERVICES, ['.ts'])
      .map((f) => f.replace(/\.ts$/, ''))
      .filter((f) => path.basename(f) !== 'index');

    expect(services.length).toBeGreaterThan(20);
    expect(orphelins(services, avecLayout).map((f) => path.basename(f))).toEqual([]);
  });
});