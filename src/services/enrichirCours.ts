/**
 * 📚 ENRICHISSEUR LOCAL DE COURS (+200%)
 *
 * Le contenu des cours vient de Firebase et peut être court. Ce service génère
 * LOCALEMENT (0 requête réseau, 100 % hors-ligne) des sections pédagogiques
 * supplémentaires et cohérentes avec le chapitre, portant la longueur perçue
 * du cours à ~3× :
 *   1. Objectifs du chapitre
 *   2. Méthode pas-à-pas
 *   3. Exemples résolus / Exemples d'application
 *   4. Erreurs fréquentes à éviter (pièges)
 *   5. Points clés à retenir
 *   6. Questions d'auto-évaluation
 *   7. Schéma annoté (si le chapitre s'y prête)
 *
 * Le contenu est adapté au thème détecté (mathématiques, analyse, géométrie,
 * trigonométrie, physique, chimie, SVT, probabilités, ...) pour rester pertinent.
 */

import { schemaPourChapitre } from './schemas';

export interface SectionCours {
  emoji: string;
  titre: string;
  lignes: string[];
}

function normaliser(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ');
}

export type ThemeCours = 'mathematiques' | 'analyse' | 'geometrie' | 'trigonometrie' | 'complexes' | 'probabilites' | 'physique' | 'chimie' | 'svt' | 'general';

/** Détecte le thème d'un chapitre à partir de son titre et de sa matière. */
export function detecterTheme(titre: string, matiere?: string): ThemeCours {
  const t = normaliser(`${titre} ${matiere || ''}`);
  if (/ln|log|expo|derive|integr|limite|continu|suite|fonction/.test(t)) return 'analyse';
  if (/angle|sin|cos|tan|trigonometr/.test(t)) return 'trigonometrie';
  if (/complexe|imaginaire|argument|module/.test(t)) return 'complexes';
  if (/probab|denombrement|arrangement|combinaison|loi|statist/.test(t)) return 'probabilites';
  if (/vecteur|droite|plan|triangle|pythagore|cercle|sphere|aire|volume|projet/.test(t)) return 'geometrie';
  if (/chimi|solution|mole|atom|reaction|electro|oxydo|acide|base|concentration/.test(t)) return 'chimie';
  if (/physi|mecani|force|vitesse|energie|electric|mouvement|newton|magnet/.test(t)) return 'physique';
  if (/svt|biologi|cellule|gene|ecosystem|neurone|digest|reprodu|vegetal|adn/.test(t)) return 'svt';
  if (/math|algebr|equat|nombre|calcul/.test(t)) return 'mathematiques';
  return 'general';
}

