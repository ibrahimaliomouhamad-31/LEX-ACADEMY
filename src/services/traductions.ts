// TRADUCTIONS FR/EN — couvre les libellés principaux de l'app (v1).

export type Langue = 'fr' | 'en';

const DICO: { [cle: string]: { fr: string; en: string } } = {
  // Accueil
  bonjour: { fr: 'Bonjour,', en: 'Hello,' },
  pas_connecte: { fr: "Tu n'es pas connecté.", en: 'You are not logged in.' },
  connexion: { fr: "Se connecter / S'inscrire", en: 'Log in / Sign up' },
  espace_revision: { fr: 'ESPACE DE RÉVISION', en: 'STUDY HUB' },
  le_cours: { fr: '📘 Le Cours (Détaillé)', en: '📘 Lessons (Detailed)' },
  exercices: { fr: '✍️ Exercices (Infini)', en: '✍️ Exercises (Infinite)' },
  revisions_jour: { fr: '🧠 Révisions du jour', en: "🧠 Today's review" },
  classement: { fr: '🏆 Classement du LEX', en: '🏆 LEX Leaderboard' },
  lexai: { fr: '🤖 LEX.AI (Assistant)', en: '🤖 LEX.AI (Assistant)' },
  plus: { fr: '🎯 Plus (BAC blanc, flashcards, duels, stats...)', en: '🎯 More (Mock exams, flashcards, duels, stats...)' },
  // Hub
  boite_outils: { fr: 'BOÎTE À OUTILS', en: 'TOOLBOX' },
  plus_titre: { fr: '🎯 Plus de fonctionnalités', en: '🎯 More features' },
  // Exercice
  verifier: { fr: 'Vérifier ma réponse', en: 'Check my answer' },
  ta_reponse: { fr: 'Ta réponse ici (ex: 3 ou un mot)', en: 'Your answer here (e.g. 3 or a word)' },
  retour: { fr: '‹ Retour', en: '‹ Back' },
  // Commun
  hors_ligne_ok: { fr: 'Fonctionne 100% hors-ligne', en: 'Works 100% offline' },
  chargement: { fr: 'Chargement...', en: 'Loading...' },
};

export function t(cle: string, langue: Langue): string {
  const entree = DICO[cle];
  if (!entree) return cle;
  return entree[langue];
}
