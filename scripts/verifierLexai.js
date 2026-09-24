#!/usr/bin/env node
/**
 * 🔍 VÉRIFICATION DU PROXY LEX.AI — diagnostic en ligne, sans lancer l'app.
 *
 * Pourquoi ce script existe : LEX.AI dépend d'un proxy serveur (Cloudflare
 * Worker `workers/lexai-chat/worker.js`). L'ancienne Cloud Function
 * `lexaiChat` n'a JAMAIS été déployée (plan Blaze payant exigé) : son URL
 * renvoie un 404 HTML, que l'app traduit par « assistant non activé ».
 * Ce script dit POURQUOI, en une commande, et teste une URL avant de la
 * coller dans `app.json → extra.lexaiProxyUrl`.
 *
 * Usage :
 *   npm run lexai:check                                    → URL configurée
 *   node scripts/verifierLexai.js --url=https://…          → URL précise
 *   node scripts/verifierLexai.js --question="Bonjour"     → change la question
 *
 * Sortie : code 0 si le proxy répond une VRAIE réponse IA, 1 sinon.
 */

const TIMEOUT_MS = 30000;
const FIREBASE_SECOURS =
  'https://us-central1-lex-academy-10eef.cloudfunctions.net/lexaiChat';

/** URL testée + d'où elle vient (même priorité que `configIA.ts`). */
function lireUrlConfiguree(argv) {
  const argUrl = argv.find((a) => a.startsWith('--url='));
  if (argUrl) {
    return { url: argUrl.slice('--url='.length).trim(), source: 'argument --url' };
  }

  let extra = {};
  try {
    // `require` relatif : résolu depuis CE fichier (pas depuis le dossier
    // courant) → aucun besoin de `__dirname`.
    extra = (require('../app.json').expo || {}).extra || {};
  } catch {
    extra = {};
  }
  const depuisAppJson =
    typeof extra.lexaiProxyUrl === 'string' ? extra.lexaiProxyUrl.trim() : '';
  if (depuisAppJson) {
    return { url: depuisAppJson, source: 'app.json → extra.lexaiProxyUrl' };
  }

  const depuisEnv = (process.env.EXPO_PUBLIC_LEXAI_PROXY_URL || '').trim();
  if (depuisEnv) {
    return { url: depuisEnv, source: '.env → EXPO_PUBLIC_LEXAI_PROXY_URL' };
  }

  return { url: FIREBASE_SECOURS, source: 'secours intégré (Cloud Function jamais déployée)' };
}

/** Affiche un diagnostic lisible et renvoie le code de sortie. */
function diagnostiquer(url, source, reponse, corps) {
  console.log('');
  console.log(`   URL testée   : ${url}`);
  console.log(`   Origine      : ${source}`);
  console.log(`   Statut HTTP  : ${reponse.status}`);
  console.log('');

  const extrait = (corps || '').replace(/\s+/g, ' ').slice(0, 180);
  if (extrait) console.log(`   Corps        : ${extrait}`);
  console.log('');

  let ok = false;
  let json = null;
  try {
    json = JSON.parse(corps);
  } catch {
    json = null;
  }

  if (reponse.status === 200 && json && typeof json.reponse === 'string' && json.reponse.trim()) {
    console.log('✅ LEX.AI est ACTIF : le proxy répond une vraie réponse IA.');
    console.log('   Extrait : ' + json.reponse.trim().replace(/\s+/g, ' ').slice(0, 160));
    ok = true;
  } else if (reponse.status === 200) {
    console.log('⚠️  Le proxy répond 200 mais sans le contrat `{ reponse: "..." }`.');
    console.log('   → Vérifie le code du worker (workers/lexai-chat/worker.js).');
  } else if (reponse.status === 404) {
    console.log('❌ Proxy INTROUVABLE (404).');
    if (url === FIREBASE_SECOURS) {
      console.log('   → C\'est attendu : la Cloud Function `lexaiChat` n\'est pas déployée.');
      console.log('   → Déployer le worker : npm run lexai:login puis npm run lexai:deploy,');
      console.log('     puis coller l\'URL affichée dans app.json → extra.lexaiProxyUrl.');
    } else {
      console.log('   → URL erronée, ou worker jamais déployé (npm run lexai:deploy).');
    }
  } else if (reponse.status === 429) {
    console.log('✅ Le worker EXISTE et répond (429 = quota 60 req / 10 min / IP atteint).');
    console.log('   → Attends 10 minutes et relance : l\'IA est bien activée.');
    ok = true;
  } else if (reponse.status === 503) {
    console.log('⚠️  Worker DÉPLOYÉ mais clé Groq absente côté serveur (503).');
    console.log('   → npm run lexai:secret puis coller la clé gsk_… (elle est dans functions/.env).');
    ok = true;
  } else if (reponse.status === 502) {
    console.log('⚠️  Worker DÉPLOYÉ mais Groq a refusé l\'appel (502).');
    console.log('   → Clé Groq invalide/expirée, ou modèle indisponible.');
    ok = true;
  } else if (reponse.status === 405) {
    console.log('❌ Cette URL n\'accepte pas POST (405) — ce n\'est pas le worker lexai-chat.');
  } else if (reponse.status === 401 || reponse.status === 403) {
    console.log('❌ Accès refusé (401/403) : Cloudflare Access / WAF protège cette URL.');
  } else {
    console.log(`❌ Réponse inattendue (${reponse.status}).`);
  }
  return ok ? 0 : 1;
}

async function main() {
  const argv = process.argv.slice(2);
  const argQuestion = argv.find((a) => a.startsWith('--question='));
  const question = argQuestion ? argQuestion.slice('--question='.length) : 'Bonjour, présente-toi en une phrase.';
  const { url, source } = lireUrlConfiguree(argv);

  console.log('🔍 Vérification du proxy LEX.AI…');
  console.log(`   Question envoyée : ${question}`);

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), TIMEOUT_MS);

  try {
    const reponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: question }] }),
      signal: controleur.signal,
    });
    const corps = await reponse.text();
    process.exitCode = diagnostiquer(url, source, reponse, corps);
  } catch (erreur) {
    console.log('');
    console.log(`❌ Appel impossible : ${erreur && erreur.message ? erreur.message : erreur}`);
    console.log('   → Pas d\'internet, URL injoignable, ou domaine inexistant (workers.dev non déployé).');
    process.exitCode = 1;
  } finally {
    clearTimeout(minuteur);
  }
}

main();
