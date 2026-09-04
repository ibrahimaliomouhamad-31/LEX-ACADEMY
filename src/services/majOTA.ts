// 67 — MISES À JOUR OTA (expo-updates) : corriger l'app sans réinstaller
// l'APK chez les 150 élèves. Actif seulement dans un build EAS (see README).
import * as Updates from 'expo-updates';

export async function verifierMAJ(): Promise<boolean> {
  try {
    if (__DEV__) return false; // jamais en mode développeur
    const verif = await Updates.checkForUpdateAsync();
    if (verif.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    }
  } catch {
    // pas de build OTA configuré : silencieux
  }
  return false;
}
