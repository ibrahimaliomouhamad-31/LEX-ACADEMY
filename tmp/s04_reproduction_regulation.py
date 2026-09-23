# -*- coding: utf-8 -*-
"""Notions curees - SVT : reproduction et regulation."""

SVT = ['svt']

GROUPES = [
    (SVT,
     ['appareils genitaux', 'fecondation', 'nidation'],
     'svt_reproduction_humaine',
     'Reproduction humaine',
     [
         ("Appareils genitaux masculin et feminin",
          "Testicules et ovaires produisent les gametes ; voies genitales et organes externes permettent la rencontre.",
          'genitaux gametes testicules ovaires'),
         ("Fecondation et nidation",
          "La fusion spermatozoide-ovule forme l'oeuf, qui migre puis s'implante dans la muqueuse uterine.",
          'fecondation oeuf nidation uterus'),
         ("Grossesse et accouchement",
          "Le placenta nourrit l'embryon puis le foetus ; contractions et dilatation du col precedent l'expulsion.",
          'placenta embryon foetus accouchement'),
     ]),
    (SVT,
     ['regulation des naissances', 'contraception'],
     'svt_regulation_naissances',
     'Regulation des naissances',
     [
         ("Methodes contraceptives",
          "Pilule, preservatif, DIU ou methodes naturelles : elles empechent la fecondation ou la nidation.",
          'contraception pilule preservatif diu'),
         ("Interruption volontaire de grossesse",
          "Pratique encadree par la loi, elle met fin a une grossesse non desiree dans un delai legal.",
          'ivg loi grossesse interruption'),
         ("Planification familiale au Niger",
          "Espacement des naissances et sante maternelle : la planification ameliore la vie des familles.",
          'planification espacement maternelle famille'),
     ]),
    (SVT,
     ['regulation de la glycemie', 'glycémie'],
     'svt_glycemie',
     'Regulation de la glycemie',
     [
         ("Glycemie et ses variations",
          "La glycemie oscille autour de 1 g/L : elle monte apres le repas et baisse pendant le jeune.",
          'glycemie repas jeune variations'),
         ("Insuline et glucagon",
          "Le pancreas secrete l'insuline qui fait baisser la glycemie et le glucagon qui la fait monter.",
          'insuline glucagon pancreas hormones'),
         ("Diabete et depistage",
          "Le diabete est une hyperglycemie chronique par defaut d'insuline : depistage et regime adaptes.",
          'diabete hyperglycemie depistage regime'),
     ]),
]