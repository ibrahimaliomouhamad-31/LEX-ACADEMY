/**
 * 👥 GESTION DES RÔLES & PERMISSIONS
 * Rôles de responsabilité (moniteur, chef de classe, délégué) attribués par le
 * proviseur depuis l'ecran admin_roles. La source de verite de l'admin est la
 * collection `admins` (voir estAdminActuel).
 */

import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { getCurrentUserId } from './auth';
import { rapporterErreur } from '../utils/logger';

/**
 * 👑 URL de la fonction de bootstrap superadmin (même projet/region que
 * `lexaiChat`, cf. configIA.ts). Elle n'accepte qu'un appel AUTHENTIFIÉ :
 * l'app envoie le jeton Firebase de la session, la fonction en déduit l'uid
 * (jamais transmis par le client → aucun risque d'usurpation d'uid).
 */
const URL_DEVENIR_SUPERADMIN =
  'https://us-central1-lex-academy-10eef.cloudfunctions.net/devenirSuperAdmin';

/** Jeton d'identité Firebase de la session — '' si non connecté. */
async function jetonIdentite(): Promise<string> {
  try {
    const utilisateur = (auth as { currentUser?: { getIdToken?: () => Promise<string> } } | null)
      ?.currentUser;
    if (utilisateur && typeof utilisateur.getIdToken === 'function') {
      return await utilisateur.getIdToken();
    }
  } catch (error) {
    rapporterErreur('[roles] Jeton identite indisponible:', error);
  }
  return '';
}

/**
 * L'utilisateur courant est-il administrateur ?
 *
 * Priorité à la collection `admins` : c'est la SEULE réellement alimentée par
 * l'écran 🏛️ `admin.tsx` (bootstrap « code proviseur » → `setDoc(doc(db,'admins',uid))`).
 * Convention `docId == uid` : c'est le CHEMIN testé par `isAdmin()` dans
 * `firestore.rules` (les règles ne savent pas faire de « where »).
 * Repli sur `roles/{uid}.isAdmin`, pour ne pas casser un admin provisionné
 * selon l'ancien modèle.
 *
 * ⚠️ Ce test REMPLACE l'ancien `getDoc(doc(db,'roles',uid))` seul : comme le
 * proviseur n'existe que dans `admins`, ce test échouait toujours → l'écran
 * d'attribution des rôles affichait « Permissions insuffisantes » au proviseur
 * lui-même, même après un bootstrap réussi.
 */
export async function estAdminActuel(): Promise<boolean> {
  const uid = await getCurrentUserId();
  if (!uid) return false;

  try {
    // 📌 Convention serveur : le doc d'admin porte l'ID de l'eleve
    // (`admins/<uid>`) — c'est ce CHEMIN exact que teste `isAdmin()` dans
    // `firestore.rules` (les regles ne savent pas faire de « where »).
    // 1 seule lecture, et plus fiable qu'un champ.
    const snapDirect = await getDoc(doc(db, 'admins', uid));
    if (snapDirect.exists()) return true;

    // Repli : anciens documents a ID aleatoire (crees avant la convention).
    const snapAdmin = await getDocs(query(collection(db, 'admins'), where('userId', '==', uid)));
    if (!snapAdmin.empty) return true;
  } catch (error) {
    rapporterErreur('[roles] Erreur lecture collection admins:', error);
  }

  try {
    const snapRole = await getDoc(doc(db, 'roles', uid));
    if (snapRole.exists()) {
      const d = snapRole.data() as {
        isAdmin?: boolean;
        role?: string;
        isDeleted?: boolean;
        estSuperAdmin?: boolean;
      };
      // 👑 Le superadmin passe TOUJOURS par la porte admin (hiérarchie
      // stricte : superadmin ⊃ admin). Sans ce test, un superadmin dont le
      // doc `admins/<uid>` manquerait (ou dont le rôle vaudrait 'superadmin'
      // et non 'admin') se voyait refuser ses propres écrans d'administration.
      const estSuper = d.estSuperAdmin === true || d.role === 'superadmin';
      if (!d.isDeleted && (d.isAdmin === true || d.role === 'admin' || estSuper)) return true;
    }
  } catch (error) {
    rapporterErreur('[roles] Erreur lecture role admin:', error);
  }

  return false;
}

