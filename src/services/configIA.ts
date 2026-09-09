// CONFIG IA — point UNIQUE de configuration des appels Groq.
//
// 🔒 SÉCURITÉ (corrigé) : tous les appels IA passent désormais par le proxy
// Firebase Functions `lexaiChat` — la clé Groq ne vit QUE côté serveur
// (functions:secrets:set GROQ_API_KEY). L'ancienne clé en dur dans l'APK a
// été supprimée : plus aucune clé IA dans l'application.
//
// Si la Function n'est pas encore déployée, les écrans IA affichent un
// message clair (pas de crash) — voir le message d'erreur de lexai.tsx.

export const URL_PROXY: string =
  'https://us-central1-lex-academy-10eef.cloudfunctions.net/lexaiChat';

export function urlChat(): string {
  return URL_PROXY;
}

export function urlTranscription(): string {
  return URL_PROXY.replace('lexaiChat', 'lexaiTranscrire');
}

export function headersIA(): { [cle: string]: string } {
  // Aucune clé côté client : le proxy ajoute la sienne.
  return { 'Content-Type': 'application/json' };
}

