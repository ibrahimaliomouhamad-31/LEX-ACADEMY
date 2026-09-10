// CITATIONS MOTIVATIONNELLES (amélioration 8) : module dédié pour les citations
// affichées dans l'application (badges, accueil, etc.)

export interface Citation {
  texte: string;
  auteur: string;
}

export const CITATIONS: Citation[] = [
  { texte: "Le succès est la somme de petits efforts répétés jour après jour.", auteur: "Robert Collier" },
  { texte: "L'éducation est l'arme la plus puissante pour changer le monde.", auteur: "Nelson Mandela" },
  { texte: "Le seul moyen de faire du bon travail est d'aimer ce que vous faites.", auteur: "Steve Jobs" },
  { texte: "La connaissance est le commencement de l'action.", auteur: "Proverbe africain" },
  { texte: "Chaque expert était un jour un débutant.", auteur: "Helen Hayes" },
  { texte: "L'avenir appartient à ceux qui croient en la beauté de leurs rêves.", auteur: "Eleanor Roosevelt" },
  { texte: "Le travail est la clé de la réussite.", auteur: "Proverbe touareg" },
  { texte: "Celui qui déplace une montagne commence par déplacer de petites pierres.", auteur: "Confucius" },
];

/** Retourne une citation aléatoire. */
export function citationAleatoire(): Citation {
  return CITATIONS[Math.floor(Math.random() * CITATIONS.length)];
}

/** Retourne toutes les citations disponibles. */
export function toutesLesCitations(): Citation[] {
  return [...CITATIONS];
}
