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

  // 1) Web : Web Speech API native.
  const synthese = paroleWeb();
  if (synthese) {
    try {
      synthese.cancel();
      const voix = new SpeechSynthesisUtterance(contenu);
      voix.lang = options.language || 'fr-FR';
      voix.rate = options.rate ?? 0.95;
      voix.onend = () => options.onDone?.();
      voix.onerror = () => options.onError?.();
      synthese.speak(voix);
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
    speak(contenu, {
      language: options.language || 'fr',
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
