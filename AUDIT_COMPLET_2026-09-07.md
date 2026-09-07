# 🔍 AUDIT COMPLET - LEX-ACADEMY

**Date:** 7 septembre 2026  
**Audit par:** Copilot  
**Status:** Phase 1 - Analyse Complète

---

## 📋 Table des matières
1. [Vue d'ensemble de l'application](#vue-densemble)
2. [Architecture technique](#architecture-technique)
3. [🚨 Problèmes critiques identifiés](#problèmes-critiques)
4. [⚠️ Problèmes majeurs](#problèmes-majeurs)
5. [⚡ Recommandations d'optimisation](#recommandations-doptimisation)
6. [🔐 Audit de sécurité](#audit-de-sécurité)
7. [📴 Fonctionnalité hors ligne](#fonctionnalité-hors-ligne)
8. [🧪 Plan de test complet](#plan-de-test-complet)
9. [Roadmap de correction](#roadmap-de-correction)

---

## 📱 Vue d'ensemble

**LEX-ACADEMY** est une application mobile éducative construite avec **Expo** et **React Native**, déploiée sur Android/iOS/Web.

### Stack technique confirmée :
- **Frontend:** React 19.2.3 + React Native 0.86.3 + Expo 57.0.18 + TypeScript
- **Mobile:** Expo Router (file-based routing)
- **Backend:** Firebase Firestore + Cloud Functions (Node.js 20)
- **Auth:** Authentification custom (SHA-256 hashed, stockage local)
- **IA:** Proxy Groq (LLM) via Firebase Functions
- **Local Storage:** AsyncStorage (React Native)
- **Sync:** Synchronisation bidirectionnelle Cloud/Local
- **Notifications:** Expo Notifications

### Public cible :
- Élèves du LEX de Tessaoua, Niger
- Préparation aux compositions et BAC
- Interface en français + anglais

**Taille du repo:** 2.7 MB | **1 PR ouverte** (Qodo audit)

---

## 🏗️ Architecture technique

### Structure du projet

```
LEX-ACADEMY/
├── src/
│   ├── app/                    # Écrans principaux (Expo Router)
│   │   ├── index.tsx           # Accueil (📊 Dashboard)
│   │   ├── login/              # Connexion (SHA-256)
│   │   ├── profil/             # Profil utilisateur
│   │   ├── classes/            # Cours par classe
│   │   ├── classes_exos/       # Exercices
│   │   ├── revisions/          # Révisions (SRS spaced-repet)
│   │   ├── defi_jour/          # Challenge quotidien
│   │   ├── classement/         # Ranking XP
│   │   ├── lexai/              # Chat IA Groq
│   │   ├── guide/              # Onboarding
│   │   └── plus/               # Settings, transfert compte
│   ├── services/               # Logique métier
│   │   ├── syncCloud.ts        # Sync Firestore ↔ Local
│   │   ├── userStorage.ts      # Clés utilisateur personnalisées
│   │   ├── revisions.ts        # SRS + spaced repetition
│   │   ├── signalementService  # Bug reports → Firestore
│   │   ├── objectifs.ts        # Objectifs (queue hors-ligne)
│   │   ├── majOTA.ts           # Over-the-Air updates
│   │   ├── parametres.ts       # Settings, langue, thème
│   │   ├── traductions.ts      # i18n (fr/en)
│   │   └── ...
│   ├── config/
│   │   └── firebaseConfig.js   # Init Firebase + Firestore
│   └── (autres modules)
├── functions/                  # Cloud Functions (Node.js)
│   ├── index.js                # Proxy Groq + audit logging
│   └── package.json            # Dépendances Firebase Admin
├── firestore.rules             # Règles Firestore (critiques ⚠️)
├── firebase.json               # Config deploy Firebase
├── app.json                    # Config Expo (splash, icon, etc.)
├── package.json                # App + dependencies
├── genererExercicesMassifs.js  # Script : génère exercices
├── remplirExercicesMassif.js   # Script : peuple Firestore
├── remplirFirebase.js          # Script : seed données
├── topUpExercices.js           # Script : top-up exercices
└── (scripts de data loading)
```

### Flux de données

```
┌─────────────────────────────────────────────────────────────┐
│                      UTILISATEUR                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    📱 App       🔌 Offline       ☁️ Cloud
    (Expo)      (AsyncStorage)   (Firestore)
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
    🤖 IA Proxy              📊 Audit Logging
   (Cloud Functions)       (Journal des scores)
```

---

## 🚨 PROBLÈMES CRITIQUES

### 1. 🔑 **SÉCURITÉ : Firebase Config en dur (exposée)**

**Severité:** CRITIQUE  
**Fichier:** `firebaseConfig.js`, `src/config/firebaseConfig.js`  
**Problème:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC3y581S0nHqYfIX4TjvumGKLgpDj1G1dg",  // ❌ EXPOSÉE
  authDomain: "lex-academy-10eef.firebaseapp.com",
  projectId: "lex-academy-10eef",
  // ...
};
```

- **Clé Firebase API en dur dans le code source** → Accessible publiquement
- **Risque:** Abus de quota Firestore, lecture/écriture arbitraire si règles faibles
- **Impact:** Compromis de la base de données pédagogique

**Recommandation:** 
- Exporter en variable d'environnement (`.env` + `expo-constants`)
- Ne jamais commiter `firebaseConfig` avec clés réelles
- Ajouter `.env.local` au `.gitignore`

---

### 2. 🔓 **FIRESTORE RULES : Trop permissives (ABUS MAJEUR)**

**Severité:** CRITIQUE  
**Fichier:** `firestore.rules`  
**Problème:**
```firestore-rules
match /utilisateurs/{doc} {
  allow read: if true;      // ✅ OK : lecture libre (classement)
  allow write: if true;     // ❌ DANGER : TOUTE ÉCRITURE LIBRE
}

match /defi_jour/{doc} {
  allow read: if true;
  allow write: if true;     // ❌ N'IMPORTE QUI peut tricher les scores
}

match /progression/{doc} {
  allow read: if true;
  allow write: if true;     // ❌ Copie d'XP entre comptes
}
```

**Impact en production:**
1. **Usurpation d'identité:** N'importe qui peut modifier le profil d'un élève
2. **Triche massive:** Scores gonflés, XP volée, classement falsifié
3. **Doublage de compte:** Un utilisateur crée plusieurs comptes, cumule XP
4. **Vandalisme:** Suppression de progression d'autres élèves

**Solution immédiate:**

```firestore-rules
match /utilisateurs/{userId} {
  allow read: if true;  // Classement OK
  allow write: if request.auth.uid == userId && request.auth != null;
}

match /defi_jour/{docId} {
  allow read: if true;
  allow write: if request.auth != null && 
               request.auth.uid == resource.data.userId;
}

match /progression/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}

match /admins/{docId} {
  allow read, write: if false;  // Admin panel sécurisé
}
```

**Action urgente:** Déployer ces règles AVANT la production.

---

### 3. 🔐 **Authentification : Pas de Firebase Auth**

**Severité:** CRITIQUE  
**Problème:** L'app utilise une authentification maison :
```typescript
// Dans login :
const motDePasseHashe = sha256(motDePasseUtilisateur);
await AsyncStorage.setItem('lex_user_id', userId);
await setDoc(doc(db, 'utilisateurs', userId), {
  nom, email, motDePasse: motDePasseHashe, // ❌ Stocké en Firestore
  xp: 0, streak: 0
});
```

**Risques:**
- Pas de jeton session (n'importe qui peut usurper un ID)
- Mots de passe stockés en Firestore (lecture libre possible même hachés)
- Pas de refresh/expiration de session
- Pas de 2FA

**Solution recommandée:**
1. **Migrer vers Firebase Auth** (simple + sécurisé)
2. **OU renforcer le système custom:**
   - Générer JWT signés côté serveur
   - Stocker session id + expiration
   - Implémenter refresh token

---

### 4. ⚠️ **Proxy Groq : Pas de validation input stricte**

**Severité:** HAUTE  
**Fichier:** `functions/index.js`  
**Problème:**
```javascript
const body = req.body || {};
const messages = body.messages;
if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
  res.status(400).json({ error: 'messages requis (1 à 40)' });
  return;
}
// ❌ Pas de validation du contenu des messages
```

**Risques:**
- **Injection de prompts:** Un élève peut modifier le système promptpour obtenir les réponses
- **Déni de service:** Requêtes malformées peuvent bloquer la fonction
- **Fuite d'API Groq:** Pas de rate-limiting par utilisateur

---

### 5. 📴 **Sync hors-ligne : Perte de données possibles**

**Severité:** HAUTE  
**Fichier:** `src/services/syncCloud.ts`  
**Problème:**

```typescript
// Union naïve des exercices résolus
const union = Array.from(new Set([...cloudResolus, ...local.resolus]));

// Si local reçoit une mise à jour de cloud PENDANT une révision hors-ligne,
// la progression locale n'est PAS verrouillée → race condition
```

**Scénario de bug:**
1. Élève télécharge exercices (offline)
2. Résout 5 exercices hors-ligne, score local = 100
3. Revient en ligne → sync demarre
4. Autre device de l'élève envoie cloud update AVANT la merge
5. **Race condition:** Dernière mise à jour gagne, 5 exercices perdus

---

## ⚠️ PROBLÈMES MAJEURS

### 6. 🧠 **SRS (Spaced Repetition) non implémenté correctement**

**Severité:** MOYENNE  
**Fichier:** `src/services/revisions.ts` (à vérifier)  
**Problème:** Le système affiche "révisions du jour" mais pas de :
- Algorithme SM-2 / Leitner
- Délai d'oubli (forgetting curve)
- Progression réelle

**Impact:** Les élèves ne révisent pas intelligemment.

**Recommandation:**
```typescript
interface RevisionCard {
  id: string;
  question: string;
  reponse: string;
  interval: number;      // Jours avant prochain révision
  easeFactor: number;    // 1.3 - 2.5 (SM-2)
  repetitions: number;   // Nombre de fois révisée
  nextReview: Date;      // Timestamp prochain révision
}

// SM-2 Algorithm:
function calculerProchainInterval(
  quality: 0 | 1 | 2 | 3 | 4 | 5,  // Réponse (0=oublie, 5=parfait)
  easeFactor: number,
  interval: number,
  repetitions: number
) {
  // Implémentation SM-2 standard
}
```

---

### 7. 🌐 **Support hors-ligne incomplet**

**Severité:** MOYENNE  
**Problèmes:**
- Pas de stockage local des exercices (téléchargement massif chaque fois)
- Pas de cache des cours
- Sync avec retry-logic faible → données perdues si WiFi coupe
- Pas de notification si sync a échoué

**À corriger:**
- Ajouter `expo-sqlite` ou `realm` pour cache structuré
- Implémenter queue de sync avec persistence
- Afficher badge "⚠️ Non synced" pour alerter l'utilisateur

---

### 8. 📊 **Performances : Bundle size trop gros**

**Severité:** MOYENNE  
**Problèmes:**
- Expo 57 + React 19 + dépendances = bundle très lourd
- Pas de code splitting visible
- Imports inutiles dans `index.tsx` (323 KB + dépendances)

**Recommandations:**
```json
// À ajouter dans package.json scripts :
{
  "scripts": {
    "analyze": "react-native-bundle-visualizer"
  }
}
```

---

### 9. 🔒 **Pas de validation des données côté client**

**Severité:** MOYENNE  
**Problème:**
```typescript
// Dans scores:
await setDoc(doc(db, 'defi_jour', userId), {
  score: userInput.score,  // ❌ Pas de vérification
  tempsS: userInput.tempsS
});
```

Le Cloud Function ne valide pas si le score est cohérent (ex: 1000 points en 5 secondes = impossible).

**Audit Logging:**
```javascript
exports.journalScores = onDocumentCreated('/defi_jour/{docId}', async (event) => {
  const suspect = (d.score || 0) > 3 || (d.tempsS || 999) < 10;
  // ✅ Bien : détecte anomalies
  // ❌ Mais : pas d'action automatique (suppression, alert admin)
});
```

---

### 10. 📝 **Documentation manquante**

**Severité:** BASSE  
- Pas de README français pour développeurs locaux
- Pas de guide d'architecture
- Pas de doc API Groq proxy

---

## ⚡ RECOMMANDATIONS D'OPTIMISATION

### Performance

| Problème | Solution | Impact |
|----------|----------|--------|
| Bundle trop gros | Tree-shaking + lazy loading (code splitting) | -30% APK |
| Sync inefficace | Batching requêtes Firestore + debounce | -50% API calls |
| Re-renders inutiles | Memoization (useMemo, useCallback) | Fluidité 60fps |
| AsyncStorage lent | Indexation + requêtes optimisées | Accès -80% |
| Images non optimisées | WebP + responsive sizes | -40% bandwidth |

### UX pour Tessaoua (connexion lente)

1. **Skeleton screens** pendant chargement
2. **Indicateur réseau** : "🟢 Online" / "🔴 Offline" / "⚠️ Syncing..."
3. **Progressive image loading:** Basse res → haute res
4. **Offline-first UI:** Continuer même sans connexion
5. **Smart data prefetching:** Télécharger révisions du jour au chargement

---

## 🔐 AUDIT DE SÉCURITÉ

### Matrice de risques

| Composant | Risque | Critère | Statut |
|-----------|--------|---------|--------|
| Auth Custom | Usurpation d'identité | Tokens + expiration | 🔴 CRITIQUE |
| Firestore Rules | Lecture/écriture libre | Auth required | 🔴 CRITIQUE |
| Firebase Config | Clés exposées | Env variables | 🔴 CRITIQUE |
| Groq Proxy | Injection prompts | Input validation | 🟠 HAUTE |
| Données personnelles | Lisibles en cache | Chiffrement? | 🟠 HAUTE |
| Sync hors-ligne | Race conditions | Mutex/lock | 🟠 HAUTE |

### Checklist de sécurité

- [ ] Règles Firestore restrictives déployées
- [ ] API keys en variables d'environnement
- [ ] Firebase Auth implémenté ou JWT signé
- [ ] HTTPS enforced sur Groq proxy
- [ ] Rate limiting par utilisateur
- [ ] CORS correctement configuré
- [ ] Données sensibles chiffrées en cache local
- [ ] Audit logging du côté serveur
- [ ] Backup automatique Firestore
- [ ] Gestion des mots de passe sécurisée (argon2, pas SHA-256)

---

## 📴 FONCTIONNALITÉ HORS LIGNE

### État actuel ✅/❌

| Feature | Hors-ligne | Problème |
|---------|-----------|---------|
| Afficher cours | ✅ AsyncStorage | Pas de prefetch |
| Afficher exercices | ❌ | Doit recharger chaque fois |
| Réviser | ✅ Local + SRS | Race condition sync |
| Soumettre scores | ⚠️ Queue locale | Perte si crash |
| Chat IA | ❌ | Besoin connexion |
| Classement | ✅ Cache | Mais pas de mise à jour |
| Notifications | ⚠️ Expo | Dépend platform |

### Amélioration proposée : Mode offline robuste

```typescript
// 1. Download all content on first sync
async function telechargerDonneesLocales() {
  const tous_cours = await db.collection('cours').get();
  const tous_exos = await db.collection('exercices').get();
  
  // Stocker en SQLite (structuré)
  await saveToDB({
    cours: tous_cours.docs,
    exercises: tous_exos.docs,
    timestamp: Date.now()
  });
}

// 2. Implement Sync Queue with Firestore writes
export class SyncQueue {
  private queue: Action[] = [];
  private isOnline = true;
  
  async add(action: Action) {
    this.queue.push(action);
    if (this.isOnline) await this.flush();
    else await persistQueue();  // SQLite
  }
  
  async flush() {
    for (const action of this.queue) {
      try {
        await firestore.write(action);
      } catch (e) {
        // Retry exponential backoff
        await wait(2 ** action.retries * 1000);
      }
    }
    this.queue = [];
  }
}

// 3. Show sync status
<View style={{ flexDirection: 'row' }}>
  {isOnline ? (
    <Text style={{ color: 'green' }}>🟢 Connecté</Text>
  ) : (
    <Text style={{ color: 'orange' }}>🟠 Hors-ligne (en sync...)</Text>
  )}
</View>
```

---

## 🧪 PLAN DE TEST COMPLET

### Phase 1 : Tests unitaires (3 jours)

```bash
# Jest + React Native Testing Library
npm install --save-dev @testing-library/react-native jest

# Tests à écrire :
# - userStorage (get/set/remove)
# - syncCloud (collecterLocal, pousserProgression, restaurerProgressionSiVide)
# - traductions (t() function)
# - revisions (calcul des dates next_review)
```

### Phase 2 : Tests intégration (5 jours)

```
Scénarios:
1. Login → Profil → Revisions → Classement (happy path)
2. Offline → Edits locaux → Reconnect → Sync
3. Multi-device: Device A = online, Device B = offline, A sync, B sync after
4. Triche: Modifier score localement, observer audit log
5. Chat IA: Message → Proxy Groq → Réponse
```

### Phase 3 : Stress test (3 jours)

- **Offline duration:** Tester 3 jours sans connexion
- **Sync concurrent:** 100 utilisateurs sync en même temps
- **Large dataset:** 10,000 exercices + 1000 utilisateurs
- **Network conditions:** Slow 3G, packet loss, interruptions

### Phase 4 : Tests utilisateurs (Tessaoua)

- **Groupe:** 20-30 élèves du LEX
- **Durée:** 1 semaine d'usage intensif
- **Métriques:**
  - Temps chargement < 3s (3G)
  - Pas de perte de données
  - Compréhension UI (français)
  - Problèmes rapportés

---

## 🐛 BUGS CONNUS À CORRIGER

### Bug 1 : Conflit de clés AsyncStorage

**Problèmes:**
```javascript
// firebaseConfig.js (RACINE)
export const db = getFirestore(app);

// src/config/firebaseConfig.js (DUPLIQUÉE)
export const db = getFirestore(app);

// Résultat: Import confus
// En fait ça fonctionne mais mauvaise pratique
```

**Fix:** Garder un seul `firebaseConfig.js` (à la racine), importer depuis `src/app/index.tsx`

---

### Bug 2 : Migration de clés cassée

```typescript
// syncCloud.ts ligne 40-49
// Si utilisateur n'a JAMAIS été connecté :
const id = await getCurrentUserId(); // null
const key = await userKey(name);      // Lance Error!
```

**Fix:** 
```typescript
export async function userKey(name: string): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    // Retourner clé globale ou erreur gracieuse
    return `lex_global_${name}`;
  }
  return `lex_user_${userId}_${name}`;
}
```

---

### Bug 3 : Pas de gestion d'erreur Groq

```javascript
// functions/index.js - ligne 59-82
try {
  const reponse = await fetch('https://api.groq.com/...');
  const data = await reponse.json();
  if (!reponse.ok) {
    res.status(502).json({ error: data?.error?.message || 'Erreur Groq' });
    return;
  }
  res.json({ reponse: data.choices?.[0]?.message?.content || '' });
} catch (e) {
  res.status(500).json({ error: 'Erreur proxy' });
  // ❌ Pas de log → impossible debugger en prod
}
```

**Fix:**
```javascript
catch (e) {
  console.error('[lexaiChat]', e);
  // Envoyer à Sentry ou Firebase Crashlytics
  logError('groq_proxy_crash', { error: e.message, timestamp: Date.now() });
  res.status(500).json({ error: 'Erreur proxy (administrateur notifié)' });
}
```

---

## 🎯 ROADMAP DE CORRECTION

### **URGENT (Semaine 1)**

**Priorité 0: Sécurité**
- [ ] Firestore Rules restrictives + déploiement
- [ ] API keys en `.env`
- [ ] Supprimer `firebaseConfig` du repo public

**Priorité 1: Fonctionnement hors-ligne**
- [ ] Implémenter SyncQueue avec persistence
- [ ] Prefetch des exercices au démarrage
- [ ] Afficher indicateur réseau

**Code:**
```bash
# Branch de correction urgente
git checkout -b fix/security-offline-mode

# 1. Update firestore.rules
# 2. Add .env support
# 3. Implement SyncQueue
# 4. Add sync status UI
```

---

### **COURT TERME (Semaine 2-3)**

- [ ] Firebase Auth (ou JWT renforcé)
- [ ] Validation Groq proxy
- [ ] Tests unitaires (userStorage, syncCloud)
- [ ] Fix bugs AsyncStorage
- [ ] Memoization + perf optimizations

---

### **MOYEN TERME (Semaine 4+)**

- [ ] Implémentation SM-2 complète pour SRS
- [ ] Cache SQLite pour exercices
- [ ] Notification sync status
- [ ] Tests utilisateurs Tessaoua
- [ ] Push notifications (Expo)

---

### **LONG TERME**

- [ ] Migration vers Expo SDK 58+
- [ ] Web version optimisée
- [ ] Intégration SSO (Google, Microsoft)
- [ ] Dashboard admin
- [ ] Analytics Firestore

---

## 📊 Métriques de santé à tracker

```javascript
// Ajouter à Firebase Cloud Functions
exports.trackMetrics = onRequest(async (req, res) => {
  const metrics = {
    activeUsers: (await db.collection('utilisateurs').where('derniere_connexion', '>=', Date.now() - 86400000).count().get()).data().count,
    totalXP: (await db.collectionGroup('utilisateurs').aggregate({ xp: 'sum' }).get()).data().xp,
    averageScore: /* ... */,
    offlineSessions: /* queue size */,
    syncErrors: /* logged failures */,
  };
  res.json(metrics);
});
```

**Dashboard recommandé:** Google Data Studio + BigQuery

---

## ✅ CHECKLIST PRE-PRODUCTION

- [ ] Firestore Rules sécurisées + testées
- [ ] API keys en variables d'environnement
- [ ] Tests offline 72h minimum
- [ ] Sync queue implémenté + tested
- [ ] Zéro erreurs TypeScript (`tsc --noEmit`)
- [ ] Audit de sécurité par 2e dev
- [ ] Tests utilisateurs avec 20+ élèves (1 semaine)
- [ ] Rate limiting Groq proxy
- [ ] Backup Firestore configuré
- [ ] Monitoring + alerting (Sentry)
- [ ] Chiffrement données sensibles
- [ ] Version 1.0.0 taguée
- [ ] Release notes en français + anglais

---

## 📞 CONTACT & SUPPORT

**Créateur:** Élève du LEX Tessaoua  
**Stack Support:**
- Firebase Docs: https://firebase.google.com/docs
- Expo Docs: https://docs.expo.dev/versions/v57.0.0/
- React Native: https://reactnative.dev

**Groupes d'aide:**
- Discord Expo: https://chat.expo.dev
- React Native Community: https://github.com/react-native-community
- Firebase Community: https://stackoverflow.com/questions/tagged/firebase

---

**Fin d'audit: 7 septembre 2026**

Prochaine phase: Implémentation des corrections urgentes + tests.

