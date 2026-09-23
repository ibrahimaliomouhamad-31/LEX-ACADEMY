# -*- coding: utf-8 -*-
"""Chargement centralisé des groupes de micro-notions curées.

Source unique de vérité partagée par `generer_microNotions.py` (émission du
bloc TypeScript) et `verif_couverture.py` (vérification du routage de tous les
chapitres du programme officiel).

Deux formats de fichiers de données dans `tmp/` :

  - Format RICHE — `tmp/[ps]NN_*.py` (Physique-Chimie `p`, SVT `s`) :
    `GROUPES = [(matieres, motsChapitre, slug, libelle, notions), ...]`

  - Format HISTORIQUE — `tmp/gNN_*.py` (Mathématiques) :
    `GROUPES = [(motsChapitre, notions), ...]`, référencés explicitement par
    `PLAN_MATHS` car l'ordre d'insertion dans le fichier cible est imposé.

L'ordre final de `GROUPES` est significatif : le premier groupe dont un
mot-clé est contenu dans le titre normalisé du chapitre l'emporte. Les groupes
Physique-Chimie/SVT sont donc placés avant les groupes de Mathématiques (dont
les titres ne se recoupent pas avec ceux des deux autres matières).

⚠️ Les motifs sont précis (`NN_`, deux chiffres) : un simple `g*.py`
capturerait aussi `generer_microNotions.py`, provoquant une génération
récursive au moment de l'import.
"""
import glob
import importlib.util
import re
import unicodedata

MOTIF_MATHS = 'tmp/g[0-9][0-9]_*.py'
MOTIF_PS = 'tmp/[ps][0-9][0-9]_*.py'
MATHS = ['mathematiques']


def normaliser(s):
    """Reproduit exactement `normaliserCle` de src/services/microNotions.ts."""
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'[^a-z0-9 ]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def charger(chemin, nom):
    spec = importlib.util.spec_from_file_location(nom, chemin)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.GROUPES


curated = charger('tmp/curated_maths.py', 'curated_maths')
modules = {}
for chemin in sorted(glob.glob(MOTIF_MATHS)):
    nom = chemin.split('/')[-1][:-3]
    modules[nom] = charger(chemin, nom)

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
    for entree in charger(chemin, nom):
        assert len(entree) == 5, (chemin, 'entrée attendue à 5 champs')
        GROUPES.append(entree)

# --- Puis Mathématiques (format historique) --------------------------------
# Les groupes de maths sont explicitement restreints à la matière afin qu'un
# chapitre de Physique-Chimie ou de SVT ne puisse jamais les déclencher.
for entree in PLAN_MATHS:
    source, index, slug, libelle = entree[:4]
    if isinstance(source, str):
        source = modules[source]
    mots, notions = source[index]
    GROUPES.append((MATHS, mots, slug, libelle, notions))

slugs = [e[2] for e in GROUPES]
assert len(slugs) == len(set(slugs)), 'slug dupliqué: %s' % (
    sorted({s for s in slugs if slugs.count(s) > 1}),)


# Chapitres fourre-tout sans notions curées spécifiques : le fallback
# heuristique (extraction depuis le contenu du cours) s'applique — c'est voulu.
FALLBACK_ATTENDU = ('revisions generales', 'revisions generales du bac')


def router(titre, matiere=''):
    """Simule le routage de `chargerNotionsChapitre` ; renvoie le groupe ou None."""
    t = normaliser(titre)
    m = normaliser(matiere)
    for matieres, mots, slug, libelle, notions in GROUPES:
        if m and matieres and m not in matieres:
            continue
        if any(normaliser(x) in t for x in mots if x.isascii()):
            return (matieres, mots, slug, libelle, notions)
    return None