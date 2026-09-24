import { jest } from '@jest/globals';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
}));

import { Alert, Platform } from 'react-native';
import { alerte } from '../utils/alerte';

const alerteNative = Alert.alert as unknown as jest.Mock;

type ElementFake = {
  style: { cssText: string };
  children: ElementFake[];
  textContent: string | null;
  type?: string;
  onclick?: ((e: { target: ElementFake }) => void) | null;
  attrs: Record<string, string>;
  retire: boolean;
  setAttribute(nom: string, valeur: string): void;
  appendChild(enfant: ElementFake): ElementFake;
  remove(): void;
  focus(): void;
};

function elementFake(tag: string): ElementFake {
  const e: ElementFake = {
    style: { cssText: '' },
    children: [],
    textContent: null,
    onclick: null,
    attrs: {},
    retire: false,
    setAttribute(nom, valeur) {
      e.attrs[nom] = valeur;
    },
    appendChild(enfant) {
      e.children.push(enfant);
      return enfant;
    },
    remove() {
      e.retire = true;
    },
    focus() {},
  };
  void tag;
  return e;
}

/** Installe un mini-DOM global et renvoie les captures nécessaires aux tests. */
function installerDocumentFake(): {
  body: ElementFake;
  ecoutes: Map<string, (e: unknown) => void>;
} {
  const body = elementFake('body');
  const ecoutes = new Map<string, (e: unknown) => void>();
  const doc = {
    body,
    createElement: (tag: string) => elementFake(tag),
    addEventListener(type: string, fn: (e: unknown) => void) {
      ecoutes.set(type, fn);
    },
    removeEventListener(type: string) {
      ecoutes.delete(type);
    },
  };
  (globalThis as Record<string, unknown>).document = doc;
  return { body, ecoutes };
}

function retrouverBouton(couche: ElementFake, texte: string): ElementFake | undefined {
  // couche > fenetre > rangee > boutons (la fenêtre porte les styles de boîte)
  const fenetre = couche.children[0];
  const rangee = fenetre.children[fenetre.children.length - 1];
  return rangee.children.find((b) => b.textContent === texte);
}

describe('alerte() — plateformes', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).document;
    (Platform as { OS: string }).OS = 'ios';
    alerteNative.mockClear();
  });

  test('native : délègue à Alert.alert avec les mêmes arguments', () => {
    const boutons = [{ text: 'OK', onPress: () => {} }];
    alerte('Titre', 'Message', boutons);
    expect(alerteNative).toHaveBeenCalledWith('Titre', 'Message', boutons);
  });

  test('web sans DOM (SSR) : ne lève pas d’exception', () => {
    (Platform as { OS: string }).OS = 'web';
    expect(() => alerte('Titre', 'Message')).not.toThrow();
  });

  test('web : construit la fenêtre, exécute le onPress du bouton puis ferme', () => {
    (Platform as { OS: string }).OS = 'web';
    const { body } = installerDocumentFake();
    const onPress = jest.fn();

    alerte('👋 Salut', 'Message', [{ text: 'OK', onPress }]);

    expect(body.children).toHaveLength(1);
    const couche = body.children[0];
    expect(couche.attrs.role).toBe('alertdialog');
    const ok = retrouverBouton(couche, 'OK');
    expect(ok).toBeDefined();
    expect(onPress).not.toHaveBeenCalled();

    ok?.onclick?.({ target: couche.children[0] });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(couche.retire).toBe(true);
  });

  test('web : sans bouton, propose un OK par défaut', () => {
    (Platform as { OS: string }).OS = 'web';
    const { body } = installerDocumentFake();
    alerte('Titre', 'Message');
    const couche = body.children[0];
    expect(retrouverBouton(couche, 'OK')).toBeDefined();
  });

  test('web : le bouton Annuler déclenche son onPress (confirmation refusée)', () => {
    (Platform as { OS: string }).OS = 'web';
    const { body } = installerDocumentFake();
    const annuler = jest.fn();
    const promouvoir = jest.fn();

    alerte('Confirmer ?', undefined, [
      { text: 'Annuler', style: 'cancel', onPress: annuler },
      { text: 'Promouvoir', onPress: promouvoir },
    ]);

    const couche = body.children[0];
    retrouverBouton(couche, 'Annuler')?.onclick?.({ target: couche.children[0] });
    expect(annuler).toHaveBeenCalledTimes(1);
    expect(promouvoir).not.toHaveBeenCalled();
    expect(couche.retire).toBe(true);
  });
});