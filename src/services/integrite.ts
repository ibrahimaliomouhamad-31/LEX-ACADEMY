// INTÉGRITÉ : détection d'effacement du cache / triche sur le streak (amélioration 7)
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE_EMPREINTE = '@lex/empreinteStreak';

/** Empreinte légère de l'état (streak + date) stockée séparément du cache principal. */
async function empreinte(streak: number, dateISO: string): Promise<string> {
  const brut = `${streak}|${dateISO}|LEX`;
  let h = 0;
  for (let i = 0; i < brut.length; i++) {
    h = (h * 31 + brut.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

/** À appeler quand le streak est mis à jour : stocke l'empreinte hors du cache principal. */
export async function scellerStreak(streak: number, dateISO: string): Promise<void> {
  await AsyncStorage.setItem(CLE_EMPREINTE, await empreinte(streak, dateISO));
}

/**
 * Vérifie que le streak n'a pas été falsifié (effacement partiel du cache, édition manuelle).
 * Retourne true si l'empreinte correspond, false = valeur suspecte à réinitialiser.
 */
export async function streakAuthentique(streak: number, dateISO: string): Promise<boolean> {
  const attendu = await AsyncStorage.getItem(CLE_EMPREINTE);
  if (!attendu) {
    // Première fois : on scelle la valeur actuelle (de confiance, vient du cache propre)
    await scellerStreak(streak, dateISO);
    return true;
  }
  return (await empreinte(streak, dateISO)) === attendu;
}

/** Réinitialise le streak après détection d'altération. */
export async function signalerAltération(): Promise<void> {
  await AsyncStorage.removeItem(CLE_EMPREINTE);
}