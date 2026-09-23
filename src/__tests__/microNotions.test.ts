import { describe, it, expect } from '@jest/globals';
import { extraireMicroNotions, motsClesPourNotion, chargerNotionsChapitre } from '../services/microNotions';

describe('extraireMicroNotions', () => {
  it('extrait plusieurs micro-notions à partir d\'un cours structuré', () => {
    const cours = [
      'I. Définition d\'une fonction',
      'Une fonction associe à chaque nombre une unique image.',
      'II. Limite d\'une fonction',
      'On étudie le comportement en l\'infini.',
      'III. Continuité',
      'Une fonction continue se trace sans lever le stylo.',
      'IV. Dérivée',
      'La dérivée mesure le taux de variation instantané.',
      'V. Théorème des valeurs intermédiaires',
      'Toute valeur entre deux images est atteinte.',
      'VI. Suites arithmétiques',
      'La différence entre deux termes consécutifs est constante.',
      'VII. Suites géométriques',
      'Le rapport entre deux termes consécutifs est constant.',
      'VIII. Intégrale',
      'L\'intégrale calcule l\'aire sous la courbe.',
      'IX. Primitive',
      'Une primitive est une fonction dont la dérivée est donnée.',
      'X. Exponentielle',
      'La fonction exponentielle a des propriétés remarquables.',
      'XI. Logarithme',
      'Le logarithme est la réciproque de l\'exponentielle.',
      'XII. Nombres complexes',
      'On étend les nombres réels avec le nombre i.',
      'XIII. Probabilités',
      'On mesure la chance qu\'un événement se produise.',
      'XIV. Statistiques',
      'On résume des données par moyenne et écart-type.',
      'XV. Vecteurs',
      'On représente des translations et directions dans le plan.',
    ].join('\n');

    const notions = extraireMicroNotions(cours);
    expect(notions.length).toBeGreaterThanOrEqual(5);
    // Chaque notion doit être structurée
    expect(notions[0].titre.length).toBeGreaterThan(0);
    expect(Array.isArray(notions[0].motsCles)).toBe(true);
  });

  it('retourne un tableau vide pour du contenu vide ou inconnu', () => {
    expect(extraireMicroNotions('')).toEqual([]);
    expect(extraireMicroNotions(undefined as unknown as string)).toEqual([]);
  });

  it('dédoublonne les titres identiques', () => {
    const cours = 'I. Nombres\npremière ligne\nI. Nombres\ndeuxième ligne';
    const notions = extraireMicroNotions(cours);
    const titres = notions.map((n) => n.titre);
    expect(new Set(titres).size).toBe(titres.length);
  });
});

describe('motsClesPourNotion', () => {
  it('ajoute des mots-clés pertinents selon le titre', () => {
    const notion = { id: 'notion_0', titre: 'Dérivée et dérivation', motsCles: [], extrait: '', ordre: 0, maitrise: 0 };
    const mots = motsClesPourNotion(notion);
    // Le thème 'dérivé' doit déclencher l'ajout des mots-clés d'analyse
    expect(mots.some((m) => m.includes('derive') || m.includes('pente') || m.includes('taux'))).toBe(true);
  });

  it('garde les mots-clés de base sans doublon', () => {
    const notion = { id: 'notion_1', titre: 'Équations', motsCles: ['equation', 'resolution'], extrait: '', ordre: 0, maitrise: 0 };
    const mots = motsClesPourNotion(notion);
    expect(new Set(mots).size).toBe(mots.length);
  });
});

