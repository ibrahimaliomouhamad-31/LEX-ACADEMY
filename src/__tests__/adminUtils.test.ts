// 🧪 TESTS DES OUTILS D'ADMINISTRATION (logique pure, sans Firestore)
//
// Ces fonctions portent les décisions sensibles de l'écran 🏛️ :
//   • retrouver l'élève à promouvoir (et gérer les HOMONYMES) ;
//   • interdire la suppression du DERNIER administrateur ;
//   • retrouver les élèves d'une classe dont le champ diffère (`classe` libre
//     des anciens profils vs `niveau` du modèle lycée).
import {
  docAdminAPromouvoir,
  estUnUid,
  libelleRoleAdmin,
  normaliserNom,
  traceAdmin,
  trouverCandidatsParNom,
  variantesClasse,
  verifierRetraitAdmin,
  type ProfilEleve,
} from '../services/adminUtils';

describe('normaliserNom', () => {
  it('ignore la casse, les accents et les espaces superflus', () => {
    expect(normaliserNom('  Ibrahima   ALI ')).toBe('ibrahima ali');
    expect(normaliserNom('Aïssatou')).toBe('aissatou');
    expect(normaliserNom("O'NEILL")).toBe('o neill');
  });

  it('renvoie une chaîne vide pour une saisie vide', () => {
    expect(normaliserNom('')).toBe('');
    expect(normaliserNom('   ')).toBe('');
  });
});

describe('estUnUid', () => {
  it('reconnait un identifiant technique Firebase', () => {
    expect(estUnUid('Ab3xY9kLmNoPqRsTuVwXyZ12345')).toBe(true);
  });

  it('refuse un nom d’élève (espaces ou trop court)', () => {
    expect(estUnUid('Ibrahima Ali')).toBe(false);
    expect(estUnUid('court')).toBe(false);
    expect(estUnUid('')).toBe(false);
  });
});

describe('trouverCandidatsParNom', () => {
  const profils: ProfilEleve[] = [
    { uid: 'u1', nom: 'Ibrahima Ali', niveau: '2nde' },
    { uid: 'u2', nom: 'ibrahima ali', classe: 'terminale' },
    { uid: 'u3', nom: 'Aïssatou Diallo', niveau: '1ere' },
  ];

  it('retrouve les HOMONYMES malgré la casse et les accents', () => {
    const trouves = trouverCandidatsParNom(profils, 'IBRAHIMA ALI');
    expect(trouves.map((p) => p.uid)).toEqual(['u1', 'u2']);
  });

  it('retrouve un élève saisi SANS accent', () => {
    expect(trouverCandidatsParNom(profils, 'aissatou diallo').map((p) => p.uid)).toEqual(['u3']);
  });

  it('ne renvoie RIEN pour un nom absent ou vide', () => {
    expect(trouverCandidatsParNom(profils, 'Moussa')).toEqual([]);
    expect(trouverCandidatsParNom(profils, '   ')).toEqual([]);
  });

  it('ne fait jamais de correspondance partielle (pas de « Ali » → « Alima »)', () => {
    const avecAlima: ProfilEleve[] = [{ uid: 'u4', nom: 'Alima', niveau: '2nde' }];
    expect(trouverCandidatsParNom(avecAlima, 'Ali')).toEqual([]);
  });
});

describe('verifierRetraitAdmin', () => {
  const deuxAdmins = [
    { id: 'moi', nom: 'Proviseur' },
    { id: 'autre', nom: 'Adjoint' },
  ];

  it('interdit de supprimer le DERNIER administrateur (verrouillage définitif)', () => {
    const seul = verifierRetraitAdmin([{ id: 'moi', nom: 'Proviseur' }], 'moi', 'moi');
    expect(seul.autorise).toBe(false);
    expect(seul.raison).toContain('au moins un administrateur');
  });

  it('autorise le retrait d’un autre admin', () => {
    expect(verifierRetraitAdmin(deuxAdmins, 'autre', 'moi').autorise).toBe(true);
  });

  it('avertit quand on retire son PROPRE accès (passation de pouvoir)', () => {
    const propre = verifierRetraitAdmin(deuxAdmins, 'moi', 'moi');
    expect(propre.autorise).toBe(true);
    expect(propre.avertissement).toBeTruthy();
  });

  it('refuse une cible inconnue ou sans identifiant', () => {
    expect(verifierRetraitAdmin(deuxAdmins, '', 'moi').autorise).toBe(false);
    expect(verifierRetraitAdmin(deuxAdmins, 'inconnu', 'moi').autorise).toBe(false);
  });
});

describe('docAdminAPromouvoir', () => {
  it('respecte la convention docId == uid testée par isAdmin()', () => {
    const d = docAdminAPromouvoir('uid123', 'Ibrahima', '2026-09-21', 'uidAdmin');
    expect(d).toEqual({
      nom: 'Ibrahima',
      userId: 'uid123',
      ajouteLe: '2026-09-21',
      ajoutePar: 'uidAdmin',
    });
    expect(d.userId).toBe('uid123');
  });
});

describe('traceAdmin', () => {
  it('produit une trace d’audit identifiable (type = admin)', () => {
    const t = traceAdmin('promotion_admin', 'uidAdmin', 'Proviseur', 'uid123', 'Ibrahima', '2026-09-21');
    expect(t.type).toBe('admin');
    expect(t.action).toBe('promotion_admin');
    expect(t.cible).toBe('uid123');
    expect(t.le).toBe('2026-09-21');
  });
});

describe('variantesClasse', () => {
  it('ajoute les niveaux du lycée à la saisie approximative', () => {
    expect(variantesClasse('2nde')).toContain('2nde');
    expect(variantesClasse('terminale')).toContain('terminale');
    expect(variantesClasse('1ère')).toContain('1ere');
    expect(variantesClasse('TERMINALE A')).toContain('terminale');
  });

  it('conserve la saisie exacte (champ classe libre des anciens profils)', () => {
    expect(variantesClasse('2nde A')).toContain('2nde A');
    expect(variantesClasse('2nde A')).toContain('2nde');
  });

  it('renvoie une liste vide pour une saisie vide', () => {
    expect(variantesClasse('   ')).toEqual([]);
  });
});

describe('libelleRoleAdmin', () => {
  it('traduit chaque rôle en libellé lisible', () => {
    expect(libelleRoleAdmin('admin')).toContain('Administrateur');
    expect(libelleRoleAdmin('superadmin')).toContain('Superadmin');
    expect(libelleRoleAdmin('etudiant')).toContain('Élève');
    expect(libelleRoleAdmin(undefined)).toContain('Inconnu');
  });
});
