import { describe, it, expect } from '@jest/globals';
import {
  construireMessages,
  extraireReponse,
  extraireErreurProxy,
  quotaClientDepasse,
  resoudreUrlProxy,
  PROXY_FIREBASE_SECOURS,
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

// ─── CONTEXTE COMPACTÉ (mémoire des échanges archivés par l'écran) ──────────
describe('LEX.AI — construireMessages avec résumé compacté', () => {
  const historique: MessageChat[] = [
    { role: 'user', content: 'q1' },
    { role: 'assistant', content: 'r1' },
  ];

  it("n'ajoute aucun message quand le résumé est vide ou blanc", () => {
    const sans = construireMessages(historique, 'q2');
    expect(construireMessages(historique, 'q2', '')).toEqual(sans);
    expect(construireMessages(historique, 'q2', '   ')).toEqual(sans);
    expect(sans.filter((m) => m.role === 'system')).toHaveLength(1);
  });

  it('injecte le résumé juste après le prompt système, question en dernier', () => {
    const messages = construireMessages(historique, 'q2', 'Questions traitees : derivation.');
    expect(messages[0]).toEqual({ role: 'system', content: SYSTEME_LEXAI });
    expect(messages[1].role).toBe('system');
    expect(messages[1].content).toContain('derivation');
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'q2' });
  });

  it('borne le résumé envoyé (contexte léger, jamais 8000 caractères)', () => {
    const messages = construireMessages([], 'q', 'x'.repeat(9000));
    // 1500 caractères de résumé + le libellé du message système.
    expect(messages[1].content.length).toBeLessThanOrEqual(1560);
  });

  it('reste sous 30 messages ET 32 Ko même saturé avec résumé', () => {
    const charge: MessageChat[] = [];
    for (let i = 0; i < 60; i++) {
      charge.push({ role: 'user', content: 'q'.repeat(8000) });
      charge.push({ role: 'assistant', content: 'r'.repeat(8000) });
    }
    const messages = construireMessages(charge, 'question finale', 'resume '.repeat(400));
    expect(messages.length).toBeLessThanOrEqual(30);
    expect(JSON.stringify(messages).length).toBeLessThanOrEqual(32000);
    // Système, résumé et question survivent tous à la troncature.
    expect(messages[0]).toEqual({ role: 'system', content: SYSTEME_LEXAI });
    expect(messages[1].content).toContain('resume');
    expect(messages[messages.length - 1].content).toBe('question finale');
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

// ─── QUOTA CLIENT (marge sous le rate-limiter serveur 60/10 min/IP) ─────────
describe('LEX.AI — quotaClientDepasse (fenêtre glissante)', () => {
  const MIN = 60 * 1000;
  const maintenant = 1_000_000_000;

  it("n'est pas dépassé en dessous de 40 envois dans la fenêtre", () => {
    const horodatages = Array.from({ length: 39 }, (_, i) => maintenant - i * 1000);
    expect(quotaClientDepasse(horodatages, maintenant)).toBe(false);
  });

  it('est dépassé à partir de 40 envois dans la fenêtre', () => {
    const horodatages = Array.from({ length: 40 }, (_, i) => maintenant - i * 1000);
    expect(quotaClientDepasse(horodatages, maintenant)).toBe(true);
  });

  it('ignore les envois hors fenêtre (10 min) : le quota se relâche', () => {
    // 40 envois, tous il y a plus de 10 min → fenêtre vide → non dépassé.
    const vieux = Array.from({ length: 40 }, (_, i) => maintenant - 11 * MIN - i * 1000);
    expect(quotaClientDepasse(vieux, maintenant)).toBe(false);
    // Mélange : 39 récents (dans la fenêtre) + 5 vieux → toujours non dépassé.
    const melange = [
      ...Array.from({ length: 39 }, (_, i) => maintenant - i * 1000),
      ...Array.from({ length: 5 }, (_, i) => maintenant - 15 * MIN - i * 1000),
    ];
    expect(quotaClientDepasse(melange, maintenant)).toBe(false);
  });

  it('garde la limite pile à la frontière de la fenêtre (10 min exactement)', () => {
    // 39 récents + 1 exactement à 10 min → hors fenêtre (filtre strict <) → 39.
    const bordure = [
      ...Array.from({ length: 39 }, (_, i) => maintenant - i * 1000),
      maintenant - 10 * MIN,
    ];
    expect(quotaClientDepasse(bordure, maintenant)).toBe(false);
  });
});

// ─── RÉSOLUTION DE L'URL DU PROXY (app.json > .env > secours) ───────────────
describe('LEX.AI — resoudreUrlProxy (priorité de configuration)', () => {
  it("préfère l'URL de app.json (elle voyage dans l'APK)", () => {
    expect(resoudreUrlProxy('https://lexai-chat.abc.workers.dev', 'https://env.example')).toBe(
      'https://lexai-chat.abc.workers.dev'
    );
  });

  it('retombe sur le .env quand app.json est vide ou blanc', () => {
    expect(resoudreUrlProxy('', 'https://lexai-chat.abc.workers.dev')).toBe(
      'https://lexai-chat.abc.workers.dev'
    );
    expect(resoudreUrlProxy('   ', 'https://lexai-chat.abc.workers.dev')).toBe(
      'https://lexai-chat.abc.workers.dev'
    );
  });

  it('retombe sur le secours Firebase quand rien n\'est configuré', () => {
    expect(resoudreUrlProxy(undefined, undefined)).toBe(PROXY_FIREBASE_SECOURS);
    expect(resoudreUrlProxy('', '')).toBe(PROXY_FIREBASE_SECOURS);
  });

  it('nettoie les espaces et le slash final (copier-coller depuis wrangler)', () => {
    expect(resoudreUrlProxy(' https://lexai-chat.abc.workers.dev/ ')).toBe(
      'https://lexai-chat.abc.workers.dev'
    );
    expect(resoudreUrlProxy('https://lexai-chat.abc.workers.dev///')).toBe(
      'https://lexai-chat.abc.workers.dev'
    );
  });
});