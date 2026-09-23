# -*- coding: utf-8 -*-
"""Notions curees - SVT : genetique (information, transmission, expression)."""

SVT = ['svt']

GROUPES = [
    (SVT,
     ['information genetique', 'clonage', 'mitose'],
     'svt_information_genetique',
     'Information genetique et division cellulaire',
     [
         ("Support de l'information genetique",
          "Les chromosomes du noyau portent les genes, segments d'ADN qui commandent les caracteres.",
          'chromosomes genes adn caracteres'),
         ("Mitose et transmission fidele",
          "La mitose copie puis repartit les chromatides : les deux cellules filles sont identiques.",
          'mitose chromatides filles identiques'),
         ("Clonage et biotechnologies",
          "Le clonage produit des copies genetiquement identiques : applications agricoles et limites ethiques.",
          'clonage copies identiques ethique'),
     ]),
    (SVT,
     ['expression de l information', 'reproduction sexuee', 'brassage'],
     'svt_expression_brassage',
     'Expression et brassage genetique',
     [
         ("Expression de l'information genetique",
          "L'ADN est transcrit en ARN puis traduit en proteines : genotype et environnement font le phenotype.",
          'transcription traduction proteines phenotype'),
         ("Meiose et brassage genetique",
          "La meiose melange les chromosomes puis les chromatides : chaque gamete est unique.",
          'meiose gametes melange unique'),
         ("Fecondation et diversite",
          "La rencontre aleatoire des gametes amplifie la diversite : aucun individu n'est identique.",
          'fecondation aleatoire diversite individus'),
     ]),
    (SVT,
     ['heredite', 'anomalies chromosomiques'],
     'svt_heredite_anomalies',
     'Heredite et anomalies chromosomiques',
     [
         ("Transmission des caracteres",
          "Alleles dominants et recessifs, genotypes et croisements : les lois de Mendel prevoient les proportions.",
          'alleles mendel croisements proportions'),
         ("Heredite humaine et groupes sanguins",
          "Groupes ABO, daltonisme ou hemophilie : exemples d'heredite liee au sexe ou autosomique.",
          'groupes sanguins daltonisme sexe'),
         ("Anomalies chromosomiques",
          "Trisomie 21 ou monosomie : un chromosome en trop ou en moins provoque des troubles du developpement.",
          'trisomie monosomie developpement troubles'),
     ]),
]