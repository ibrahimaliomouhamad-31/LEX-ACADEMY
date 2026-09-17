// Mock in-memory d'AsyncStorage (environnement node sans React Native)
const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: jest.fn(async (k: string) => { store.delete(k); }),
  },
}));

jest.mock('../config/firebaseConfig', () => ({ db: {} }));
jest.mock('../utils/logger', () => ({
  rapporterErreur: jest.fn(),
  avertirDev: jest.fn(),
  logDev: jest.fn(),
}));

// Miroir client : identité locale + XP local (jamais Firebase pour ces tests).
jest.mock('../services/userStorage', () => ({
  getCurrentUserId: jest.fn(async () => 'mon-uid'),
}));
jest.mock('../services/xpLocal', () => ({
  lireXpTotal: jest.fn(async () => 420),
  lireXpSemaineActuelle: jest.fn(async () => 60),
}));

const setDoc = jest.fn(async () => undefined);
const updateDoc = jest.fn(async () => undefined);
const getDocs = jest.fn();
const getDoc = jest.fn();
const getCountFromServer = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn((_db: unknown, _col: string, id: string) => ({ id })),
  where: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  limit: jest.fn(() => ({})),
  query: jest.fn((...args: unknown[]) => ({ args })),
  getDocs: (...args: unknown[]) => getDocs(...args),
  getDoc: (...args: unknown[]) => getDoc(...args),
  setDoc: (...args: unknown[]) => setDoc(...(args as [])),
  updateDoc: (...args: unknown[]) => updateDoc(...(args as [])),
  getCountFromServer: (...args: unknown[]) => getCountFromServer(...args),
}));

import {
  chargerClassement,
  ecrireCacheClassement,
  elevesDepuisDocs,
  lireCacheClassement,
  lireMonProfilPublic,
  maPosition,
  publierMonProfilPublic,
  requeteClassement,
} from '../services/classementPublic';
import { getCurrentUserId } from '../services/userStorage';
import { classeCanonique, niveauPourClasse, NIVEAUX_FILTRAGE } from '../utils/nomenclatureLycee';

const CLASSES_ATTENDUES = ['2nde', '1ère C', '1ère D', 'Terminale C', 'Terminale D'];

const document = (id: string, donnees: Record<string, unknown>) => ({
  id,
  data: () => donnees,
});

describe('Nomenclature du lycée (logique pure)', () => {
  it('n’accepte que les niveaux du lycée', () => {
    expect(NIVEAUX_FILTRAGE.map((n) => n.valeur)).toEqual(['2nde', '1ere', 'terminale']);
    expect(CLASSES_ATTENDUES.every((c) => ['2nde', '1ere', 'terminale'].includes(niveauPourClasse(c)))).toBe(true);
  });

  it('normalise les anciennes écritures de classe, sans inventer de branche', () => {
    expect(classeCanonique('1ereC')).toBe('1ère C');
    expect(classeCanonique('1ère c')).toBe('1ère C');
    expect(classeCanonique('Première D')).toBe('1ère D');
    expect(classeCanonique('tleD')).toBe('Terminale D');
    expect(classeCanonique('2nde')).toBe('2nde');
    // ⛔ Le LEX est un lycée : aucune classe de collège, aucune invention.
    expect(classeCanonique('3ème')).toBeNull();
    expect(classeCanonique('Première')).toBeNull();
    expect(classeCanonique('')).toBeNull();
    expect(niveauPourClasse('6ème')).toBe('inconnu');
    expect(niveauPourClasse('Première')).toBe('1ere');
  });
});

