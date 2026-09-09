/**
 * PROXY SÉCURISÉ GROQ — HTTP simple (onRequest), compatible fetch() depuis l'app.
 *
 * DÉPLOIEMENT (une seule fois) :
 *   1. npm install -g firebase-tools   (si besoin) puis firebase login
 *   2. cd functions && npm install
 *   3. firebase functions:secrets:set GROQ_API_KEY   (coller la clé gsk_...)
 *   4. firebase deploy --only functions
 *   URL obtenue : https://<region>-lex-academy-10eef.cloudfunctions.net/lexaiChat
 *
 * 🔒 Améliorations sécurité :
 *  - Purge périodique du rate-limiter (plus de fuite mémoire),
 *  - Plafond de taille de requête (anti-abus),
 *  - Limite par IP renforcée + plafond de tokens.
 */

require('dotenv').config();

// ⚠️ Initialisation OBLIGATOIRE du SDK Admin : sans elle, toute fonction
// utilisant firebase-admin (journalScores, classement_public, resetXpSemaine)
// plante au premier appel avec « The default Firebase app does not exist ».
const admin = require('firebase-admin');
admin.initializeApp();

const { onRequest } = require('firebase-functions/v2/https');

const CLE_GROQ = process.env.GROQ_API_KEY;
// Clé côté SERVEUR uniquement (jamais embarquée dans l'APK).

// --- Rate limiter avec purge (avant : Map infinie → fuite mémoire) ---
const fenetres = new Map(); // cle -> { compte, debut }
const FENETRE_MS = 600000; // 10 min
const MAX_REQUETES = 60;   // 60 requêtes / 10 min / IP (largement suffisant)

function limiter(ip) {
  const maintenant = Date.now();
  const cleFenetre = Math.floor(maintenant / FENETRE_MS);
  const cle = `${ip}:${cleFenetre}`;

  // Purge : supprime les fenêtres périmées (toutes les ~100 requêtes).
  if (fenetres.size > 1000) {
    for (const [cle, valeur] of fenetres) {
      if (Math.floor(maintenant / FENETRE_MS) > Number(cle.split(':')[1])) {
        fenetres.delete(cle);
      }
    }
  }

  const entree = fenetres.get(cle) || { compte: 0 };
  entree.compte += 1;
  fenetres.set(cle, entree);
  return entree.compte <= MAX_REQUETES;
}

