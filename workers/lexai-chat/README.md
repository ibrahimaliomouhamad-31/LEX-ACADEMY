# 🤖 lexai-chat — proxy Groq (Cloudflare Worker)

Alternative **gratuite** à Firebase Cloud Functions, qui exige le plan Blaze
payant (`cloudbuild` + `secretmanager` refusés sur le plan Spark).

- Plan **Cloudflare Free** : 100 000 requêtes / jour, **aucune carte bancaire**.
- Contrat **identique** à `functions/index.js` → aucun changement dans l'app :
  - OK : `{ reponse: "..." }` — erreurs : `{ error: "..." }` (400/405/429/502/503)
  - limites : ≤ 30 messages, ≤ 8 000 car./message, ≤ 32 000 car. total
  - rate-limit 60 / 10 min / IP, modèle imposé côté serveur
- La clé Groq vit uniquement dans le **secret du worker**.

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