describe('chargerNotionsChapitre — notions curées', () => {
  it('renvoie les VRAIES notions du programme pour un chapitre Arithmétique', async () => {
    const notions = await chargerNotionsChapitre(
      'term_c_math_chapX',
      { titre: 'Arithmétique', matiere: 'Mathématiques', theorie: 'Texte de cours au format non structuré.' },
      null,
      'Mathématiques'
    );
    expect(notions.length).toBeGreaterThanOrEqual(8);
    expect(notions.map((n) => n.titre)).toContain('Congruences');
    expect(notions.map((n) => n.titre)).toContain('Théorème de Bézout');
    // Ids stables : la maîtrise enregistrée survit aux rechargements.
    expect(notions[0].id).toBe('cur_arithmetique_0');
    expect(new Set(notions.map((n) => n.id)).size).toBe(notions.length);
  });

  it('ne déclenche PAS les notions curées pour un chapitre sans correspondance', async () => {
    // 'Titan' : mot inventé qui ne figure dans aucun groupe (ni 'force', ni autre).
    const notions = await chargerNotionsChapitre(
      'autre_chap',
      { titre: 'Titan', matiere: 'Physique-Chimie', theorie: 'I. Xyzq\nUn blabla de test sans mot cle.' },
      null,
      'Physique-Chimie'
    );
    // L'extraction heuristique classique s'applique (aucune notion curée).
    expect(notions.every((n) => !n.id.startsWith('cur_'))).toBe(true);
  });

  it('route chaque chapitre du programme officiel vers le bon groupe curé', async () => {
    // Titres réels des chapitres du programme officiel (toutes matières,
    // Seconde C → Terminale C/D). 'Révisions Générales du BAC' (SVT) est le
    // seul chapitre volontairement exclu : il relève du fallback heuristique.
    const chapitres: [string, string, string][] = [
      // Seconde C
      ['Calculs dans ℝ', 'Mathématiques', 'calculs_reels'],
      ['Vecteurs du plan et Barycentre', 'Mathématiques', 'vecteurs_barycentre'],
      ['Équations et inéquations du second degré', 'Mathématiques', 'second_degre'],
      ["Géométrie dans l'espace", 'Mathématiques', 'geometrie_espace'],
      ['Angles orientés et trigonométrie', 'Mathématiques', 'trigonometrie'],
      ["Fonctions numériques d'une variable réelle", 'Mathématiques', 'generalites_fonctions'],
      ['Produit scalaire', 'Mathématiques', 'produit_scalaire'],
      ['Statistique', 'Mathématiques', 'statistique'],
      ['Transformations du plan', 'Mathématiques', 'transformations'],
      // Première C / Première D
      ['Équations, Inéquations, Polynômes et Systèmes Linéaires', 'Mathématiques', 'polynomes'],
      ['Équations, Inéquations, Polynômes', 'Mathématiques', 'polynomes'],
      ['Primitives', 'Mathématiques', 'integrales'],
      ["Géométrie dans l'Espace", 'Mathématiques', 'geometrie_espace'],
      ['Suites Numériques', 'Mathématiques', 'suites'],
      ['Généralités sur les Fonctions Numériques', 'Mathématiques', 'generalites_fonctions'],
      ['Applications du Produit Scalaire et du Barycentre', 'Mathématiques', 'produit_scalaire'],
      ['Dénombrements', 'Mathématiques', 'denombrements'],
      ['Dénombrement', 'Mathématiques', 'denombrements'],
      ['Angles Orientés et Trigonométrie', 'Mathématiques', 'trigonometrie'],
      ['Transformations du Plan', 'Mathématiques', 'transformations'],
      ['Limites et Continuité', 'Mathématiques', 'limites_continuite'],
      ['Dérivation', 'Mathématiques', 'derivation'],
      ["Exemples d'Études de Fonctions Numériques", 'Mathématiques', 'etudes_fonctions'],
      // Terminale C / Terminale D
      ['Arithmétique', 'Mathématiques', 'arithmetique'],
      ['Fonctions exponentielles', 'Mathématiques', 'exponentielles'],
      ["Exemples d'études de fonctions", 'Mathématiques', 'etudes_fonctions'],
      ['Calcul Intégral', 'Mathématiques', 'integrales'],
      ['Équations différentielles linéaires', 'Mathématiques', 'equations_differentielles'],
      ['Équations différentielles', 'Mathématiques', 'equations_differentielles'],
      ['Probabilité sur un ensemble fini', 'Mathématiques', 'probabilites'],
      ['Calcul des Probabilités', 'Mathématiques', 'probabilites'],
      ['Séries statistiques à deux variables', 'Mathématiques', 'statistique'],
      ['Statistique à deux variables', 'Mathématiques', 'statistique'],
      ['Variables aléatoires', 'Mathématiques', 'variables_aleatoires'],
      ['Encadrements et approximations', 'Mathématiques', 'calculs_reels'],
      ['Nombres complexes', 'Mathématiques', 'complexes'],
      ['Calculs Barycentriques', 'Mathématiques', 'calculs_barycentriques'],
      ['Applications affines du plan', 'Mathématiques', 'applications_affines_plan'],
      ['Coniques', 'Mathématiques', 'coniques'],
      ["Applications affines de l'espace", 'Mathématiques', 'applications_affines_espace'],
      ['Suites numériques (Terminale)', 'Mathématiques', 'suites'],
      ['Suites numériques', 'Mathématiques', 'suites'],
      ['Fonctions logarithmes', 'Mathématiques', 'logarithmes'],
      ['Propriétés des fonctions continues ou dérivables', 'Mathématiques', 'fonctions_continues'],
      ['Similitudes planes directes', 'Mathématiques', 'similitudes'],
      // Terminale C / Terminale D — Physique-Chimie
      ['Alcanes', 'Physique-Chimie', 'pc_chimie_organique'],
      ['Amplificateur opérationnel', 'Physique-Chimie', 'pc_electronique'],
      ['Auto-induction', 'Physique-Chimie', 'pc_auto_induction'],
      ['Centre d\'inertie', 'Physique-Chimie', 'pc_centre_inertie'],
      ['Champ magnétique', 'Physique-Chimie', 'pc_champ_magnetique'],
      ['Chlorure de sodium', 'Physique-Chimie', 'pc_atome_classification'],
      ['Cinématique', 'Physique-Chimie', 'pc_cinematique'],
      ['Circuit en régime sinusoïdal forcé', 'Physique-Chimie', 'pc_circuits_rlc'],
      ['Circuit oscillant LC', 'Physique-Chimie', 'pc_circuits_rlc'],
      ['Classification périodique', 'Physique-Chimie', 'pc_atome_classification'],
      ['Combustibles fossiles', 'Physique-Chimie', 'pc_chimie_organique'],
      ['Composés aromatiques', 'Physique-Chimie', 'pc_chimie_organique'],
      ['Condensateurs', 'Physique-Chimie', 'pc_condensateurs'],
      ['Couples acide base', 'Physique-Chimie', 'pc_solutions_acido_basique'],
      ['Couples oxydant-réducteur', 'Physique-Chimie', 'pc_oxydoreduction_piles'],
      ['Dipôles', 'Physique-Chimie', 'pc_dipoles'],
      ['Dipôles non linéaires', 'Physique-Chimie', 'pc_dipoles'],
      ['Dispersion - Diffraction de la lumière', 'Physique-Chimie', 'pc_dispersion_diffraction'],
      ['Dérivés insaturés : Alcènes. Alcynes', 'Physique-Chimie', 'pc_chimie_organique'],
      ['Effet photoélectrique', 'Physique-Chimie', 'pc_photoelectrique'],
      ['Energie cinétique', 'Physique-Chimie', 'pc_energie_cinetique'],
      ['Force de Laplace', 'Physique-Chimie', 'pc_force_laplace'],
      ['Force de Lorentz', 'Physique-Chimie', 'pc_force_lorentz'],
      ['Généralisation de l\'oxydoréduction', 'Physique-Chimie', 'pc_oxydoreduction_piles'],
      ['Généralités sur les phénomènes vibratoires', 'Physique-Chimie', 'pc_vibrations_generalites'],
      ['Induction électromagnétique', 'Physique-Chimie', 'pc_induction'],
      ['Interférences d\'ondes lumineuses', 'Physique-Chimie', 'pc_interferences_lumineuses'],
      ['Ions monoatomiques et ions polyatomiques', 'Physique-Chimie', 'pc_atome_classification'],
      ['La force', 'Physique-Chimie', 'pc_statique_fluides'],
      ['Lentilles minces', 'Physique-Chimie', 'pc_lentilles'],
      ['Liaison covalente dans une molécule', 'Physique-Chimie', 'pc_atome_classification'],
      ['Loi d\'Ohm pour un récepteur non ohmique', 'Physique-Chimie', 'pc_loi_ohm_recepteur'],
      ['Loi d\'ohm pour un récepteur non ohmique', 'Physique-Chimie', 'pc_loi_ohm_recepteur'],
      ['Loi de Lavoisier', 'Physique-Chimie', 'pc_atome_classification'],
      ['Mouvement', 'Physique-Chimie', 'pc_mouvement_general'],
      ['Mouvement dans le champ de pesanteur terrestre', 'Physique-Chimie', 'pc_mouvement_champs'],
      ['Mouvement de particules chargées dans un champ électrique uniforme', 'Physique-Chimie', 'pc_mouvement_champs'],
      ['Mouvement du centre d\'inertie d\'un solide', 'Physique-Chimie', 'pc_centre_inertie'],
      ['Noyau atomique', 'Physique-Chimie', 'pc_noyau_atomique'],
      ['Oscillateurs mécaniques de translation', 'Physique-Chimie', 'pc_mouvement_general'],
      ['Piles et potentiels d\'oxydoréduction', 'Physique-Chimie', 'pc_oxydoreduction_piles'],
      ['Propagation d\'un phénomène vibratoire', 'Physique-Chimie', 'pc_propagation_ondes'],
      ['Quantité de mouvement', 'Physique-Chimie', 'pc_mouvement_general'],
      ['Réactions nucléaires', 'Physique-Chimie', 'pc_reactions_nucleaires'],
      ['Réfraction de la lumière', 'Physique-Chimie', 'pc_refraction'],
      ['Rôle du solvant lors de la dissolution d\'un composé ionique dans l\'eau', 'Physique-Chimie', 'pc_solutions_acido_basique'],
      ['Solutions aqueuses (Acide/Base et pH)', 'Physique-Chimie', 'pc_solutions_acido_basique'],
      ['Solutions aqueuses acides, solutions aqueuses basiques', 'Physique-Chimie', 'pc_solutions_acido_basique'],
      ['Solutions aqueuses d\'acide chlorhydrique et d\'hydroxyde de sodium', 'Physique-Chimie', 'pc_solutions_acido_basique'],
      ['Statique des fluides', 'Physique-Chimie', 'pc_statique_fluides'],
      ['Structure de l\'atome', 'Physique-Chimie', 'pc_atome_classification'],
      ['Superposition de deux phénomènes vibratoires', 'Physique-Chimie', 'pc_vibrations_generalites'],
      ['Tension continue', 'Physique-Chimie', 'pc_tensions_variables'],
      ['Tensions variables', 'Physique-Chimie', 'pc_tensions_variables'],
      ['Transistor', 'Physique-Chimie', 'pc_electronique'],
      ['Travail et puissance', 'Physique-Chimie', 'pc_travail_puissance'],
      ['Énergie cinétique', 'Physique-Chimie', 'pc_energie_cinetique'],
      ['Énergie mécanique', 'Physique-Chimie', 'pc_energie_mecanique'],
      ['Énergie potentielle', 'Physique-Chimie', 'pc_energie_potentielle'],
      ['Énergie électrique', 'Physique-Chimie', 'pc_energie_electrique'],
      ['Équilibre d\'un solide en rotation autour d\'un axe fixe', 'Physique-Chimie', 'pc_statique_fluides'],
      ['Équilibre d\'un solide soumis à 3 forces non parallèles', 'Physique-Chimie', 'pc_statique_fluides'],
      // SVT (toutes classes)
      ['Altération et sédimentation', 'SVT', 'svt_alteration_sedimentation'],
      ['Anomalies chromosomiques', 'SVT', 'svt_heredite_anomalies'],
      ['Biodiversité et Impacts Humains', 'SVT', 'svt_ecosystemes'],
      ['Calcaire et gypse', 'SVT', 'svt_ressources_niger'],
      ['Constituants de l’environnement', 'SVT', 'svt_environnement'],
      ['Conséquences de la tectonique des plaques', 'SVT', 'svt_tectonique'],
      ['De la fécondation à la nidation', 'SVT', 'svt_reproduction_humaine'],
      ['Devenir des substances synthétisées', 'SVT', 'svt_devenir_substances'],
      ['Dégradations de l’environnement', 'SVT', 'svt_environnement'],
      ['Expression de l\'information génétique', 'SVT', 'svt_information_genetique'],
      ['Flux de matière et d\'énergie', 'SVT', 'svt_ecosystemes'],
      ['Formation, évolution et propriétés d’un sol', 'SVT', 'svt_sols'],
      ['Gestion de l’environnement', 'SVT', 'svt_environnement'],
      ['Hérédité et génétique humaine', 'SVT', 'svt_heredite_anomalies'],
      ['Information génétique et clonage', 'SVT', 'svt_information_genetique'],
      ['L\'échelle des temps géologiques', 'SVT', 'svt_echelle_temps'],
      ['La carte géologique - La coupe géologique', 'SVT', 'svt_carte_geologique'],
      ['La gestion des sols', 'SVT', 'svt_sols'],
      ['La régulation de la glycémie', 'SVT', 'svt_glycemie'],
      ['La régulation des naissances', 'SVT', 'svt_regulation_naissances'],
      ['Le Muscle et sa Contraction', 'SVT', 'svt_systeme_nerveux'],
      ['Le Système Immunitaire (Le soi et le non-soi)', 'SVT', 'svt_immunite'],
      ['Le Système Nerveux Central', 'SVT', 'svt_systeme_nerveux'],
      ['Le VIH/SIDA et le dysfonctionnement du système immunitaire', 'SVT', 'svt_immunite'],
      ['Le fonctionnement des appareils génitaux et leur régulation', 'SVT', 'svt_reproduction_humaine'],
      ['Les Réponses Immunitaires', 'SVT', 'svt_immunite'],
      ['Les ressources géologiques exploitées au Niger', 'SVT', 'svt_ressources_niger'],
      ['Les Écosystèmes et Relations Trophiques', 'SVT', 'svt_ecosystemes'],
      ['Messages nerveux et synapses', 'SVT', 'svt_systeme_nerveux'],
      ['Mécanismes de l\'immunité', 'SVT', 'svt_immunite'],
      ['Nutrition carbonée d\'un végétal chlorophyllien', 'SVT', 'svt_nutrition_carbonee'],
      ['Nutrition minérale d\'un végétal chlorophyllien', 'SVT', 'svt_nutrition_minerale'],
      ['Organisation de la cellule vivante', 'SVT', 'svt_cellule'],
      ['Principes de stratigraphie et méthodes de datation', 'SVT', 'svt_stratigraphie_datation'],
      ['Production primaire et productivité de l’écosystème', 'SVT', 'svt_ecosystemes'],
      ['Relations trophiques', 'SVT', 'svt_ecosystemes'],
      ['Reproduction sexuée et brassage génétique', 'SVT', 'svt_expression_brassage'],
      ['Respiration et Fermentations', 'SVT', 'svt_respiration_fermentation'],
      ['Rôles des végétaux dans l’écosystème', 'SVT', 'svt_ecosystemes'],
      ['Structure interne de la Terre', 'SVT', 'svt_seisme_terre'],
      ['Séisme et structure interne de la Terre', 'SVT', 'svt_seisme_terre'],
      ['Tectonique des plaques', 'SVT', 'svt_tectonique'],
      ['Tissu nerveux et notions de reflexes', 'SVT', 'svt_systeme_nerveux'],
      ['Transmission de l\'information génétique (Mitose)', 'SVT', 'svt_information_genetique'],
      ['Uranium d\'Arlit', 'SVT', 'svt_ressources_niger'],
      ['Énergie fossile : charbon d\'Anou-Araren', 'SVT', 'svt_ressources_niger'],
    ];

    for (const [titre, matiere, idAttendu] of chapitres) {
      const notions = await chargerNotionsChapitre('chap_test', { titre, matiere, theorie: '' }, null, matiere);
      // Chaque chapitre doit avoir ses vraies notions, pas une extraction heuristique.
      expect(notions.every((n) => n.id.startsWith('cur_'))).toBe(true);
      expect(notions[0].id).toBe(`cur_${idAttendu}_0`);
      expect(notions.length).toBeGreaterThanOrEqual(2);
      // Ids uniques (stabilité de la maîtrise enregistrée) et contenu non vide.
      expect(new Set(notions.map((n) => n.id)).size).toBe(notions.length);
      for (const n of notions) {
        expect(n.titre.length).toBeGreaterThan(2);
        expect(n.extrait.length).toBeGreaterThan(10);
        expect(n.motsCles.length).toBeGreaterThanOrEqual(2);
      }
    }

  });

  it('isole les matières : un titre ambiguous ne déclenche que son groupe de matière', async () => {
    // 'La force' (Physique-Chimie, Seconde C) ne doit pas déclencher un groupe
    // de Mathématiques ; 'Statistique' (Maths) ne doit pas déclencher la SVT.
    const pc = await chargerNotionsChapitre(
      'chap_pc',
      { titre: 'La force', matiere: 'Physique-Chimie', theorie: '' },
      null,
      'Physique-Chimie'
    );
    expect(pc[0].id).toBe('cur_pc_statique_fluides_0');

    const maths = await chargerNotionsChapitre(
      'chap_maths',
      { titre: 'Statistique', matiere: 'Mathématiques', theorie: '' },
      null,
      'Mathématiques'
    );
    expect(maths[0].id).toBe('cur_statistique_0');
  });

  it('retombe sur le fallback heuristique pour un chapitre fourre-tout', async () => {
    // 'Révisions Générales du BAC' (SVT) n'a volontairement aucun groupe :
    // l'extraction heuristique classique s'applique (aucune notion curée).
    const notions = await chargerNotionsChapitre(
      'chap_svt_rev',
      {
        titre: 'Révisions Générales du BAC',
        matiere: 'SVT',
        theorie: 'I. Mitose\nLa mitose comprend la prophase et la métaphase.',
      },
      null,
      'SVT'
    );
    expect(notions.every((n) => !n.id.startsWith('cur_'))).toBe(true);
  });
});