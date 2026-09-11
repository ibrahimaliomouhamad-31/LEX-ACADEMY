// 76 — FIREBASE AUTH : vraie authentification (au lieu du nom+mot de passe
// librement forgeable). Compte Auth = email synthétique nom@lex.academy +
// mot de passe = hash SHA-256 (jamais le mot de passe en clair).

import { initializeApp, getApps } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { firebaseConfig } from '../config/firebaseConfig';

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

export function emailSynthetique(nom: string): string {
  // 🛡️ NORMALISATION ANTI-COLLISION : minuscules + suppression des accents +
  // espaces → points. Avant, « Moussa » et « moussa » (ou « André » / « Andre »)
  // donnaient deux emails différents → deux comptes pour le même élève,
  // classements éclatés et usurpation facile par variante de casse.
  const base = nom.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const propre = base.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'eleve';
  return `${propre}@lex.academy`;
}

// Crée le compte Auth ; renvoie l'uid. Le mot de passe passé est DÉJÀ haché (sha256).
export async function creerCompte(nom: string, mdpHashe: string): Promise<string> {
  const cred = await createUserWithEmailAndPassword(auth, emailSynthetique(nom), mdpHashe);
  return cred.user.uid;
}

// Connexion ; renvoie l'uid ou null si échec.
export async function connecter(nom: string, mdpHashe: string): Promise<string | null> {
  try {
    const cred = await signInWithEmailAndPassword(auth, emailSynthetique(nom), mdpHashe);
    return cred.user.uid;
  } catch {
    return null;
  }
}

export async function deconnecter(): Promise<void> {
  await signOut(auth);
}

export function estConnecteAuth(): boolean {
  return auth.currentUser !== null;
}