function majuscule(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// --- Gabarits par thème pour chaque section ---
const GABARITS: Record<ThemeCours, {
  objectifs: string[];
  methodes: string[];
  exemples: string[];
  pieges: string[];
  cles: string[];
  autoEval: string[];
}> = {
  mathematiques: {
    objectifs: [
      'Maîtriser les définitions et notations du chapitre',
      'Savoir appliquer les propriétés et formules à des cas concrets',
      'Résoudre des équations et inéquations de façon méthodique',
      'Interpréter les résultats et vérifier leur cohérence',
      'Réinvestir les notions dans des exercices de type BAC',
    ],
    methodes: [
      '1. Relire le cours et noter les définitions et les propriétés clés sur une fiche.',
      '2. Reformuler chaque règle avec tes propres mots pour vérifier ta compréhension.',
      '3. Reproduire les exemples du cours SANS regarder, puis comparer pas à pas.',
      '4. Appliquer la méthode sur un exercice simple avant de passer aux cas difficiles.',
      '5. À la fin, écrire la « recette » : les étapes précises à suivre face à ce type de problème.',
    ],
    exemples: [
      'Exemple résolu : écris les données, pose l\'équation, résous, puis vérifie en remplaçant la solution.',
      'Application : traduis l\'énoncé en notation mathématique avant de chercher le résultat.',
      'Exemple type BAC : identifie bien le théorème à employer et cite-le dans ta rédaction.',
    ],
    pieges: [
      '⚠️ Oublier de vérifier les conditions d\'existence (dénominateur, racine, logarithme).',
      '⚠️ Confondre le signe de l\'inéquation quand on multiplie par une quantité négative.',
      '⚠️ Ne pas arrondir la réponse finale à la précision demandée dans l\'énoncé.',
      '⚠️ Sauter des étapes de rédaction : tout doit être justifié pour le BAC.',
    ],
    cles: [
      'Repère la définition exacte et apprends-la par cœur.',
      'Connais les propriétés dans les deux sens (si ... alors ... et réciproquement).',
      'Vérifie toujours ton résultat avec une valeur simple.',
    ],
    autoEval: [
      'Saurais-tu écrire la définition du chapitre de mémoire ?',
      'Peux-tu résoudre un exercice du type vu en cours sans aide ?',
      'Quelle est l\'erreur la plus fréquente dans ce chapitre ? Comment l\'éviter ?',
    ],
  },
analyse: {
    objectifs: [
      'Comprendre la notion de dérivée / limite / intégrale et son interprétation graphique',
      'Savoir calculer des dérivées, limites et primitives usuelles',
      'Étudier les variations d\'une fonction et dresser son tableau',
      'Utiliser les suites (arithmétiques, géométriques) et leur convergence',
      'Lier représentation graphique et résultats algébriques',
    ],
    methodes: [
      '1. Vérifier d\'abord le domaine de définition de la fonction.',
      '2. Pour une dérivée : appliquer les règles de dérivation terme à terme.',
      '3. Pour une limite : repérer la forme indéterminée et lever l\'indétermination (factorisation, quantité conjuguée).',
      '4. Étudier le signe de la dérivée pour en déduire les variations.',
      '5. Conclure avec le tableau de variations et justifier chaque étape.',
    ],
    exemples: [
      'Exemple : pour f(x)=x²+3x, la dérivée est f\'(x)=2x+3 ; on en déduit les variations.',
      'Limite type : factoriser le terme de plus haut degré pour lever une forme indéterminée.',
      'Suite : exprimer le terme général puis calculer sa limite quand n tend vers l\'infini.',
    ],
    pieges: [
      '⚠️ Oublier le domaine de définition avant tout calcul.',
      '⚠️ Confondre dérivée et primitive, ou la formule du produit avec celle de la somme.',
      '⚠️ Traiter une forme indéterminée sans la lever correctement.',
      '⚠️ Mélanger les notations f, f\' et le nombre dérivé f\'(a).',
    ],
    cles: [
      'Le signe de la dérivée commande la croissance de la fonction.',
      'Une limite finie donne une valeur, une limite infinie donne une tendance.',
      'L\'intégrale mesure une aire algébrique sous la courbe d\'une primitive.',
    ],
    autoEval: [
      'Peux-tu dériver correctement la fonction du dernier exemple ?',
      'Sais-tu lever chaque type de forme indéterminée ?',
      'Peux-tu dresser le tableau de variations d\'une fonction simple ?',
    ],
  },
  geometrie: {
    objectifs: [
      'Connaître les propriétés et théorèmes de la géométrie du programme',
      'Savoir calculer aires, volumes, longueurs et distances',
      'Utiliser le repérage vectoriel pour résoudre des problèmes',
      'Appliquer les relations trigonométriques dans les triangles',
      'Représenter et interpréter les figures en coordonnées',
    ],
    methodes: [
      '1. Faire une figure claire et annotée avec toutes les données.',
      '2. Identifier le théorème ou la propriété adaptée à la situation.',
      '3. Appliquer la formule en remplaçant les valeurs une par une.',
      '4. Vérifier les unités et l\'ordre de grandeur du résultat.',
      '5. Rédiger la conclusion en rappelant la question posée.',
    ],
    exemples: [
      'Pythagore : dans un triangle rectangle, le carré de l\'hypoténuse égale la somme des carrés des deux autres côtés.',
      'Aire/perimetre : applique la bonne formule puis vérifie avec des unités cohérentes.',
      'Vecteurs : pour aligner trois points, montrer que deux vecteurs sont colinéaires.',
    ],
    pieges: [
      '⚠️ Appliquer Pythagore à un triangle qui n\'est pas rectangle.',
      '⚠️ Confondre rayon et diamètre, ou hauteur et côté.',
      '⚠️ Écrire des résultats sans préciser l\'unité (cm, m², cm³).',
    ],
    cles: [
      'Une figure annotée est déjà la moitié de la solution.',
      'Choisis la formule adaptée à la figure (triangle, cercle, sphère...).',
      'Toujours vérifier l\'unité et l\'ordre de grandeur.',
    ],
    autoEval: [
      'Peux-tu énoncer le théorème utilisé sans regarder le cours ?',
      'Saurais-tu retrouver la formule de l\'aire d\'un triangle ?',
      'Peux-tu justifier que deux droites sont perpendiculaires ?',
    ],
  },
trigonometrie: {
    objectifs: [
      'Connaître les valeurs remarquables des angles usuels',
      'Maîtriser les relations sin²+cos²=1 et tan=sin/cos',
      'Résoudre des équations trigonométriques',
      'Utiliser la trigonométrie dans les triangles (formule des sinus/cosinus)',
      'Interpréter les fonctions sin, cos, tan et leurs courbes',
    ],
    methodes: [
      '1. Si l\'angle est remarquable, remplace par sa valeur connue.',
      '2. Sinon, exprime tout en sin et cos et simplifie avec les identités.',
      '3. Pour une équation, isole sin(x) ou cos(x) puis résous sur l\'intervalle demandé.',
      '4. Vérifie que les solutions trouvées sont dans le bon intervalle (modulo 2π).',
      '5. Conclus en donnant toutes les solutions sur l\'intervalle étudié.',
    ],
    exemples: [
      'Valeurs remarquables : sin(0)=0, sin(π/2)=1, sin(π)=0, cos(0)=1, cos(π/2)=0.',
      'Identité : sin²(x)+cos²(x)=1 sert à passer de l\'un à l\'autre.',
      'Équation : résoudre sin(x)=1/2 sur [0;2π] donne x=π/6 et x=5π/6.',
    ],
    pieges: [
      '⚠️ Oublier que sin et cos sont périodiques (ajouter 2kπ).',
      '⚠️ Confondre degrés et radians dans les calculs.',
      '⚠️ Oublier le signe de sin ou cos selon le quadrant.',
    ],
    cles: [
      'Mémorise les valeurs remarquables (0, π/6, π/4, π/3, π/2).',
      'Toujours indiquer l\'unité : radian par défaut au BAC.',
      'Vérifie le nombre de solutions sur l\'intervalle demandé.',
    ],
    autoEval: [
      'Peux-tu donner sin(π/6), cos(π/3), tan(π/4) de mémoire ?',
      'Peux-tu résoudre cos(x)=1/2 sur [0;2π] ?',
      'Saurais-tu simplifier sin²(x)+cos²(x) ?',
    ],
  },
  complexes: {
    objectifs: [
      'Représenter un nombre complexe dans le plan (partie réelle et imaginaire)',
      'Calculer : addition, produit, conjugué, inverse',
      'Passer de la forme algébrique à la forme trigonométrique (module et argument)',
      'Résoudre des équations du second degré dans ℂ',
      'Utiliser les complexes en géométrie (translation, rotation)',
    ],
    methodes: [
      '1. Identifie z = a + ib avec a = Re(z) et b = Im(z).',
      '2. Pour le module : |z| = √(a² + b²).',
      '3. Pour l\'argument : θ tel que cosθ=a/|z| et sinθ=b/|z|.',
      '4. Pour résoudre : applique les formules du second degré ou factorise.',
      '5. Vérifie en replaçant la solution dans l\'équation initiale.',
    ],
    exemples: [
      'Si z=1+i, alors |z|=√2 et arg(z)=π/4 : la forme trigonométrique est √2(cosπ/4 + i sinπ/4).',
      'Produit de conjugués : z·z̄ = |z|² = a² + b² (toujours réel).',
      'Équation : z² + 1 = 0 a pour solutions z=i et z=-i.',
    ],
    pieges: [
      '⚠️ Oublier i² = -1 dans les calculs de produits.',
      '⚠️ Confondre module et conjugué.',
      '⚠️ Ne pas redonner les solutions sous la forme a+ib demandée.',
    ],
    cles: [
      'Le module est une distance, donc toujours positif.',
      'z·z̄ = |z|² est une identité très utile.',
      'Toujours écrire i² = -1 pour simplifier.',
    ],
    autoEval: [
      'Peux-tu calculer (1+i)(1-i) ?',
      'Saurais-tu trouver le module et l\'argument de z=i ?',
      'Peux-tu résoudre z² + 1 = 0 ?',
    ],
  },
probabilites: {
    objectifs: [
      'Connaître les notions d\'événement, univers et probabilité',
      'Calculer des probabilités simples, conditionnelles et totales',
      'Maîtriser le dénombrement : arrangements et combinaisons',
      'Utiliser la loi binomiale et ses formules',
      'Interpréter les probabilités dans des situations concrètes',
    ],
    methodes: [
      '1. Décris l\'univers et compte le nombre de cas possibles et favorables.',
      '2. Applique P = (cas favorables)/(cas possibles) si l\'équiprobabilité est assurée.',
      '3. Pour une probabilité conditionnelle : P(A|B) = P(A∩B) / P(B).',
      '4. Pour une loi binomiale : identifie n, p puis applique la formule.',
      '5. Vérifie que le résultat est bien un nombre entre 0 et 1.',
    ],
    exemples: [
      'Dé : P(obtenir un nombre pair) = 3/6 = 1/2.',
      'Combinaisons : pour choisir 2 élèves parmi 10, C(10,2)=45 façons.',
      'Loi binomiale : P(X=k) = C(n,k)·p^k·(1-p)^(n-k).',
    ],
    pieges: [
      '⚠️ Oublier l\'équiprobabilité avant d\'appliquer la formule classique.',
      '⚠️ Confondre "et" (intersection) et "ou" (union).',
      '⚠️ Donner un résultat hors de l\'intervalle [0;1].',
    ],
    cles: [
      'Une probabilité est toujours entre 0 et 1.',
      'La somme des probabilités de tous les cas = 1.',
      'Distingue bien arrangement (ordre compte) et combinaison (ordre non brutal).',
    ],
    autoEval: [
      'Peux-tu calculer P(nombre pair) avec un dé ?',
      'Saurais-tu distinguer arrangement et combinaison ?',
      'Peux-tu appliquer la formule P(A|B) ?',
    ],
  },
  physique: {
    objectifs: [
      'Identifier les grandeurs, unités et le système international',
      'Appliquer les lois fondamentales (Newtons, Ohm, conservation)',
      'Analyser un mouvement et calculer vitesses et accélérations',
      'Étudier les circuits électriques et l\'énergie',
      'Interpréter les résultats et faire l\'analyse dimensionnelle',
    ],
    methodes: [
      '1. Lis l\'énoncé et écris les données avec leurs unités.',
      '2. Convertis toutes les unités dans le système international.',
      '3. Choisis la loi adaptée et écris la formule complète.',
      '4. Remplace les valeurs une par une sans sauter d\'étape.',
      '5. Vérifie l\'unité et l\'ordre de grandeur du résultat final.',
    ],
    exemples: [
      'Loi d\'Ohm : U = R·I, donc R = U/I (en ohms).',
      'Énergie cinétique : Ec = ½·m·v² avec v en m/s et m en kg.',
      'Vitesse : v = d/t avec d en mètres et t en secondes.',
    ],
    pieges: [
      '⚠️ Oublier de convertir km/h en m/s (divise par 3,6).',
      '⚠️ Confondre les unités de la tension (V) et du courant (A).',
      '⚠️ Faire des calculs sans vérifier la cohérence dimensionnelle.',
    ],
    cles: [
      'Le SI est la base : m, kg, s, A, V, Ω.',
      'Analyse dimensionnelle : l\'unité du résultat doit être juste.',
      'Convertis avant de calculer, jamais après.',
    ],
    autoEval: [
      'Peux-tu convertir 54 km/h en m/s ?',
      'Saurais-tu appliquer U = R·I ?',
      'Quelle est l\'unité de l\'énergie ?',
    ],
  },
chimie: {
    objectifs: [
      'Connaître les notions de mole, masse molaire et concentration',
      'Équilibrer des équations de réaction chimique',
      'Calculer une quantité de matière n = m/M et C = n/V',
      'Distinguer acide, base, oxydant et réducteur',
      'Utiliser le tableau d\'avancement',
    ],
    methodes: [
      '1. Écris l\'équation de la réaction et équilibre-la.',
      '2. Calcule les quantités de matière avec n = m/M ou C·V.',
      '3. Repère le réactif limitant (le nombre le plus petit après division par le coefficient).',
      '4. Déduis les quantités produites au tableau d\'avancement.',
      '5. Conclus en calculant concentration ou masse demandée.',
    ],
    exemples: [
      'Concentration : C = n/V ; pour 0,1 mol dans 0,5 L, C = 0,2 mol/L.',
      'Quantité de matière : n = m/M ; pour 2 g de NaCl (M≈58,5 g/mol), n ≈ 0,034 mol.',
      'Réactif limitant : c\'est celui qui s\'épuise en premier dans la réaction.',
    ],
    pieges: [
      '⚠️ Oublier les unités (g/L, mol/L) et la conversion de volume en litres.',
      '⚠️ Ne pas équilibrer l\'équation avant de raisonner sur les quantités.',
      '⚠️ Confondre masse molaire M, masse m et quantité n.',
    ],
    cles: [
      'n = m/M et C = n/V sont les deux formules maîtresses.',
      'Le réactif limitant détermine la réaction : repère-le toujours.',
      'Travaille en mol, jamais en grammes dans les rapports de réaction.',
    ],
    autoEval: [
      'Peux-tu calculer une quantité de matière si tu connais m et M ?',
      'Saurais-tu repérer le réactif limitant ?',
      'Comment convertis-tu un volume en mL vers L ?',
    ],
  },
  svt: {
    objectifs: [
      'Comprendre l\'organisation du vivant et la structure cellulaire',
      'Expliquer la transmission du patrimoine génétique (ADN, gènes)',
      'Décrire le fonctionnement des systèmes (digestif, nerveux, circulatoire)',
      'Étudier les écosystèmes et les relations entre êtres vivants',
      'S\'approprier la démarche scientifique et le vocabulaire de la discipline',
    ],
    methodes: [
      '1. Repose la question sous forme d\'hypothèse avant de répondre.',
      '2. Illustre chaque idée avec un exemple ou un schéma annoté.',
      '3. Structure la réponse : décrire, expliquer, conclure.',
      '4. Utilise le vocabulaire scientifique précis de la leçon.',
      '5. Relis ta réponse en te demandant si elle répond vraiment à la question.',
    ],
    exemples: [
      'Cellule : unité structurale et fonctionnelle du vivant, délimitée par une membrane.',
      'ADN : molécule support de l\'information génétique, formée de nucléotides.',
      'Écosystème : ensemble formé par un milieu et les êtres vivants qui y interagissent.',
    ],
    pieges: [
      '⚠️ Répondre sans utiliser le schéma/vocabulaire du cours.',
      '⚠️ Confondre le rôle d\'une structure avec sa localisation.',
      '⚠️ Écrire de longues phrases sans structure claire.',
    ],
    cles: [
      'Le vocabulaire précis fait la différence au BAC.',
      'Un schéma légendé vaut souvent mieux qu\'un long texte.',
      'La démarche : observer, s\'interroger, émettre une hypothèse, vérifier.',
    ],
    autoEval: [
      'Peux-tu expliquer le rôle de la membrane cellulaire ?',
      'Saurais-tu décrire une relation dans un écosystème ?',
      'Quel vocabulaire clé dois-tu mémoriser de ce chapitre ?',
    ],
  },
  general: {
    objectifs: [
      'Comprendre les idées principales et la démarche du chapitre',
      'Savoir reformuler les définitions et propriétés essentielles',
      'Appliquer les notions sur des exemples concrets',
      'Faire le lien avec les exercices et le programme du BAC',
      'Identifier les points forts et les lacunes à combler',
    ],
    methodes: [
      '1. Lis le cours une première fois pour saisir l\'ensemble, sans t\'arrêter.',
      '2. Relis en soulignant les définitions et propriétés clés.',
      '3. Fais une fiche de révision avec l\'essentiel.',
      '4. Reproduis les exemples sans regarder, puis compare.',
      '5. Teste-toi avec les questions d\'auto-évaluation ci-dessous.',
    ],
    exemples: [
      'Reprends chaque notion vue et donne un exemple personnel.',
      'Applique la méthode sur un exercice du chapitre.',
      'Reformule la conclusion du cours dans tes propres mots.',
    ],
    pieges: [
      '⚠️ Lire passivement sans rien écrire ni retenir.',
      '⚠️ Passer au chapitre suivant sans avoir compris les bases.',
      '⚠️ Ignorer les définitions : elles sont la base des évaluations.',
    ],
    cles: [
      'Reformuler pour comprendre : c\'est la meilleure mémorisation.',
      'Revoir régulièrement vaut mieux qu\'un long bloc.',
      'Chaque notion s\'apprend par la pratique.',
    ],
    autoEval: [
      'Peux-tu résumer ce chapitre en 3 phrases ?',
      'Quelle notion as-tu le moins bien comprise ?',
      'Sauras-tu expliquer l\'essentiel à un camarade ?',
    ],
  },
};
/**
 * Génère les sections d'enrichissement du cours à partir du titre, de la
 * matière et d'un peu du contenu existant. Le nombre de sections est
 * suffisant pour porter la longueur à ~3×.
 */
export function genererSectionsCours(titre: string, matiere?: string, contenu?: string): SectionCours[] {
  const theme = detecterTheme(titre, matiere);
  const g = GABARITS[theme];
  const seed = (normaliser(titre).length + (matiere || '').length + (contenu || '').length) % 100;
  const rng = (seed % 10) / 10;
  const sujet = majuscule((titre || 'ce chapitre').trim());

  const sections: SectionCours[] = [];

  sections.push({ emoji: '🎯', titre: 'Objectifs du chapitre', lignes: g.objectifs });

  sections.push({
    emoji: '🛠️',
    titre: 'Méthode pas-à-pas',
    lignes: [`Pour réussir « ${sujet} », suis cette démarche :`, ...g.methodes],
  });

  sections.push({
    emoji: '💡',
    titre: 'Exemples d\'application',
    lignes: [`Exemples types autour de « ${sujet} » :`, ...g.exemples],
  });

  sections.push({ emoji: '🚫', titre: 'Erreurs fréquentes à éviter', lignes: g.pieges });

  sections.push({ emoji: '📌', titre: 'Points clés à retenir', lignes: g.cles });

  sections.push({ emoji: '✅', titre: 'Questions d\'auto-évaluation', lignes: g.autoEval });

  // 📐 Schéma annoté si le chapitre s'y prête (amélioration 26)
  const schema = schemaPourChapitre(titre);
  if (schema) {
    sections.push({ emoji: '📐', titre: `Schéma : ${schema.titre}`, lignes: [schema.art, '', `➡️ ${schema.legende}`] });
  }

  // On permute légèrement l'ordre des exemples pour varier (déterminisme local)
  if (rng < 0.5) {
    const [intro, ...exemples] = sections[2].lignes;
    sections[2].lignes = [intro, ...exemples.reverse()];
  }

  return sections;
}

/** Concatène toutes les sections en un seul grand texte (utile pour l'audio). */
export function sectionsEnTexte(sections: SectionCours[]): string {
  return sections
    .map((s) => `${s.titre}.\n${s.lignes.join('\n')}`)
    .join('\n\n');
}