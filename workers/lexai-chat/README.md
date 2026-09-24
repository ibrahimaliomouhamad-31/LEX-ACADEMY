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
cd workers/lexai-chat
npx wrangler login                        # compte gratuit, sans carte
npx wrangler secret put GROQ_API_KEY      # coller la clé gsk_…
npx wrangler deploy                       # affiche https://lexai-chat.<hash>.workers.dev
```

## Brancher l'app

Copier l'URL affichée dans `.env` à la racine :

```
EXPO_PUBLIC_LEXAI_PROXY_URL=https://lexai-chat.<hash>.workers.dev
```

Puis relancer `npm run start` (les variables `EXPO_PUBLIC_*` sont embarquées
au démarrage du bundler).

## Vérification rapide

```bash
curl -X POST https://lexai-chat.<hash>.workers.dev \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"salut"}]}'
# → {"reponse":"…"}  et non une erreur
```
