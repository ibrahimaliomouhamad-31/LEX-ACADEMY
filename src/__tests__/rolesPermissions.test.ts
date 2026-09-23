// 🧪 TESTS DES RÔLES & PERMISSIONS
//
// `genererPermissions` est la SEULE source des permissions : le service ne lit
// JAMAIS le champ `permissions` d'un document (il le régénère depuis le rôle,
// cf. getPermissionsUtilisateur). Une régression ici ouvrirait — ou fermerait —
// des droits à toute une catégorie d'élèves, sans aucun signal visible.
//
// 🧪 Mocks natifs : expo-constants est ESM pur (crash Jest sinon) et Firebase
// n'a rien à faire dans un test — même approche que `nouveauxServices.test.ts`.
//
// 🧠 FAUX FIRESTORE EN MÉMOIRE : les gardes de la hiérarchie
// superadmin ⊃ admin (estSuperAdminActuel, cibleEstSuperAdmin, revoquerRole,
// deleguerPouvoirs) ne sont testables qu'avec de VRAIS documents. On simule
// donc `doc/collection/where/query/getDoc/getDocs/setDoc` sur un simple objet
// `{ 'collection/id': données }` : aucun réseau, et on teste le COMPORTEMENT.
// (Les variables lues par les fabriques `jest.mock` doivent commencer par
// « mock » — c'est une contrainte de babel-plugin-jest-hoist.)

/** Magasin de secours : 'collection/id' → données (absent = document inexistant). */
const mockMagasin: Record<string, Record<string, unknown>> = {};

/** UID renvoyé par getCurrentUserId() — réassigné dans les tests de hiérarchie. */
let mockUidCourant = 'uid-test';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, col: string, id: string) => ({ __chemin: `${col}/${id}`, __col: col })),
  collection: jest.fn((_db: unknown, col: string) => ({ __col: col })),
  where: jest.fn((champ: string, _op: string, valeur: unknown) => ({ champ, valeur })),
  query: jest.fn((ref: { __col: string }, ...clauses: { champ: string; valeur: unknown }[]) => ({
    __col: ref.__col,
    clauses,
  })),
  getDoc: jest.fn(async (ref: { __chemin: string }) => {
    const donnees = mockMagasin[ref.__chemin];
    return { exists: () => donnees !== undefined, data: () => donnees };
  }),
  getDocs: jest.fn(async (requete: { __col: string; clauses: { champ: string; valeur: unknown }[] }) => {
    const docs = Object.entries(mockMagasin)
      .filter(([chemin]) => chemin.split('/')[0] === requete.__col)
      .filter(([, donnees]) => requete.clauses.every((c) => donnees[c.champ] === c.valeur))
      .map(([chemin, donnees]) => ({ id: chemin.split('/')[1], data: () => donnees }));
    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
      forEach: (rappel: (d: unknown) => void) => docs.forEach(rappel),
    };
  }),
  setDoc: jest.fn(
    async (ref: { __chemin: string }, donnees: Record<string, unknown>, options?: { merge?: boolean }) => {
      mockMagasin[ref.__chemin] = options?.merge
        ? { ...(mockMagasin[ref.__chemin] || {}), ...donnees }
        : { ...donnees };
    }
  ),
  updateDoc: jest.fn(async (ref: { __chemin: string }, donnees: Record<string, unknown>) => {
    mockMagasin[ref.__chemin] = { ...(mockMagasin[ref.__chemin] || {}), ...donnees };
  }),
}));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn(() => ({})) }));
jest.mock('../config/firebaseConfig', () => ({ db: {}, auth: { currentUser: null } }));
jest.mock('../services/auth', () => ({ getCurrentUserId: jest.fn(async () => mockUidCourant) }));
// 🔇 Journal mocké : les tests ASSERTENT ce qui est (ou non) signalé comme
// erreur — notamment le permission-denied attendu d'une visite non connectée.
jest.mock('../utils/logger', () => ({
  rapporterErreur: jest.fn(),
  logDev: jest.fn(),
  avertirDev: jest.fn(),
}));


