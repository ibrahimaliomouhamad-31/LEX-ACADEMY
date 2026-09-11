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
- **Écrans** : `exercices`, `liste_exercices`, `matieres_exos`, `chapitres_exos`, `classes_exos`, `entrainement_infini`, `qcm_eclair`, `qcm_svt`, `bac_blanc`, `annales`, `defi_jour`, `olympiades`, `positionnement`, `maitrise`, `solveur`, `photo_exo`, `flashcards`
- **Services** : `selectionAdaptive`, `revisions`, `revisionsGamifiees`, `revisionsPlanification`, `annalesPasAPas`, `qaCache`, `solveur`, `flashcardsService`, `defiService`, `olympiades`
- BAC réel 3h/4h, anti-farm persistant, démarches pas-à-pas. `infini.tsx` = chat IA (≠ `entrainement_infini`).

## 3️⃣ 📊 SUIVI & PROGRESSION
- **Écrans** : `statistiques`, `stats_detail`, `journal_erreurs`, `competences`, `badges`, `profil`, `classement`, `objectifs`
- **Services** : `statsSuivi`, `stagnation`, `competences`, `badgesMatiere`, `xpLocal`, `integrite`, `objectifs`
- Streak anti-triche (empreinte scellée), alertes de stagnation par matière.

## 4️⃣ 🎮 MOTIVATION & GAMIFICATION
- **Écrans** : `recompenses`, `boutique`, `duels`, `coupe`, `conquete`, `mini_jeux`, `avatars`, `calcul_mental`
- **Services** : `recompenses`, `motivation`, `duelService`

## 5️⃣ 👥 SOCIAL & ENTRAIDE (sans profs)
- **Écrans** : `groupes`, `partage`
- **Services** : `groupesEntraide` (réactions 💙, modération), `moderationFiches`, `signalementService`, `rolesPermissions`
- Seul domaine nécessitant le réseau (modéré côté local + Firestore).

## 6️⃣ ⚙️ INFRASTRUCTURE OFFLINE-FIRST
- **Écrans** : `parametres`, `transfert`
- **Services** : `cacheHorsLigne`, `syncQueue`, `syncCloud`, `syncOrchestrator`, `userStorage`, `chiffrement`, `economieDonnees`, `prechargement`, `telechargementAuto`, `reseau`/`networkListener`, `optionsApp`, `accessibilite`, `majOTA`, `crashLog`, `appCheck`, `traductions`
- Mode économie de données (3G/4G Niger), file de sync, préchargement intelligent.

## 7️⃣ 🔐 COMPTE, SÉCURITÉ & ADMIN
- **Écrans** : `login`, `register`, `admin`, `admin_roles`
- **Services** : `auth`, `authFirebase`, `rolesPermissions` + `firestore.rules`, `functions/index.js`

## 8️⃣ 🧰 OUTILS & ASSISTANCE
- **Écrans** : `calculatrice`, `recherche`, `lexai`, `planning`, `calendrier`, `bien_etre`, `revision_express`, `guide`, `plus`
- **Services** : `configIA`, `qaCache`, `notifications`, `rechercheGlobale`
- `plus.tsx` = hub central de navigation (toutes les routes vérifiées).

---

## 🧹 Nettoyage effectué (template Expo supprimé)
`explore.tsx`, `app-tabs(.web).tsx`, `hint-row`, `themed-text/view`, `external-link`,
`web-badge`, `ui/collapsible`, `hooks/use-theme`, `hooks/use-color-scheme(.web)`,
`constants/theme`, `scripts/reset-project.js`.

## ✅ Gates de validation
- `npx tsc --noEmit` = 0 erreur
- `npx jest --ci` = 110/110 verts (8 suites)
- Toute route dans `plus.tsx` doit pointer vers un fichier existant.

---

## 🔁 Journal des audits par morceau (6 cycles complets)

| Cycle | Morceau(x) | Corrections |
|---|---|---|
| A | 1 📖 | 12 schémas ASCII, formulaire branché sur service CEA (~1300 formules), glossaire intelligent (définitions + flou), favoris ⭐ chapitres, « Reprendre où j'en étais », loader pièges, +2 tests |
| B | 2 🏋️ | Plafond audio énoncé, audit 23 routes / 0 orpheline |
| C | 3 📊 + 4 🎮 | Classement : repli hors-ligne (carte locale XP + ligue), retour `back()` |
| D | 5 👥 + 6 ⚙️ | Transfert : restauration = remplacement complet (anti-incohérence XP/anti-farm), alerte code volumineux WhatsApp |
| E | 7 🔐 + 8 🧰 | Compteur formules dynamique recherche, audit sécurité (IA proxy sans clé client, auth à sel SHA-256), +3 tests chiffrement/stagnation |
| F | Tous | Revérification transversale : 23 routes / 0 orpheline, logs maîtrisés (2 console.log diagnostiques syncQueue), 1 TODO mineur (admin_roles) |
| G | Tous | Chiffrement LEX2 (clé utilisateur + sel), bootstrap proviseur à code, garde examen partagée (bloquerSiExamen), données réelles (profil/statistiques), anti-double-débit boutique, export filtré (pas de hash), anti-troncature préchargement, Fisher-Yates QCM, calculatrice robuste, auth normalisée, rôles unifiés |
| H | Tests + Types | Tests calculatrice (22), QCM SVT (7), auth hachage (8), chiffrement LEX1/LEX8 (8), intégrité streak (5) = 49 tests. Élimination 10× `any` (syncQueue→unknown, statsSuivi→number\|string, auth→unknown typé). 2× eslint-disable supprimés (bac_blanc, qcm_eclair : pattern useRef) |
| I | Perf cache + Sync | **Index inversé exo→chapitre** (`getExoById` O(1) au lieu de scanner 40 Mo), **LRU coalescé en RAM** (≤ 1 écriture/5 s vs 1 par lecture), **multiGet par lots de 40** (mémoire téléphone), **bug clé-réservée corrigé** (`lex_cache_meta` vue comme chapitre « meta » fantôme → fausses tailles + éviction de la meta à chaque purge), **sync antifragile** : saveQueue retry×3 backoff, conflicts corrompus → [], guard verifierConnexion, docId orphelin unique, +9 tests (cycleI) |

**Défauts corrigés au total : ~46** (bugs d'affichage, données en dur, incohérences offline, pile de navigation, restauration incomplète, sécurité, intégrité, anti-triche, couverture tests, sécurité de types, perf cache LRU/index, clé-réservée fantôme, antifragilité sync).
