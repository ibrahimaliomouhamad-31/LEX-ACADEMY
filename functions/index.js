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
// utilisant firebase-admin (classement_public, resetXpSemaine)
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

// 🔒 SECRET DÉCLARÉ : la valeur n'est injectée dans process.env QUE si elle
// apparaît ici (option `secrets` de firebase-functions/v2). Sans cette ligne,
// CLE_GROQ resterait undefined même après `functions:secrets:set`.
exports.lexaiChat = onRequest({ cors: true, secrets: ['GROQ_API_KEY'] }, async (req, res) => {
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
 * 👑 BOOTSTRAP SUPERADMIN — USAGE UNIQUE.
 *
 * Appel : POST https://us-central1-lex-academy-10eef.cloudfunctions.net/devenirSuperAdmin
 *   en-tête : Authorization: Bearer <jeton Firebase de l'utilisateur>
 *   corps   : { "code": "<code de bootstrap>" }
 *
 * 🔒 POURQUOI UNE FONCTION (et pas une vérification dans l'app) :
 * un code écrit dans le bundle JS est extractible en quelques minutes. Ici le
 * code n'existe QUE sous forme d'empreinte SHA-256, dans le secret Cloud
 * Functions `SUPERADMIN_CODE_HASH` (ou, à défaut, dans
 * `config/superadmin.codeHash` posé depuis la console Firebase). L'app ne
 * connaît rien du code : elle transmet seulement la saisie.
 *
 * 🔒 L'uid n'est JAMAIS transmis par le client : il est déduit du jeton
 * vérifié (`verifyIdToken`) → impossible de réclamer le rôle pour quelqu'un
 * d'autre, même en connaissant le code.
 *
 * 🔒 USAGE UNIQUE : `config/superadmin.uid` est posé au premier succès. Toute
 * réclamation ultérieure par un AUTRE uid est refusée (409). Le superadmin en
 * place, lui, peut relancer l'appel (idempotent).
 *
 * MISE EN PLACE (une seule fois) :
 *   1. node -e "console.log(require('crypto').createHash('sha256').update('<TON_CODE>','utf8').digest('hex'))"
 *   2. cd functions && firebase functions:secrets:set SUPERADMIN_CODE_HASH   (coller l'empreinte)
 *   3. firebase deploy --only functions
 */
const crypto = require('crypto');

/** Empreinte SHA-256 hexadécimale (utf8) — jamais le code en clair. */
function empreinteCode(valeur) {
  return crypto.createHash('sha256').update(String(valeur), 'utf8').digest('hex');
}

/** Comparaison à TEMPS CONSTANT : la durée ne révèle pas combien d'octets sont bons. */
function egaliteTempsConstant(a, b) {
  const tamponA = Buffer.from(String(a), 'utf8');
  const tamponB = Buffer.from(String(b), 'utf8');
  if (tamponA.length !== tamponB.length) return false;
  return crypto.timingSafeEqual(tamponA, tamponB);
}

/** uid de l'appelant, ou null si le jeton est absent/invalide. */
async function uidDuJeton(req) {
  const entete = String((req.headers && req.headers.authorization) || '');
  const jeton = entete.startsWith('Bearer ') ? entete.slice(7).trim() : '';
  if (!jeton) return null;
  try {
    const decode = await admin.auth().verifyIdToken(jeton);
    return decode.uid || null;
  } catch {
    return null;
  }
}

exports.devenirSuperAdmin = onRequest({ cors: true }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST requis' });
    return;
  }

  const uid = await uidDuJeton(req);
  if (!uid) {
    res.status(401).json({ error: 'Jeton Firebase requis.' });
    return;
  }

  const code = String((req.body && req.body.code) || '').trim();
  if (!code) {
    res.status(400).json({ error: 'Code requis.' });
    return;
  }

  try {
    const db = admin.firestore();
    const refSentinelle = db.collection('config').doc('superadmin');
    const docSentinelle = await refSentinelle.get();
    const sentinelle = docSentinelle.exists ? docSentinelle.data() : {};

    // 🔒 USAGE UNIQUE : un autre uid a déjà réclamé → refus définitif.
    if (sentinelle.uid && sentinelle.uid !== uid) {
      res.status(409).json({ error: 'Rôle déjà réclamé : contacte le superadmin en place.' });
      return;
    }

    // Empreinte attendue : secret d'abord (recommande), repli Firestore.
    const attendue = String(
      process.env.SUPERADMIN_CODE_HASH || sentinelle.codeHash || ''
    ).toLowerCase();
    if (!attendue) {
      res.status(503).json({
        error: "Bootstrap non configuré : definis le secret SUPERADMIN_CODE_HASH puis redeploie.",
      });
      return;
    }

    if (!egaliteTempsConstant(empreinteCode(code), attendue)) {
      res.status(403).json({ error: 'Code incorrect.' });
      return;
    }

    // 1) Fiche de role (source lue par le CLIENT : estSuperAdminActuel).
    await db.collection('roles').doc(uid).set(
      {
        userId: uid,
        role: 'superadmin',
        estSuperAdmin: true,
        isAdmin: true,
        isDeleted: false,
        actif: true,
        dateAttribution: new Date().toISOString(),
      },
      { merge: true }
    );

    // 2) Collection `admins` (source lue par les REGLES : isSuperAdmin()).
    await db.collection('admins').doc(uid).set(
      { userId: uid, role: 'superadmin', ajouteLe: new Date().toISOString().slice(0, 10) },
      { merge: true }
    );

    // 3) Sentinelle : ferme la porte d'auto-promotion heritee (adminInitialise)
    //    ET enregistre le detenteur du role. `codeHash` n'est JAMAIS ecrase.
    await refSentinelle.set(
      { uid, claimLe: new Date().toISOString() },
      { merge: true }
    );
    await db.collection('config').doc('initialise').set(
      { par: uid, le: new Date().toISOString() },
      { merge: true }
    );

    res.json({ ok: true, uid, role: 'superadmin' });
  } catch (erreur) {
    res.status(500).json({ error: String((erreur && erreur.message) || erreur) });
  }
});

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