import {
  genererPermissions,
  TOUTES_PERMISSIONS,
  DOMAINES_PERMISSIONS,
  PERMISSIONS_SUPERADMIN_SEUL,
  estAdminActuel,
  estSuperAdminActuel,
  cibleEstSuperAdmin,
  deleguerPouvoirs,
  revoquerRole,
  attribuerRoleEtudiant,
  getPermissionsUtilisateur,
  type UserRole,
  type PermissionKey,
} from '../services/rolesPermissions';
import { getDoc } from 'firebase/firestore';
import { logDev, rapporterErreur } from '../utils/logger';

/**
 * Les 12 clés HISTORIQUES : anciens rôles pédagogiques (moniteur, chef de
 * classe, délégué) retirés du modèle en février 2026. Elles restent dans ce test
 * d'architecture pour garantir que les 38+ clés ajoutées ne sont jamais
 * attribuées aux rôles pédagogiques — elles ne sont accessibles qu'aux admins
 * délégués et au superadmin.
 */
const CLES_HISTORIQUES = [
  'peutAider',
  'peutCorriger',
  'gererAbsences',
  'creerDefis',
  'validerHomework',
  'accesStatsClasse',
  'creerAnnonces',
  'gererPetitions',
  'gererUtilisateurs',
  'gererContenu',
  'accesAudit',
  'modifierRoles',
] as const;

/**
 * Clés ayant la valeur `true` pour un rôle donné.
 * ⚠️ Neutre vis-à-vis du catalogue : on lit `TOUTES_PERMISSIONS` (et non une
 * liste recopiée à la main) → ajouter une permission au service ne casse
 * jamais ce test, et en retirer une le fait échouer à coup sûr.
 */
function actives(
  role: UserRole,
  cles: readonly string[] = CLES_HISTORIQUES
): string[] {
  const permissions = genererPermissions(role) as unknown as Record<string, boolean>;
  return cles.filter((cle) => permissions[cle] === true);
}

/** Vide le faux Firestore entre deux tests (isolement strict). */
beforeEach(() => {
  for (const chemin of Object.keys(mockMagasin)) delete mockMagasin[chemin];
  mockUidCourant = 'uid-test';
});


describe('genererPermissions : droits par rôle', () => {
  it('un élève n’a AUCUNE permission spéciale', () => {
    expect(actives('etudiant')).toEqual([]);
  });

  it('un administrateur cumule TOUS les droits sauf ceux réservés au superadmin', () => {
    const attendues = TOUTES_PERMISSIONS.filter((cle) => !PERMISSIONS_SUPERADMIN_SEUL.includes(cle));
    expect(actives('admin', TOUTES_PERMISSIONS)).toEqual([...attendues]);
  });

  it('le superadmin cumule les 50 droits, sans exception', () => {
    expect(actives('superadmin', TOUTES_PERMISSIONS)).toEqual([...TOUTES_PERMISSIONS]);
  });

  it('un rôle inconnu retombe sur « aucun droit » (défaut sûr)', () => {
    expect(actives('role_invente' as UserRole)).toEqual([]);
  });

  it('les nouvelles permissions (creerCompte, promouvoirEleve) sont déléguables à un admin', () => {
    const permsAdmin = genererPermissions('admin') as Record<string, boolean>;
    expect(permsAdmin.creerCompte).toBe(true);
    expect(permsAdmin.promouvoirEleve).toBe(true);
  });

  it('creerCompte et promouvoirEleve sont TOUJOURS faux pour un élève', () => {
    const permsEleve = genererPermissions('etudiant') as Record<string, boolean>;
    expect(permsEleve.creerCompte).toBe(false);
    expect(permsEleve.promouvoirEleve).toBe(false);
  });
});

