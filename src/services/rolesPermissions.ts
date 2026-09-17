/**
 * 👥 GESTION DES RÔLES & PERMISSIONS
 * Rôles de responsabilité (moniteur, chef de classe, délégué) attribués par le
 * proviseur depuis l'ecran admin_roles. La source de verite de l'admin est la
 * collection `admins` (voir estAdminActuel).
 */

import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCurrentUserId } from './auth';
import { rapporterErreur } from '../utils/logger';

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
      const d = snapRole.data() as { isAdmin?: boolean; role?: string; isDeleted?: boolean };
      if (!d.isDeleted && (d.isAdmin === true || d.role === 'admin')) return true;
    }
  } catch (error) {
    rapporterErreur('[roles] Erreur lecture role admin:', error);
  }

  return false;
}

export type UserRole = 'etudiant' | 'moniteur' | 'chef_classe' | 'delegue' | 'admin';

export interface UserPermissions {
  userId: string;
  role: UserRole;
  nom: string;
  classe: string;
  permissions: {
    // Moniteur : Aide les autres
    peutAider: boolean;
    peutCorriger: boolean;
    
    // Chef de classe : Gère la classe
    gererAbsences: boolean;
    creerDefis: boolean;
    validerHomework: boolean;
    
    // Délégué : Représente la classe
    accesStatsClasse: boolean;
    creerAnnonces: boolean;
    gererPetitions: boolean;
    
    // Admin : Accès complet
    gererUtilisateurs: boolean;
    gererContenu: boolean;
    accesAudit: boolean;
    modifierRoles: boolean;
  };
  dateAttribution: string;
  dateExpiration?: string;
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
function genererPermissions(role: UserRole): UserPermissions['permissions'] {
  const base = {
    peutAider: false,
    peutCorriger: false,
    gererAbsences: false,
    creerDefis: false,
    validerHomework: false,
    accesStatsClasse: false,
    creerAnnonces: false,
    gererPetitions: false,
    gererUtilisateurs: false,
    gererContenu: false,
    accesAudit: false,
    modifierRoles: false,
  };

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
      };
    default:
      return base;
  }
}

// ✅ OBTENIR LES PERMISSIONS D'UN UTILISATEUR
export async function getPermissionsUtilisateur(userId: string): Promise<UserPermissions | null> {
  try {
    const doc_snap = await getDoc(doc(db, 'roles', userId));
    if (!doc_snap.exists()) return null;
    const data = doc_snap.data() as UserPermissions & { isDeleted?: boolean };
    if (data.isDeleted) return null; // rôle révoqué : plus aucune permission
    // ️ Normalisation : un doc écrit hors de ce service (bootstrap proviseur,
    // console Firestore) peut ne pas contenir le champ `permissions` — et
    // `peutEffectuerAction` faisait alors `perms.permissions[action]` → crash.
    // Les permissions sont donc TOUJOURS régénérées depuis le rôle.
    return { ...data, userId, permissions: genererPermissions(data.role) };
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
