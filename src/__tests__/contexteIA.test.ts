import { describe, expect, it } from '@jest/globals';
import {
  CARACTERES_PAR_TOKEN,
  SEUIL_CONTEXTE_CRITIQUE,
  SEUIL_CONTEXTE_MOYEN,
  mesurerContexte,
} from '../services/contexteIA';
import { LIMITES_PROXY } from '../services/configIA';
import type { MessageIA } from '../services/conversationsIA';

/** Conversation de `n` messages alternés, chaque message long de `taille`. */
function conversation(n: number, taille: number): MessageIA[] {
  const tiret = 'a'.repeat(taille);
  return Array.from({ length: n }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `message ${i} ${tiret}`,
  }));
}

describe('contexteIA — conversation vide', () => {
  it('affiche un contexte quasi vide et rassurant', () => {
    const mesure = mesurerContexte([], '');
    expect(mesure.actifs).toBe(0);
    expect(mesure.envoyes).toBe(0);
    expect(mesure.ignores).toBe(0);
    expect(mesure.tronque).toBe(false);
    expect(mesure.niveau).toBe('ok');
    expect(mesure.pourcentage).toBeLessThan(SEUIL_CONTEXTE_MOYEN);
    expect(mesure.conseil).toContain('Contexte léger');
  });

  it('ne throw pas sur un historique invalide (donnée corrompue)', () => {
    const mesure = mesurerContexte(null as unknown as MessageIA[], undefined as unknown as string);
    expect(mesure.actifs).toBe(0);
    expect(mesure.pourcentage).toBeGreaterThanOrEqual(0);
  });
});

describe('contexteIA — plafond de messages (30)', () => {
  const mesure = mesurerContexte(conversation(40, 40));

  it('transmet au plus 28 messages d’historique et signale les ignorés', () => {
    expect(mesure.actifs).toBe(40);
    expect(mesure.envoyes).toBe(LIMITES_PROXY.messages - 2);
    expect(mesure.ignores).toBe(40 - (LIMITES_PROXY.messages - 2));
    expect(mesure.tronque).toBe(true);
  });

  it('sature la barre et conseille de compacter', () => {
    expect(mesure.pourcentage).toBe(100);
    expect(mesure.niveau).toBe('critique');
    expect(mesure.conseil).toContain('12 anciens messages');
    expect(mesure.conseil).toContain('compacte');
  });

  it('réserve un message au contexte compacté quand il existe', () => {
    const avecResume = mesurerContexte(conversation(40, 40), 'Questions traitees : derivation.');
    expect(avecResume.envoyes).toBe(LIMITES_PROXY.messages - 3);
    expect(avecResume.ignores).toBe(40 - (LIMITES_PROXY.messages - 3));
    expect(avecResume.tronque).toBe(true);
  });
});

describe('contexteIA — tokens et niveaux', () => {
  it('estime les tokens au quart des caractères, plafond inclus', () => {
    const mesure = mesurerContexte(conversation(10, 1000));
    expect(mesure.tokens).toBe(Math.ceil(mesure.caracteres / CARACTERES_PAR_TOKEN));
    expect(mesure.maxTokens).toBe(Math.ceil(LIMITES_PROXY.total / CARACTERES_PAR_TOKEN));
    expect(mesure.tokens).toBeLessThan(mesure.maxTokens);
  });

  it("n'ignore aucun message quand la discussion tient dans les plafonds", () => {
    const mesure = mesurerContexte(conversation(10, 1000));
    expect(mesure.envoyes).toBe(10);
    expect(mesure.ignores).toBe(0);
    expect(mesure.tronque).toBe(false);
  });

  it('passe en niveau « moyen » à partir du seuil de remplissage', () => {
    // 6 × 3000 caractères ≈ 18 600 caractères ≈ 62 % du budget de 30 000.
    const mesure = mesurerContexte(conversation(6, 3000));
    expect(mesure.pourcentage).toBeGreaterThanOrEqual(SEUIL_CONTEXTE_MOYEN);
    expect(mesure.pourcentage).toBeLessThan(SEUIL_CONTEXTE_CRITIQUE);
    expect(mesure.niveau).toBe('moyen');
    expect(mesure.conseil).toContain('compactage');
  });

  it('passe en niveau « critique » quand le budget de caractères explose', () => {
    // 6 × 4500 caractères ≈ 27 600 ≈ 92 % du budget : sous le plafond de
    // messages (6 < 28) donc rien n'est encore ignoré, mais la barre alerte.
    const mesure = mesurerContexte(conversation(6, 4500));
    expect(mesure.pourcentage).toBeGreaterThanOrEqual(SEUIL_CONTEXTE_CRITIQUE);
    expect(mesure.niveau).toBe('critique');
    expect(mesure.envoyes).toBe(6);
    expect(mesure.ignores).toBe(0);
    expect(mesure.tronque).toBe(false);
    expect(mesure.conseil).toContain('compacte maintenant');
  });

  it('signale la troncature par le plafond de caractères (messages ignorés)', () => {
    // 10 × 3000 ≈ 30 600 caractères : l'historique le plus ancien est coupé
    // par le budget de 30 000, même si l'on reste sous 30 messages.
    const mesure = mesurerContexte(conversation(10, 3000));
    expect(mesure.tronque).toBe(true);
    expect(mesure.ignores).toBeGreaterThan(0);
    expect(mesure.envoyes).toBe(10 - mesure.ignores);
    expect(mesure.conseil).toContain('ne part plus au moteur');
  });
});
