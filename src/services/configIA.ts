// CONFIG IA — point UNIQUE de configuration des appels Groq.
//
// ⚠️ SÉCURITÉ : la clé ci-dessous est encore en dur (utilisable par quiconque
// décompile l'APK). APRÈS le déploiement des Firebase Functions :
//   1. Remplace URL_PROXY par l'URL réelle (ex: 'https://us-central1-lex-academy-10eef.cloudfunctions.net/lexaiChat')
//   2. SUPPRIME la ligne CLE_API ci-dessous (et l'export cleApi)
//   3. Révoque l'ancienne clé dans la console Groq
// Tout le reste de l'app passera automatiquement par le proxy sécurisé.

export const URL_PROXY: string = ''; // '' = mode direct (temporaire)

const CLE_API = 'MA_CLE_SECRETE_ICI';

export function cleApi(): string {
  return CLE_API;
}

export function urlChat(): string {
  return URL_PROXY !== '' ? URL_PROXY : 'https://api.groq.com/openai/v1/chat/completions';
}

export function urlTranscription(): string {
  // Le proxy transcriptions arrive avec lexaiTranscrire ; en attendant : direct
  return URL_PROXY !== '' ? URL_PROXY.replace('lexaiChat', 'lexaiTranscrire') : 'https://api.groq.com/openai/v1/audio/transcriptions';
}

export function headersIA(): { [cle: string]: string } {
  if (URL_PROXY !== '') {
    return { 'Content-Type': 'application/json' };
  }
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${CLE_API}` };
}

