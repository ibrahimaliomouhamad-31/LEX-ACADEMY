// CONFIG IA — point UNIQUE de configuration de l'appel Groq.
//
// 🔒 SÉCURITÉ : l'appel IA passe par le proxy Firebase Functions `lexaiChat` —
// la clé Groq ne vit QUE côté serveur (functions:secrets:set GROQ_API_KEY).
// L'ancienne clé en dur dans l'APK a été supprimée : plus aucune clé IA dans
// l'application.
//
// ⚠️ SI LA FUNCTION N'EST PAS DÉPLOYÉE : l'URL répond **404 en HTML** (pas du
// JSON) → `lexai.tsx` teste le STATUT AVANT de parser, et affiche « assistant
// non activé » au lieu d'accuser à tort la connexion de l'élève.
//
// Contrats (voir functions/index.js) :
//   réponse OK  : `{ reponse: "..." }`
//   erreurs     : `{ error: "..." }` avec 400 / 429 / 502
//   limites     : ≤ 30 messages, ≤ 8000 car. par message, ≤ 32 000 car. total

// 🔁 MIGRATION PROXY (alternative gratuite) : Firebase Cloud Functions exige
// le plan BLAZE (payant) — cloudbuild + secretmanager sont refusés sur Spark.
// Le proxy vit désormais sur Cloudflare Workers (plan Free : 100 000 req/jour,
// sans carte). Voir workers/lexai-chat/README.md.
//
// L'URL se configure à DEUX endroits (le premier non vide gagne) :
//   1. app.json → extra.lexaiProxyUrl   ✅ recommandé : voyage dans l'APK,
//      exactement comme extra.firebaseApiKey (aucun .env requis au build) ;
//   2. .env → EXPO_PUBLIC_LEXAI_PROXY_URL (embarqué au démarrage du bundler).
// Tant que rien n'est configuré, l'ancienne URL Firebase reste en secours : le
// 404 HTML qu'elle renvoie est géré côté écran (« assistant non activé », pas
// de faux blame connexion).
// 🔍 Vérifier le proxy en ligne (avant/après déploiement) : npm run lexai:check
export const PROXY_FIREBASE_SECOURS =
  'https://us-central1-lex-academy-10eef.cloudfunctions.net/lexaiChat';

/** Clé de configuration dans `app.json` → `expo.extra`. */
export const CLE_EXTRA_PROXY = 'lexaiProxyUrl';

/** Nettoie une URL collée à la main : espaces + slash final (wrangler). */
function nettoyerUrl(valeur?: string): string {
  return typeof valeur === 'string' ? valeur.trim().replace(/\/+$/, '') : '';
}

/**
 * Résout l'URL du proxy par priorité : app.json → .env → secours Firebase.
 * Fonction PURE et testée : la lecture d'`app.json` est faite par l'appelant.
 */
export function resoudreUrlProxy(extraValue?: string, envValue?: string): string {
  return nettoyerUrl(extraValue) || nettoyerUrl(envValue) || PROXY_FIREBASE_SECOURS;
}

/**
 * Lit `app.json → extra.lexaiProxyUrl`. Import DIFFÉRÉ volontaire : ce service
 * reste chargeable en environnement Node (tests), où les modules natifs d'Expo
 * n'existent pas — les tests n'ont donc pas à mocker `expo-constants`.
 */
export function lireUrlProxyExtra(): string | undefined {
  try {
    // Import différé (voir JSDoc) : règle désactivée ligne à ligne, comme
    // `utils/logger.ts` pour son propre require conditionnel.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const constants = require('expo-constants') as {
      default?: { expoConfig?: { extra?: Record<string, unknown> } };
    };
    const valeur = constants.default?.expoConfig?.extra?.[CLE_EXTRA_PROXY];
    return typeof valeur === 'string' ? valeur : undefined;
  } catch {
    return undefined;
  }
}

export const URL_PROXY: string = resoudreUrlProxy(
  lireUrlProxyExtra(),
  process.env.EXPO_PUBLIC_LEXAI_PROXY_URL
);

export function urlChat(): string {
  return URL_PROXY;
}

export function headersIA(): { [cle: string]: string } {
  // Aucune clé côté client : le proxy ajoute la sienne.
  return { 'Content-Type': 'application/json' };
}

// ─── CONTRAT DE REQUÊTE (limites imposées par le proxy `lexaiChat`) ─────────
// functions/index.js refuse (400) au-delà de 30 messages, 8000 caractères par
// message ou 32 000 caractères au total. Sans troncature, l'historique du chat
// dépassait ces plafonds après ~15 échanges → rejet 400 affiché à tort comme
// « problème de connexion ». `construireMessages` garantit un payload valide
// dans TOUS les cas (jamais plus de 30 messages, jamais plus de 32 Ko).