describe('genererPermissions : intégrité de la forme', () => {
  const roles: UserRole[] = [
    'etudiant',
    'admin',
    'superadmin',
    'inconnu' as UserRole,
  ];

  it('renvoie TOUJOURS les 50 clés du catalogue (jamais undefined à la lecture)', () => {
    for (const role of roles) {
      const permissions = genererPermissions(role) as unknown as Record<string, unknown>;
      expect(Object.keys(permissions).sort()).toEqual([...TOUTES_PERMISSIONS].sort());
    }
  });

  it('ne renvoie que des booléens', () => {
    for (const role of roles) {
      const permissions = genererPermissions(role) as unknown as Record<string, unknown>;
      for (const cle of TOUTES_PERMISSIONS) {
        expect(typeof permissions[cle]).toBe('boolean');
      }
    }
  });

  it('les droits d’administration restent réservés au rôle admin', () => {
    const sensibles = ['gererUtilisateurs', 'gererContenu', 'accesAudit', 'modifierRoles'];
    for (const role of ['etudiant'] as UserRole[]) {
      const permissions = genererPermissions(role) as unknown as Record<string, boolean>;
      for (const cle of sensibles) {
        expect(permissions[cle]).toBe(false);
      }
    }
  });

describe('📚 Catalogue des permissions', () => {
  it('expose au moins 40 permissions partageables (exigence produit)', () => {
    expect(TOUTES_PERMISSIONS.length).toBeGreaterThanOrEqual(40);
  });

  it('ne contient aucun doublon', () => {
    expect(new Set(TOUTES_PERMISSIONS).size).toBe(TOUTES_PERMISSIONS.length);
  });

  it('chaque permission appartient à au moins un domaine (grille de délégation complète)', () => {
    const couvertes = new Set(DOMAINES_PERMISSIONS.flatMap((d) => d.cles));
    for (const cle of TOUTES_PERMISSIONS) {
      expect(couvertes.has(cle)).toBe(true);
    }
  });

  it('aucun domaine ne référence une permission inconnue', () => {
    for (const domaine of DOMAINES_PERMISSIONS) {
      for (const cle of domaine.cles) {
        expect(TOUTES_PERMISSIONS).toContain(cle);
      }
    }
  });

  it('les permissions « superadmin seul » sont dans le catalogue et jamais accordées à admin', () => {
    expect(PERMISSIONS_SUPERADMIN_SEUL.length).toBeGreaterThan(0);
    for (const cle of PERMISSIONS_SUPERADMIN_SEUL) {
      expect(TOUTES_PERMISSIONS).toContain(cle);
      expect(genererPermissions('admin')[cle]).toBe(false);
      expect(genererPermissions('superadmin')[cle]).toBe(true);
    }
  });

  it('les permissions ajoutées ne fuitent vers AUCUN rôle pédagogique', () => {
    const nouvelles = TOUTES_PERMISSIONS.filter(
      (cle) => !(CLES_HISTORIQUES as readonly string[]).includes(cle)
    );
    expect(nouvelles.length).toBeGreaterThan(0);
    for (const role of ['etudiant'] as UserRole[]) {
      const permissions = genererPermissions(role) as unknown as Record<string, boolean>;
      for (const cle of nouvelles) {
        expect(permissions[cle]).toBe(false);
      }
    }
  });
});

});

