// 🔊 PAROLE — couche TTS sécurisée (web + natif), 100% hors-ligne.
// Sur web, `expo-speech` n'expose pas toujours `speak`/`stop` (import * undefined
// selon le bundler) : on bascule sur la Web Speech API native si dispo.
// Sur natif, on délègue à `expo-speech` via import dynamique (évite le crash
// "Cannot read properties of undefined (reading 'stop')" au chargement web).
import { Platform } from 'react-native';

type VoixOptions = {
  language?: string;
  rate?: number;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

// ─── LANGUE & VOIX ──────────────────────────────────────────────────────────
/**
 * Langue des leçons : **toujours `fr-FR`** (BCP-47 complet).
 *
 * 🛡️ CORRECTIF ACCENT ANGLAIS (audit 04/10/2026) : le code envoyait `'fr'`
 * (tag sans région). Or, quand l'appareil ne possède PAS de voix française
 * (fréquent sur Android : les données TTS de Google se téléchargent à la main),
 * `setLanguage(Locale('fr'))` échoue en silence et le moteur retombe sur sa
 * langue par défaut → un texte français lu avec un ACCENT ANGLAIS.
 * Deux correctifs cumulatifs :
 *  1. tag régional complet `fr-FR` (les docs expo-speech recommandent IETF BCP 47) ;
 *  2. voix française CHOISIE EXPLICITEMENT via `getAvailableVoicesAsync()`,
 *     pour ne plus dépendre du choix muet du moteur.
 * Si aucune voix française n'existe sur l'appareil, l'écran 🎧 l'annonce
 * (voir `voixFrancaiseDisponible()` + `audio_cours.tsx`).
 */
export const LANGUE_AUDIO_DEFAUT = 'fr-FR';

/** Format minimal d'une voix exploitable, qu'elle vienne du web ou du natif. */
export interface VoixCandidate {
  identifier: string;
  language: string;
  name?: string;
}

/** Normalise un identifiant BCP-47 : `fr_FR` ≡ `fr-fr`. */
function langueNormalisee(language: string): string {
  return String(language || '').replace(/_/g, '-').toLowerCase().trim();
}

/** Ce tag concerne-t-il le français ? (`fr`, `fr-FR`, `fr-CA`, `fr-F`…) */
function estFrancais(language: string): boolean {
  return /^fr(-|$)/.test(langueNormalisee(language));
}

/**
 * Choisit LA voix française parmi celles proposées par le système.
 * Fonction PURE (logique testable sans appareil) : préférence
 * `fr-FR` > `fr` > toute autre région française ; `null` si aucune.
 */
export function choisirVoixFrancaise(
  voix: readonly VoixCandidate[] | null | undefined
): VoixCandidate | null {
  if (!Array.isArray(voix) || voix.length === 0) return null;
  const francaises = voix.filter(
    (v) => v && typeof v.language === 'string' && estFrancais(v.language)
  );
  if (francaises.length === 0) return null;
  const note = (v: VoixCandidate): number => {
    const l = langueNormalisee(v.language);
    if (l === 'fr-fr') return 0; // la cible exacte
    if (l === 'fr') return 1; // langue seule, reconnue par les deux moteurs
    return 2; // fr-CA, fr-BE… : français, mais pas la voix attendue
  };
  // Tri stable par note, puis par identifiant pour un résultat déterministe.
  return [...francaises].sort(
    (a, b) => note(a) - note(b) || a.identifier.localeCompare(b.identifier)
  )[0];
}

function paroleWeb(): SpeechSynthesis | null {
  if (Platform.OS !== 'web') return null;
  try {
    const g = globalThis as unknown as { speechSynthesis?: SpeechSynthesis };
    return g.speechSynthesis ?? null;
  } catch {
    return null;
  }
}

export function paroleDisponible(): boolean {
  if (paroleWeb() !== null) return true;
  if (Platform.OS !== 'web') return true; // natif : expo-speech
  return false;
}

/** Cache : la liste des voix ne change pas en cours de session (vidée si vide). */
let voixSysteme: readonly VoixCandidate[] | null = null;

/**
 * Voix connues du système — web : `speechSynthesis.getVoices()` ;
 * natif : `Speech.getAvailableVoicesAsync()`. Jamais de lecture planante :
 * toute erreur se transforme en liste vide (on retombe sur le tag `fr-FR`).
 */
async function listerVoix(): Promise<readonly VoixCandidate[]> {
  if (voixSysteme && voixSysteme.length > 0) return voixSysteme;

  const synthese = paroleWeb();
  if (synthese) {
    try {
      const brut = synthese.getVoices?.() ?? [];
      // Chrome peuple la liste de façon ASYNCHRONE : un seul ré-essai bref
      // avant de conclure (jamais mis en cache si toujours vide).
      const liste = brut.length > 0 ? brut : await nouvelEssaiVoixWeb(synthese);
      const mappees = liste.map((v) => ({
        identifier: v.voiceURI || v.name || '',
        // Web API : la propriété s'appelle `lang` (`language` n'existe pas
        // sur SpeechSynthesisVoice → erreur de type).
        language: v.lang,
        name: v.name,
      }));
      if (mappees.length > 0) voixSysteme = mappees;
      return mappees;
    } catch {
      return [];
    }
  }
  if (Platform.OS === 'web') return []; // pas de synthèse du tout

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Speech = require('expo-speech') as {
      getAvailableVoicesAsync?: () => Promise<{ identifier: string; language: string; name?: string }[]>;
      default?: { getAvailableVoicesAsync?: () => Promise<{ identifier: string; language: string; name?: string }[]> };
    };
    const get = Speech?.getAvailableVoicesAsync ?? Speech?.default?.getAvailableVoicesAsync;
    if (typeof get !== 'function') return [];
    const brut = await get();
    const liste = brut ?? [];
    // Android renvoie parfois [] au premier appel : un seul ré-essai.
    const finale = liste.length > 0 ? liste : await get().catch(() => []);
    const mappees = finale.map((v) => ({
      identifier: String(v?.identifier ?? ''),
      language: String(v?.language ?? ''),
      name: v?.name,
    }));
    if (mappees.length > 0) voixSysteme = mappees;
    return mappees;
  } catch {
    return [];
  }
}

