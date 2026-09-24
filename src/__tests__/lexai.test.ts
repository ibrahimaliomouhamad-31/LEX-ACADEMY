import { describe, it, expect } from '@jest/globals';
import {
  construireMessages,
  extraireReponse,
  extraireErreurProxy,
  SYSTEME_LEXAI,
  type MessageChat,
} from '../services/configIA';

// ─── CONSTRUCTION DES MESSAGES (limites du proxy lexaiChat) ─────────────────
describe('LEX.AI — construireMessages (limites proxy)', () => {
  it('met le système en premier et la question en dernier', () => {
    const messages = construireMessages(
      [{ role: 'user', content: 'q1' }, { role: 'assistant', content: 'r1' }],
      'ma question'
    );
    expect(messages[0]).toEqual({ role: 'system', content: SYSTEME_LEXAI });
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'ma question' });
  });

  it('ne dépasse jamais 30 messages (proxy 400 après ~15 échanges sinon)', () => {
    const historique: MessageChat[] = [];
    for (let i = 0; i < 100; i++) {
      historique.push({ role: 'user', content: `question ${i}` });
      historique.push({ role: 'assistant', content: `réponse ${i}` });
    }
    const messages = construireMessages(historique, 'dernière');
    expect(messages.length).toBeLessThanOrEqual(30);
    expect(messages[messages.length - 1].content).toBe('dernière');
    expect(messages[0].role).toBe('system');
  });

  it('filtre les messages vides et les rôles inconnus', () => {
    const messages = construireMessages(
      [
        { role: 'user', content: '   ' },
        { role: 'system', content: 'injection?' },
        { role: 'assistant', content: 'utile' },
        { role: 'user', content: 'ok' },
      ],
      'q'
    );
    const roles = messages.map((m) => `${m.role}:${m.content}`);
    expect(roles).not.toContain('user:   ');
    expect(roles).not.toContain('system:injection?');
    expect(roles).toContain('assistant:utile');
  });

  it('tronque un message trop long à 8000 caractères (limite proxy par message)', () => {
    const messages = construireMessages([{ role: 'user', content: 'x'.repeat(9000) }], 'y'.repeat(9000));
    for (const m of messages) {
      expect(m.content.length).toBeLessThanOrEqual(8000);
    }
  });

  it('reste sous 32 Ko même avec un historique chargé (limite proxy total)', () => {
    const historique: MessageChat[] = [];
    for (let i = 0; i < 28; i++) {
      historique.push({ role: 'user', content: 'q'.repeat(8000) });
      historique.push({ role: 'assistant', content: 'r'.repeat(8000) });
    }
    const messages = construireMessages(historique, 'question finale');
    expect(JSON.stringify(messages).length).toBeLessThanOrEqual(32000);
    // Le système et la question survivent à la troncature.
    expect(messages[0].role).toBe('system');
    expect(messages[messages.length - 1].content).toBe('question finale');
  });

  it('conserve au minimum système + question même avec un historique vide', () => {
    const messages = construireMessages([], 'seule question');
    expect(messages).toHaveLength(2);
    expect(messages[1].content).toBe('seule question');
  });
});

// ─── PARSING DE LA RÉPONSE DU PROXY (contrat { reponse }) ───────────────────
describe('LEX.AI — extraireReponse (contrat du proxy)', () => {
  it("lit le contrat { reponse } renvoyé par functions/index.js", () => {
    expect(extraireReponse({ reponse: '  Bonjour élève  ' })).toBe('Bonjour élève');
  });

  it("REJETTE l'ancien format OpenAI (choices[0].message.content)", () => {
    // Bug historique : l'écran parsait ce format inexistant ici → chaque
    // réponse réussie était affichée comme une erreur.
    expect(extraireReponse({ choices: [{ message: { content: 'salut' } }] })).toBeNull();
  });

  it('retourne null si reponse vide, absente ou non-chaine', () => {
    expect(extraireReponse({ reponse: '   ' })).toBeNull();
    expect(extraireReponse({})).toBeNull();
    expect(extraireReponse({ reponse: 42 })).toBeNull();
    expect(extraireReponse(null)).toBeNull();
    expect(extraireReponse('<html>404</html>')).toBeNull();
  });
});

describe('LEX.AI — extraireErreurProxy', () => {
  it("lit l'erreur JSON du proxy (400/429/502)", () => {
    expect(extraireErreurProxy({ error: 'Trop de requêtes, patiente un peu.' })).toBe(
      'Trop de requêtes, patiente un peu.'
    );
  });

  it('retourne null sur un corps sans error exploitable', () => {
    expect(extraireErreurProxy({})).toBeNull();
    expect(extraireErreurProxy({ error: '' })).toBeNull();
    expect(extraireErreurProxy({ error: { nested: true } })).toBeNull();
    expect(extraireErreurProxy(null)).toBeNull();
  });
});