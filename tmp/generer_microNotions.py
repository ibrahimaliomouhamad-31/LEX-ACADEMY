# -*- coding: utf-8 -*-
"""Génère le bloc NOTIONS_CURATEES de src/services/microNotions.ts.

Sources : tmp/curated_maths.py + tmp/g*.py (données validées par
tmp/verif_groupes.py). L'ordre des groupes est explicite : le premier groupe
dont un mot-clé est contenu dans le titre normalisé du chapitre gagne, donc on
va du plus spécifique au plus générique.

Ce script n'utilise volontairement aucun antislash littéral (chr(92)) afin
d'éviter toute ambiguïté d'échappement entre Python et TypeScript.

⚠️ Les motifs de recherche des données sont précis (`NN_`, deux chiffres) :
un simple `g*.py` capturerait aussi ce script, provoquant une génération
récursive au moment de l'import.

Deux sources de données :
  - `tmp/[ps]NN_*.py` : Physique-Chimie (`p`) et SVT (`s`) au format riche
    (matieres, motsChapitre, slug, libelle, notions) ; l'ordre des fichiers
    puis des groupes à l'intérieur d'un fichier est significatif.
  - `tmp/gNN_*.py` + `tmp/curated_maths.py` : Mathématiques, référencés
    explicitement par PLAN_MATHS.
"""
import glob
import importlib.util

FICHIER = 'src/services/microNotions.ts'
MOTIF = 'tmp/g[0-9][0-9]_*.py'
MOTIF_PS = 'tmp/[ps][0-9][0-9]_*.py'
NL = chr(10)
BS = chr(92)
Q = chr(39)
DQ = chr(34)


def charger(chemin, nom):
    spec = importlib.util.spec_from_file_location(nom, chemin)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.GROUPES


curated = charger('tmp/curated_maths.py', 'curated_maths')
modules = {}
for chemin in sorted(glob.glob(MOTIF)):
    nom = chemin.split('/')[-1][:-3]
    modules[nom] = charger(chemin, nom)


def ts(texte):
    """Échappe une chaîne pour un littéral TypeScript à quotes simples."""
    return Q + texte.replace(BS, BS + BS).replace(Q, BS + Q) + Q


# (source, index du groupe dans la source, slug, libellé pour le commentaire)
# `source` peut être un module chargé, ou le nom d'un module (str) pour les
# sources en format riche.
PLAN_MATHS = [
    (curated, 0, 'arithmetique', 'Arithmétique'),
    (curated, 2, 'second_degre', 'Second degré'),
    (curated, 1, 'polynomes', 'Polynômes, équations et systèmes'),
    (modules['g06_derivation'], 0, 'derivation', 'Dérivation'),
    (modules['g07_limites'], 0, 'limites_continuite', 'Limites et continuité'),
    (modules['g08_fonctions_continues'], 0, 'fonctions_continues', 'Propriétés des fonctions continues ou dérivables'),
    (modules['g09_exponentielles'], 0, 'exponentielles', 'Fonctions exponentielles'),
    (modules['g10_logarithmes'], 0, 'logarithmes', 'Fonctions logarithmes'),
    (modules['g11_integrales'], 0, 'integrales', 'Primitives et calcul intégral'),
    (modules['g12_complexes'], 0, 'complexes', 'Nombres complexes'),
    (modules['g13_suites'], 0, 'suites', 'Suites numériques'),
    (modules['g14_probabilites'], 0, 'probabilites', 'Probabilités'),
    (modules['g15_variables_aleatoires'], 0, 'variables_aleatoires', 'Variables aléatoires'),
    (modules['g16_statistique'], 0, 'statistique', 'Statistique'),
    (modules['g17_denombrements'], 0, 'denombrements', 'Dénombrements'),
    (modules['g18_trigonometrie'], 0, 'trigonometrie', 'Angles orientés et trigonométrie'),
    (modules['g19_produit_scalaire'], 0, 'produit_scalaire', 'Produit scalaire'),
    (modules['g20_vecteurs_barycentre'], 0, 'vecteurs_barycentre', 'Vecteurs du plan et barycentre'),
    (modules['g21_calculs_barycentriques'], 0, 'calculs_barycentriques', 'Calculs barycentriques'),
    (modules['g22_transformations'], 0, 'transformations', 'Transformations du plan'),
    (modules['g23_geometrie_espace'], 0, 'geometrie_espace', "Géométrie dans l'espace"),
    (modules['g24_coniques'], 0, 'coniques', 'Coniques'),
    (modules['g25_applications_affines_plan'], 0, 'applications_affines_plan', 'Applications affines du plan'),
    (modules['g26_similitudes'], 0, 'similitudes', 'Similitudes planes directes'),
    (modules['g27_applications_affines_espace'], 0, 'applications_affines_espace', "Applications affines de l'espace"),
    (modules['g28_equations_differentielles'], 0, 'equations_differentielles', 'Équations différentielles'),
    (modules['g29_calculs_reels'], 0, 'calculs_reels', 'Calculs dans ℝ et encadrements'),
    (curated, 3, 'generalites_fonctions', 'Généralités sur les fonctions'),
    (curated, 4, 'etudes_fonctions', "Exemples d'études de fonctions"),
]

