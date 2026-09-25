# 🤖 lexai-chat — proxy Groq (Cloudflare Worker)

Alternative **gratuite** à Firebase Cloud Functions, qui exige le plan Blaze
payant (`cloudbuild` + `secretmanager` refusés sur le plan Spark).

- Plan **Cloudflare Free** : 100 000 requêtes / jour, **aucune carte bancaire**.
- Contrat **identique** à `functions/index.js` → aucun changement dans l'app :
  - OK : `{ reponse: "..." }` — erreurs : `{ error: "..." }` (400/405/429/502/503)
  - limites : ≤ 30 messages, ≤ 8 000 car./message, ≤ 32 000 car. total
  - rate-limit 60 / 10 min / IP, modèle imposé côté serveur
- La clé Groq vit uniquement dans le **secret du worker**.

## ✅ État en production (25/09/2026)

| Élément | Valeur |
|---|---|
| URL du worker | **https://lexai-chat.lex-academy.workers.dev** |
| Sous-domaine `workers.dev` | `lex-academy` (créé via l'API — le compte n'en avait aucun) |
| Secret serveur | `GROQ_API_KEY` ✅ posé (`wrangler secret list` le confirme) |
| Modèle imposé | `openai/gpt-oss-120b` (côté serveur : le client ne choisit jamais) |
| Vérification | `npm run lexai:check` → **HTTP 200 + `{ reponse }`** (vraie réponse IA) |
| Branchement app | `app.json → extra.lexaiProxyUrl` |

L'ancienne URL (`us-central1-lex-academy-10eef.cloudfunctions.net/lexaiChat`)
reste en **secours** dans `configIA.ts` mais répond **404** : la Cloud Function
n'a jamais pu être déployée (plan Blaze payant exigé, `firebase functions:list`
= 0 fonction). Le 404 est géré proprement côté écran (« assistant non activé »).

## Déploiement (une fois)

```bash
npm run lexai:login     # ouvre le navigateur : compte Cloudflare GRATUIT, sans carte
npm run lexai:secret    # coller la clé gsk_… (déjà présente dans functions/.env)
npm run lexai:deploy    # affiche https://lexai-chat.<hash>.workers.dev
```

Ces trois scripts npm équivalent à `npx wrangler login | secret put | deploy`
exécutés dans ce dossier (`package.json` fait le `cd` pour vous).

## Brancher l'app

Copier l'URL affichée par le déploiement dans **`app.json` → `expo.extra`** :

```json
"lexaiProxyUrl": "https://lexai-chat.<hash>.workers.dev"
```

✅ C'est la voie **recommandée** : `extra` est embarqué dans l'APK, exactement
comme `extra.firebaseApiKey` — l'URL est donc active même sans fichier `.env`
(le projet n'en versionne aucun). Alternative : un `.env` à la racine avec
`EXPO_PUBLIC_LEXAI_PROXY_URL=https://…` (priorité plus basse, non embarquée
dans un build lancé sans ce `.env`).

`src/services/configIA.ts` résout l'URL ainsi :
`app.json → extra.lexaiProxyUrl` → `.env → EXPO_PUBLIC_LEXAI_PROXY_URL` →
URL Firebase historique (jamais déployée → 404 géré côté écran).

Puis relancer `npm run start` (les variables `EXPO_PUBLIC_*` et `extra` sont
lues au démarrage du bundler).

## Vérification rapide

```bash
npm run lexai:check                                     # teste l'URL configurée
node scripts/verifierLexai.js --url=https://lexai-chat.<hash>.workers.dev
```

Le script affiche un diagnostic précis : ✅ actif / ❌ 404 (worker non déployé) /
429 (quota atteint → worker bien vivant) / 503 (secret `GROQ_API_KEY` manquant) /
502 (clé Groq refusée). Équivalent manuel :

```bash
curl -X POST https://lexai-chat.<hash>.workers.dev \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"salut"}]}'
# → {"reponse":"…"}  et non une erreur
```
