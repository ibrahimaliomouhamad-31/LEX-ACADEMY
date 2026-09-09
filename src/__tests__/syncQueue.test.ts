import { describe, it, expect } from '@jest/globals';
import { estErreurReseau } from '../utils/erreurs';

describe('estErreurReseau (ré-export syncQueue)', () => {
  it('reconnaît les erreurs réseau', () => {
    expect(estErreurReseau(new Error('Network request failed'))).toBe(true);
    expect(estErreurReseau('FirebaseError: unavailable')).toBe(true);
  });
});