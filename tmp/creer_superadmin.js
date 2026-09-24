#!/usr/bin/env node
/**
 * tmp/creer_superadmin.js
 * -----------------------
 * Crée le superadmin Mouhamad Ibrahim Alio dans Firebase Auth + Firestore.
 *
 * ⚠️  Ce script doit être lancé APRÈS suppression_totale.js (ou sur une base
 *     fraîche). Il crée :
 *     - Un utilisateur Auth (email aléatoire, mot de passe fourni via la
 *       variable d'environnement SUPERADMIN_MOT_DE_PASSE)
 *     - Un document admins/<uid> avec role: 'superadmin'
 *     - Un document roles/<uid> avec estSuperAdmin: true, role: 'superadmin'
 *     - Une sentinelle config/superadmin (uid) pour verrouiller le bootstrap
 *
 * Usage (depuis la racine) :
 *   SUPERADMIN_MOT_DE_PASSE='<mot de passe>' node tmp/creer_superadmin.js
 *
 * Prérequis : fichier firebase-service-account.json à la racine, ou variable
 *   FIREBASE_SERVICE_ACCOUNT pointant vers lui.
 */
'use strict';

const admin = require('firebase-admin');
const crypto = require('crypto');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || 'firebase-service-account.json';
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (e) {
  console.error(
    '❌  Impossible de charger le compte de service :',
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

// ─── Données du superadmin ───────────────────────────────────────────────
// 🔐 Mot de passe fourni par variable d'environnement — JAMAIS écrit dans le
// dépôt (il était en clair ici, récupérable par quiconque clone le repo).
const motDePasseEnv = process.env.SUPERADMIN_MOT_DE_PASSE;
if (!motDePasseEnv || motDePasseEnv.length < 8) {
  console.error('❌  Définissez SUPERADMIN_MOT_DE_PASSE (8 caractères minimum) :');
  console.error("     SUPERADMIN_MOT_DE_PASSE='...' node tmp/creer_superadmin.js");
  process.exit(1);
}

const SUPERADMIN = {
  nom: 'Mouhamad Ibrahim Alio',
  email: `superadmin-${Date.now()}@lex-academy.local`,
  motDePasse: motDePasseEnv,
  role: 'superadmin',
};

async function creerSuperadmin() {
  console.log('\n========================================');
  console.log('  Création du SUPERADMIN');
  console.log('========================================\n');
  console.log('📋  Profil :');
  console.log(`   Nom     : ${SUPERADMIN.nom}`);
  console.log(`   Email   : ${SUPERADMIN.email}`);
  console.log('   Motdep  : **** (fourni via SUPERADMIN_MOT_DE_PASSE)');
  console.log('');

  // 1. Créer l'utilisateur Auth
  console.log('🔑  Création de l\'utilisateur Firebase Auth...');
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email: SUPERADMIN.email,
      password: SUPERADMIN.motDePasse,
      displayName: SUPERADMIN.nom,
      emailVerified: true,
      disabled: false,
    });
    console.log(`   ✅  UID : ${userRecord.uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      console.warn(`   ℹ️  L'email existe déjà. Tentative de récupération...`);
      const liste = await auth.listUsers(100);
      const existing = liste.users.find(
        (u) => u.email === SUPERADMIN.email
      );
      if (existing) {
        userRecord = existing;
        console.log(`   ✅  UID existant utilisé : ${userRecord.uid}`);
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  const uid = userRecord.uid;

  // 2. Créer les documents Firestore
  console.log('\n🗄️  Écriture des documents Firestore...');

  // admins/<uid>
  await db.doc(`admins/${uid}`).set({
    nom: SUPERADMIN.nom,
    role: SUPERADMIN.role,
    userId: uid,
    ajouteLe: new Date().toISOString(),
    ajoutePar: 'script_superadmin',
  });
  console.log(`   ✅  admins/${uid} créé`);

  // roles/<uid>
  await db.doc(`roles/${uid}`).set({
    estSuperAdmin: true,
    role: SUPERADMIN.role,
    userId: uid,
    creeLe: new Date().toISOString(),
  });
  console.log(`   ✅  roles/${uid} créé`);

  // config/superadmin (sentinelle)
  await db.doc('config/superadmin').set({
    uid: uid,
    creeLe: new Date().toISOString(),
  });
  console.log(`   ✅  config/superadmin créé (sentinelle)`);

  // 3. Résumé
  console.log('\n========================================');
  console.log('  ✅  SUPERADMIN CRÉÉ AVEC SUCCÈS');
  console.log('========================================\n');
  console.log('📌  Prochaines étapes :');
  console.log('   1. Connectez-vous avec :');
  console.log(`      Email : ${SUPERADMIN.email}`);
  console.log('      Mot de passe : celui défini dans SUPERADMIN_MOT_DE_PASSE (non affiché)');
  console.log('   2. CHANGEZ immédiatement votre mot de passe');
  console.log('   3. Vérifiez que vous avez accès à l\'écran Administration');
  console.log('');
  console.log('🔒  Sécurité :');
  console.log('   - Ce script est IRREVERSIBLE');
  console.log('   - Le mot de passe n’est jamais écrit dans le dépôt → changez-le après première connexion');
  console.log('   - Le fichier firebase-service-account.json doit être gardé secret');
  console.log('');

  return userRecord;
}

creerSuperadmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌  ERREUR CRITIQUE :', err.message || err);
    if (err.code) console.error('   Code :', err.code);
    process.exit(1);
  });