#!/usr/bin/env node
/**
 * 🧹 MIGRATION DU CLASSEMENT — voie de secours SANS Cloud Function.
 *
 * Pourquoi ce script existe : la Cloud Function `migrerClassementPublic`
 * (functions/index.js) est la voie officielle, mais le projet est sur le plan
 * SPARK → les Functions ne peuvent pas être déployées. Or les profils créés
 * AVANT le modèle lycée n'ont pas de champ `niveau` : le filtre du classement
 * ne les voit pas, et `classement_public` est vide.
 *
 * Ce script applique EXACTEMENT la même logique que la Function : il importe
 * `functions/classement.js` (module testé, source unique de vérité) et lui
 * fournit un adaptateur Firestore REST. Aucune règle n'est dupliquée ici.
 *
 * Usage :
 *   node scripts/migrerClassement.js                 → simulation (aucune écriture)
 *   node scripts/migrerClassement.js --write         → applique les corrections
 *   GOOGLE_ACCESS_TOKEN=... node scripts/migrerClassement.js   → jeton explicite
 *
 * 🔒 L'écriture passe par l'API admin : elle exige un jeton Google porteur du
 * scope cloud-platform. Un élève ne peut donc pas lancer cette migration.
 */

const fs = require('fs');
const path = require('path');
const { profilPublic, classeCanonique, migrerClassementPublic } = require('../functions/classement');

const PROJECT_ID = process.env.LEX_PROJECT_ID || 'lex-academy-10eef';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Lit le jeton d'accès : variable d'env d'abord, sinon config firebase-tools. */
function lireJeton() {
  if (process.env.GOOGLE_ACCESS_TOKEN) return process.env.GOOGLE_ACCESS_TOKEN;
  const fichier = path.join(
    process.env.HOME || '',
    '.config',
    'configstore',
    'firebase-tools.json'
  );
  const config = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  const jeton = config && config.tokens && config.tokens.access_token;
  if (!jeton) throw new Error('Aucun jeton d’accès : lance `npx firebase-tools login`.');
  return jeton;
}

/** Convertit un document Firestore REST en objet JS (types usuels). */
function depuisRest(champs) {
  const objet = {};
  for (const [cle, valeur] of Object.entries(champs || {})) {
    if ('stringValue' in valeur) objet[cle] = valeur.stringValue;
    else if ('integerValue' in valeur) objet[cle] = Number(valeur.integerValue);
    else if ('doubleValue' in valeur) objet[cle] = Number(valeur.doubleValue);
    else if ('booleanValue' in valeur) objet[cle] = valeur.booleanValue;
    else if ('nullValue' in valeur) objet[cle] = null;
    else if ('mapValue' in valeur) objet[cle] = depuisRest(valeur.mapValue.fields);
    else if ('arrayValue' in valeur) objet[cle] = (valeur.arrayValue.values || []).map((v) => depuisRest({ v }).v);
  }
  return objet;
}

/** Convertit un objet JS en champs Firestore REST. */
function versRest(objet) {
  const champs = {};
  for (const [cle, valeur] of Object.entries(objet)) {
    if (valeur === null || valeur === undefined) continue;
    if (typeof valeur === 'string') champs[cle] = { stringValue: valeur };
    else if (typeof valeur === 'number' && Number.isInteger(valeur)) champs[cle] = { integerValue: String(valeur) };
    else if (typeof valeur === 'number') champs[cle] = { doubleValue: valeur };
    else if (typeof valeur === 'boolean') champs[cle] = { booleanValue: valeur };
  }
  return champs;
}

/** Adaptateur Firestore REST exposant l'API attendue par functions/classement.js. */
function creerDbRest(jeton) {
  let ecritures = 0;

  const appeler = async (url, options = {}) => {
    const reponse = await fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    });
    const texte = await reponse.text();
    const corps = texte ? JSON.parse(texte) : {};
    if (!reponse.ok) {
      throw new Error(`${reponse.status} ${corps.error ? corps.error.message : texte}`);
    }
    return corps;
  };

  const chemins = (doc) => `${BASE}/${doc.collection}/${doc.uid}`;

  /** Écriture partielle (équivalent de `merge: true`). */
  const ecrire = async (doc, donnees) => {
    const champs = versRest(donnees);
    const noms = Object.keys(champs);
    if (noms.length === 0) return {};
    const requete = noms.map((n) => `updateMask.fieldPaths=${encodeURIComponent(n)}`).join('&');
    ecritures += 1;
    return appeler(`${chemins(doc)}?${requete}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: champs }),
    });
  };

  const lire = async (doc) => {
    const reponse = await fetch(chemins(doc), { headers: { Authorization: `Bearer ${jeton}` } });
    if (reponse.status === 404) return { exists: false, data: () => undefined };
    const corps = await reponse.json();
    if (!reponse.ok) throw new Error(`${reponse.status} lecture ${doc.collection}/${doc.uid}`);
    const donnees = depuisRest(corps.fields);
    return { exists: true, data: () => donnees };
  };

  const lirePage = async (nom, taille) => {
    const reponse = await appeler(`${BASE}/${nom}?pageSize=${taille}`);
    return (reponse.documents || []).map((d) => ({
      id: d.name.split('/').pop(),
      data: () => depuisRest(d.fields),
    }));
  };

  const db = {
    get ecritures() {
      return ecritures;
    },
    collection: (nom) => ({
      doc: (uid) => ({ collection: nom, uid }),
      orderBy: () => ({
        limit: (taille) => ({
          get: async () => {
            const docs = await lirePage(nom, taille);
            return { empty: docs.length === 0, docs };
          },
        }),
      }),
      get: async () => {
        const docs = await lirePage(nom, 1000);
        return { empty: docs.length === 0, docs };
      },
    }),
    runTransaction: async (travail) =>
      travail({
        get: (ref) => lire(ref),
        set: (ref, donnees) => ecrire(ref, donnees),
        update: (ref, donnees) => ecrire(ref, donnees),
        delete: async (ref) => {
          ecritures += 1;
          const reponse = await fetch(chemins(ref), {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${jeton}` },
          });
          if (!reponse.ok && reponse.status !== 404) {
            throw new Error(`${reponse.status} suppression ${ref.collection}/${ref.uid}`);
          }
        },
      }),
  };
  return db;
}