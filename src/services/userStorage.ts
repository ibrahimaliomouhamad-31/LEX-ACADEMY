import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'lex_user_id';
const USER_ID_INVITE = 'invite_local';

/**
 * Retourne l'UID de l'utilisateur actuellement connecté.
 *
 * 🔄 SOURCE UNIQUE D'IDENTITÉ : tout le code doit passer par ici.
 * Deux systèmes coexistaient (lex_user_id vs lex_user_session) ce qui
 * disperdait les données. On lit d'abord la clé officielle `lex_user_id`
 * (écrite par login.tsx), puis la session Firebase Auth (auth.ts), et en
 * dernier recours on attribue un identifiant INVITÉ stable :
 *
 * ⚠️ IMPORTANT (offline-first) : ne jamais renvoyer null. Un élève qui
 * utilise l'app sans compte (ou déconnecté pendant 4 jours) doit quand
 * même accumuler XP, stats, badges et révisions localement. Les données
 * invité restent sous une clé séparée et peuvent être rattachées plus tard.
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    const id = await AsyncStorage.getItem(USER_ID_KEY);
    if (id) return id;

    // Fallback : session Firebase Auth éventuelle (ancien flux auth.ts)
    const session = await AsyncStorage.getItem('lex_user_session');
    if (session) {
      const parse = JSON.parse(session) as { uid?: string };
      if (parse?.uid) {
        // On unifie : tout le monde passe par la clé officielle.
        await AsyncStorage.setItem(USER_ID_KEY, parse.uid);
        return parse.uid;
      }
    }
  } catch {
    // lecture corrompue : on continue en mode invité
  }
  return USER_ID_INVITE;
}

/** L'utilisateur est-il en mode invité (non connecté) ? */
export async function estInvite(): Promise<boolean> {
  return (await getCurrentUserId()) === USER_ID_INVITE;
}

/**
 * Crée une clé AsyncStorage propre à l'utilisateur connecté.
 *
 * Exemple :
 * userKey('stats')
 * → lex_user_<UID>_stats
 *
 * Ne throw JAMAIS (offline-first) : sans connexion ni compte, l'élève
 * garde un espace de stockage invité fonctionnel.
 */
export async function userKey(name: string): Promise<string> {
  const userId = await getCurrentUserId();
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