# --- Sources en format riche : Physique-Chimie puis SVT ---------------------
# L'ordre est significatif : un groupe spécifique doit précéder un groupe
# générique dont le mot-clé serait contenu dans le même titre de chapitre.
GROUPES = []
for chemin in sorted(glob.glob(MOTIF_PS)):
    nom = chemin.split('/')[-1][:-3]
    for matieres, mots, slug, libelle, notions in charger(chemin, nom):
        GROUPES.append((matieres, mots, slug, libelle, notions))

# --- Puis Mathématiques (format historique) --------------------------------
# Les groupes de maths sont explicitement restreints à la matière afin qu'un
# chapitre de Physique-Chimie ou de SVT ne puisse jamais les déclencher.
MATHS = ['mathematiques']
for entree in PLAN_MATHS:
    source, index, slug, libelle = entree[:4]
    if isinstance(source, str):
        source = modules[source]
    mots, notions = source[index]
    GROUPES.append((MATHS, mots, slug, libelle, notions))

slugs = [e[2] for e in GROUPES]
assert len(slugs) == len(set(slugs)), 'slug dupliqué'

# --- Construction du bloc TypeScript ---------------------------------------
lignes = []
lignes.append("type NotionCur = [string, string, string];")
lignes.append("type GroupeCur = { id: string; matieres: string[]; motsChapitre: string[]; notions: NotionCur[] };")
lignes.append("")
lignes.append("// NOTIONS CURÉES par chapitre (programmes de Mathématiques, Physique-Chimie et SVT).")
lignes.append("// Les ids sont stables (`cur_<groupe>_<index>`) afin que la maîtrise enregistrée")
lignes.append("// localement survive aux rechargements de l'application.")
lignes.append("// `matieres` restreint un groupe à une matière ('mathematiques', 'physique chimie',")
lignes.append("// 'svt') : un groupe sans `matieres` s'applique à toutes les matières.")
lignes.append("// IMPORTANT - L'ORDRE EST SIGNIFICATIF : le premier groupe dont un mot-clé est")
lignes.append("// contenu dans le titre normalisé du chapitre l'emporte, du plus spécifique au plus générique.")
lignes.append("const NOTIONS_CURATEES: GroupeCur[] = [")

nb_notions = 0
for matieres, mots, slug, libelle, notions in GROUPES:
    propres = [m for m in mots if m.isascii()]
    assert propres, (slug, mots)

    lignes.append("")
    lignes.append("  // --- %s ---" % libelle)
    lignes.append("  {")
    lignes.append("    id: %s," % ts(slug))
    if matieres:
        lignes.append("    matieres: [%s],"
                      % ', '.join(ts(m) for m in sorted(matieres)))
    else:
        lignes.append("    matieres: [],")
    if len(propres) == 1:
        lignes.append("    motsChapitre: [%s]," % ts(propres[0]))
    else:
        lignes.append("    motsChapitre: [")
        for m in propres:
            lignes.append("      %s," % ts(m))
        lignes.append("    ],")
    lignes.append("    notions: [")
    for titre, extrait, mots_cles in notions:
        lignes.append("      [%s, %s, %s]," % (ts(titre), ts(extrait), ts(mots_cles)))
        nb_notions += 1
    lignes.append("    ],")
    lignes.append("  },")
