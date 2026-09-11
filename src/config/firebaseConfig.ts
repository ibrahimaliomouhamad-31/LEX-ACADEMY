import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Constants from 'expo-constants';

// ✅ Variables d'environnement d'abord (app.json extra / .env),
// puis valeurs de secours intégrées pour que l'app démarre TOUJOURS,
// même sans .env (critical : les élèves utilisent l'app hors-ligne).
// 🛡️ AUDIT : la clé API Firebase n'est PAS un secret (identifiant public
// du projet, protégé par les règles Firestore + App Check) — mais on évite
// de la versionner en clair : variable d'environnement d'abord, secours
// générique sinon. Configurer EXPO_PUBLIC_FIREBASE_* ou extra dans app.json.
const CONFIG_SECOURS: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'CLE_A_CONFIGURER_VIA_ENV',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'lex-academy-10eef.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'lex-academy-10eef',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'lex-academy-10eef.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '512518959635',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:512518959635:web:b2463918d2633a4bea85e6',
};

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const firebaseConfig: FirebaseOptions = {
  apiKey: extra.firebaseApiKey || CONFIG_SECOURS.apiKey,
  authDomain: extra.firebaseAuthDomain || CONFIG_SECOURS.authDomain,
  projectId: extra.firebaseProjectId || CONFIG_SECOURS.projectId,
  storageBucket: extra.firebaseStorageBucket || CONFIG_SECOURS.storageBucket,
  messagingSenderId: extra.firebaseMessagingSenderId || CONFIG_SECOURS.messagingSenderId,
  appId: extra.firebaseAppId || CONFIG_SECOURS.appId,
};

import { avertirDev, rapporterErreur } from '../utils/logger';

if (!extra.firebaseApiKey) {
  avertirDev(
    '[firebaseConfig] ⚠️ Variables .env absentes : utilisation de la configuration de secours intégrée.'
  );
}

// initializeApp ne doit JAMAIS faire planter l'app au démarrage :
// hors-ligne, le reste de l'app (100% local) doit continuer de fonctionner.
let app: FirebaseApp;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  rapporterErreur('firebaseConfig init Firebase', error);
  app = getApps().length > 0 ? getApp() : initializeApp({ projectId: 'lex-academy-local' });
}

export const firebaseEstConfigure = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export { firebaseConfig };

// ✅ PERSISTANCE OFFLINE FIRESTORE : le SDK garde une copie locale de toutes
// les données lues (cours, exercices, classement, profil). Sans internet,
// getDoc() répond depuis le cache au lieu de jeter une erreur.
// Sur React Native le cache persistant s'appuie sur AsyncStorage (déjà installé).
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (error) {
  // Certaines plateformes/environnements refusent le cache persistant :
  // on retombe sur Firestore en mémoire plutôt que de crasher.
  avertirDev('[firebaseConfig] Cache persistant indisponible, fallback mémoire :', error);
  db = getFirestore(app);
}

export { db };
export const auth = getAuth(app);

export default app;