/** Ré-essai bref de la liste web (Chrome : `voiceschanged` différé). */
async function nouvelEssaiVoixWeb(synthese: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  return synthese.getVoices?.() ?? [];
}

/**
 * L'appareil dispose-t-il d'une VOIX FRANÇAISE ? Non → le texte sera lu par
 * la voix par défaut (c'est exactement le symptôme « accent anglais »), et
 * l'écran 🎧 prévient l'élève avec la marche à suivre.
 */
export async function voixFrancaiseDisponible(): Promise<boolean> {
  if (Platform.OS === 'web' && paroleWeb() === null) return false; // pas de TTS
  const voix = await listerVoix();
  if (choisirVoixFrancaise(voix)) return true;
  // Liste encore vide (démarrage) : on ne conclut pas, un dernier essai.
  if (voix.length === 0) {
    return choisirVoixFrancaise(await listerVoix()) !== null;
  }
  return false;
}

export async function stopperParole(): Promise<void> {
  // Web natif d'abord (toujours défini si dispo).
  const synthese = paroleWeb();
  if (synthese) {
    try {
      synthese.cancel();
    } catch {
      // ignore
    }
    return;
  }
  if (Platform.OS === 'web') return; // rien à arrêter, pas de module
  try {
    // Import dynamique : jamais résolu au chargement web → pas de crash.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Speech = require('expo-speech') as {
      stop?: () => void;
      default?: { stop?: () => void };
    };
    const stop = Speech?.stop ?? Speech?.default?.stop;
    if (typeof stop === 'function') stop();
  } catch {
    // TTS indisponible : silencieux.
  }
}

export async function parler(texte: string, options: VoixOptions = {}): Promise<boolean> {
  const contenu = (texte || '').trim();
  if (!contenu) return false;
  // Tag régional complet par défaut (`fr-FR`) : `'fr'` seul n'est pas
  // suffisamment explicite pour les moteurs TTS (voir LANGUE_AUDIO_DEFAUT).
  const langue = options.language || LANGUE_AUDIO_DEFAUT;

  // 1) Web : Web Speech API native.
  const synthese = paroleWeb();
  if (synthese) {
    try {
      synthese.cancel();
      const message = new SpeechSynthesisUtterance(contenu);
      message.lang = langue;
      message.rate = options.rate ?? 0.95;
      message.onend = () => options.onDone?.();
      message.onerror = () => options.onError?.();
      // 🎙️ Voix française CHOISIE explicitement : sans elle, un navigateur
      // sans données fr retombe sur sa voix par défaut (accent anglais).
      if (estFrancais(langue)) {
        const candidate = choisirVoixFrancaise(await listerVoix());
        if (candidate) {
          const systeme = synthese.getVoices?.() ?? [];
          message.voice =
            systeme.find((v) => (v.voiceURI || v.name) === candidate.identifier) ?? null;
        }
      }
      synthese.speak(message);
      return true;
    } catch {
      options.onError?.();
      return false;
    }
  }
  if (Platform.OS === 'web') {
    options.onError?.();
    return false;
  }

  // 2) Natif : expo-speech via import dynamique.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Speech = require('expo-speech') as {
      speak?: (t: string, o?: Record<string, unknown>) => void;
      default?: { speak?: (t: string, o?: Record<string, unknown>) => void };
    };
    const speak = Speech?.speak ?? Speech?.default?.speak;
    if (typeof speak !== 'function') {
      options.onError?.();
      return false;
    }
    // 🎙️ Voix française CHOISIE explicitement : le tag `language` seul ne
    // suffit pas — sans données TTS françaises, Android renvoie un échec
    // silencieux de setLanguage() et lit le texte avec sa voix par défaut
    // (accent anglais). On impose donc l'identifiant de voix française.
    const candidate = estFrancais(langue) ? choisirVoixFrancaise(await listerVoix()) : null;
    speak(contenu, {
      language: langue,
      ...(candidate ? { voice: candidate.identifier } : {}),
      rate: options.rate ?? 0.95,
      onDone: options.onDone,
      onStopped: options.onStopped,
      onError: options.onError,
    });
    return true;
  } catch {
    options.onError?.();
    return false;
  }
}
