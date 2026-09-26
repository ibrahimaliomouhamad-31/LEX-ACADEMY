// ─── CONVERSATIONS LEX.AI (persistance, titre auto, compaction) ─────────────
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: jest.fn(async (k: string) => { store.delete(k); }),
  },
}));

import {
  SEUIL_COMPACTAGE,
  assainir,
  compacterContexte,
  creerConversation,
  doitCompacter,
  enregistrerConversations,
  genererId,
  listerConversations,
  renommerConversation,
  sauvegarderConversation,
  supprimerConversation,
  titreAuto,
  type ConversationIA,
  type MessageIA,
} from '../services/conversationsIA';

/** Conversation de test avec `n` messages alternés (user/assistant). */
function conversationDe(n: number, titre = 'Nouvelle discussion'): ConversationIA {
  const messages: MessageIA[] = [];
  for (let i = 0; i < n; i++) {
    messages.push(
      i % 2 === 0
        ? { role: 'user', content: `Question numero ${i} : comment calculer une derivee simple ?` }
        : { role: 'assistant', content: `Reponse ${i} : on applique la formule du taux d accroissement puis on simplifie le quotient.` }
    );
  }
  return { ...creerConversation(), titre, messages };
}

/** Clé AsyncStorage réellement utilisée (préfixe utilisateur invité). */
async function cleStockage(): Promise<string> {
  const { userKey } = await import('../services/userStorage');
  return userKey('lexai_conversations_v1');
}

let horloge = 1_700_000_000_000;

