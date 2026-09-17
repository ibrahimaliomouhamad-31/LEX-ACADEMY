const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  classeCanonique,
  niveauPourClasse,
  profilPublic,
  synchroniserProfil,
  migrerClassementPublic,
} = require('../classement');

/** Faux Firestore minimal : documents en mémoire + journal des écritures. */
function fausseBase(utilisateurs) {
  const journal = { set: [], update: [], delete: [] };
  const reference = (collection, uid) => ({ collection, uid });
  const transaction = {
    get: async (ref) => {
      const donnees = (utilisateurs || {})[ref.uid];
      return { exists: Boolean(donnees), data: () => donnees };
    },
    set: (ref, donnees) => journal.set.push({ ref, donnees }),
    update: (ref, donnees) => journal.update.push({ ref, donnees }),
    delete: (ref) => journal.delete.push(ref),
  };
  const docs = Object.entries(utilisateurs || {}).map(([id, donnees]) => ({
    id,
    data: () => donnees,
  }));
  const page = (curseur, limite) => {
    const id = typeof curseur === 'string' ? curseur : curseur && curseur.id;
    const debut = id ? docs.findIndex((d) => d.id === id) + 1 : 0;
    const tranche = docs.slice(debut, debut + limite);
    return { empty: tranche.length === 0, docs: tranche };
  };
  const db = {
    journal,
    runTransaction: (fn) => fn(transaction),
    collection: (nom) => ({
      doc: (uid) => reference(nom, uid),
      orderBy: () => ({
        limit: (n) => ({
          get: () => Promise.resolve(page(null, n)),
          startAfter: (curseur) => ({ get: () => Promise.resolve(page(curseur, n)) }),
        }),
      }),
      get: () => Promise.resolve(page(null, docs.length || 1)),
    }),
  };
  return db;
}

test('les classes sont normalisées et restent STRICTEMENT lycée', () => {
  assert.equal(classeCanonique('2nde'), '2nde');
  assert.equal(classeCanonique('1èreC'), '1ère C');
  assert.equal(classeCanonique('1ere d'), '1ère D');
  assert.equal(classeCanonique('Terminale C'), 'Terminale C');
  assert.equal(classeCanonique('tleD'), 'Terminale D');
  // Aucune classe de collège : l'app est un lycée d'excellence.
  assert.equal(classeCanonique('3ème'), null);
  assert.equal(niveauPourClasse('6ème'), 'inconnu');
  // Ancien libellé sans branche : le niveau est déduit, la branche n'est pas inventée.
  assert.equal(niveauPourClasse('Première'), '1ere');
  assert.equal(classeCanonique('Première'), null);
});

test('la fiche publique ne contient que les champs du classement', () => {
  const publicData = profilPublic({
    nom: 'Amina',
    classe: '1ereC',
    xp: 320,
    xp_semaine: 40,
    avatar: '🦁',
    email: 'amina@lex.academy',
    codeTransfert: 'SECRET',
    mot_de_passe: 'hash',
  });
  assert.deepEqual(publicData, {
    nom: 'Amina',
    classe: '1ère C',
    niveau: '1ere',
    xp: 320,
    xp_semaine: 40,
    avatar: '🦁',
  });
  // Valeurs hostiles : jamais de niveau arbitraire, jamais d'XP négatif.
  assert.equal(profilPublic({ classe: 'Terminale D', xp: -50 }).niveau, 'terminale');
  assert.equal(profilPublic({ classe: 'Terminale D', xp: -50 }).xp, 0);
  assert.equal(profilPublic({ niveau: 'admin' }).niveau, 'inconnu');
  assert.equal(profilPublic({ classe: 'CM2' }).niveau, 'inconnu');
});

test("l'XP stocké en chaîne est converti (données réelles) et jamais corrompu", () => {
  // Des profils de production portent xp: "200" : publié à 0, l'élève
  // tombait au fond du classement alors qu'il avait 200 XP.
  assert.equal(profilPublic({ classe: '1ère C', xp: '200' }).xp, 200);
  assert.equal(profilPublic({ classe: '1ère C', xp: ' 1250 ' }).xp, 1250);
  assert.equal(profilPublic({ classe: '1ère C', xp: 12.6 }).xp, 13);
  // Valeurs hostiles : ni négatif, ni NaN, ni texte.
  assert.equal(profilPublic({ xp: -80 }).xp, 0);
  assert.equal(profilPublic({ xp: 'beaucoup' }).xp, 0);
  assert.equal(profilPublic({ xp: '' }).xp, 0);
  assert.equal(profilPublic({ xp: null }).xp, 0);
  assert.equal(profilPublic({ xp_semaine: '40' }).xp_semaine, 40);
});

test('la synchronisation relit la source et supprime la fiche des comptes partis', async () => {
  const db = fausseBase({ eleve1: { nom: 'Moussa', classe: 'Terminale C', xp: 100, niveau: 'terminale' } });
  await synchroniserProfil(db, 'eleve1');
  assert.equal(db.journal.set.length, 1);
  assert.equal(db.journal.set[0].donnees.niveau, 'terminale');
  assert.equal(db.journal.set[0].donnees.xp, 100);

  await synchroniserProfil(db, 'inconnu');
  assert.deepEqual(db.journal.delete, [{ collection: 'classement_public', uid: 'inconnu' }]);
});

test('aucune fiche publique invalide n’est publiée pour une classe hors lycée', async () => {
  // « q » / « 3ème » : niveau indéductible. Publier `niveau: "inconnu"` serait
  // refusé par les règles Firestore et bloquerait ensuite la publication
  // côté client → on retire la fiche.
  const db = fausseBase({ test: { nom: 'q', classe: 'q', xp: 10 } });
  await synchroniserProfil(db, 'test');
  assert.equal(db.journal.set.length, 0);
  assert.deepEqual(db.journal.delete, [{ collection: 'classement_public', uid: 'test' }]);
});

test('la migration simule par défaut et répare les anciens profils texte', async () => {
  const utilisateurs = {
    ancien1: { nom: 'Halima', classe: '1èreC', xp: 50 },
    ancien2: { nom: 'Sami', classe: '3ème', xp: 10 },
    recent: { nom: 'Nadia', classe: '2nde', niveau: '2nde', xp: 80 },
  };

  const simulation = await migrerClassementPublic(fausseBase(utilisateurs), { tailleLot: 2 });
  assert.equal(simulation.dryRun, true);
  assert.equal(simulation.examines, 3);
  assert.equal(simulation.corriges, 2); // ancien1 + ancien2 (jamais alignés)
  assert.equal(simulation.dejaAlignes, 1);

  const base = fausseBase(utilisateurs);
  const reel = await migrerClassementPublic(base, { dryRun: false, tailleLot: 2 });
  assert.equal(reel.lots, 2); // pagination vérifiée
  assert.equal(reel.corriges, 2);
  const classes = base.journal.update.map((m) => m.donnees.classe).filter(Boolean);
  assert.deepEqual(classes, ['1ère C']); // « 3ème » reste tel quel, sans invention
  // Seul l'élève au niveau exploitable reçoit une fiche ; « 3ème » est écarté
  // (niveau inconnu ≠ valeur acceptée par les règles Firestore).
  assert.equal(base.journal.set.length, 1);
  assert.equal(base.journal.set[0].donnees.niveau, '1ere');
  assert.deepEqual(base.journal.delete, [{ collection: 'classement_public', uid: 'ancien2' }]);
});