// 👑 HIÉRARCHIE superadmin ⊃ admin ⊃ rôles pédagogiques.
// Ces tests échouent si quelqu'un « simplifie » une garde : c'est exactement ce
// qu'un élève curieux tenterait (s'auto-promouvoir via un service exporté).
describe('👑 Hiérarchie superadmin', () => {
  it('estAdminActuel() accepte un superadmin (hiérarchie stricte)', async () => {
    mockUidCourant = 'uid-super';
    mockMagasin['roles/uid-super'] = { role: 'superadmin', estSuperAdmin: true };
    await expect(estAdminActuel()).resolves.toBe(true);
  });

  it('estSuperAdminActuel() lit roles.estSuperAdmin, puis le repli admins.role', async () => {
    mockUidCourant = 'uid-super';
    mockMagasin['roles/uid-super'] = { estSuperAdmin: true };
    await expect(estSuperAdminActuel()).resolves.toBe(true);

    delete mockMagasin['roles/uid-super'];
    mockMagasin['admins/uid-super'] = { role: 'superadmin' };
    await expect(estSuperAdminActuel()).resolves.toBe(true);
  });

  it('estSuperAdminActuel() reste faux pour un admin ordinaire', async () => {
    mockUidCourant = 'uid-admin';
    mockMagasin['admins/uid-admin'] = { nom: 'Admin' };
    mockMagasin['roles/uid-admin'] = { role: 'admin', isAdmin: true };
    await expect(estSuperAdminActuel()).resolves.toBe(false);
  });

  it('cibleEstSuperAdmin() reconnait la cible et refuse les cas vides', async () => {
    mockMagasin['roles/uid-super'] = { estSuperAdmin: true };
    await expect(cibleEstSuperAdmin('uid-super')).resolves.toBe(true);
    await expect(cibleEstSuperAdmin('uid-inconnu')).resolves.toBe(false);
    await expect(cibleEstSuperAdmin('')).resolves.toBe(false);
  });

  it('un admin ORDINAIRE ne peut PAS révoquer le superadmin', async () => {
    mockUidCourant = 'uid-admin';
    mockMagasin['admins/uid-admin'] = { nom: 'Admin' };
    mockMagasin['roles/uid-super'] = { estSuperAdmin: true, role: 'superadmin' };

    const resultat = await revoquerRole('uid-super');
    expect(resultat.success).toBe(false);
    expect(resultat.error).toMatch(/superadmin/i);
    expect(mockMagasin['roles/uid-super'].isDeleted).toBeUndefined();
  });

  it('le superadmin PEUT révoquer un admin ordinaire', async () => {
    mockUidCourant = 'uid-super';
    mockMagasin['admins/uid-super'] = { role: 'superadmin' };
    mockMagasin['roles/uid-admin'] = { role: 'admin' };

    const resultat = await revoquerRole('uid-admin');
    expect(resultat.success).toBe(true);
    expect(mockMagasin['roles/uid-admin'].isDeleted).toBe(true);
  });

  it('un élève ne peut pas s’attribuer un rôle (défaut sûr)', async () => {
    mockUidCourant = 'uid-eleve';
    mockMagasin['roles/uid-eleve'] = { role: 'etudiant' };

    const resultat = await attribuerRoleEtudiant('uid-eleve', 'Eleve', '2nde', 'etudiant');
    expect(resultat.success).toBe(false);
    expect(resultat.error).toMatch(/insuffisantes/i);
  });

  it('un admin ORDINAIRE ne peut PAS s’octroyer le rôle superadmin', async () => {
    mockUidCourant = 'uid-admin';
    mockMagasin['admins/uid-admin'] = { nom: 'Admin' };

    const resultat = await attribuerRoleEtudiant('uid-admin', 'Admin', '2nde', 'superadmin');
    expect(resultat.success).toBe(false);
    expect(resultat.error).toMatch(/superadmin/i);
  });

  it('un admin ORDINAIRE ne peut PAS modifier la fiche du superadmin', async () => {
    mockUidCourant = 'uid-admin';
    mockMagasin['admins/uid-admin'] = { nom: 'Admin' };
    mockMagasin['roles/uid-super'] = { estSuperAdmin: true, role: 'superadmin' };

    const resultat = await attribuerRoleEtudiant('uid-super', 'Chef', '2nde', 'etudiant');
    expect(resultat.success).toBe(false);
    // Le rôle du superadmin est resté intact.
    expect(mockMagasin['roles/uid-super'].role).toBe('superadmin');
    expect(mockMagasin['roles/uid-super'].estSuperAdmin).toBe(true);
  });
});

