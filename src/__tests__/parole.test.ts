/**
 * 🧪 PAROLE — verrouille le CORRECTIF ACCENT ANGLAIS (audit 04/10/2026).
 *
 * Symptôme réel : le cours était lu avec une voix anglaise. Deux causes
 * traitées dans `services/parole.ts` :
 *  1. tag sans région (`'fr'`) au lieu de `fr-FR` (BCP 47, cf. expo-speech) ;
 *  2. aucune voix française choisie → sur un appareil sans données TTS
 *     françaises, le moteur retombe silencieusement sur `en-US`.
 *
 * Ce fichier teste la sélection de voix (fonction pure) ET le passage
 * effectif à `Speech.speak` (natif + web).
 */

// Plateforme partagée : `jest.resetModules()` recrée une NOUVELLE instance de
// `react-native` à chaque test, l'`Platform` importé par le test et celui lu
// par `parole.ts` ne sont donc plus le même objet. L'état vit ici, dans une
// variable externe, derrière un accesseur — les deux instances lisent la même.
// (Même démarche que `store` / `setDoc` dans `classementPublic.test.ts`.)
let plateformeCourante = 'ios';

jest.mock('react-native', () => ({
  Platform: {
    get OS(): string {
      return plateformeCourante;
    },
    set OS(valeur: string) {
      plateformeCourante = valeur;
    },
  },
}));

// expo-speech est chargé en `require` dynamique (garde anti-crash web) :
// ces fausses fonctions reçoivent donc l'appel réel.
const speak = jest.fn();
const stop = jest.fn();
const getAvailableVoicesAsync = jest.fn();

jest.mock('expo-speech', () => ({
  speak: (t: string, o?: unknown) => speak(t, o),
  stop: () => stop(),
  getAvailableVoicesAsync: () => getAvailableVoicesAsync(),
}));

import { Platform } from 'react-native';
import {
  LANGUE_AUDIO_DEFAUT,
  choisirVoixFrancaise,
  parler,
  voixFrancaiseDisponible,
  type VoixCandidate,
} from '../services/parole';

type Parole = typeof import('../services/parole');

/**
 * Recharge le module à chaque test : il conserve un CACHE interne de la liste
 * des voix, qu'aucun test ne doit partager avec un autre.
 */
function recharger(): Parole {
  jest.resetModules();
  speak.mockClear();
  stop.mockClear();
  getAvailableVoicesAsync.mockClear();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../services/parole') as Parole;
}

const FR_VOIX: VoixCandidate[] = [
  { identifier: 'google-fr', language: 'fr-FR', name: 'Google Français' },
];

describe('choisirVoixFrancaise (sélection pure, sans appareil)', () => {
  it('préfère fr-FR aux autres régions françaises et à la voix anglaise', () => {
    const retenue = choisirVoixFrancaise([
      { identifier: 'en-US-1', language: 'en-US' },
      { identifier: 'fr-CA-1', language: 'fr-CA' },
      { identifier: 'fr-FR-1', language: 'fr-FR' },
      { identifier: 'fr-CA-0', language: 'fr_CA' },
    ]);
    expect(retenue?.identifier).toBe('fr-FR-1');
  });

  it('accepte les formes sans région et avec souligné (fr, fr_FR)', () => {
    expect(choisirVoixFrancaise([{ identifier: 'a', language: 'fr' }])?.identifier).toBe('a');
    expect(choisirVoixFrancaise([{ identifier: 'b', language: 'fr_FR' }])?.identifier).toBe('b');
    // Les deux présentes : `fr_FR` (= fr-FR) l'emporte sur `fr` nu.
    expect(
      choisirVoixFrancaise([
        { identifier: 'simple', language: 'fr' },
        { identifier: 'region', language: 'fr_FR' },
      ])?.identifier
    ).toBe('region');
  });

  it("n'invente jamais une voix : aucune française → null", () => {
    expect(choisirVoixFrancaise([{ identifier: 'en-US-1', language: 'en-US' }])).toBeNull();
    expect(choisirVoixFrancaise([])).toBeNull();
    expect(choisirVoixFrancaise(null)).toBeNull();
    expect(choisirVoixFrancaise(undefined)).toBeNull();
  });

  it('décide de façon déterministe à score égal (identifiant croissant)', () => {
    const attendu = choisirVoixFrancaise([
      { identifier: 'voix-z', language: 'fr-FR' },
      { identifier: 'voix-a', language: 'fr-FR' },
    ]);
    expect(attendu?.identifier).toBe('voix-a');
  });
});

