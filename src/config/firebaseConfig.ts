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
const CONFIG_SECOURS: FirebaseOptions = {
  apiKey: 'AIzaSyC3y581S0nHqYfIX4TjvumGKLgpDj1G1dg',
  authDomain: 'lex-academy-10eef.firebaseapp.com',
  projectId: 'lex-academy-10eef',
  storageBucket: 'lex-academy-10eef.firebasestorage.app',
  messagingSenderId: '512518959635',
  appId: '1:512518959635:web:b2463918d2633a4bea85e6',
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

if (!extra.firebaseApiKey) {
  console.warn(
    '[firebaseConfig] ⚠️ Variables .env absentes : utilisation de la configuration de secours intégrée.'
  );
}

// initializeApp ne doit JAMAIS faire planter l'app au démarrage :
// hors-ligne, le reste de l'app (100% local) doit continuer de fonctionner.
let app: FirebaseApp;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  console.error('[firebaseConfig] Erreur init Firebase :', error);
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
  console.warn('[firebaseConfig] Cache persistant indisponible, fallback mémoire :', error);
  db = getFirestore(app);
}

export { db };
export const auth = getAuth(app);

export default app;
