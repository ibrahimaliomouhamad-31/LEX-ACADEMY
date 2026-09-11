/**
 * 👥 GESTION DES RÔLES & PERMISSIONS
 * Pour les élèves de moins de 14 ans ayant des responsabilités
 */

import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCurrentUserId } from './auth';
import { syncQueue } from './syncQueue';

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
    // soit le rôle 'admin' (les deux modèles coexistent dans l'app). Avant,
    // seul isAdmin était testé → un admin créé avec role='admin' était rejeté.
    const adminId = await getCurrentUserId();
    if (!adminId) return { success: false, error: 'Pas de session admin' };

    const adminDoc = await getDoc(doc(db, 'roles', adminId));
    const d = adminDoc.exists() ? (adminDoc.data() as { isAdmin?: boolean; role?: string }) : null;
    if (!d || (d.isAdmin !== true && d.role !== 'admin')) {
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

    // Sauvegarder dans Firestore
    await syncQueue.add('create', 'roles', userId, userRole as unknown as Record<string, unknown>);

    return { success: true };
  } catch (error) {
    console.error('[roles] Erreur attribution:', error);
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
    return doc_snap.exists() ? (doc_snap.data() as UserPermissions) : null;
  } catch (error) {
    console.error('[roles] Erreur lecture permissions:', error);
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
    return snapshot.docs.map((doc) => doc.data() as UserPermissions);
  } catch (error) {
    console.error('[roles] Erreur liste rôles:', error);
    return [];
  }
}

// ✅ REVOQUER UN RÔLE
export async function revoquerRole(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminId = await getCurrentUserId();
    if (!adminId) return { success: false, error: 'Pas de session admin' };

    const adminDoc = await getDoc(doc(db, 'roles', adminId));
    const d = adminDoc.exists() ? (adminDoc.data() as { isAdmin?: boolean; role?: string }) : null;
    if (!d || (d.isAdmin !== true && d.role !== 'admin')) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    await syncQueue.add('delete', 'roles', userId, {});
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
