# -*- coding: utf-8 -*-
"""Audit des exercices infinis : pour chaque notion curee, quel generateur est
choisi par `genererExercicePourNotion` ?

Reproduit en Python la logique de src/services/generateurLocal.ts :
  - correspondance par MOTS ENTIERS (`motCorrespond`) ;
  - filtrage par MATIERE deduite de l'id `cur_pc_...` / `cur_svt_...`.

Usage : python3 tmp/diag_notions_hors_sujet.py [--tous]
"""
import re
import sys
import unicodedata

GL = 'src/services/generateurLocal.ts'
MN = 'src/services/microNotions.ts'


def norm(s):
    s = s.lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9 ]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def unescape(s):
    return s.replace("\\'", "'").replace('\\\\', '\\')


def mot_correspond(cle, mot):
    """Doit rester identique a `motCorrespond` de generateurLocal.ts."""
    m = norm(mot)
    if not m:
        return False
    if ' ' in m:
        return (' %s ' % cle).find(' %s ' % m) != -1
    for tok in cle.split(' '):
        if tok == m or (len(m) >= 5 and tok.startswith(m)):
            return True
    return False


def lire_sujets():
    src = open(GL, encoding='utf-8').read()
    i = src.index('const SUJETS: Sujet[] = [')
    j = src.index('\n];', i)
    sujets = []
    motif = r"\{\s*matieres: \[(.*?)\],\s*motsCles: \[(.*?)\],\s*generateurs: \[(.*?)\],\s*\}"
    for m in re.finditer(motif, src[i:j], re.S):
        mats = [x.strip() for x in re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(1))]
        mots = [unescape(x) for x in re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2))]
        gens = [x.strip() for x in m.group(3).split(',') if x.strip()]
        sujets.append((mats, mots, gens))
    return sujets


def lire_pools():
    src = open(GL, encoding='utf-8').read()
    pools = {}
    for nom, matiere in (('POOL_MATHS', 'maths'),
                         ('POOL_PHYSIQUE_CHIMIE', 'physique chimie'),
                         ('POOL_SVT', 'svt')):
        i = src.index('const %s: GenFonction[] = [' % nom)
        j = src.index('\n];', i)
        pools[matiere] = re.findall(r'^\s{2}(\w+),', src[i:j], re.M)
    return pools


def lire_notions():
    src = open(MN, encoding='utf-8').read()
    a = src.index('const NOTIONS_CURATEES: GroupeCur[] = [')
    b = src.index('\n];', a)
    notions = []
    gid = None
    for ligne in src[a:b].split('\n'):
        mid = re.search(r"id: '([^']+)'", ligne)
        if mid:
            gid = mid.group(1)
            continue
        mnot = re.match(r"^\s*\['(.*)'\],?\s*$", ligne)
        if mnot and gid:
            champs = mnot.group(1).split("', '")
            if len(champs) >= 3:
                notions.append((gid, unescape(champs[0]), champs[-1]))
    return notions


def matiere_de(gid):
    """Copie de `matiereDepuisIdNotion` : l'id reel est `cur_<groupe>_<index>`."""
    id_reel = 'cur_' + gid
    if '_pc_' in id_reel:
        return 'physique chimie'
    if '_svt_' in id_reel:
        return 'svt'
    return 'maths'


def main():
    sujets = lire_sujets()
    pools = lire_pools()
    notions = lire_notions()
    print('SUJETS : %d  |  NOTIONS curees : %d' % (len(sujets), len(notions)))
    print('POOLS   : ' + ' ; '.join('%s=%d' % (k, len(v)) for k, v in sorted(pools.items())))

    par_cas = {}
    for gid, titre, motsc in notions:
        mat = matiere_de(gid)
        cle = norm(titre + ' ' + motsc)
        trouve = None
        for mats, mots, gens in sujets:
            if mat not in mats:
                continue
            for mot in mots:
                if mot_correspond(cle, mot):
                    trouve = ('mot-cle "%s"' % mot, ', '.join(gens))
                    break
            if trouve:
                break
        cle_cas = (mat,) + (trouve if trouve else ('(fallback pool %s)' % mat, '/'.join(pools[mat])))
        par_cas.setdefault(cle_cas, []).append((gid, titre))

    total_hors_sujet = 0
    for cas in sorted(par_cas):
        print('-' * 78)
        print('%-16s %-24s -> %-45s (%d)' % (cas[0], cas[1], cas[2], len(par_cas[cas])))
        for gid, titre in par_cas[cas]:
            print('        [%s] %s' % (gid, titre))
    print('=' * 78)
    print('Total notions : %d' % len(notions))
    print('Hors-sujet inter-matieres attendus : %d' % total_hors_sujet)


if __name__ == '__main__':
    main()
