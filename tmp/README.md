# Pipeline des notions curées (Mathématiques, Physique-Chimie, SVT)

Ce dossier contient les **sources** et le **générateur** du bloc
`NOTIONS_CURATEES` de `src/services/microNotions.ts`.

Il n'est pas nécessaire pour exécuter l'application : il sert uniquement à
régénérer le bloc lorsque l'on ajoute ou modifie des notions.

## Contenu

| Fichier | Rôle |
|---|---|
| `charger_groupes.py` | **Source unique de vérité** : charge toutes les données et expose `GROUPES` ordonné + `router()` (simulation du routage TS) |
| `curated_maths.py` | 5 groupes historiques de maths (Arithmétique, Polynômes, Second degré, Généralités et études de fonctions) |
| `g06_…` → `g29_….py` | Format HISTORIQUE (maths) : un groupe par thème, référencés par `PLAN_MATHS` dans `charger_groupes.py` |
| `p01_…` → `p13_….py` | Format RICHE (Physique-Chimie) : chargement automatique par motif, aucune entrée PLAN à ajouter |
| `s01_…` → `s08_….py` | Format RICHE (SVT) : même structure, chargement automatique par motif |
| `verif_groupes.py` | Valide **toutes** les données (structure, longueurs, doublons, mots-clés ASCII) |
| `verif_couverture.py` | Route **tous** les titres du backup et signale les chapitres non couverts (hors `FALLBACK_ATTENDU`) |
| `generer_microNotions.py` | Génère et injecte le bloc TypeScript dans `src/services/microNotions.py` |

## Régénérer

```bash
cd /Users/apple/lex-academy-app
python3 tmp/verif_groupes.py            # 1. valider les données
python3 tmp/verif_couverture.py         # 2. vérifier la couverture des chapitres
python3 tmp/generer_microNotions.py     # 3. (re)générer le bloc TypeScript
npx tsc --noEmit                        # 4. vérifier les types
npx jest --ci src/__tests__/microNotions.test.ts
```

Le générateur est **idempotent** : le relancer sans rien changer produit un
fichier byte-identique.

## Ajouter un thème

1. Créer `tmp/g30_mon_theme.py` avec la même structure :

   ```python
   # -*- coding: utf-8 -*-
   GROUPES = [
       (['mots cles normalises du titre de chapitre'], [
           ('Titre de la notion',
            'Explication claire et complète, en français.',
            'mots cles normalises separes par des espaces'),
       ]),
   ]
   ```

2. Ajouter l'entrée correspondante dans `PLAN` (dans `generer_microNotions.py`)
   à la bonne position — **l'ordre est significatif**.
3. Ajouter la ligne attendue dans le tableau `chapitres` du test
   `src/__tests__/microNotions.test.ts`.

## Règles à respecter

- **Ordre significatif** : le premier groupe dont un mot-clé est contenu dans
  le titre normalisé du chapitre l'emporte. Du plus spécifique au plus
  générique (sinon « Calcul Intégral » tombe sur un groupe trop large).
- **Mots-clés en ASCII sans accent** : `normaliserCle()` supprime accents et
  ponctuation du titre du chapitre ; les entrées accentuées sont ignorées.
- **Apostrophes** : le générateur échappe automatiquement les apostrophes
  françaises pour TypeScript (`d'étude` → `d\'étude`). Ne pas échapper à la main.
- **Ids stables** : `cur_<groupe>_<index>` ; réordonner les notions d'un groupe
  réinitialise la maîtrise enregistrée des élèves pour ce groupe.
- **Titres de chapitres de référence** : extraits de
  `backups/2026-08-22T14-11-42_cours.json` (Seconde C → Terminale C/D).
- **Gating par matière** : chaque groupe déclare `matieres` (`mathematiques`,
  `physique chimie`, `svt`). Un chapitre ne déclenche que les groupes de sa
  matière — c'est ce qui isole 'La force' (PC) de 'Statistique' (maths).
- **Fallback attendu** : 'Révisions Générales du BAC' (SVT, chapitre
  fourre-tout) relève volontairement de l'extraction heuristique.