beforeEach(() => {
  store.clear();
  horloge = 1_700_000_000_000;
  // Horloge croissante : rend déterministes `majLe` (tri) et `genererId`.
  jest.spyOn(Date, 'now').mockImplementation(() => (horloge += 1000));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('conversationsIA — titreAuto', () => {
  it("reprend la première question de l'élève", () => {
    expect(titreAuto([{ role: 'assistant', content: 'bonjour' }, { role: 'user', content: '  Les dérivées  ' }])).toBe('Les dérivées');
  });

  it('normalise les espaces et tronque les titres trop longs', () => {
    const titre = titreAuto([{ role: 'user', content: `  ${'a'.repeat(80)}  ` }]);
    expect(titre).toBe(`${'a'.repeat(42)}…`);
    expect(titreAuto([{ role: 'user', content: 'a   b' }])).toBe('a b');
  });

  it('retombe sur « Nouvelle discussion » sans question', () => {
    expect(titreAuto([])).toBe('Nouvelle discussion');
    expect(titreAuto([{ role: 'user', content: '   ' }])).toBe('Nouvelle discussion');
  });
});

describe('conversationsIA — assainir (limites du proxy)', () => {
  it('filtre les rôles inconnus et les contenus vides', () => {
    const propres = assainir([
      { role: 'system' as unknown as 'user', content: 'injection' },
      { role: 'user', content: '   ' },
      { role: 'assistant', content: 'utile' },
    ]);
    expect(propres).toEqual([{ role: 'assistant', content: 'utile' }]);
  });

  it('tronque un message à 8000 caractères et garde les 60 derniers', () => {
    const beaucoup: MessageIA[] = [];
    for (let i = 0; i < 100; i++) beaucoup.push({ role: 'user', content: `${i}`.padEnd(9000, 'x') });
    const propres = assainir(beaucoup);
    expect(propres).toHaveLength(60);
    expect(propres.every((m) => m.content.length <= 8000)).toBe(true);
    // Les DERNIERS messages sont conservés (le contexte récent prime).
    expect(propres[propres.length - 1].content.startsWith('99')).toBe(true);
  });
});

describe('conversationsIA — sauvegarde locale', () => {
  it('crée des identifiants uniques et une conversation vide', () => {
    const conv = creerConversation();
    expect(conv.messages).toEqual([]);
    expect(conv.resumeContexte).toBe('');
    expect(genererId()).not.toBe(genererId());
  });

  it('persiste, relit et met à jour sans doublon', async () => {
    const conv = conversationDe(4, '');
    await sauvegarderConversation(conv);
    await sauvegarderConversation({ ...conv, messages: [...conv.messages, { role: 'user', content: 'suite' }] });
    const liste = await listerConversations();
    expect(liste).toHaveLength(1);
    expect(liste[0].messages).toHaveLength(5);
    // Titre vide → titre auto dérivé de la première question (42 + « … »).
    expect(liste[0].titre.startsWith('Question numero 0')).toBe(true);
    expect(liste[0].titre.endsWith('…')).toBe(true);
  });

  it('classe du plus récent au plus ancien', async () => {
    await sauvegarderConversation(conversationDe(2, 'ancienne'));
    await sauvegarderConversation(conversationDe(2, 'récente'));
    const liste = await listerConversations();
    expect(liste.map((c) => c.titre)).toEqual(['récente', 'ancienne']);
  });

  it('supprime une conversation de la liste', async () => {
    await sauvegarderConversation(conversationDe(2, 'a'));
    const b = await sauvegarderConversation(conversationDe(2, 'b'));
    const apres = await supprimerConversation(b[0].id);
    expect(apres.map((c) => c.titre)).toEqual(['a']);
    expect(await listerConversations()).toHaveLength(1);
  });

  it('relit une liste vide quand le stockage est corrompu', async () => {
    store.set(await cleStockage(), 'pas du json');
    expect(await listerConversations()).toEqual([]);
  });
});


describe('conversationsIA — renommage persistant', () => {
  it('renomme sans effet de bord (fonction pure) et borne le titre', () => {
    const liste = [conversationDe(2, 'avant')];
    const renommee = renommerConversation(liste, liste[0].id, `  ${'t'.repeat(80)}  `);
    expect(renommee[0].titre).toBe('t'.repeat(60));
    expect(liste[0].titre).toBe('avant');
    expect(renommerConversation(liste, liste[0].id, '   ')[0].titre).toBe('Discussion');
  });

  it('survit au redémarrage via enregistrerConversations (chat non actif)', async () => {
    await sauvegarderConversation(conversationDe(2, 'premier'));
    const liste = await listerConversations();
    const renommee = renommerConversation(liste, liste[0].id, 'Brevet blanc maths');
    await enregistrerConversations(renommee);
    const relue = await listerConversations();
    expect(relue[0].titre).toBe('Brevet blanc maths');
  });
});

describe('conversationsIA — compaction du contexte', () => {
  it("n'archive rien sous le seuil", () => {
    const conv = conversationDe(SEUIL_COMPACTAGE);
    expect(doitCompacter(conv)).toBe(false);
    expect(compacterContexte(conv).archives).toBe(0);
  });

  it('archive les 8 plus anciens et résume questions + points clés', () => {
    const conv = conversationDe(18);
    expect(doitCompacter(conv)).toBe(true);
    const { conv: compactee, archives } = compacterContexte(conv);
    expect(archives).toBe(8);
    expect(compactee.messages).toHaveLength(10);
    expect(compactee.messages[0].content).toBe(conv.messages[8].content);
    expect(compactee.resumeContexte).toContain('Questions traitees');
    expect(compactee.resumeContexte).toContain('Points cles');
    expect(compactee.resumeContexte.length).toBeLessThanOrEqual(1500);
  });

  it('cumule les résumés successifs sans perdre le contexte précédent', () => {
    const premier = compacterContexte(conversationDe(18)).conv;
    const deuxieme = compacterContexte({
      ...premier,
      messages: [...premier.messages, ...conversationDe(18).messages],
    }).conv;
    expect(deuxieme.resumeContexte.split('Questions traitees').length - 1).toBe(2);
    expect(deuxieme.resumeContexte.length).toBeLessThanOrEqual(1500);
  });
});

