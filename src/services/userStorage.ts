import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'lex_user_id';

/**
 * Retourne l'UID de l'utilisateur actuellement connecté.
 */
export async function getCurrentUserId(): Promise<string | null> {
  return AsyncStorage.getItem(USER_ID_KEY);
}

/**
 * Crée une clé AsyncStorage propre à l'utilisateur connecté.
 *
 * Exemple :
 * userKey('stats')
 * → lex_user_<UID>_stats
 */
export async function userKey(name: string): Promise<string> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('Aucun utilisateur connecté');
  }

  return `lex_user_${userId}_${name}`;
}

/**
 * Lit une donnée personnelle de l'utilisateur connecté.
 */
export async function getUserItem(name: string): Promise<string | null> {
  const key = await userKey(name);
  return AsyncStorage.getItem(key);
}

/**
 * Enregistre une donnée personnelle pour l'utilisateur connecté.
 */
export async function setUserItem(
  name: string,
  value: string
): Promise<void> {
  const key = await userKey(name);
  await AsyncStorage.setItem(key, value);
}

/**
 * Supprime une donnée personnelle de l'utilisateur connecté.
 */
export async function removeUserItem(name: string): Promise<void> {
  const key = await userKey(name);
  await AsyncStorage.removeItem(key);
}
