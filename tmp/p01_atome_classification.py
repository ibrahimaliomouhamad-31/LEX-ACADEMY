# -*- coding: utf-8 -*-
"""Physique-Chimie — structure de la matière et classification périodique.

Format RICHE : (matieres, motsChapitre, slug, libelle, notions)
Le premier groupe de TOUS les fichiers dont un mot-clé est contenu dans le
titre normalisé du chapitre l'emporte : l'ordre des fichiers (`pNN_`) et des
groupes à l'intérieur d'un fichier est donc significatif.
"""
PC = ['physique chimie']

GROUPES = [
    (PC,
     ['structure de l atome', 'classification periodique', 'liaison covalente',
      'ions monoatomiques', 'chlorure de sodium', 'loi de lavoisier'],
     'pc_atome_classification',
     "Atome, classification périodique et liaison chimique",
     [
         ("L'atome et ses constituants",
          'Un atome est constitué d\'un noyau (protons et neutrons) et d\'électrons. Un atome est électriquement neutre.',
          'atome noyau proton neutron electron'),
         ('Symbole et écriture du noyau',
          "Écriture A/Z X : Z est le numéro atomique (nombre de protons) et A le nombre de masse (protons + neutrons).",
          'symbole noyau numero atomique masse'),
         ('Élément chimique et isotopes',
          "Les isotopes d'un élément ont le même Z mais des A différents : même chimie, masses différentes.",
          'element isotope numero atomique masse'),
         ('Configuration électronique',
          "Répartition des électrons en couches (K, L, M) : c'est elle qui explique les propriétés chimiques de l'élément.",
          'configuration electronique couche regle'),
         ('La classification périodique',
          "Les éléments sont rangés par Z croissant, en lignes (périodes) et colonnes (familles) aux propriétés voisines.",
          'classification periodique periode groupe'),
         ('Familles chimiques',
          'Les alcalins, alcalino-terreux, halogènes et gaz nobles partagent une configuration électronique externe.',
          'famille colonne alcalin halogene gaz noble'),
         ('Propriétés périodiques',
          'Le rayon atomique et l\'électronégativité varient régulièrement dans le tableau périodique.',
          'rayon atomique electronegativite periode'),
         ('La liaison covalente',
          "Une liaison covalente résulte de la mise en commun de deux électrons entre deux atomes : c'est une liaison forte.",
          'liaison covalente doublet partage'),
         ('Représentation de Lewis',
          'Schéma de Lewis : les doublets liants et les doublets non liants représentent les électrons de valence.',
          'lewis doublet valence schema'),
         ('Ions monoatomiques',
          "Un ion monoatomique provient d'un atome ayant gagné ou perdu des électrons : il est chargé.",
          'ion monoatomique charge electron'),
         ('Ions polyatomiques',
          'Un ion polyatomique est un groupement d\'atomes liés qui porte une charge globale.',
          'ion polyatomique charge groupement'),
         ('Le chlorure de sodium',
          'Solide ionique formé d\'un empilement régulier d\'ions Na+ et Cl− : c\'est un cristal ionique.',
          'chlorure sodium cristal ionique reseau'),
         ('Loi de conservation de la masse',
          "Loi de Lavoisier : lors d'une réaction chimique, la masse totale des produits est égale à celle des réactifs.",
          'lavoisier conservation masse reaction'),
         ('Équation bilan et stœchiométrie',
          "Écrire l'équation bilan en ajustant les coefficients pour équilibrer les nombres d'atomes de chaque élément.",
          'equation bilan coefficient stoechiometrie ajuster'),
     ]),
]
