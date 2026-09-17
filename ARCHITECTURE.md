# 🗺️ Architecture LEX Academy — Cartographie par domaines

> Application Expo/React Native 100% offline-first, sans accès professeur,
> pour les élèves de Terminale C/D du Lycée d'Excellence de Tessaoua (Niger).

Les fichiers écrans restent **à plat dans `src/app/`** (contrainte expo-router),
mais chaque fichier appartient à un domaine fonctionnel clair.

---

## 1️⃣ 📖 PÉDAGOGIE — Cours & Contenu
- **Écrans** : `classes` → `matieres` → `chapitres` → `cours`, `audio_cours`, `figures`, `pieges`, `glossaire`, `formulaire`, `mon_cahier`
- **Services** : `contenuCours`, `enrichirCours`, `generateurLocal`, `microNotions`, `schemas`, `fichesSynthese`, `programmeOfficiel`
- Contenu enrichi ×3 (7 sections dont schémas ASCII), micro-notions (>13/chapitre), cahier chiffré (XOR+Base64).

## 2️⃣ 🏋️ ENTRAÎNEMENT & ÉVALUATION
- **Écrans** : `exercices`, `liste_exercices`, `matieres_exos`, `chapitres_exos`, `classes_exos`, `entrainement_infini`, `qcm_eclair`, `qcm_svt`, `defi_jour`, `olympiades`, `positionnement`, `maitrise`, `solveur`, `flashcards`
- **Services** : `selectionAdaptive`, `revisions`, `qaCache`, `solveur`, `flashcardsService`, `defiService`, `olympiades`
- BAC réel 3h/4h, anti-farm persistant, démarches pas-à-pas. `entrainement_infini` = exercices OFFLINE illimités (générateur local, zéro réseau). L'ancien chat IA en ligne (`infini.tsx`) et `photo_exo` ont été supprimés (cycle K : jamais déployés, jamais joignables).

## 3️⃣ 📊 SUIVI & PROGRESSION
- **Écrans** : `statistiques`, `journal_erreurs`, `competences`, `badges`, `profil`, `classement`, `objectifs`
- **Services** : `statsSuivi`, `stagnation`, `competences`, `badgesMatiere`, `xpLocal`, `integrite`, `objectifs`
- Streak anti-triche (empreinte scellée), alertes de stagnation par matière.

## 4️⃣ 🎮 MOTIVATION & GAMIFICATION
- **Écrans** : `boutique`, `duels`, `mini_jeux`, `avatars`, `calcul_mental`
- **Services** : `motivation`, `duelService`

## 5️⃣ 👥 SOCIAL & ENTRAIDE (sans profs)
- **Écrans** : `partage`
- **Services** : `moderationFiches`, `signalementService`
- Seul domaine nécessitant le réseau (modéré côté local + Firestore).

## 6️⃣ ⚙️ INFRASTRUCTURE OFFLINE-FIRST
- **Écrans** : `parametres`, `transfert`
- **Services** : `cacheHorsLigne`, `syncQueue`, `syncCloud`, `syncOrchestrator`, `userStorage`, `chiffrement`, `economieDonnees`, `prechargement`, `telechargementAuto`, `reseau`/`networkListener`, `optionsApp`, `accessibilite`, `majOTA`, `crashLog`, `appCheck`, `traductions`
- Mode économie de données (3G/4G Niger), file de sync, préchargement intelligent.

## 7️⃣ 🔐 COMPTE, SÉCURITÉ & ADMIN
- **Écrans** : `login`, `register`, `admin`, `admin_roles`
- **Services** : `auth`, `authFirebase`, `rolesPermissions` + `firestore.rules`, `functions/index.js`

## 8️⃣ 🧰 OUTILS & ASSISTANCE
- **Écrans** : `calculatrice`, `recherche`, `lexai`, `bien_etre`, `guide`, `plus`
- **Services** : `configIA`, `qaCache`, `notifications`, `rechercheGlobale`
- `plus.tsx` = hub central de navigation (toutes les routes vérifiées).

