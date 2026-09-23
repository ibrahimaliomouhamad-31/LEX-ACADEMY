# -*- coding: utf-8 -*-
"""Analyse des collisions de routing entre titres de chapitres et mots-clés curés.

Sert à décider si le blocage par matière (`matiere`) est indispensable et à
vérifier que chaque titre de chapitre tombe bien sur le groupe attendu.
"""
import re
import unicodedata


def norm(s):
    s = unicodedata.normalize('NFD', str(s).lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9 ]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def lire_groupes(chemin='src/services/microNotions.ts'):
    """Relit le bloc TS généré : [(id, matieres, motsChapitre), ...]"""
    ts = open(chemin, encoding='utf-8').read()
    bloc = ts[ts.index('const NOTIONS_CURATEES'):
              ts.index('export async function chargerNotionsChapitre')]
    groupes = []
    for m in re.finditer(
            r"id: '([a-z_]+)',\s*\n"
            r"(?:\s*matieres: \[(.*?)\],\s*\n)?"
            r"\s*motsChapitre: \[(.*?)\],",
            bloc, re.S):
        groupes.append((m.group(1),
                        re.findall(r"'([^']+)'", m.group(2) or ''),
                        re.findall(r"'([^']+)'", m.group(3))))
    return groupes


def lire_titres(chemin='/tmp/titres_pc_svt.txt'):
    """[(matiere, titre), ...]"""
    titres, matiere = [], None
    for ligne in open(chemin, encoding='utf-8'):
        ligne = ligne.rstrip()
        if ligne.startswith('#####'):
            matiere = ligne.strip('# ').strip()
        elif ligne.strip().startswith('- '):
            titres.append((matiere, ligne.strip()[2:]))
    return titres


if __name__ == '__main__':
    groupes = lire_groupes()
    titres = lire_titres()
    print('Groupes lus :', len(groupes))
    print('Titres lus  :', len(titres))
    print()
    hits = 0
    for mat, titre in titres:
        tn = norm(titre)
        trouve = None
        for gid, matieres, mots in groupes:
            if any(m in tn for m in mots):
                trouve = gid
                break
        if trouve:
            hits += 1
            print('  [%-14s] %-72s -> %s' % (mat, titre, trouve))
    print('TOTAL titres PC/SVT captés par un groupe :', hits)