const LIMITE_MESSAGES = 30;
const LIMITE_MESSAGE = 8000;
const LIMITE_TAILLE = 30000; // marge sous les 32 000 du proxy (JSON.stringify)
const LIMITE_RESUME = 1500; // résumé compacté envoyé par l'écran LEX.AI

export interface MessageChat {
  role: string;
  content: string;
}

/**
 * Construit le tableau `messages` envoyé au proxy : prompt système en tête,
 * contexte compacté éventuel, historique nettoyé (uniquement user/assistant
 * non vides) et tronqué aux limites serveur, question de l'élève en DERNIER.
 *
 * `resumeContexte` (optionnel) = résumé des échanges ARCHIVÉS par l'écran
 * LEX.AI (compaction). Il part en second message `system` : le proxy ne
 * valide que `content` (le rôle n'est pas contrôlé), donc la mémoire des
 * vieux échanges survit à la troncature à 30 messages.
 */
export function construireMessages(
  historique: MessageChat[],
  question: string,
  resumeContexte?: string
): MessageChat[] {
  const utiles = historique
    .filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim() !== ''
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, LIMITE_MESSAGE) }));

  const resume = (resumeContexte ?? '').trim().slice(0, LIMITE_RESUME);
  const avecResume = resume !== '';

  // système (1) + résumé (0 ou 1) + historique + question (1) ≤ 30.
  const maxHistorique = LIMITE_MESSAGES - (avecResume ? 3 : 2);
  const messages: MessageChat[] = [
    { role: 'system', content: SYSTEME_LEXAI },
    ...(avecResume
      ? [{ role: 'system', content: `Contexte des échanges précédents (résumé compacté) :\n${resume}` }]
      : []),
    ...utiles.slice(-maxHistorique),
    { role: 'user', content: question.slice(0, LIMITE_MESSAGE) },
  ];

  // Plafond 32 Ko : on raccourcit l'historique le plus ancien — jamais le
  // système, ni le résumé compacté, ni la question (qui vient d'être posée).
  const premierHistorique = avecResume ? 2 : 1;
  while (messages.length > premierHistorique + 1 && JSON.stringify(messages).length > LIMITE_TAILLE) {
    messages.splice(premierHistorique, 1);
  }
  return messages;
}

/**
 * Extrait la réponse DU PROXY. Contrat : `{ reponse: "..." }`
 * (functions/index.js `res.json({ reponse: ... })`).
 * L'ancien format OpenAI `{ choices[0].message.content }` n'arrive jamais ici :
 * l'écran n'appelle JAMAIS Groq directement, uniquement le proxy.
 * Retourne null si le corps ne respecte pas le contrat (réponse vide incluse).
 */
export function extraireReponse(data: unknown): string | null {
  if (data !== null && typeof data === 'object' && 'reponse' in data) {
    const reponse = (data as { reponse?: unknown }).reponse;
    if (typeof reponse === 'string' && reponse.trim() !== '') return reponse.trim();
  }
  return null;
}

/** Lit `{ error: "..." }` du proxy (400/429/502) ; null si absent illisible. */
export function extraireErreurProxy(data: unknown): string | null {
  if (data !== null && typeof data === 'object' && 'error' in data) {
    const erreur = (data as { error?: unknown }).error;
    if (typeof erreur === 'string' && erreur.trim() !== '') return erreur.trim();
  }
  return null;
}

// ─── QUOTA CLIENT (marge sous le rate-limiter serveur) ───────────────────────
// Le proxy refuse (429) au-delà de 60 requêtes / 10 min / IP — une IP de
// quartier est souvent partagée entre élèves. On plafonne donc côté client à
// 40 tentatives / 10 min (fenêtre glissante identique) pour ne JAMAIS arriver
// au 429 serveur avec un message d'erreur au lieu d'une réponse IA.
const FENETRE_QUOTA_MS = 10 * 60 * 1000;
const LIMITE_QUOTA_CLIENT = 40;

/**
 * Vrai si l'élève a déjà atteint le quota client dans la fenêtre glissante.
 * `horodatages` = instants (ms) des envois précédents (non nettoyés) — le
 * filtre interne ne compte que ceux de la fenêtre courante.
 */
export function quotaClientDepasse(horodatages: readonly number[], maintenant: number): boolean {
  return horodatages.filter((h) => maintenant - h < FENETRE_QUOTA_MS).length >= LIMITE_QUOTA_CLIENT;
}

// ─── PROMPT SYSTÈME ──────────────────────────────────────────────────────────
export const SYSTEME_LEXAI =
  "Tu es LEX.AI, un professeur virtuel strict mais pédagogue du Lycée d'Excellence (LEX) au Niger. Tu aides l'élève en lui donnant des indices et en le guidant. Tu ne donnes JAMAIS la réponse finale directement. Tu utilises le programme officiel du Niger.";