export type UserRole = 'etudiant' | 'moniteur' | 'chef_classe' | 'delegue' | 'admin' | 'superadmin';

/**
 * 🔑 CATALOGUE DES 50 PERMISSIONS (12 historiques + 38 nouvelles).
 *
 * Convention : le NOM est la documentation. Les permissions marquées 🔒
 * (promouvoirAdmin, retrograderAdmin) sont réservées au superadmin :
 * `genererPermissions('admin')` ne les active PAS.
 */
export type PermissionKey =
  // Historiques — entraide de classe
  | 'peutAider'
  | 'peutCorriger'
  | 'gererAbsences'
  | 'creerDefis'
  | 'validerHomework'
  | 'accesStatsClasse'
  | 'creerAnnonces'
  | 'gererPetitions'
  // Historiques — administration
  | 'gererUtilisateurs'
  | 'gererContenu'
  | 'accesAudit'
  | 'modifierRoles'
  // 📖 Pédagogie — cours & exercices
  | 'voirCoursTousNiveaux'
  | 'modifierCours'
  | 'publierCours'
  | 'creerExercice'
  | 'modifierExercice'
  | 'gererFichesSynthese'
  | 'gererSchemas'
  | 'gererAudioCours'
  // 📝 Devoirs & défis
  | 'creerDevoir'
  | 'corrigerDevoir'
  | 'publierDevoir'
  | 'validerDefi'
  | 'gererOlympiades'
  // 👥 Comptes
  | 'voirListeEleves'
  | 'promouvoirAdmin'
  | 'retrograderAdmin'
  | 'suspendreCompte'
  | 'reinitialiserMotDePasse'
  | 'exporterDonneesEleves'
  | 'gererInscriptions'
  // 🛡️ Modération
  | 'voirSignalements'
  | 'traiterSignalement'
  | 'bannirTemporaire'
  | 'voirJournalAide'
  | 'traiterDemandeAide'
  // 📊 Statistiques
  | 'accesStatsEcole'
  | 'exporterStatistiques'
  | 'voirJournalAdmin'
  | 'gererClassement'
  // 📣 Communication
  | 'envoyerNotification'
  | 'gererGroupes'
  | 'creerSondage'
  | 'gererCalendrierScolaire'
  // ⚙️ Système
  | 'gererParametresApp'
  | 'gererSauvegardes'
  | 'forcerSync'
  | 'voirSanteSync'
  | 'gererModeExamen';

/** Les 50 clés, dans un ordre stable (tests + grille UI). */
export const TOUTES_PERMISSIONS: readonly PermissionKey[] = [
  'peutAider',
  'peutCorriger',
  'gererAbsences',
  'creerDefis',
  'validerHomework',
  'accesStatsClasse',
  'creerAnnonces',
  'gererPetitions',
  'gererUtilisateurs',
  'gererContenu',
  'accesAudit',
  'modifierRoles',
  'voirCoursTousNiveaux',
  'modifierCours',
  'publierCours',
  'creerExercice',
  'modifierExercice',
  'gererFichesSynthese',
  'gererSchemas',
  'gererAudioCours',
  'creerDevoir',
  'corrigerDevoir',
  'publierDevoir',
  'validerDefi',
  'gererOlympiades',
  'voirListeEleves',
  'promouvoirAdmin',
  'retrograderAdmin',
  'suspendreCompte',
  'reinitialiserMotDePasse',
  'exporterDonneesEleves',
  'gererInscriptions',
  'voirSignalements',
  'traiterSignalement',
  'bannirTemporaire',
  'voirJournalAide',
  'traiterDemandeAide',
  'accesStatsEcole',
  'exporterStatistiques',
  'voirJournalAdmin',
  'gererClassement',
  'envoyerNotification',
  'gererGroupes',
  'creerSondage',
  'gererCalendrierScolaire',
  'gererParametresApp',
  'gererSauvegardes',
  'forcerSync',
  'voirSanteSync',
  'gererModeExamen',
];

