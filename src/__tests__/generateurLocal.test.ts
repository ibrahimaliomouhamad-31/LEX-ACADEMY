// 🚫 TESTS DE NON-RÉGRESSION « EXERCICES HORS-SUJET »
//
// Bug corrigé : un simple `includes` sur les mots-clés produisait des exercices
// totalement hors-sujet dans les exercices infinis par notion :
//   • « Fission nucléaire » → Pythagore (le mot-clé « aire » matchait « nu-
//     cléaire ») ;
//   • « Appareils génitaux » → pourcentages (« taux » dans « génitaux ») ;
//   • « Écosystèmes » → équations du 2nd degré (« système » dans « écosys-
//     tème ») ;
//   • « Binôme de Newton » → mécanique (« newton ») ;
//   • sans compter les 256 notions sur 594 qui tombaient dans un pool 100 %
//     mathématiques (matière ignorée).
//
// Les exercices sont désormais sélectionnés par MOTS ENTIERS et filtrés par
// matière (déduite de l'id `cur_pc_…` / `cur_svt_…` ou passée par l'écran).
import { genererExercice, genererExercicePourNotion } from '../services/generateurLocal';

// Formulations exclusives aux générateurs de MATHÉMATIQUES.
const MARQUEURS_MATHS =
  /Résous l'équation|Résous :|Résous le système|Résous l'inéquation|Calcule f'\(|primitive F de f|Calcule la limite|Calcule PGCD|Calcule PPCM|hypoténuse|est arithmétique|est géométrique|FCFA|sous la forme|valeur exacte de|urne contient|lance un dé|solution double|e\^\(ln|son aire|son périmètre|sans calculatrice/;

// Formulations exclusives aux générateurs de PHYSIQUE-CHIMIE (toutes portent
// une unité ou un appareil de mesure).
const MARQUEURS_PC =
  /Ω|Wh|mol\/L|kg\/L|m\/s|km\/h|joules|en N\)|g\/mol|conducteur ohmique/;

// Formulations exclusives aux générateurs de SVT.
const MARQUEURS_SVT = /cellul|chromosome|ADN|mitose|Photosynthèse/i;

interface CasNotion {
  id: string;
  titre: string;
  motsCles: string[];
}

const GRAINES = Array.from({ length: 40 }, (_, i) => 1000 + i * 7);

function notion(c: CasNotion) {
  return { ...c, extrait: '' };
}

// Cas réels qui étaient hors-sujet avant la correction.
const NOTIONS_SVT: CasNotion[] = [
  {
    id: 'cur_svt_ecosystemes_2',
    titre: 'Ecosystemes et biotope',
    motsCles: ['ecosysteme', 'biotope', 'milieu', 'savane'],
  },
  {
    id: 'cur_svt_reproduction_humaine_4',
    titre: 'Appareils genitaux masculin et feminin',
    motsCles: ['genitaux', 'gametes', 'testicules', 'ovaires'],
  },
  {
    id: 'cur_svt_tectonique_1',
    titre: 'Dérive des continents et preuves',
    motsCles: ['wegener', 'derive', 'fossiles', 'preuves'],
  },
];

const NOTIONS_PC: CasNotion[] = [
  {
    id: 'cur_pc_reactions_nucleaires_3',
    titre: 'Fission nucléaire',
    motsCles: ['fission', 'lourd', 'reacteur', 'neutron'],
  },
  {
    id: 'cur_pc_electronique_6',
    titre: 'Montages fondamentaux à ampli op',
    motsCles: ['montage', 'amplificateur', 'fondamentaux'],
  },
  {
    id: 'cur_pc_energie_electrique_0',
    titre: 'Puissance électrique',
    motsCles: ['puissance', 'electrique', 'energie'],
  },
];

describe('Exercices infinis : cohérence notion → matière', () => {
  it('ne sert JAMAIS un exercice de mathématiques à une notion de SVT', () => {
    for (const c of NOTIONS_SVT) {
      for (const g of GRAINES) {
        const exo = genererExercicePourNotion(notion(c), 40, g);
        expect(exo.enonce).not.toMatch(MARQUEURS_MATHS);
        expect(exo.enonce).toMatch(MARQUEURS_SVT);
      }
    }
  });

  it('ne sert JAMAIS un exercice de mathématiques à une notion de physique-chimie', () => {
    for (const c of NOTIONS_PC) {
      for (const g of GRAINES) {
        const exo = genererExercicePourNotion(notion(c), 40, g);
        expect(exo.enonce).not.toMatch(MARQUEURS_MATHS);
        expect(exo.enonce).toMatch(MARQUEURS_PC);
      }
    }
  });

  it("« nucléaire » ne déclenche plus Pythagore (mot-clé « aire »)", () => {
    for (const g of GRAINES) {
      const exo = genererExercicePourNotion(notion(NOTIONS_PC[0]), 40, g);
      expect(exo.enonce).not.toMatch(/hypoténuse|triangle rectangle|son aire|son périmètre/);
    }
  });

  it("« Puissance électrique » déclenche l'électricité (E = P × t ou U = R × I)", () => {
    for (const g of GRAINES) {
      const exo = genererExercicePourNotion(notion(NOTIONS_PC[2]), 40, g);
      expect(exo.enonce).toMatch(/appareil électrique de puissance|conducteur ohmique/);
    }
  });

  it('« Binôme de Newton » reste du dénombrement, pas de la mécanique', () => {
    const notionBinome = notion({
      id: 'cur_denombrements_7',
      titre: 'Binôme de Newton',
      motsCles: ['binome', 'newton', 'developpement'],
    });
    for (const g of GRAINES) {
      const exo = genererExercicePourNotion(notionBinome, 60, g);
      expect(exo.enonce).not.toMatch(/moto|énergie cinétique|poids|conducteur ohmique|électrique/);
    }
  });

  it('la matière passée explicitement est prioritaire sur les mots-clés', () => {
    const notionAmbiguë = notion({
      id: 'notion_libre_12',
      titre: 'Étude d’une solution',
      motsCles: ['solution', 'concentration'],
    });
    const exoSvt = genererExercicePourNotion(notionAmbiguë, 40, 4242, 'SVT');
    expect(exoSvt.enonce).toMatch(MARQUEURS_SVT);
    const exoPc = genererExercicePourNotion(notionAmbiguë, 40, 4242, 'Physique-Chimie');
    expect(exoPc.enonce).toMatch(MARQUEURS_PC);
  });
});

describe('genererExercice (par chapitre) : cohérence de matière', () => {
  it("un chapitre de SVT ne reçoit pas d'exercice de mathématiques", () => {
    for (let i = 0; i < 40; i++) {
      const exo = genererExercice('cur_svt_ecosystemes', 'Les écosystèmes et le biotope', 35);
      expect(exo.enonce).not.toMatch(MARQUEURS_MATHS);
    }
  });

  it('un chapitre classique de maths reste en mathématiques', () => {
    for (let i = 0; i < 40; i++) {
      const exo = genererExercice('jeu_calcul', 'Calcul rapide et équations', 12);
      expect(exo.enonce).not.toMatch(MARQUEURS_SVT);
      expect(exo.enonce).not.toMatch(MARQUEURS_PC);
    }
  });
});
