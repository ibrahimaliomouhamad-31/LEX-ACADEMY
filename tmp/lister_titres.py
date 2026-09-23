# -*- coding: utf-8 -*-
"""Liste les titres uniques par matière (pour concevoir les groupes curés)."""
import sys

from analyse_collisions import lire_titres, norm

if __name__ == '__main__':
    par = {}
    for mat, titre in lire_titres():
        par.setdefault(mat, [])
        if titre not in par[mat]:
            par[mat].append(titre)
    for mat, titres in par.items():
        print('=' * 70)
        print(mat, '->', len(titres), 'titres uniques')
        print('=' * 70)
        for i, t in enumerate(titres, 1):
            print('%3d. %s' % (i, t))
        print()