/**
 * PROXY GROQ — Cloudflare Worker (plan Free : 100 000 requêtes/jour, sans carte).
 *
 * Pourquoi Cloudflare et plus Firebase Cloud Functions : `firebase deploy`
 * exige le plan Blaze (payant) pour activer cloudbuild + secretmanager.
 * Ce worker reproduit EXACTEMENT le contrat de functions/index.js :
 *   - réponse OK : { reponse: "..." }
 *   - erreurs    : { error: "..." } (400 / 405 / 429 / 502 / 503)
 *   - limites    : ≤ 30 messages, ≤ 8000 car. par message, ≤ 32 000 car. total
 *   - rate-limit : 60 requêtes / 10 min / IP (meilleure-approximation :
 *     mémoire par isolate, partagée entre requêtes d'un même isolate)
 *   - modèle IMPOSÉ côté serveur (le client n'en choisit jamais)
 *
 * DÉPLOIEMENT (une fois, compte gratuit) :
 *   1. npx wrangler login
 *   2. npx wrangler secret put GROQ_API_KEY     (coller la clé gsk_…)
 *   3. npx wrangler deploy                      (affiche l'URL workers.dev)
 *   4. coller cette URL dans app.json → extra.lexaiProxyUrl
 *      (équivalent : EXPO_PUBLIC_LEXAI_PROXY_URL dans .env)
 *   → plus simple depuis la racine du projet : npm run lexai:login / lexai:secret
 *     / lexai:deploy, puis npm run lexai:check pour valider l'URL en ligne.
 */

const MODELE_AUTORISE = 'openai/gpt-oss-120b';

// --- Rate limiter (même algorithme que functions/index.js) ------------------
const fenetres = new Map(); // cle -> { compte, debut }
const FENETRE_MS = 600000; // 10 min
const MAX_REQUETES = 60; // 60 / 10 min / IP

function limiter(ip, maintenant) {
  const bucket = Math.floor(maintenant / FENETRE_MS);
  const cle = `${ip}:${bucket}`;

  // Purge des fenêtres périmées (mémoire bornée).
  if (fenetres.size > 1000) {
    const bucketCourant = Math.floor(maintenant / FENETRE_MS);
    for (const autre of fenetres.keys()) {
      if (bucketCourant > Number(autre.split(':')[1])) {
        fenetres.delete(autre);
      }
    }
  }

  const entree = fenetres.get(cle) || { compte: 0, debut: maintenant };
  entree.compte += 1;
  fenetres.set(cle, entree);
  return entree.compte <= MAX_REQUETES;
}

/** Réponse JSON avec CORS (le worker est appelé depuis l'app Expo/web). */
function json(status, corps) {
  return new Response(JSON.stringify(corps), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      });
    }
    if (request.method !== 'POST') {
      return json(405, { error: 'POST requis' });
    }

    const ip = request.headers.get('cf-connecting-ip') || 'inconnu';
    if (!limiter(ip, Date.now())) {
      return json(429, { error: 'Trop de requêtes, patiente un peu.' });
    }

    // 🔒 Clé : secret serveur (`wrangler secret put GROQ_API_KEY`), jamais
    // dans le bundle de l'app.
    if (!env.GROQ_API_KEY) {
      return json(503, {
        error: 'Clé API manquante côté serveur : defines GROQ_API_KEY (wrangler secret put).',
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'Corps JSON invalide.' });
    }

    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
      return json(400, { error: 'messages requis (1 à 30)' });
    }
    // Plafond de taille totale (anti-abus) : ~32 Ko de conversation.
    if (JSON.stringify(messages).length > 32000) {
      return json(400, { error: 'Conversation trop longue.' });
    }
    for (const m of messages) {
      if (!m || typeof m.content !== 'string' || m.content.length > 8000) {
        return json(400, { error: 'Message invalide.' });
      }
    }

    try {
      const reponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
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
        return json(502, { error: (data && data.error && data.error.message) || 'Erreur Groq' });
      }
      const contenu =
        data && data.choices && data.choices[0] && data.choices[0].message
          ? data.choices[0].message.content
          : '';
      return json(200, { reponse: contenu || '' });
    } catch (e) {
      return json(500, { error: 'Erreur proxy' });
    }
  },
};