describe('Classement public — miroir client (plan Spark, sans Cloud Function)', () => {
  it('publie uniquement les champs du classement, depuis l’identité et l’XP locaux', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'mon-uid',
      data: () => ({ nom: 'Moussa', classe: '1ereC', avatar: '🦁', email: 'fuite@lex.academy' }),
    });

    expect(await publierMonProfilPublic()).toBe(true);
    // Le mock ne connaît pas la signature de setDoc : on la redonne ici, sinon
    // TypeScript considère `calls[0]` comme un tuple vide.
    const appels = setDoc.mock.calls as unknown as [
      unknown,
      Record<string, unknown>,
      { merge?: boolean },
    ][];
    const [reference, champs, options] = appels[0];
    expect(reference).toEqual({ id: 'mon-uid' });
    expect(Object.keys(champs).sort()).toEqual(
      ['avatar', 'classe', 'majISO', 'nom', 'niveau', 'xp', 'xp_semaine'].sort()
    );
    // 🧽 Classe canonique + niveau déduit : sinon l'élève sort du filtre.
    expect(champs).toMatchObject({ nom: 'Moussa', classe: '1ère C', niveau: '1ere', xp: 420, xp_semaine: 60 });
    expect(options).toEqual({ merge: true });
    // 🔒 Le champ privé de `utilisateurs` n'est jamais recopié… et la clé
    // `email` n'existe même pas dans l'objet envoyé.
    expect('email' in champs).toBe(false);
  });

  it('ne publie rien en mode invité (aucun compte)', async () => {
    (getCurrentUserId as jest.Mock).mockResolvedValueOnce('invite_local');
    expect(await publierMonProfilPublic()).toBe(false);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('répare le niveau manquant d’un profil antérieur (plan Spark, sans Cloud Function)', async () => {
    updateDoc.mockClear();
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'mon-uid',
      // Profil ANCIEN : classe en texte libre, aucun champ `niveau`.
      data: () => ({ nom: 'Amina', classe: 'Terminale D', avatar: '🦁' }),
    });

    expect(await publierMonProfilPublic()).toBe(true);
    // Le rattrapage écrit UNIQUEMENT `niveau` : jamais email/hash/code.
    expect(updateDoc).toHaveBeenCalledWith({ id: 'mon-uid' }, { niveau: 'terminale' });
  });

  it('n’écrit pas dans le profil quand le niveau est déjà correct', async () => {
    updateDoc.mockClear();
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'mon-uid',
      data: () => ({ nom: 'Amina', classe: '2nde', niveau: '2nde', avatar: '🦁' }),
    });

    expect(await publierMonProfilPublic()).toBe(true);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('omet le niveau quand la classe n’existe pas au LEX (jamais « inconnu »)', async () => {
    updateDoc.mockClear();
    setDoc.mockClear();
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'mon-uid',
      // Compte de test : ni niveau déductible, ni classe du lycée.
      data: () => ({ nom: 'q', classe: 'q', avatar: '🎓' }),
    });

    expect(await publierMonProfilPublic()).toBe(true);
    const appels = setDoc.mock.calls as unknown as [unknown, Record<string, unknown>][];
    const champs = appels[0][1];
    // 🔒 « inconnu » n'est pas une valeur acceptée par les règles Firestore :
    // publier ce champ rendrait la fiche non publiable, et l'écrire dans
    // `utilisateurs` bloquerait ensuite toutes les mises à jour du profil.
    expect('niveau' in champs).toBe(false);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('ne bloque jamais le classement si la publication échoue', async () => {
    getDoc.mockRejectedValueOnce(new Error('hors-ligne'));
    expect(await publierMonProfilPublic()).toBe(false);
  });
});



beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
});

describe('Classement public — conversion des documents', () => {
  it('conserve l’UID (repérage de sa ligne) et trie par XP décroissant', () => {
    const eleves = elevesDepuisDocs([
      document('uid-bas', { nom: 'Sami', classe: '2nde', xp: 10 }),
      document('uid-haut', { nom: 'Amina', classe: '1ère C', xp: 300, xp_semaine: 40 }),
    ]);
    expect(eleves.map((e) => e.uid)).toEqual(['uid-haut', 'uid-bas']);
    expect(eleves[0]).toMatchObject({ nom: 'Amina', classe: '1ère C', xp: 300 });
  });

  it('neutralise les valeurs hostiles (XP négatif, types inattendus)', () => {
    const [eleve] = elevesDepuisDocs([
      document('x', { nom: 42, classe: null, xp: -999, xp_semaine: 'beaucoup', avatar: {} }),
    ]);
    expect(eleve).toMatchObject({ nom: 'Élève', classe: '', xp: 0, xp_semaine: 0, avatar: '🎓' });
  });
});

