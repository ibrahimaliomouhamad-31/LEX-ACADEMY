/**
 * 🔐 AUTHENTIFICATION ROBUSTE
 * Firebase Auth + JWT + Session management
 * Remplace le système custom faible par une auth sécurisée
 */

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

    // Créer utilisateur Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Créer profil dans Firestore
    await setDoc(doc(db, 'utilisateurs', user.uid), {
      uid: user.uid,
      email,
      nom,
      classe,
      xp: 0,
      streak: 0,
      dateCreation: new Date().toISOString(),
      codeTransfert: generateTransferCode(), // Sauvegarde de compte
      derniere_connexion: new Date().toISOString().split('T')[0],
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
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSessionValide();
  return session?.uid || null;
}

// ✅ ACTUALISER SESSION (au lancement de l'app)
export async function refreshSession(): Promise<UserSession | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();

      if (user) {
        const userDoc = await getDoc(doc(db, 'utilisateurs', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          await saveSession(user.uid, user.email!, data.nom, data.classe);
          resolve(await getSessionValide());
        }
      } else {
        resolve(null);
      }
    });
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
