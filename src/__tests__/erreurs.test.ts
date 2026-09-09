import { describe, it, expect } from '@jest/globals';
import { classifierErreur, estErreurReseau } from '../utils/erreurs';

describe('classifierErreur', () => {
  it('détecte un signe inversé', () => {
    const d = classifierErreur('-12', '12|12 m');
    expect(d.type).toBe('signe');
  });

  it('détecte une unité manquante', () => {
    const d = classifierErreur('12', '12 km/h');
    expect(d.type).toBe('unite');
  });

  it('détecte un presque (1 caractère d’écart)', () => {
    const d = classifierErreur('13', '12');
    expect(d.type).toBe('presque');
  });

  it('détecte une inversion de chiffres', () => {
    const d = classifierErreur('132', '123');
    expect(d.type).toBe('inversion');
  });

  it('retourne faux pour une réponse sans rapport', () => {
    const d = classifierErreur('bonjour', '42');
    expect(d.type).toBe('faux');
  });

  it('ne qualifie pas une réponse vide comme presque juste', () => {
    const d = classifierErreur('', '42');
    expect(d.type).toBe('faux');
  });
});

describe('estErreurReseau', () => {
  it('reconnaît les erreurs réseau classiques', () => {
    expect(estErreurReseau(new Error('Network request failed'))).toBe(true);
    expect(estErreurReseau('FirebaseError: unavailable')).toBe(true);
    expect(estErreurReseau('failed to fetch')).toBe(true);
    expect(estErreurReseau('timeout')).toBe(true);
  });

  it('ne confond pas avec une erreur métier', () => {
    expect(estErreurReseau(new Error('permission-denied'))).toBe(false);
    expect(estErreurReseau('Conflit: données serveur plus récentes')).toBe(false);
  });
});