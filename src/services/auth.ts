/**
 * 🔐 AUTHENTIFICATION ROBUSTE
 * Firebase Auth + JWT + Session management
 * Remplace le système custom faible par une auth sécurisée
 */

import { sha256 } from 'js-sha256';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

/**
 * 🔐 SALAGE DÉTERMINISTE PAR COMPTE (sans lecture pré-auth requise).
 *
 * Contrainte offline-first + règles Firestore :
 * - le sel vit dans /donnees_privees (lecture réservée au propriétaire
 *   CONNECTÉ), donc illisible AVANT connexion ;
 * - Firebase Auth ne permet pas de lire quoi que ce soit avant sign-in.
 *
 * Solution : sel = dérivé du nom normalisé (unique par construction via
 * l'email synthétique nom@lex.academy). Deux élèves avec le même mot de
 * passe mais un nom différent → hachés différents → fini l'attaque par
 * dictionnaire partagé. ⚠️ Jamais de singleton/global.
 */
export const selPourCompte = (nom: string): string => {
  // 🛡️ Même normalisation que l'email synthétique (minuscules, sans accents,
  // séparateurs regroupés) : le hash du mot de passe est identique quelle que
  // soit la casse/les accents tapés à la connexion.
  const base = nom.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const propre = base.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'eleve';
  return sha256(`lex-academy::sel::${propre}`);
};

export const genererSel = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Hache un mot de passe avec un sel.
 * Double SHA-256 + concaténation du sel = robustesse renforcée.
 * (js-sha256 retourne directement une string hexadécimale, pas d'objet.)
 */
export const hacherAvecSel = (mdp: string, sel: string): string => {
  return sha256(sha256(mdp.trim()) + sel);
};

/**
 * Hachage complet côté client : salage déterministe + double SHA-256.
 * Utilisé par inscription ET connexion (même formule → même résultat).
 */
export const hacherMotDePasse = (nom: string, mdp: string): string => {
  return hacherAvecSel(mdp, selPourCompte(nom));
};

const USER_SESSION_KEY = 'lex_user_session';
const SESSION_EXPIRY_KEY = 'lex_session_expiry';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 jours

interface UserSession {
  uid: string;
  email: string;
  nom: string;
  classe: string;
  createdAt: string;
}

// ✅ INSCRIPTION SÉCURISÉE
export async function registerUser(
  email: string,
  password: string,
  nom: string,
  classe: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    // Valider inputs
    if (!email.includes('@') || password.length < 8 || !nom.trim()) {
      return { success: false, error: 'Email/password/nom invalides' };
    }

    // 🔐 Salage déterministe par compte (même formule qu'à la connexion).
    // register.tsx/authFirebase : hacherMotDePasse(nom, mdp) → mdpHache.
    const mdpHache = hacherAvecSel(password, selPourCompte(nom));

    // Créer utilisateur Firebase Auth avec le mot de passe haché
    const userCredential = await createUserWithEmailAndPassword(auth, email, mdpHache);
    const user = userCredential.user;

    // Créer profil dans Firestore — SEULEMENT les champs publics.
    // 🔒 Les données sensibles (email, code de transfert, sel) vivent dans le
    // document privé /donnees_privees (lecture réservée au propriétaire).
    await setDoc(doc(db, 'utilisateurs', user.uid), {
      uid: user.uid,
      nom,
      classe,
      xp: 0,
      streak: 0,
      avatar: '🎓',
      dateCreation: new Date().toISOString(),
      derniere_connexion: new Date().toISOString().split('T')[0],
    });
    await setDoc(doc(db, 'donnees_privees', user.uid), {
      email,
      codeTransfert: generateTransferCode(), // Sauvegarde de compte
      // 🔐 Le sel déterministe est recalculable (selPourCompte) : on ne stocke
      // plus de sel aléatoire pré-auth-illisible. Aucun mot de passe ici.
    });

    // Créer progression vide
    await setDoc(doc(db, 'progression', user.uid), {
      stats: null,
      resolus: [],
      infiniStats: null,
      srs: null,
      dateISO: new Date().toISOString(),
    });

    // Sauvegarder session
    await saveSession(user.uid, email, nom, classe);

    return { success: true, user };
  } catch (error: any) {
    console.error('[auth] Erreur registration:', error);
    return {
      success: false,
      error:
        error.code === 'auth/email-already-in-use'
          ? 'Email déjà utilisé'
          : error.message || 'Erreur inscription',
    };
  }
}

