# -*- coding: utf-8 -*-
"""Liste les titres PC/SVT du programme officiel et leur couverture."""
import json
import sys
from collections import OrderedDict

sys.path.insert(0, 'tmp')
import charger_groupes as CG

d = json.load(open('backups/2026-08-22T14-11-42_cours.json', encoding='utf-8'))

par = OrderedDict()
for c in d:
    m = c.get('matiere')
    if m not in ('Physique-Chimie', 'SVT'):
        continue
    par.setdefault(m, OrderedDict()).setdefault(c.get('titre'), []).append(c.get('classe'))

for matiere, titres in par.items():
    print('=' * 70)
    print(matiere, '-', len(titres), 'chapitres distincts')
    print('=' * 70)
    for i, (titre, classes) in enumerate(sorted(titres.items()), 1):
        g = CG.router(titre, matiere)
        if g:
            etat = g[2]
        elif CG.normaliser(titre) in CG.FALLBACK_ATTENDU:
            etat = '(fallback heuristique — attendu)'
        else:
            etat = '*** NON COUVERT ***'
        print('%2d. %-58s %s' % (i, titre[:58], etat))
        print('     classes : %s' % ', '.join(sorted(set(classes))))