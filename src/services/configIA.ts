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

export const URL_PROXY: string =
  'https://us-central1-lex-academy-10eef.cloudfunctions.net/lexaiChat';

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

export interface MessageChat {
  role: string;
  content: string;
}

/**
 * Construit le tableau `messages` envoyé au proxy : prompt système en tête,
 * historique nettoyé (uniquement user/assistant non vides) et tronqué aux
 * limites serveur, question de l'élève en DERNIER.
 */
export function construireMessages(historique: MessageChat[], question: string): MessageChat[] {
  const utiles = historique
    .filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim() !== ''
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, LIMITE_MESSAGE) }));

  // système (1) + historique + question (1) ≤ 30.
  const maxHistorique = LIMITE_MESSAGES - 2;
  const messages: MessageChat[] = [
    { role: 'system', content: SYSTEME_LEXAI },
    ...utiles.slice(-maxHistorique),
    { role: 'user', content: question.slice(0, LIMITE_MESSAGE) },
  ];

  // Plafond 32 Ko : on raccourcit l'historique le plus ancien — jamais le
  // système ni la question (qui vient d'être posée).
  while (messages.length > 3 && JSON.stringify(messages).length > LIMITE_TAILLE) {
    messages.splice(1, 1);
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

