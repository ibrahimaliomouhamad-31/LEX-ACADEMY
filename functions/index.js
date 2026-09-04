/**
 * PROXY SÉCURISÉ GROQ — HTTP simple (onRequest), compatible fetch() depuis l'app.
 *
 * DÉPLOIEMENT (une seule fois) :
 *   1. npm install -g firebase-tools   (si besoin) puis firebase login
 *   2. firebase init functions → JavaScript, NE PAS écraser index.js
 *   3. cd functions && npm install
 *   4. firebase functions:secrets:set GROQ_API_KEY   (coller la clé gsk_...)
 *   5. firebase deploy --only functions
 *   URL obtenue : https://<region>-lex-academy-10eef.cloudfunctions.net/lexaiChat
 *
 * PUIS dans l'app (voir la conversation) : remplacer les appels directs à
 * api.groq.com par cette URL et SUPPRIMER les clés en dur.
 */

require('dotenv').config();

const { onRequest } = require('firebase-functions/v2/https');

const CLE_GROQ = process.env.GROQ_API_KEY;
// Clé côté SERVEUR uniquement (jamais embarquée dans l'APK).
// Plan Spark : pas de Secret Manager — la clé vit dans ce fichier privé.


exports.lexaiChat = onRequest({ cors: true }, async (req, res) => {
  // CORS pour l'app mobile (fetch)
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

  const body = req.body || {};
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    res.status(400).json({ error: 'messages requis (1 à 40)' });
    return;
  }

  // Anti-abus basique par IP : 100 requêtes / 10 min
  const ip = req.headers['x-forwarded-for'] || req.ip || 'inconnu';
  const maintenant = Date.now();
  const cle = `ip:${ip}:${Math.floor(maintenant / 600000)}`;
  const cache = exports.lexaiChat.compteur || new Map();
  const hits = cache.get(cle) || 0;
  if (hits >= 100) {
    res.status(429).json({ error: 'Trop de requêtes, patiente un peu.' });
    return;
  }
  cache.set(cle, hits + 1);
  exports.lexaiChat.compteur = cache;

  try {
    const reponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLE_GROQ}`,
      },
      body: JSON.stringify({
        model: body.model || 'openai/gpt-oss-120b',
        temperature: body.temperature ?? 0.5,
        max_tokens: body.max_tokens ?? 2000,
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
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
exports.journalScores = onDocumentCreated('/defi_jour/{docId}', async (event) => {
  const db = require('firebase-admin').firestore();
  const d = event.data && event.data.data ? event.data.data() : {};
  return db.collection('journal_audit').add({
    type: 'defi', ref: event.params.docId, nom: d.nom || '?', classe: d.classe || '?',
    score: d.score, tempsS: d.tempsS, suspect: (d.score || 0) > 3 || (d.tempsS || 999) < 10,
    dateISO: new Date().toISOString(),
  }).catch(() => null);
});