describe('Classement public — requête et cache hors-ligne', () => {
  it('filtre par niveau seulement quand un niveau est choisi', () => {
    expect(requeteClassement('')).toBeTruthy();
    expect(requeteClassement('1ere')).toBeTruthy();
  });

  it('ressert le dernier classement connu quand le réseau échoue', async () => {
    const attendu = [{ uid: 'a', nom: 'Amina', classe: '', niveau: '', xp: 120, xp_semaine: 0, avatar: '🎓' }];
    getDocs.mockResolvedValueOnce({ docs: [document('a', { nom: 'Amina', xp: 120 })] });

    const enLigne = await chargerClassement('1ere');
    expect(enLigne.source).toBe('reseau');
    expect(enLigne.eleves).toEqual(attendu);
    expect(await lireCacheClassement('1ere')).toEqual(attendu);

    // Réseau coupé : le filtre retrouve exactement le même top 50.
    getDocs.mockRejectedValueOnce(new Error('offline'));
    const horsLigne = await chargerClassement('1ere');
    expect(horsLigne.source).toBe('cache');
    expect(horsLigne.eleves).toEqual(attendu);
  });

  it('ne mélange jamais deux niveaux dans le cache', async () => {
    await ecrireCacheClassement('2nde', [{ uid: 'a', nom: 'Seconde', xp: 5 }]);
    await ecrireCacheClassement('terminale', [{ uid: 'b', nom: 'Tle', xp: 900 }]);
    expect((await lireCacheClassement('2nde'))[0].nom).toBe('Seconde');
    expect((await lireCacheClassement('terminale'))[0].nom).toBe('Tle');
    expect(await lireCacheClassement('1ere')).toEqual([]);
  });

  it('ignore un cache corrompu au lieu de planter l’écran', async () => {
    store.set('@lex/classement_cache:1ere', '{pas du json');
    expect(await lireCacheClassement('1ere')).toEqual([]);
  });

  it('n’écrit rien quand le classement est vide (pas de fausse liste hors-ligne)', async () => {
    await ecrireCacheClassement('1ere', []);
    expect(await lireCacheClassement('1ere')).toEqual([]);
  });
});

describe('Classement public — position et fiche personnelle', () => {
  it('calcule le rang réel à partir des comptages serveur', async () => {
    getCountFromServer.mockResolvedValueOnce({ data: () => ({ count: 45 }) });
    getCountFromServer.mockResolvedValueOnce({ data: () => ({ count: 11 }) });
    expect(await maPosition('1ere', 250)).toEqual({ position: 12, total: 45 });
  });

  it('masque le rang si le comptage échoue ou si le niveau est vide', async () => {
    getCountFromServer.mockRejectedValueOnce(new Error('index manquant'));
    expect(await maPosition('1ere', 250)).toBeNull();
    expect(await maPosition('', 250)).toBeNull();
  });

  it('lit la fiche publique de l’élève connecté par son UID', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'mon-uid',
      data: () => ({ nom: 'Moi', classe: '2nde', xp: 77 }),
    });
    expect(await lireMonProfilPublic('mon-uid')).toMatchObject({ uid: 'mon-uid', xp: 77 });

    getDoc.mockResolvedValueOnce({ exists: () => false });
    expect(await lireMonProfilPublic('mon-uid')).toBeNull();
    // En mode invité (uid null), aucun appel réseau n'est déclenché.
    expect(await lireMonProfilPublic(null)).toBeNull();
  });
});
