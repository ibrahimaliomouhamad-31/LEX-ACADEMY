/**
 * 🛡️ FIREBASE APP CHECK — protège les ressources Firebase contre les abus
 * (bots, APK modifiés, quotas brûlés).
 *
 * ⚠️ IMPORTANT (compatibilité SDK) : le provider natif
 * `ReactNativeFirebaseAppCheckProvider` (Play Integrity / App Attest) n'existe
 * PAS dans le paquet `firebase/app-check` — il vient de
 * `@react-native-firebase/app-check` (build natif). Pour ne jamais casser
 * l'app, on active donc App Check sur le Web (reCAPTCHA) quand une clé est
 * fournie, et sur mobile on teste le flux en mode debug via CustomProvider.
 * Le reste ne fait JAMAIS planter l'app si indisponible.
 */

import { Platform } from 'react-native';
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider } from 'firebase/app-check';
import app from '../config/firebaseConfig';

let demarre = false;

export function initAppCheck(): void {
  if (demarre) return;
  demarre = true;

  try {
    if (Platform.OS === 'web') {
      // Web : reCAPTCHA V3 (clé à créer dans la console Google Cloud).
      const cleRecaptcha = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY || '';
      if (!cleRecaptcha) return; // pas de clé : on saute (pas de crash)
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(cleRecaptcha),
        isTokenAutoRefreshEnabled: true,
      });
    } else if (__DEV__) {
      // Mobile en dev : CustomProvider de debug pour tester le flux.
      // (Le vrai provider natif Play Integrity / App Attest nécessite
      //  `@react-native-firebase/app-check` + un build natif.)
      initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: () =>
            Promise.resolve({
              token: 'debug-token-lex-academy',
              expireTimeMillis: Date.now() + 60 * 60 * 1000,
            }),
        }),
        isTokenAutoRefreshEnabled: true,
      });
    } else {
      // Mobile en production : on ne peut pas fournir de token valide sans le
      // module natif. On log un avertissement, l'app continue normalement.
      console.warn(
        '[appCheck] Provider natif requis en production mobile ' +
          '(Play Integrity / App Attest) : installe @react-native-firebase/app-check.'
      );
    }
  } catch (error) {
    console.warn("[appCheck] Indisponible (l'app continue sans) :", error);
  }
}