exports.lexaiChat = onRequest({ cors: true }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST requis' });
    return;
  }

  const ip = String(req.headers['x-forwarded-for'] || req.ip || 'inconnu').split(',')[0].trim();
  if (!limiter(ip)) {
    res.status(429).json({ error: 'Trop de requêtes, patiente un peu.' });
    return;
  }

  const body = req.body || {};
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
    res.status(400).json({ error: 'messages requis (1 à 30)' });
    return;
  }
  // Plafond de taille totale (anti-abus) : ~32 Ko de conversation.
  const taille = JSON.stringify(messages).length;
  if (taille > 32000) {
    res.status(400).json({ error: 'Conversation trop longue.' });
    return;
  }
  // Chaque message doit être une chaîne raisonnable.
  for (const m of messages) {
    if (!m || typeof m.content !== 'string' || m.content.length > 8000) {
      res.status(400).json({ error: 'Message invalide.' });
      return;
    }
  }

  try {
    const reponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLE_GROQ}`,
      },
      body: JSON.stringify({
        model: body.model || 'openai/gpt-oss-120b',
        temperature: Math.min(Math.max(Number(body.temperature ?? 0.5), 0), 1),
        max_tokens: Math.min(Number(body.max_tokens ?? 1200), 2000),
        reasoning_effort: 'low',
        messages,
      }),
    });
    const data = await reponse.json();
    if (!reponse.ok) {
      res.status(502).json({ error: data?.error?.message || 'Erreur Groq' });
      return;
    }
    res.json({ reponse: data.choices?.[0]?.message?.content || '' });
  } catch (e) {
    res.status(500).json({ error: 'Erreur proxy' });
  }
});

/**
 * Proxy transcription audio (pour la dictée vocale) — multipart renvoyé tel quel.
 * Idem déploiement : lexaiTranscrire. Le client envoie le FormData Groq sans
 * l'en-tête Authorization (la clé est ajoutée ici).
 */
exports.lexaiTranscrire = onRequest({ cors: true }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  res.status(501).json({ error: 'Pour la dictée : réutilise lexaiChat ou envoie le fichier en JSON base64.' });
});

// 72 — JOURNAL D'AUDIT : trace toutes les écritures de scores pour repérer
// les anomalies (rafales, scores impossibles). Consultable dans Firestore.
// 🔒 Avec les règles Firestore (score 0..3), un score invalide est bloqué à
// la source ; l'audit garde un œil sur les temps anormalement rapides.
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
exports.journalScores = onDocumentCreated('/defi_jour/{docId}', async (event) => {
  const db = require('firebase-admin').firestore();
  const d = event.data && event.data.data ? event.data.data() : {};
  const suspect = (d.tempsS || 999) < 8; // 3 questions en < 8 s = quasi impossible
  return db.collection('journal_audit').add({
    type: 'defi', ref: event.params.docId, nom: d.nom || '?', classe: d.classe || '?',
    score: d.score, tempsS: d.tempsS, suspect,
    dateISO: new Date().toISOString(),
  }).catch(() => null);
});

/**
 * 🏆 CLASSEMENT PUBLIC — collection dénormalisée et SANS données sensibles.
 *
 * Le classement (écran classement.tsx) lit actuellement `utilisateurs`, qui
 * contient email, hash de mot de passe et code de transfert → fuite si la
 * règle de lecture est trop ouverte. Ici on agrége POUR CHAQUE MISE À JOUR
 * d'XP d'un utilisateur une fiche publique (nom, classe, xp, xp_semaine,
 * avatar) dans `classement_public`, qui seule est lisible par les élèves.
 */
const { onDocumentUpdated, onDocumentCreated: onDocCree } = require('firebase-functions/v2/firestore');
exports.reflechirClassementPublic = onDocumentUpdated('utilisateurs/{userId}', async (event) => {
  const db = require('firebase-admin').firestore();
  const apres = event.data.after.data();
  if (!apres) return null;
  const uid = event.params.userId;
  // N'expose JAMAIS l'email ni le hash : uniquement l'essentiel du classement.
  return db.collection('classement_public').doc(uid).set({
    nom: String(apres.nom || 'Élève'),
    classe: String(apres.classe || ''),
    xp: Number(apres.xp) || 0,
    xp_semaine: Number(apres.xp_semaine) || 0,
    avatar: String(apres.avatar || '🎓'),
    majISO: new Date().toISOString(),
  }, { merge: true }).catch(() => null);
});
exports.reflechirClassementCree = onDocCree('utilisateurs/{uid}', async (event) => {
  // Rejoue la même logique à la création du profil (la 1re fois).
  const db = require('firebase-admin').firestore();
  const donnees = event.data ? event.data.data() : {};
  const uid = event.params.uid;
  return db.collection('classement_public').doc(uid).set({
    nom: String(donnees.nom || 'Élève'),
    classe: String(donnees.classe || ''),
    xp: Number(donnees.xp) || 0,
    xp_semaine: Number(donnees.xp_semaine) || 0,
    avatar: String(donnees.avatar || '🎓'),
    maj: new Date().toISOString(),
  }, { merge: true }).catch(() => null);
});

/**
 * 🗓️ HORLOGE HEBDOMADAIRE — réinitialise les XP de la semaine pour les
 * classements/ligues hebdo. Exécuté chaque lundi à 00:05 (heure serveur).
 * On rend aussi `classement_public.xp_semaine` à 0 : les ligues repartent
 * équitablement, les « gros » XP cumulés ne bloquent plus les nouveaux.
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
exports.resetXpSemaine = onSchedule('5 0 * * MON', { timeZone: 'Africa/Niamey' }, async () => {
  const db = require('firebase-admin').firestore();
  const { FieldValue } = require('firebase-admin/firestore');
  const snapshot = await db.collection('utilisateurs').get().catch(() => null);
  if (!snapshot) return;
  let i = 0;
  for (const d of snapshot.docs) {
    try {
      await db.collection('utilisateurs').doc(d.id).update({
        xp_semaine: 0,
        xp_semaine_cle: FieldValue.delete(),
      });
      await db.collection('classement_public').doc(d.id).update({
        xp_semaine: 0,
      }).catch(() => null);
      i++;
    } catch { /* continuer */ }
    // Petit respect des quotas (1 requête/élève à la fois, pas de ruée).
    if (i % 20 === 0) await new Promise((r) => setTimeout(r, 1000));
  }
});