lignes.append("];")
lignes.append("")

nouveau_bloc = NL.join(lignes)

# --- Substitution dans le fichier cible ------------------------------------
# Idempotent : relancer le script après une première génération ne change rien
# (utile pour ajouter de nouveaux chapitres puis régénérer).
src = open(FICHIER, encoding='utf-8').read()
lignes_src = src.split(NL)

debut = next(i for i, l in enumerate(lignes_src) if l.startswith('type NotionCur'))
fin = next(i for i, l in enumerate(lignes_src)
           if 'export async function chargerNotionsChapitre' in l)

# Sécurité : la ligne d'export doit être propre (aucun résidu `]export`).
ligne_export = lignes_src[fin]
if not ligne_export.startswith('export async function'):
    ligne_export = 'export async function chargerNotionsChapitre(' + \
        ligne_export.split('chargerNotionsChapitre(', 1)[1]

resultat = NL.join(lignes_src[:debut] + nouveau_bloc.split(NL)
                   + [ligne_export] + lignes_src[fin + 1:])

# --- Correction du mapping (n.titre sur un tuple renvoie undefined) --------
if 'titre: n.titre' in resultat:
    resultat = resultat.replace(
        "        id: `cur_${mot}_${i}`," + NL
        + "        titre: n.titre," + NL
        + "        extrait: n.extrait," + NL
        + "        motsCles: n.motsCles," + NL,
        "        id: `cur_${groupe.id}_${i}`," + NL
        + "        titre," + NL
        + "        extrait," + NL
        + "        motsCles: motsCles.split(' ').filter((m) => m.length >= 3)," + NL,
    )
    resultat = resultat.replace(
        "      return groupe.notions.map((n, i) => ({" + NL,
        "      return groupe.notions.map((n, i) => {" + NL
        + "        const [titre, extrait, motsCles] = n;" + NL
        + "        return {" + NL,
    )
    resultat = resultat.replace(
        "      });" + NL + "    }" + NL + "  }",
        "        };" + NL + "      });" + NL + "    }" + NL + "  }",
    )
mapping_ok = 'const [titre, extrait, motsCles] = n;' in resultat
assert mapping_ok, 'mapping curé non corrigé'

# --- Boucle : utiliser some() plutôt que find() (variable morte) ----------
if 'const mot = groupe.motsChapitre.find' in resultat:
    resultat = resultat.replace(
        "    const mot = groupe.motsChapitre.find((m) => titreChapitre.includes(m));" + NL
        + "    if (mot) {",
        "    const correspond = groupe.motsChapitre.some((m) => titreChapitre.includes(m));" + NL
        + "    if (correspond) {",
    )
boucle_ok = 'const correspond = groupe.motsChapitre.some' in resultat
assert boucle_ok, 'boucle non corrigée'

# Indentation propre de la boucle.
resultat = resultat.replace(
    "  const titreChapitre = normaliserCle(source.titre || '');" + NL
    + "    for (const groupe of NOTIONS_CURATEES) {",
    "  const titreChapitre = normaliserCle(source.titre || '');" + NL
    + "  for (const groupe of NOTIONS_CURATEES) {",
)

if not resultat.endswith(NL):
    resultat += NL
open(FICHIER, 'w', encoding='utf-8').write(resultat)

print('Groupes écrits  :', len(GROUPES))
print('Notions écrites :', nb_notions)
print('Bloc NOTIONS_CURATEES : lignes %d-%d remplacées' % (debut + 1, fin))
print('Mapping curé    : OK (déstructuration du tuple)')
print('Boucle curée    : OK (some() + indentation)')