/** Regroupement par domaine pour l'interface de délégation (grille à cocher). */
export const DOMAINES_PERMISSIONS: readonly { domaine: string; cles: readonly PermissionKey[] }[] = [
  { domaine: '🤝 Entraide', cles: ['peutAider', 'peutCorriger'] },
  { domaine: '🏫 Vie de classe', cles: ['gererAbsences', 'creerDefis', 'validerHomework', 'accesStatsClasse', 'creerAnnonces', 'gererPetitions'] },
  { domaine: '📖 Pédagogie', cles: ['voirCoursTousNiveaux', 'modifierCours', 'publierCours', 'creerExercice', 'modifierExercice', 'gererFichesSynthese', 'gererSchemas', 'gererAudioCours'] },
  { domaine: '📝 Devoirs & défis', cles: ['creerDevoir', 'corrigerDevoir', 'publierDevoir', 'validerDefi', 'gererOlympiades'] },
  { domaine: '👥 Comptes', cles: ['voirListeEleves', 'promouvoirAdmin', 'retrograderAdmin', 'suspendreCompte', 'reinitialiserMotDePasse', 'exporterDonneesEleves', 'gererInscriptions'] },
  { domaine: '🛡️ Modération', cles: ['voirSignalements', 'traiterSignalement', 'bannirTemporaire', 'voirJournalAide', 'traiterDemandeAide'] },
  { domaine: '📊 Statistiques', cles: ['accesStatsEcole', 'exporterStatistiques', 'voirJournalAdmin', 'gererClassement'] },
  { domaine: '📣 Communication', cles: ['envoyerNotification', 'gererGroupes', 'creerSondage', 'gererCalendrierScolaire'] },
  { domaine: '⚙️ Système', cles: ['gererParametresApp', 'gererSauvegardes', 'forcerSync', 'voirSanteSync', 'gererModeExamen'] },
  { domaine: '🔐 Administration', cles: ['gererUtilisateurs', 'gererContenu', 'accesAudit', 'modifierRoles'] },
];

/** Permissions que même un `admin` complet ne reçoit JAMAIS (superadmin seul). */
export const PERMISSIONS_SUPERADMIN_SEUL: readonly PermissionKey[] = ['promouvoirAdmin', 'retrograderAdmin'];

/**
 * Permissions que le superadmin PEUT confier à un élève ou à un autre admin :
 * tout le catalogue, moins ses propres réserves (sinon un délégué pourrait
 * créer d'autres superadmins et la hiérarchie n'aurait plus aucun sens).
 */
export const PERMISSIONS_DELEGABLES: readonly PermissionKey[] = TOUTES_PERMISSIONS.filter(
  (cle) => !PERMISSIONS_SUPERADMIN_SEUL.includes(cle)
);

/**
 * Grille de la délégation : les domaines, purgés des permissions
 * superadmin-seul (et sans domaine devenu vide). C'est LA structure affichée
 * par l'écran de partage de pouvoirs — ainsi l'UI ne décide de rien.
 */
export function grilleDelegation(): { domaine: string; cles: readonly PermissionKey[] }[] {
  return DOMAINES_PERMISSIONS.map((d) => ({
    domaine: d.domaine,
    cles: d.cles.filter((cle) => !PERMISSIONS_SUPERADMIN_SEUL.includes(cle)),
  })).filter((d) => d.cles.length > 0);
}

export type PermissionsCarte = Record<PermissionKey, boolean>;