// 🎁 DÉLÉGATION DE POUVOIRS : la fonctionnalité demandée (le superadmin coche
// les pouvoirs d'un élève choisi, et RIEN d'autre ne les accorde).
describe('🎁 Délégation de pouvoirs', () => {
  it('deleguerPouvoirs() est refusé hors superadmin', async () => {
    mockUidCourant = 'uid-admin';
    mockMagasin['admins/uid-admin'] = { nom: 'Admin' };

    const resultat = await deleguerPouvoirs('uid-eleve', ['gererContenu']);
    expect(resultat.success).toBe(false);
    expect(resultat.error).toMatch(/superadmin/i);
  });

  it('le superadmin délègue, déduplique et ignore les clés inconnues', async () => {
    mockUidCourant = 'uid-super';
    mockMagasin['admins/uid-super'] = { role: 'superadmin' };
    mockMagasin['roles/uid-eleve'] = { userId: 'uid-eleve', role: 'etudiant', classe: '2nde' };

    const avant = await getPermissionsUtilisateur('uid-eleve');
    expect(avant?.permissions.gererContenu).toBe(false);

    const resultat = await deleguerPouvoirs('uid-eleve', [
      'gererContenu',
      'voirSignalements',
      'voirSignalements',
      'permissionInventee' as PermissionKey,
    ]);
    expect(resultat.success).toBe(true);
    expect(mockMagasin['roles/uid-eleve'].pouvoirsDelegues).toEqual([
      'gererContenu',
      'voirSignalements',
    ]);

    const apres = await getPermissionsUtilisateur('uid-eleve');
    expect(apres?.permissions.gererContenu).toBe(true);
    expect(apres?.permissions.voirSignalements).toBe(true);
    // Le reste du catalogue demeure fermé : on n'a rien « débloqué en bloc ».
    expect(apres?.permissions.gererUtilisateurs).toBe(false);
    expect(apres?.permissions.promouvoirAdmin).toBe(false);
  });

  it('getPermissionsUtilisateur() ignore les pouvoirs délégués d’un rôle révoqué', async () => {
    mockMagasin['roles/uid-eleve'] = {
      userId: 'uid-eleve',
      role: 'etudiant',
      classe: '2nde',
      isDeleted: true,
      pouvoirsDelegues: ['gererContenu'],
    };
    await expect(getPermissionsUtilisateur('uid-eleve')).resolves.toBeNull();
  });
});

// 🔇 SONDE SANS SESSION : ouvrir 🏛️ /admin sans être connecté fait échouer la
// lecture `roles/{uid}` (règles `isAdmin() || estSoiMeme()` → `permission-
// denied`). Ce refus est la réponse ATTENDUE — « tu n'es pas cette personne »
// → false — pas une erreur : le signaler afficherait une erreur en dev à
// CHAQUE visite d'un non-connecté et créerait un faux crash en prod.
describe('🔇 Sonde roles sans session (permission-denied)', () => {
  /** Erreur telle que renvoyée par Firestore (FirebaseError.code). */
  const refus = (): Error =>
    Object.assign(new Error('Missing or insufficient permissions.'), {
      code: 'permission-denied',
    });

  const snapVide = async () => ({ exists: () => false, data: () => undefined });

  beforeEach(() => {
    (rapporterErreur as jest.Mock).mockClear();
    (logDev as jest.Mock).mockClear();
  });

  it('estSuperAdminActuel() retombe sur false SANS signaler d’erreur', async () => {
    (getDoc as jest.Mock).mockImplementationOnce(async () => {
      throw refus();
    });

    await expect(estSuperAdminActuel()).resolves.toBe(false);
    expect(rapporterErreur).not.toHaveBeenCalled();
    expect(logDev).toHaveBeenCalled();
  });

  it('estAdminActuel() retombe sur false SANS signaler d’erreur', async () => {
    // 1re lecture = admins/{uid} (publique) : trou vide ; 2e = roles/{uid} : refus.
    (getDoc as jest.Mock)
      .mockImplementationOnce(snapVide)
      .mockImplementationOnce(async () => {
        throw refus();
      });

    await expect(estAdminActuel()).resolves.toBe(false);
    expect(rapporterErreur).not.toHaveBeenCalled();
    expect(logDev).toHaveBeenCalled();
  });

  it('une VRAIE erreur de lecture reste signalée (aucun étouffement)', async () => {
    (getDoc as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('reseau indisponible');
    });

    await expect(estSuperAdminActuel()).resolves.toBe(false);
    expect(rapporterErreur).toHaveBeenCalledWith(
      '[roles] Erreur lecture superadmin:',
      expect.any(Error)
    );
    expect(logDev).not.toHaveBeenCalled();
  });
});
