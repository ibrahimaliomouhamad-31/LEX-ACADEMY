#!/usr/bin/env node
/**
 * tmp/supprimer_tout.js
 * -----------------------
 * 1. Supprime TOUS les utilisateurs Firebase Auth
 * 2. VIDE les collections Firestore qui portent l'historique :
 *    eleves/**, roles/**, stats/**, parametres/**, signalements/**,
 *    classement_public/**, journal_audit/**, autres collections de données
 *    utilisateur.
 *
 * Usage (depuis la racine du projet) :
 *   node tmp/supprimer_tout.js
 *
 * ⚠️  IRREVERSIBLE — à lancer uniquement sur un projet de dev / de reset,
 *     ou quand on sait exactement ce qu'on fait.
 */
'use strict';

const admin = require('firebase-admin');
const readline = require('readline');

// ---- Intialisation du SDK Admin ----
// On s'attend à un fichier serviceAccount disponible :
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || 'firebase-service-account.json';
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (e) {
  console.error(
    '❌  Impossible de charger le fichier de compte de service :',
    serviceAccountPath,
    '\n    Définissez FIREBASE_SERVICE_ACCOUNT ou placez firebase-service-account.json à la racine.'
  );
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();
const auth = admin.auth();

// -------------------------------------------------------
// Lister / supprimer les users Auth
// -------------------------------------------------------
async function supprimerUsersAuth() {
  console.log('\n🔑  Suppression des utilisateurs Firebase Auth...');
  let pageToken = undefined;
  let total = 0;

  while (true) {
    const listCmd = await auth.listUsers(1000, pageToken);
    for (const user of listCmd.users) {
      try {
        await auth.deleteUser(user.uid);
        total++;
      } catch (err) {
        console.warn(`   ⚠  échec suppression user ${user.uid}:`, err.message);
      }
    }
    if (!listCmd.pageToken) break;
    pageToken = listCmd.pageToken;
  }
  console.log(`   → ${total} utilisateur(s) Auth supprimé(s).`);
}

// -------------------------------------------------------
// Vider / supprimer les collections Firestore utilisateur
// -------------------------------------------------------
const COLLECTIONS_A_VIDER = [
  // Collections directement liées à un profil / rôle / historique
  'eleves',
  'roles',
  'admins',
  'stats',
  'parametres',
  'signalements',
  'journal_aide',
  'journal_audit',
  'classement_public',
  'flashcards_scores',
  'lex_exos_resolus',
  'bac_blanc_scores',
  'srs',
  'notifications',
  'sessions',
  'sauvegardes',
  // Tout le reste (au cas où d'autres collections utilisateur ont été créées)
  // On peut aussi vider 모든 sous-collections d'un path, mais ici on se limite
  // aux collections nommées ci-dessus.
];

async function viderCollections() {
  console.log('\n🗑️  Vidage des collections Firestore utilisateur...');
  for (const collName of COLLECTIONS_A_VIDER) {
    const snap = await db.collection(collName).listDocuments();
    if (snap.length === 0) {
      console.log(`   - ${collName}: aucun document → ignoré.`);
      continue;
    }
    let supprimes = 0;
    // Suppression en lot (batches de 500 max)
    let lastDoc = null;
    while (true) {
      let query = db.collection(collName).limit(500);
      if (lastDoc) query = query.startAfter(lastDoc);
      const batch = await query.get();
      if (batch.empty) break;
      const batchWrite = db.batch();
      batch.docs.forEach((docSnap) => {
        batchWrite.delete(docSnap.ref);
      });
      await batchWrite.commit();
      supprimes += batch.size;
      lastDoc = batch.docs[batch.docs.length - 1];
      console.log(`   - ${collName}: ${supprimes} document(s) supprimé(s) (batch)`);
    }
    console.log(`   → ${collName}: total ${supprimes} documents supprimés.`);
  }
}

// -------------------------------------------------------
// Interaction utilisateur
// -------------------------------------------------------
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function question(text) {
  return new Promise((resolve) => rl.question(text, resolve));
}

async function main() {
  console.log('==================================================');
  console.log('  SUPPRESSION TOTALE des comptes et historiques');
  console.log('==================================================\n');
  console.log('Ce script va :');
  console.log('  • supprimer TOUS les utilisateurs Firebase Auth');
  console.log('  • vider les collections Firestore :');
  for (const c of COLLECTIONS_A_VIDER) console.log(`      - ${c}`);
  console.log('\n⚠️  Cette action est IRREVERSIBLE.\n');

  const reponse = await question(
    'Tapez "SUPPRIMER" pour confirmer, ou quitter (Ctrl+C) : '
  );
  if (reponse.trim() !== 'SUPPRIMER') {
    console.log('\n❌  Annulation.');
    rl.close();
    return;
  }

  try {
    await supprimerUsersAuth();
    await viderCollections();
    console.log('\n✅  Suppression terminée.');
  } catch (err) {
    console.error('\n❌  Erreur lors de l exécution :', err);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