export interface UserPermissions {
  userId: string;
  role: UserRole;
  nom: string;
  classe: string;
  permissions: PermissionsCarte;
  dateAttribution: string;
  dateExpiration?: string;
  /** Pouvoirs fins délégués par le superadmin (fusionnés aux droits du rôle). */
  pouvoirsDelegues?: PermissionKey[];
}

/** Carte « tout faux » — base de `genererPermissions`. */
function carteVide(): PermissionsCarte {
  return Object.fromEntries(TOUTES_PERMISSIONS.map((cle) => [cle, false])) as PermissionsCarte;
}

// ✅ CRÉER/ATTRIBUER UN RÔLE
export async function attribuerRoleEtudiant(
  userId: string,
  nom: string,
  classe: string,
  role: UserRole,
  options?: {
    dateExpiration?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // 🔒 CONTRÔLE ADMIN RÉEL : on exige soit le flag isAdmin du doc de rôle,
    // soit le rôle 'admin'. La vérification elle-même est déléguée à
    // estAdminActuel() : `admins` (source de vérité) PUIS `roles/{uid}`.
    // Avant, seul `roles/{uid}` était lu → le proviseur bootstrappé était
    // toujours refusé, et un admin créé avec role='admin' l'était aussi.
    if (!(await estAdminActuel())) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // 👑 GARDE HIÉRARCHIQUE — deux verrous, car ce service est exporté (donc
    // appelable sans passer par l'UI, qui n'expose jamais ces deux cas) :
    //  1) attribuer le rôle 'superadmin' est réservé au superadmin en place ;
    //  2) modifier la fiche d'un superadmin est interdit à tout autre admin.
    // Sans eux, un admin ordinaire pouvait s'auto-promouvoir superadmin en
    // appelant `attribuerRoleEtudiant(sonUid, nom, classe, 'superadmin')`.
    if (role === 'superadmin' && !(await estSuperAdminActuel())) {
      return { success: false, error: 'Rôle superadmin réservé' };
    }
    if ((await cibleEstSuperAdmin(userId)) && !(await estSuperAdminActuel())) {
      return { success: false, error: 'Le superadmin ne peut pas être modifié' };
    }

    // Créer les permissions selon le rôle
    const permissions = genererPermissions(role);

    const userRole: UserPermissions = {
      userId,
      role,
      nom,
      classe,
      permissions,
      dateAttribution: new Date().toISOString(),
      dateExpiration: options?.dateExpiration,
    };

    // 💾 ÉCRITURE DIRECTE — et non via `syncQueue` : le `docId` DOIT être le
    // userId de l'élève. Or `syncQueue.syncAction()` injecte `userId` = UID de
    // la SESSION dans le document (`...action.data, userId`) → le champ `userId`
    // du rôle devenait celui de l'ADMIN. Comme `getRolesClasse` indexe par
    // `r.userId`, le rôle attribué (« ✅ Succès ») n'apparaissait JAMAIS.
    await setDoc(doc(db, 'roles', userId), {
      ...userRole,
      userId,
      classe,
      nom,
      isDeleted: false,
      actif: true,
    });

    // 👑 Un rôle 'admin' doit aussi apparaître dans la collection `admins` :
    // c'est elle qui fait autorité (écran d'administration ET `isAdmin()` des
    // règles serveur). Best-effort : l'attribution du rôle reste valide via
    // `roles` même si cette seconde écriture échoue.
    if (role === 'admin') {
      try {
        // 📌 docId == uid (convention serveur) + `merge` => idempotent, donc
        // aucun test d'existence préalable. Avant, `addDoc` créait un ID
        // aléatoire que `isAdmin()` ne pouvait PAS retrouver : le promu
        // n'obtenait jamais l'accès.
        await setDoc(
          doc(db, 'admins', userId),
          { nom, userId, ajouteLe: new Date().toISOString().slice(0, 10) },
          { merge: true }
        );
      } catch (error) {
        rapporterErreur('[roles] Promotion admins/ impossible (best-effort):', error);
      }
    }

    return { success: true };
  } catch (error) {
    rapporterErreur('[roles] Erreur attribution:', error);
    return { success: false, error: String(error) };
  }
}

