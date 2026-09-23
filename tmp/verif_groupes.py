# -*- coding: utf-8 -*-
"""Vérifie que tous les fichiers de groupes sont importables et cohérents.

⚠️ Le motif est volontairement précis (`gNN_*.py`, deux chiffres) : un simple
`g*.py` capturerait aussi `generer_microNotions.py`, ce qui déclencherait une
génération récursive au moment de l'import.
"""
import glob
import importlib.util
import sys

sys.path.insert(0, 'tmp')

MOTIF = 'tmp/g[0-9][0-9]_*.py'

total_notions = 0
total_groupes = 0
erreurs = []

for f in sorted(glob.glob(MOTIF)):
    nom = f.split('/')[-1][:-3]
    spec = importlib.util.spec_from_file_location(nom, f)
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
        groupes = mod.GROUPES
    except Exception as e:
        erreurs.append((f, str(e)))
        continue
    for mots, notions in groupes:
        total_groupes += 1
        # Chaque notion doit être un triplet de chaînes non vides
        for n in notions:
            assert len(n) == 3, (f, n)
            assert all(isinstance(x, str) and x for x in n), (f, n)
        # Les titres doivent être uniques dans un même groupe (ids stables)
        titres = [n[0] for n in notions]
        assert len(titres) == len(set(titres)), (f, 'titre dupliqué')
        # Les mots-clés doivent être normalisés (pas d'accent ni majuscule) ;
        # les variantes accentuées sont ignorées par le générateur.
        for m in mots:
            assert m == m.lower(), (f, m)
            assert all(c.isalnum() or c == ' ' for c in m), (f, m)
        assert any(m.isascii() for m in mots), (f, 'aucun mot-clé ASCII exploitable')
        total_notions += len(notions)
    print('%-42s %2d groupes %3d notions' % (f, len(groupes), sum(len(v) for _, v in groupes)))

print('-' * 60)
print('TOTAL : %d groupes, %d notions' % (total_groupes, total_notions))
if erreurs:
    print('ERREURS :')
    for f, e in erreurs:
        print(' ', f, e)
    sys.exit(1)
print('OK — toutes les données sont valides.')