---

## 🧹 Nettoyage effectué (template Expo supprimé)
`explore.tsx`, `app-tabs(.web).tsx`, `hint-row`, `themed-text/view`, `external-link`,
`web-badge`, `ui/collapsible`, `hooks/use-theme`, `hooks/use-color-scheme(.web)`,
`constants/theme`, `scripts/reset-project.js`.

## 🧹 Nettoyage des fonctionnalités mortes (cycle K)

Supprimés (2 132 lignes, **aucune** perte de fonctionnalité — vérifié par recherche du
**nom nu** et non par motif d'import, la base mélangeant `'` et `"` ) :

| Fichier | Lignes | Pourquoi |
|---|---|---|
| `app/recompenses.tsx` + `services/recompenses.ts` | 120 | Catalogue de coupons échangeables contre des jetons… qu'**aucun** code ne créditait jamais (`@lex/jetons` n'était que débité et absent de l'allowlist de sauvegarde) → écran « 🪙 0 jeton » à vie |
| `app/calendrier.tsx` | 105 | Aucun lien entrant ; les 3 dates utiles étaient recalculées en dur dans `index.tsx` |
| `services/revisionsGamifiees.ts` | 271 | Moteur de révision abandonné, 0 consommateur |
| `services/revisionsPlanification.ts` | 117 | Idem (les clés `lex_srs*` vivantes sont portées par `revisions`) |
| `services/schemas_v1.ts` | 79 | Nomenclature « v1 » : déjà remplacé par `schemas.ts` (utilisé par `enrichirCours`) |
| `services/index.ts` | 17 | Fichier baril importé par personne |
| `app/stats_detail.tsx` | 136 | Doublon de `statistiques` (clé legacy `lex_exos_resolus`) ; bloc « Par difficulté » fusionné dans `statistiques` |
| `app/coupe.tsx` | 110 | Classement inter-classes vide sans utilisateurs ; agrégation déjà présente dans le dashboard admin |
| `app/planning.tsx` + `app/parcours.tsx` + `app/devoirs.tsx` + `app/revision_express.tsx` | 750 | 4 réponses à « que réviser ? » aux IDs chapitres incompatibles ; `objectifs` (vraies stats + notes) couvre le besoin |
| `services/parcoursPersonnalise.ts` + `services/devoirsService.ts` | 292 | Uniquement consommés par les écrans supprimés ci-dessus |
| `app/groupes.tsx` + `services/groupesEntraide.ts` | 209 | Groupes vides avec 1 seul utilisateur ; `partage` offline conservé |
| `app/conquete.tsx` | 121 | Reskin verbal de `maitrise` (mêmes sources `getStats()` + chapitres en cache, seuil 70 % en dur, aucune mécanique de jeu) |
| `__tests__/parcoursPersonnalise.test.ts` | 73 | Test du service supprimé (avec lui, 9 suites / 112 tests restants, tous verts) |
| `src/utils/firestoreRules.ts` | 75 | **Copie divergente des règles de sécurité** (0 consommateur, exportée « à coller dans la console ») : `isAdmin()` y contredisait `firestore.rules`. Un second document de sécurité, faux, est un piège — supprimé pour ne laisser qu'une seule source de vérité |
| `app/photo_exo.tsx` | 154 | Photo d'exercice → correction IA : **jamais déployé** (endpoint Groq absent côté Functions, modèle de vision jamais autorisé), 0 lien entrant |
| `app/infini.tsx` | 247 | Chat IA « entraînement infini » : **jamais joignable** (URL non déployée → 404 HTML, contrat `{ reponse }` incompatible avec le proxy `{ reponse, limite? }`), nom ambigu avec l'entraînement OFFLINE |

## 🔐 Rôles & administration — ce qui était cassé (cycle K)

La chaîne « proviseur → attribution de rôles » n'avait **jamais** pu fonctionner.
Cinq défauts indépendants, tous corrigés :

1. **`admin.tsx` jetait le champ `userId`** des documents `admins` (`liste.push({ id, nom, ajouteLe })`)
   → `liste.some(a => a.userId === uidEleve)` toujours faux → `estAdmin = false` **pour tout le monde**,
   même le proviseur, et son dashboard n'était jamais chargé.
2. **La « migration » dupliquait les documents** : `addDoc` à chaque visite au lieu de compléter
   le document existant (`updateDoc`).
3. **Garde d'accès illisible** : `admin_roles` testait `roles/{uid}.modifierRoles`, or le proviseur
   n'existe que dans `admins` → « Accès refusé » à l'administrateur lui-même. Désormais
   `estAdminActuel()` interroge **`admins` d'abord** (source de vérité), `roles/{uid}` en repli.
4. **`syncQueue` écrasait le `userId`** : `syncAction('create')` écrit `...data, userId` (UID de la
   **session**), donc dans `roles/{eleveId}` le champ `userId` devenait celui de l'**admin**.
   `getRolesClasse` indexant par `r.userId`, le rôle attribué (« ✅ Succès ») restait invisible.
   → écriture directe `setDoc(doc(db,'roles',userId), …)` + `userId` forcé depuis le `docId`.
5. **Aucun filtre `isDeleted` en lecture** : une révocation (`syncQueue 'delete'` → `isDeleted: true`)
   laissait le rôle affiché indéfiniment. → filtré dans `getRolesClasse` / `getPermissionsUtilisateur`,
   et `peutEffectuerAction` ne peut plus planter sur un doc sans champ `permissions`.
6. **`firestore.rules` désalignées** : `isAdmin()` ne lisait que `roles/{uid}.isAdmin`, que le
   bootstrap du proviseur **n'écrivait jamais** → il n'était admin pour personne, et les règles
   interdisaient jusqu'à sa propre création (poule et œuf). Désormais `isAdmin()` s'appuie sur
   **`admins/<uid>`** avec `roles/{uid}.isAdmin` en repli.
7. **Convention `docId == uid`** (nouvelle) : les règles Firestore ne savent pas faire de « where »,
   elles ne testent que des **chemins** — sans cette convention, `exists(admins/$(uid))` est
   impossible. Le client a donc été réaligné (`setDoc` au lieu de `addDoc` partout dans `admins`,
   `estAdmin` recalculé sur `a.id === uid`).
8. **Auto-promotion** : `admins` refuse toute écriture à un non-admin, sauf **une fois** pour son
   propre doc tant que `config/initialise` (sentinelle posée par le bootstrap) n'existe pas.

## 🤖 ASSISTANT IA — ce qui était cassé (cycle K)

`lexaiChat` (proxy Groq via Firebase Functions) n'était **ni déployé ni joignable** :
l'URL répondait **404 en HTML** (pas du JSON), le contrat de réponse d'`infini.tsx`
(`{ reponse }`) était incompatible avec celui du proxy (`{ reponse, limite? }`),
et `lexai.tsx` cherchait une clé `groq` qui n'existait pas dans les traductions.
`photo_exo` réclamait en outre un modèle de **vision** que le serveur n'autorisait pas.

**Supprimés** : `app/infini.tsx` (246 l.), `app/photo_exo.tsx` (154 l.),
stub `lexaiTranscrire` et dépendances Groq associées.
**Réparés** : `lexai.tsx` (seul assistant conservé — texte FR/EN interne, test
`response.status === 404` → « assistant non activé » au lieu d'accuser la connexion),
`configIA.ts` (point unique de config, contrat `{ reponse }` documenté),
`functions/index.js` (`MODELE_AUTORISE` fixé côté serveur : le client ne choisit plus le modèle,
coût et abus impossibles).
   → 🚀 **Déploiement** : créer le premier admin depuis la console Firebase **avant** de distribuer
   l'app ; la sentinelle existe alors d'office et cette porte n'est jamais ouverte.

## ✅ Gates de validation
- `npx tsc --noEmit` = 0 erreur
- `npx jest --ci` = 122/122 verts (10 suites)
- `cd functions && npm test` = 4/4 verts (normalisation lycée, whitelist publique, migration)
- `npx expo export --platform web` = bundle OK (aucune route non résolue)
- Toute route dans `plus.tsx` doit pointer vers un fichier existant.
- `coherenceRoutes.test.ts` (cycle K) : échoue si un écran devient orphelin ou si un
  service perd son dernier consommateur — la détection est automatisée, plus de `grep` manuel.

---

## 🔁 Journal des audits par morceau (6 cycles complets)

| Cycle | Morceau(x) | Corrections |
|---|---|---|
| A | 1 📖 | 12 schémas ASCII, formulaire branché sur service CEA (~1300 formules), glossaire intelligent (définitions + flou), favoris ⭐ chapitres, « Reprendre où j'en étais », loader pièges, +2 tests |
| B | 2 🏋️ | Plafond audio énoncé, audit 23 routes / 0 orpheline |
| C | 3 📊 + 4 🎮 | Classement : repli hors-ligne (carte locale XP + ligue), retour `back()` |
| D | 5 👥 + 6 ⚙️ | Transfert : restauration = remplacement complet (anti-incohérence XP/anti-farm), alerte code volumineux WhatsApp |
| E | 7 🔐 + 8 🧰 | Compteur formules dynamique recherche, audit sécurité (IA proxy sans clé client, auth à sel SHA-256), +3 tests chiffrement/stagnation |
| F | Tous | Revérification transversale : 23 routes / 0 orpheline, logs maîtrisés (2 console.log diagnostiques syncQueue), 0 TODO (roles branches et verifies) |
| G | Tous | Chiffrement LEX2 (clé utilisateur + sel), bootstrap proviseur à code, garde examen partagée (bloquerSiExamen), données réelles (profil/statistiques), anti-double-débit boutique, export filtré (pas de hash), anti-troncature préchargement, Fisher-Yates QCM, calculatrice robuste, auth normalisée, rôles unifiés |
| H | Tests + Types | Tests calculatrice (22), QCM SVT (7), auth hachage (8), chiffrement LEX1/LEX8 (8), intégrité streak (5) = 49 tests. Élimination 10× `any` (syncQueue→unknown, statsSuivi→number\|string, auth→unknown typé). 2× eslint-disable supprimés (bac_blanc, qcm_eclair : pattern useRef) |
| I | Perf cache + Sync | **Index inversé exo→chapitre** (`getExoById` O(1) au lieu de scanner 40 Mo), **LRU coalescé en RAM** (≤ 1 écriture/5 s vs 1 par lecture), **multiGet par lots de 40** (mémoire téléphone), **bug clé-réservée corrigé** (`lex_cache_meta` vue comme chapitre « meta » fantôme → fausses tailles + éviction de la meta à chaque purge), **sync antifragile** : saveQueue retry×3 backoff, conflicts corrompus → [], guard verifierConnexion, docId orphelin unique, +9 tests (cycleI) |
| J | Sauvegarde + mémoire | **Sauvegarde de compte centralisée** (`sauvegardeCompte.ts`) : allowlist de ~32 clés de progression — correction d'une perte réelle : `lex_exos_resolus`, `bac_blanc_scores`, `flashcards_scores`, `srs`… étaient EXCLUS du code de transfert → anti-farm réinitialisé + historique perdu au changement de téléphone ; secrets/session/cache/files de sync toujours exclus. **Croissance bornée** : journal d'erreurs plafonné à 200 (avant : illimité), file préchargement parse sécurisé, texto transfert corrigé, +8 tests (cycleJ) |
| K | Nettoyage + Rôles | **711 lignes mortes supprimées** (`recompenses` + son service, `calendrier`, `revisionsGamifiees`, `revisionsPlanification`, `schemas_v1`, `services/index.ts`). **Rôles enfin fonctionnels** (5 défauts cumulés, cf. section dédiée) : `userId` restauré dans `admin.tsx` (jeté → `estAdmin` toujours faux, dashboard inutilisable par tous), migration idempotente (`updateDoc`, fini les doublons), garde d'accès basée sur `admins` via `estAdminActuel()` (le proviseur bootstrappé était refusé par son propre écran), écriture directe `roles/{uid}` (syncQueue remplaçait l'élève par l'admin dans `userId` → rôles invisibles), `isDeleted` filtré en lecture, permissions régénérées depuis le rôle (crash `peutEffectuerAction`). **`firestore.rules` réalignées** : `isAdmin()` → `admins/<uid>` (convention `docId == uid`), repli `roles/{uid}.isAdmin`, sentinelle `config/initialise` contre l'auto-promotion. **`estAdminActuel()`** : lecture directe du doc avant la requête de repli. **Boutique recentrée** : les 4 thèmes payants (900 crédits) retirés car **offerts dans 🎨 Réglages** — code mort des thèmes supprimé, textes réalignés (`parametres.tsx`, `plus.tsx`, `guide.tsx`) ; catalogue = titres + boosters (gel ❄️ et double XP ⚡ vérifiés bien consommés). **Titre de boutique affiché dans le profil** : la fiche promettait « ton titre s'affiche dans ton profil » (500 à 2 500 crédits) alors que seul l'en-tête de la boutique le montrait. **IA élaguée** : `infini` (chat, 246 l.) et `photo_exo` (154 l.) supprimés — jamais déployés (404 + contrat de réponse incompatible avec `{ reponse, limite? }`), stub `lexaiTranscrire` et dépendances Groq transcrites retirés, `MODELE_AUTORISE` figé côté serveur  + élagage lot 6 (1 694 lignes : stats_detail + sauvegarde dans statistiques, coupe, conquête, planning, parcours, devoirs, revision_express, groupes + 3 services + 1 test) |

| L | Classement lycée | **Classement filtrable par niveau, réservé au lycée** : `CLASSES`/`NIVEAUX_FILTRAGE` limités à Seconde / 1ère C-D / Terminale C-D (aucun collège — l'app est *Lycée* d'Excellence), `Picker` natif à l'inscription + `niveau` écrit dans le profil. **Défauts corrigés** : (1) le repli de `classement.tsx` lisait `utilisateurs`, collection **fermée en lecture** par les règles → classement vide en silence + fuite si la règle avait été ouverte : supprimé au profit de `classement_public` uniquement ; (2) les profils ANTÉRIEURS n'avaient pas de champ `niveau` → **invisibles** dans le filtre : `migrerClassementPublic` (Cloud Function admin, `dryRun=1` par défaut, paginée, idempotente) + recalcul du niveau **dès la connexion** (`login.tsx`) ; (3) `niveau` libre (« admin », collège) accepté par les règles → `profilScolaireValide()` (whitelist `2nde/1ere/terminale`, rétro-compatible avec les anciens profils) ; (4) la synchro publique écrasait en aveugle → transaction relisant la source, `niveau` inclus, **suppression du doc public** quand le profil disparaît, `xp_semaine` remis à 0 via la même source unique ; (5) trous hors-ligne : cache `AsyncStorage` par niveau + bandeau « dernier classement connu », rang réel `getCountFromServer` (« 🎓 12e sur 45 en 1ère »), badge 🟢 sur **sa** ligne (par UID, repli nom), filtre mémorisé et niveau restauré après connexion hors-ligne. **Index composites** (`firestore.indexes.json` + `firebase.json`) pour `niveau`+`xp`/`xp_semaine`. +14 tests (10 front `classementPublic`, 4 functions) |

**Défauts corrigés au total : ~50** (bugs d'affichage, données en dur, incohérences offline, pile de navigation, restauration incomplète, sécurité, intégrité, anti-triche, couverture tests, sécurité de types, perf cache LRU/index, clé-réservée fantôme, antifragilité sync, sauvegarde incomplète, croissance non bornée).
