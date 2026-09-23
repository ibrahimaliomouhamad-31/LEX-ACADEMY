/**
 * 🏛️ OUTILS D'ADMINISTRATION — logique PURE (aucun accès réseau).
 *
 * Ces fonctions sont extraites de l'écran `admin.tsx` pour être testables sans
 * Firestore : normalisation des noms saisis par le superadmin, détection d'un
 * identifiant technique, gestion des homonymes, garde-fous de retrait d'admin
 * et construction des traces du journal d'audit.
 *
 * Motivation : l'écran d'administration ne savait pas PROMOUVOIR un élève
 * (bouton « + Ajouter » = simple `Alert`), ni RETIRER un admin (renvoi à la
 * console Firestore), alors que les règles serveur autorisent déjà les deux
 * (`allow create/update/delete: if isAdmin()`).
 */

import type { PermissionKey } from './rolesPermissions';

/** Un profil d'élève tel que lu dans la collection `utilisateurs`. */
export interface ProfilEleve {
  uid: string;
  nom: string;
  classe?: string;
  niveau?: string;
}

/** Un administrateur tel qu'affiché par l'écran 🏛️ (doc `admins/<uid>`). */
export interface AdminListe {
  id: string;
  nom: string;
}

/** Action d'administration tracée dans `journal_audit`. */
export interface TraceAdmin {
  type: 'admin';
  action: string;
  par: string;
  parNom: string;
  cible: string;
  cibleNom: string;
  le: string;
}

/**
 * Normalise un nom pour comparaison : minuscules, sans accents, espaces
 * compactés. «  Ibrahima  ALI » et « ibrahima ali » sont ainsi reconnus égaux —
 * les élèves saisissent rarement leur nom exactement comme à l'inscription.
 */