// ✅ GÉNÉRER PERMISSIONS PAR RÔLE
// ⚠️ Exporté pour être testable SANS Firestore : c'est la SEULE source des
// permissions (elles ne sont jamais lues depuis le document, toujours
// régénérées depuis le rôle — cf. getPermissionsUtilisateur).
export function genererPermissions(role: UserRole): PermissionsCarte {
  // Base = 50 clés à `false` (cf. carteVide). Les anciens blocs littéraux qui
  // dupliquaient les 12 clés historiques ont été supprimés : une clé oubliée
  // dans la copie redevenait `undefined` à la lecture (crash
  // `perms.permissions[action]`), et une clé ajoutée au catalogue n'y
  // apparaissait jamais.
  const base = carteVide();
  switch (role) {
    case 'moniteur':
      return {
        ...base,
        peutAider: true,
        peutCorriger: true,
      };
    case 'chef_classe':
      return {
        ...base,
        gererAbsences: true,
        creerDefis: true,
        validerHomework: true,
        accesStatsClasse: true,
      };
    case 'delegue':
      return {
        ...base,
        accesStatsClasse: true,
        creerAnnonces: true,
        gererPetitions: true,
      };
    case 'admin':
      return {
        ...base,
        peutAider: true,
        peutCorriger: true,
        gererAbsences: true,
        creerDefis: true,
        validerHomework: true,
        accesStatsClasse: true,
        creerAnnonces: true,
        gererPetitions: true,
        gererUtilisateurs: true,
        gererContenu: true,
        accesAudit: true,
        modifierRoles: true,
        voirCoursTousNiveaux: true,
        modifierCours: true,
        publierCours: true,
        creerExercice: true,
        modifierExercice: true,
        gererFichesSynthese: true,
        gererSchemas: true,
        gererAudioCours: true,
        creerDevoir: true,
        corrigerDevoir: true,
        publierDevoir: true,
        validerDefi: true,
        gererOlympiades: true,
        voirListeEleves: true,
        suspendreCompte: true,
        reinitialiserMotDePasse: true,
        exporterDonneesEleves: true,
        gererInscriptions: true,
        voirSignalements: true,
        traiterSignalement: true,
        bannirTemporaire: true,
        voirJournalAide: true,
        traiterDemandeAide: true,
        accesStatsEcole: true,
        exporterStatistiques: true,
        voirJournalAdmin: true,
        gererClassement: true,
        envoyerNotification: true,
        gererGroupes: true,
        creerSondage: true,
        gererCalendrierScolaire: true,
        gererParametresApp: true,
        gererSauvegardes: true,
        forcerSync: true,
        voirSanteSync: true,
        gererModeExamen: true,
      };
    case 'superadmin':
      return Object.fromEntries(TOUTES_PERMISSIONS.map((cle) => [cle, true])) as PermissionsCarte;
    default:
      return base;
  }
}

export async function estSuperAdminActuel(): Promise<boolean> {
  const uid = await getCurrentUserId();
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'roles', uid));
    if (snap.exists()) {
      const d = snap.data() as { estSuperAdmin?: boolean; role?: string; isDeleted?: boolean };
      if (!d.isDeleted && (d.estSuperAdmin === true || d.role === 'superadmin')) return true;
    }
  } catch (error) {
    rapporterErreur('[roles] Erreur lecture superadmin:', error);
  }
  try {
    const snapAdmin = await getDoc(doc(db, 'admins', uid));
    if (snapAdmin.exists()) {
      const d = snapAdmin.data() as { role?: string };
      if (d.role === 'superadmin') return true;
    }
  } catch (error) {
    rapporterErreur('[roles] Erreur lecture admin superadmin:', error);
  }
  return false;
}

