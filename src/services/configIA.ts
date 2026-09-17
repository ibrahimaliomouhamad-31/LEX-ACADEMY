// CONFIG IA — point UNIQUE de configuration de l'appel Groq.
//
// 🔒 SÉCURITÉ : l'appel IA passe par le proxy Firebase Functions `lexaiChat` —
// la clé Groq ne vit QUE côté serveur (functions:secrets:set GROQ_API_KEY).
// L'ancienne clé en dur dans l'APK a été supprimée : plus aucune clé IA dans
// l'application.
//
// ⚠️ SI LA FUNCTION N'EST PAS DÉPLOYÉE : l'URL répond **404 en HTML** (pas du
// JSON) → c'est le cas rencontré en production. `lexai.tsx` teste
// explicitement `response.status === 404` pour afficher « assistant non
// activé » au lieu d'accuser à tort la connexion de l'élève.
//
// (Contrat de réponse : `{ reponse: "..." }` — voir functions/index.js.)

export const URL_PROXY: string =
  'https://us-central1-lex-academy-10eef.cloudfunctions.net/lexaiChat';

export function urlChat(): string {
  return URL_PROXY;
}

export function headersIA(): { [cle: string]: string } {
  // Aucune clé côté client : le proxy ajoute la sienne.
  return { 'Content-Type': 'application/json' };
}