export function normaliserNom(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Un identifiant technique (uid Firebase) ou un code de transfert peut être
 * collé directement dans le champ de promotion : au moins 20 caractères sans
 * espace. Permet de promouvoir un élève dont le nom est ambigu.
 */
export function estUnUid(s: string): boolean {
  const v = (s || '').trim();
  return v.length >= 20 && !/\s/.test(v);
}

/**
 * Élèves dont le nom correspond à la saisie (insensible casse/accents).
 * Retourne [] plutôt que de lever : l'écran affiche alors une aide.
 */
export function trouverCandidatsParNom(profils: ProfilEleve[], nom: string): ProfilEleve[] {
  const cible = normaliserNom(nom);
  if (!cible) return [];
  return profils
    .filter((p) => normaliserNom(p.nom) === cible)
    .sort((a, b) => (a.classe || a.niveau || '').localeCompare(b.classe || b.niveau || ''));
}

/**
 * Un retrait d'admin est-il possible ?
 * - Il doit TOUJOURS rester au moins un administrateur : sinon plus personne ne
 *   pourrait promouvoir, attribuer des rôles ou modérer l'app (verrouillage
 *   définitif, seul un accès console pourrait le débloquer).
 * - Se retirer soi-même est autorisé (passation de pouvoir) mais seulement
 *   s'il reste un autre admin : l'écran demande alors une confirmation
 *   renforcée, signalée par `avertissement`.
 */
export function verifierRetraitAdmin(
  admins: AdminListe[],
  uidCible: string,
  uidActuel: string
): { autorise: boolean; raison?: string; avertissement?: string } {
  if (!uidCible) {
    return { autorise: false, raison: 'Administrateur introuvable (identifiant manquant).' };
  }
  if (!admins.some((a) => a.id === uidCible)) {
    return { autorise: false, raison: 'Cet utilisateur n’est pas administrateur.' };
  }
  if (admins.length <= 1) {
    return {
      autorise: false,
      raison: 'Impossible : il doit rester au moins un administrateur pour gérer l’app.',
    };
  }
  if (uidCible === uidActuel) {
    return { autorise: true, avertissement: 'Tu vas retirer TON PROPRE accès d’administration.' };
  }
  return { autorise: true };
}

/** Champs d'un document `admins/<uid>` — docId == uid (convention serveur). */
export function docAdminAPromouvoir(uid: string, nom: string, le: string, par: string) {
  return { nom, userId: uid, ajouteLe: le, ajoutePar: par };
}

/** Trace d'audit d'une action d'administration (collection `journal_audit`). */
export function traceAdmin(
  action: string,
  par: string,
  parNom: string,
  cible: string,
  cibleNom: string,
  le: string
): TraceAdmin {
  return { type: 'admin', action, par, parNom, cible, cibleNom, le };
}

/** Libellé lisible d'un rôle de responsabilité (affichage admin). */
export function libelleRoleAdmin(role?: string): string {
  switch (role) {
    case 'superadmin':
      return '👑 Superadmin';
    case 'admin':
      return '🛡️ Administrateur';
    case 'etudiant':
      return '🎓 Élève';
    default:
      return '❔ Inconnu';
  }
}

/**
 * 🏷️ LIBELLÉS DES 50 PERMISSIONS — texte affiché dans la grille de partage.
 *
 * Le type est `Record<PermissionKey, string>` et non un `Record<string, string>`
 * volontairement : ajouter une permission au catalogue SANS lui donner de
 * libellé fait échouer `tsc`. L'interface ne peut donc jamais afficher une
 * case sans texte (ni un libellé orphelin, celui-là étant détecté par
 * `adminUtils.test.ts`).
 */
export const LIBELLES_PERMISSIONS: Record<PermissionKey, string> = {
  peutAider: '🤝 Aider les autres élèves',
  peutCorriger: '✅ Corriger les exercices',
  gererAbsences: '📋 Gérer les absences',
  creerDefis: '⚔️ Créer des défis',
  validerHomework: '📗 Valider les devoirs',
  accesStatsClasse: '📊 Voir les stats de la classe',
  creerAnnonces: '📣 Créer des annonces',
  gererPetitions: '📜 Gérer les pétitions',
  gererUtilisateurs: '👥 Gérer les comptes',
  gererContenu: '📚 Gérer le contenu pédagogique',
  accesAudit: '🔍 Accéder au journal d’audit',
  modifierRoles: '🎭 Modifier les rôles',
  voirCoursTousNiveaux: '👁️ Voir les cours de tous les niveaux',
  modifierCours: '✏️ Modifier les cours',
  publierCours: '🚀 Publier les cours',
  creerExercice: '➕ Créer des exercices',
  modifierExercice: '🛠️ Modifier les exercices',
  gererFichesSynthese: '📄 Gérer les fiches de synthèse',
  gererSchemas: '🖼️ Gérer les schémas',
  gererAudioCours: '🎧 Gérer les audios de cours',
  creerDevoir: '📝 Créer des devoirs',
  corrigerDevoir: '🖊️ Corriger les devoirs',
  publierDevoir: '📤 Publier les devoirs',
  validerDefi: '🏁 Valider les défis',
  gererOlympiades: '🏅 Gérer les olympiades',
  voirListeEleves: '📇 Voir la liste des élèves',
  promouvoirAdmin: '👑 Promouvoir un administrateur',
  retrograderAdmin: '⬇️ Rétrograder un administrateur',
  suspendreCompte: '⏸️ Suspendre un compte',
  reinitialiserMotDePasse: '🔑 Réinitialiser un mot de passe',
  exporterDonneesEleves: '📦 Exporter les données élèves',
  gererInscriptions: '🗂️ Gérer les inscriptions',
  voirSignalements: '🚩 Voir les signalements',
  traiterSignalement: '🧾 Traiter un signalement',
  bannirTemporaire: '⛔ Bannir temporairement',
  voirJournalAide: '📖 Voir le journal d’aide',
  traiterDemandeAide: '🆘 Traiter une demande d’aide',
  accesStatsEcole: '🏫 Voir les stats de l’école',
  exporterStatistiques: '📈 Exporter les statistiques',
  voirJournalAdmin: '🗒️ Voir le journal admin',
  gererClassement: '🏆 Gérer le classement',
  envoyerNotification: '🔔 Envoyer une notification',
  gererGroupes: '👫 Gérer les groupes',
  creerSondage: '🗳️ Créer un sondage',
  gererCalendrierScolaire: '📅 Gérer le calendrier scolaire',
  gererParametresApp: '⚙️ Gérer les paramètres de l’app',
  gererSauvegardes: '💾 Gérer les sauvegardes',
  forcerSync: '🔄 Forcer la synchronisation',
  voirSanteSync: '❤️ Voir l’état de la synchronisation',
  gererModeExamen: '🕵️ Gérer le mode examen',
  creerCompte: '👤 Créer un compte élève',
  promouvoirEleve: '⬆️ Promouvoir un élève admin',
};

/** Libellé d'une permission, avec repli lisible si le catalogue évolue. */
export function libellePermission(cle: PermissionKey): string {
  return LIBELLES_PERMISSIONS[cle] || cle;
}

/**
 * Valeurs acceptées pour le champ `classe` lors du chargement des élèves :
 * le modèle lycée valide `niveau` (« 2nde », « 1ere », « terminale ») tandis
 * que `classe` reste un texte libre (≤ 30 car.) hérité des anciens profils.
 * On tente donc les deux, sans jamais exiger la casse exacte.
 */
export const NIVEAUX_LYCEE = ['2nde', '1ere', 'terminale'] as const;

/** Variantes de saisie à essayer pour retrouver les élèves d'une classe. */
export function variantesClasse(saisie: string): string[] {
  const v = (saisie || '').trim();
  if (!v) return [];
  const sansAccent = normaliserNom(v);
  const variantes = new Set<string>([v, sansAccent]);
  for (const niveau of NIVEAUX_LYCEE) {
    if (sansAccent === normaliserNom(niveau) || sansAccent.includes(normaliserNom(niveau))) {
      variantes.add(niveau);
    }
  }
  if (/^1(ere|ère|re)$/.test(sansAccent)) variantes.add('1ere');
  if (sansAccent.startsWith('term')) variantes.add('terminale');
  if (sansAccent.startsWith('2') || sansAccent.startsWith('sec')) variantes.add('2nde');
  return [...variantes];
}