/**
 * 👑 BOOTSTRAP SUPERADMIN (usage UNIQUE).
 *
 * Le code secret n'est JAMAIS dans l'app ni dans `roles` : il vit côté serveur
 * dans le secret Cloud Functions `SUPERADMIN_CODE_HASH` (SHA-256 du code) — ou,
 * à défaut, dans `config/superadmin.codeHash` posé depuis la console Firebase.
 * Le client ne fait que TRANSMETTRE la saisie à la fonction `devenirSuperAdmin`,
 * qui compare les empreintes en temps constant puis écrit :
 *   - `roles/<uid>`   : `estSuperAdmin: true`, `role: 'superadmin'` ;
 *   - `admins/<uid>`  : `role: 'superadmin'` (repli `isSuperAdmin()` des règles) ;
 *   - `config/superadmin` : sentinelle `{ uid }` → le code ne sert qu'UNE fois.
 */
export async function reclamerSuperAdmin(
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (!code.trim()) return { success: false, error: 'Code requis' };

  const jeton = await jetonIdentite();
  if (!jeton) {
    return {
      success: false,
      error: 'Session Firebase absente : reconnecte-toi avant de réclamer le rôle.',
    };
  }

  try {
    const reponse = await fetch(URL_DEVENIR_SUPERADMIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
      body: JSON.stringify({ code: code.trim() }),
    });
    // ⚠️ Fonction non déployée → 404 en HTML : on ne tente même pas de parser.
    if (reponse.status === 404) {
      return { success: false, error: 'Fonction non déployée (devenirSuperAdmin).' };
    }
    const donnees = (await reponse.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!reponse.ok || donnees.ok !== true) {
      return { success: false, error: donnees.error || `Refusé par le serveur (${reponse.status}).` };
    }
    return { success: true };
  } catch (error) {
    rapporterErreur('[roles] Reclamation superadmin:', error);
    return { success: false, error: 'Serveur injoignable — réessaie en ligne.' };
  }
}

export async function cibleEstSuperAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const snapRole = await getDoc(doc(db, 'roles', userId));
    if (snapRole.exists()) {
      const d = snapRole.data() as { estSuperAdmin?: boolean; role?: string; isDeleted?: boolean };
      if (!d.isDeleted && (d.estSuperAdmin === true || d.role === 'superadmin')) return true;
    }
    const snapAdmin = await getDoc(doc(db, 'admins', userId));
    if (snapAdmin.exists()) {
      const d = snapAdmin.data() as { role?: string };
      if (d.role === 'superadmin') return true;
    }
  } catch (error) {
    rapporterErreur('[roles] Erreur garde superadmin:', error);
  }
  return false;
}