describe('parler() — natif (expo-speech)', () => {
  it('impose fr-FR ET passe la voix française au moteur', async () => {
    const parle = recharger();
    getAvailableVoicesAsync.mockResolvedValue([
      { identifier: 'en-US-1', language: 'en-US', name: 'Samantha' },
      ...FR_VOIX,
    ]);

    await expect(parle.parler('Développement d’une fonction.', { rate: 0.95 })).resolves.toBe(true);
    expect(speak).toHaveBeenCalledTimes(1);

    const [texte, options] = speak.mock.calls[0] as [string, Record<string, unknown>];
    expect(texte).toContain('Développement');
    expect(options.language).toBe('fr-FR');
    expect(options.language).toBe(LANGUE_AUDIO_DEFAUT);
    expect(options.voice).toBe('google-fr'); // ← le anti-accent-anglais
    expect(options.rate).toBe(0.95);
  });

  it('parle quand même sans voix française (tag fr-FR, sans champ voice)', async () => {
    const parle = recharger();
    getAvailableVoicesAsync.mockResolvedValue([{ identifier: 'en-US-1', language: 'en-US' }]);

    await expect(parle.parler('Bonjour.')).resolves.toBe(true);
    const [, options] = speak.mock.calls[0] as [string, Record<string, unknown>];
    expect(options.language).toBe('fr-FR');
    expect('voice' in options).toBe(false);
    // Et on signale l'absence de voix : c'est le diagnostic affiché à l'élève.
    await expect(parle.voixFrancaiseDisponible()).resolves.toBe(false);
  });

  it('ne choisit pas de voix française quand la lecture est en anglais', async () => {
    const parle = recharger();
    getAvailableVoicesAsync.mockResolvedValue(FR_VOIX);

    await expect(parle.parler('Hello students', { language: 'en-US' })).resolves.toBe(true);
    const [, options] = speak.mock.calls[0] as [string, Record<string, unknown>];
    expect(options.language).toBe('en-US');
    expect('voice' in options).toBe(false);
    // Aucune lecture de voix inutile pour un texte non français.
    expect(getAvailableVoicesAsync).not.toHaveBeenCalled();
  });

  it('détecte correctement la présence d’une voix française', async () => {
    const parle = recharger();
    getAvailableVoicesAsync.mockResolvedValue(FR_VOIX);
    await expect(parle.voixFrancaiseDisponible()).resolves.toBe(true);

    const sansFrancaise = recharger();
    getAvailableVoicesAsync.mockResolvedValue([{ identifier: 'en-US-1', language: 'en-US' }]);
    await expect(sansFrancaise.voixFrancaiseDisponible()).resolves.toBe(false);
  });

  it('retourne false pour un texte vide sans toucher au moteur', async () => {
    const parle = recharger();
    await expect(parle.parler('   ')).resolves.toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });
});

describe('parler() — web (Web Speech API)', () => {
  type MessageFake = {
    text: string;
    lang: string;
    rate: number;
    voice: unknown;
    onend?: () => void;
    onerror?: () => void;
  };
  const messages: MessageFake[] = [];
  const voixWeb = [
    { voiceURI: 'en-web', name: 'US English', lang: 'en-US' },
    { voiceURI: 'fr-web', name: 'Google français', lang: 'fr-FR' },
  ];

  beforeAll(() => {
    (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = class {
      text: string;
      lang = '';
      rate = 1;
      voice: unknown = null;
      onend?: () => void;
      onerror?: () => void;
      constructor(text: string) {
        this.text = text;
      }
    };
  });

  afterAll(() => {
    delete (globalThis as Record<string, unknown>).SpeechSynthesisUtterance;
    delete (globalThis as Record<string, unknown>).speechSynthesis;
  });

  beforeEach(() => {
    messages.length = 0;
    Platform.OS = 'web'; // accède bien à la variable partagée (getter/setter)
    (globalThis as Record<string, unknown>).speechSynthesis = {
      speak: (message: MessageFake) => messages.push(message),
      cancel: () => undefined,
      getVoices: () => voixWeb,
    };
  });

  afterEach(() => {
    Platform.OS = 'ios';
    delete (globalThis as Record<string, unknown>).speechSynthesis;
  });

  it('pose lang=fr-FR et attache la voix française sur le web', async () => {
    const parle = recharger();
    await expect(parle.parler('La trigonométrie.')).resolves.toBe(true);
    expect(messages).toHaveLength(1);
    expect(messages[0].lang).toBe('fr-FR');
    expect((messages[0].voice as { voiceURI?: string } | null)?.voiceURI).toBe('fr-web');
  });

  it('annonce l’absence de voix française sur le web', async () => {
    const parle = recharger();
    (globalThis as Record<string, unknown>).speechSynthesis = {
      speak: (message: MessageFake) => messages.push(message),
      cancel: () => undefined,
      getVoices: () => [{ voiceURI: 'en-web', name: 'US', lang: 'en-US' }],
    };
    await expect(parle.voixFrancaiseDisponible()).resolves.toBe(false);
    // La lecture reste possible malgré tout (lang = fr-FR, pas de voice).
    await expect(parle.parler('Bonjour.')).resolves.toBe(true);
    expect(messages[0].lang).toBe('fr-FR');
    expect(messages[0].voice).toBeNull();
  });
});