// ✅ CONNEXION SÉCURISÉE
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Récupérer profil
    const userDoc = await getDoc(doc(db, 'utilisateurs', user.uid));
    if (!userDoc.exists()) {
      return { success: false, error: 'Profil utilisateur non trouvé' };
    }

    const userData = userDoc.data();
    await saveSession(user.uid, email, userData.nom, userData.classe);

    return { success: true, user };
  } catch (error: any) {
    console.error('[auth] Erreur login:', error);
    return {
      success: false,
      error:
        error.code === 'auth/user-not-found'
          ? 'Utilisateur non trouvé'
          : error.code === 'auth/wrong-password'
          ? 'Mot de passe incorrect'
          : error.message || 'Erreur connexion',
    };
  }
}

// ✅ DÉCONNEXION SÉCURISÉE
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
    await AsyncStorage.removeItem(USER_SESSION_KEY);
    await AsyncStorage.removeItem(SESSION_EXPIRY_KEY);
  } catch (error) {
    console.error('[auth] Erreur logout:', error);
  }
}

// ✅ SAUVEGARDE SESSION LOCALE
async function saveSession(
  uid: string,
  email: string,
  nom: string,
  classe: string
): Promise<void> {
  const session: UserSession = {
    uid,
    email,
    nom,
    classe,
    createdAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
  await AsyncStorage.setItem(
    SESSION_EXPIRY_KEY,
    String(Date.now() + SESSION_DURATION)
  );
}

// ✅ VÉRIFIER SESSION VALIDE
export async function getSessionValide(): Promise<UserSession | null> {
  try {
    const sessionStr = await AsyncStorage.getItem(USER_SESSION_KEY);
    const expiryStr = await AsyncStorage.getItem(SESSION_EXPIRY_KEY);

    if (!sessionStr || !expiryStr) return null;

    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry) {
      // Session expirée
      await logoutUser();
      return null;
    }

    return JSON.parse(sessionStr) as UserSession;
  } catch {
    return null;
  }
}

// ✅ OBTENIR UID ACTUEL
// 🔄 DÉLÉGATION : source unique d'identité = userStorage.getCurrentUserId()
// (lit `lex_user_id` écrit par le vrai flux de login, fallback session,
// fallback invité). Avant, cette fonction lisait `lex_user_session`, une
// clé JAMAIS écrite par le flux réel → la file de synchronisation jetait
// "Pas de session" à chaque flush et rien ne se synchronisait jamais.
export async function getCurrentUserId(): Promise<string | null> {
  const { getCurrentUserId: getIdOfficiel } = await import('./userStorage');
  try {
    return await getIdOfficiel();
  } catch {
    return null;
  }
}

// ✅ ACTUALISER SESSION (au lancement de l'app)
// 🔄 BLINDÉ : avant, si getDoc() échouait (hors-ligne), la promesse ne se
// résolvait JAMAIS → l'app pouvait rester bloquée sur un écran d'attente.
// Désormais tout échec → session locale conservée (résolution garantie).
export async function refreshSession(): Promise<UserSession | null> {
  return new Promise((resolve) => {
    // Garde-fou : on résout au plus tard après 8 s quoi qu'il arrive.
    const timeout = setTimeout(() => resolve(getSessionValide()), 8000);

    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        clearTimeout(timeout);

        if (user) {
          try {
            const userDoc = await getDoc(doc(db, 'utilisateurs', user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              await saveSession(user.uid, user.email!, data.nom, data.classe);
            }
            // Hors-ligne ou profil absent : la session locale existante
            // reste valide (offline-first, jamais de déconnexion forcée).
            resolve(await getSessionValide());
          } catch {
            clearTimeout(timeout);
            resolve(await getSessionValide());
          }
        } else {
          resolve(null);
        }
      });
    } catch {
      clearTimeout(timeout);
      resolve(getSessionValide());
    }
  });
}

// 🔑 GÉNÉRER CODE DE TRANSFERT (sauvegarde compte)
function generateTransferCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 📱 MODE OFFLINE : SESSION LOCALE SUFFISANTE
export async function isOfflineMode(): Promise<boolean> {
  // Vérifier si Firebase est accessible
  return false; // À intégrer avec network monitoring
}