export async function deleguerPouvoirs(
  userId: string,
  pouvoirs: PermissionKey[]
): Promise<{ success: boolean; error?: string }> {
  if (!(await estSuperAdminActuel())) {
    return { success: false, error: 'Reserve au superadmin' };
  }
  const propres = [...new Set(pouvoirs)].filter(
    (pp): pp is PermissionKey => (TOUTES_PERMISSIONS as readonly string[]).includes(pp)
  );
  try {
    await setDoc(
      doc(db, 'roles', userId),
      { pouvoirsDelegues: propres, deleguesLe: new Date().toISOString() },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}


/**
 * Pouvoirs fins RÉELLEMENT stockés pour un utilisateur (champ brut
 * `pouvoirsDelegues`), afin que la grille de délégation s'ouvre avec les
 * cases déjà cochées. On lit le champ BRUT et non la carte de permissions :
 * celle-ci est régénérée depuis le rôle, donc réouvrir la grille afficherait
 * toutes les cases d'un admin déjà actives — impossible de voir ce qui a été
 * délégué à la main.
 */
export async function lirePouvoirsDelegues(userId: string): Promise<PermissionKey[]> {
  if (!userId) return [];
  try {
    const snap = await getDoc(doc(db, 'roles', userId));
    if (!snap.exists()) return [];
    const d = snap.data() as { pouvoirsDelegues?: PermissionKey[]; isDeleted?: boolean };
    if (d.isDeleted) return [];
    const brut = Array.isArray(d.pouvoirsDelegues) ? d.pouvoirsDelegues : [];
    // Filtre défensif : un doc écrit à la main (console Firebase) peut contenir
    // n'importe quoi — on ne garde que les clés du catalogue.
    return brut.filter((cle): cle is PermissionKey =>
      (TOUTES_PERMISSIONS as readonly string[]).includes(cle)
    );
  } catch (error) {
    rapporterErreur('[roles] Erreur lecture pouvoirs delegues:', error);
    return [];
  }
}

// ✅ OBTENIR LES PERMISSIONS D'UN UTILISATEUR
export async function getPermissionsUtilisateur(userId: string): Promise<UserPermissions | null> {
  try {
    const doc_snap = await getDoc(doc(db, 'roles', userId));
    if (!doc_snap.exists()) return null;
    const data = doc_snap.data() as UserPermissions & {
      isDeleted?: boolean;
      estSuperAdmin?: boolean;
      pouvoirsDelegues?: PermissionKey[];
    };
    if (data.isDeleted) return null; // rôle révoqué : plus aucune permission
    // ️ Normalisation : un doc écrit hors de ce service (bootstrap proviseur,
    // console Firestore) peut ne pas contenir le champ `permissions` — et
    // `peutEffectuerAction` faisait alors `perms.permissions[action]` → crash.
    // Les permissions sont donc TOUJOURS régénérées depuis le rôle.
    const carte = genererPermissions(data.role === 'superadmin' || data.estSuperAdmin === true ? 'superadmin' : data.role);
    // Fusion des pouvoirs fins délégués par le superadmin.
    const delegues = Array.isArray(data.pouvoirsDelegues) ? data.pouvoirsDelegues : [];
    for (const pv of delegues) {
      if ((TOUTES_PERMISSIONS as readonly string[]).includes(pv)) carte[pv] = true;
    }
    return { ...data, userId, permissions: carte };
  } catch (error) {
    rapporterErreur('[roles] Erreur lecture permissions:', error);
    return null;
  }
}

// ✅ VÉRIFIER UNE PERMISSION SPÉCIFIQUE
export async function peutEffectuerAction(
  userId: string,
  action: keyof UserPermissions['permissions']
): Promise<boolean> {
  const perms = await getPermissionsUtilisateur(userId);
  return perms ? perms.permissions[action] : false;
}

// ✅ LISTER TOUS LES RÔLES D'UNE CLASSE
export async function getRolesClasse(classe: string): Promise<UserPermissions[]> {
  try {
    const q = query(collection(db, 'roles'), where('classe', '==', classe));
    const snapshot = await getDocs(q);
    const roles: UserPermissions[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as UserPermissions & { isDeleted?: boolean };
      if (data.isDeleted) return; // rôle révoqué : on ne l'affiche plus
      // 🔑 `docId === userId` : on force le champ depuis l'identifiant du
      // document. Avant on lisait `data.userId` — or syncQueue y écrivait l'UID
      // de l'ADMIN (syncAction injecte le userId de la session) → la liste des
      // rôles attribués restait vide à l'écran.
      roles.push({ ...data, userId: d.id });
    });
    return roles;
  } catch (error) {
    rapporterErreur('[roles] Erreur liste rôles:', error);
    return [];
  }
}

// ✅ REVOQUER UN RÔLE
export async function revoquerRole(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(await estAdminActuel())) {
      return { success: false, error: 'Permissions insuffisantes' };
    }
    // Le superadmin est intouchable sauf par lui-meme.
    if (await cibleEstSuperAdmin(userId)) {
      if (!(await estSuperAdminActuel())) {
        return { success: false, error: 'Le superadmin ne peut pas etre revoque' };
      }
    }

    await setDoc(
      doc(db, 'roles', userId),
      { isDeleted: true, actif: false, revoqueLe: new Date().toISOString() },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
