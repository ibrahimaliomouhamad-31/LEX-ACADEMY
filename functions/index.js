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

// 🔒 MODÈLE FIXÉ CÔTÉ SERVEUR : avant, `body.model` laissait le CLIENT choisir
// n'importe quel modèle Groq (coût et abus possibles : un élève pouvait
// demander un gros modèle). Un seul modèle suffit désormais — l'écran
// photo-exo, qui réclamait un modèle de vision, a été retiré (cycle K).
const MODELE_AUTORISE = 'openai/gpt-oss-120b';

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
        model: MODELE_AUTORISE,
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

// ❌ `lexaiTranscrire` a été SUPPRIMÉ (cycle K) : c'était un stub qui répondait
// 501 sans jamais rien transcrire, et aucun écran ne l'appelait
// (`urlTranscription()` n'avait plus de consommateur). La lecture audio des
// cours passe par `expo-speech` — un TTS LOCAL, donc 100 % hors-ligne.

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

/** Classement public : whitelist de champs, jamais de lecture des profils privés. */
const { onDocumentUpdated, onDocumentCreated: onDocCree, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { synchroniserProfil, migrerClassementPublic } = require('./classement');
exports.reflechirClassementPublic = onDocumentUpdated(
  { document: 'utilisateurs/{userId}', retry: true },
  (event) => synchroniserProfil(admin.firestore(), event.params.userId, true)
);
exports.reflechirClassementCree = onDocCree(
  { document: 'utilisateurs/{uid}', retry: true },
  (event) => synchroniserProfil(admin.firestore(), event.params.uid, true)
);
exports.reflechirClassementSupprime = onDocumentDeleted(
  { document: 'utilisateurs/{uid}', retry: true },
  (event) => synchroniserProfil(admin.firestore(), event.params.uid)
);

/**
 * 🧹 MIGRATION DU CLASSEMENT (réservée à l'administrateur).
 *
 * Appel : POST/GET https://<region>-lex-academy-10eef.cloudfunctions.net/migrerClassementPublic
 *   en-tête : Authorization: Bearer <jeton Firebase de l'admin>
 *   paramètre : dryRun=1 (DÉFAUT) pour un simple rapport, dryRun=0 pour écrire.
 *
 * 🔒 Sans jeton valide ET sans appartenance à `admins` (ou roles.isAdmin),
 * la fonction répond 403 : elle ne peut pas être déclenchée par un élève.
 */
async function estAdminAuthentifie(req) {
  const entete = String((req.headers && req.headers.authorization) || '');
  const jeton = entete.startsWith('Bearer ') ? entete.slice(7).trim() : '';
  if (!jeton) return null;
  try {
    const decode = await admin.auth().verifyIdToken(jeton);
    const db = admin.firestore();
    // Même source de vérité que firestore.rules : `admins/{uid}`, repli `roles`.
    const documentAdmin = await db.collection('admins').doc(decode.uid).get();
    if (documentAdmin.exists) return decode.uid;
    const documentRole = await db.collection('roles').doc(decode.uid).get();
    if (documentRole.exists && documentRole.data().isAdmin === true) return decode.uid;
    return null;
  } catch (erreur) {
    return null;
  }
}

exports.migrerClassementPublic = onRequest(
  { cors: true, timeoutSeconds: 540, memory: '512MiB' },
  async (req, res) => {
    const uid = await estAdminAuthentifie(req);
    if (!uid) {
      res.status(403).json({ error: "Réservé à l'administrateur du LEX." });
      return;
    }
    const demande = String((req.query && req.query.dryRun) ?? (req.body && req.body.dryRun) ?? '1');
    const dryRun = demande !== '0';
    try {
      const rapport = await migrerClassementPublic(admin.firestore(), { dryRun });
      res.json({ ok: true, lancePar: uid, ...rapport });
    } catch (erreur) {
      res.status(500).json({ error: String((erreur && erreur.message) || erreur) });
    }
  }
);

/**
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
      // ✅ Une seule source de vérité pour la fiche publique (au lieu d'une
      // mise à jour partielle qui laissait des champs diverger).
      await synchroniserProfil(db, d.id);
      i++;
    } catch { /* continuer */ }
    // Petit respect des quotas (1 requête/élève à la fois, pas de ruée).
    if (i % 20 === 0) await new Promise((r) => setTimeout(r, 1000));
  }
});
