// MICRO-NOTIONS : extraction et gestion des notions d'un chapitre.
// Chaque chapitre est découpé en micro-notions (>13) pour un apprentissage efficace.
// Chaque micro-notion a ses exercices infinis qui ciblent spécifiquement cette notion.

export interface MicroNotion {
  id: string;
  titre: string;
  extrait: string;
  motsCles: string[];
  ordre: number;
  maitrise: number;
}

function normaliserCle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extraireMicroNotions(texte: string): MicroNotion[] {
  if (!texte) return [];
  const lignes = texte.split(/\r?\n/);
  const notions: MicroNotion[] = [];
  const dejaVus = new Set<string>();

  const motifsTitre = [
    /^(?:[IVXLCDM]{1,4})[.)-]\s*(.{3,100})$/i,
    /^\d{1,2}[.)-]\s*(.{3,100})$/,
    /^[A-H][.)-]\s*(.{3,100})$/,
    /^(d[eé]finition|th[eé]or[eè]me|propri[eé]t[eé]|formule|r[eè]gle|m[eé]thode|principe|loi|notion|remarque|exemple|application|corrig[eé]|exercice)\s*[:：]?\s*(.{0,100})$/i,
    /^[-•▪▸►]\s*(.{3,100})$/,
    /^(.{3,60})\s*[:：]$/,
  ];

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i].trim();
    if (ligne.length < 3 || ligne.length > 150) continue;

    let titreTrouve: string | null = null;
    for (const motif of motifsTitre) {
      const m = ligne.match(motif);
      if (m) {
        if (motif.source.startsWith('(d') || motif.source.startsWith('^(.{3,60})')) {
          titreTrouve = `${m[1].trim()}${m[2] ? ` - ${m[2].trim()}` : ''}`;
        } else {
          titreTrouve = m[1].trim();
        }
        break;
      }
    }

    if (!titreTrouve) continue;
    titreTrouve = titreTrouve.replace(/[:：]\s*$/, '').trim();
    if (titreTrouve.length < 3) continue;
    
    const cle = normaliserCle(titreTrouve);
    if (dejaVus.has(cle)) continue;
    if (cle.split(' ').length > 15) continue;

    dejaVus.add(cle);
    
    const suite = lignes.slice(i + 1, i + 5).join(' ').trim().slice(0, 200);
    const motsCles = cle.split(' ').filter(m => m.length >= 3 && !['avec', 'dans', 'pour', 'les', 'des', 'une', 'est', 'que', 'qui', 'sur', 'par'].includes(m));

    notions.push({
      id: `notion_${notions.length}`,
      titre: titreTrouve,
      extrait: suite,
      motsCles,
      ordre: notions.length,
      maitrise: 0,
    });
  }

  return notions;
}

export function motsClesPourNotion(notion: MicroNotion): string[] {
  const base = [...notion.motsCles];
  const titre = normaliserCle(notion.titre);
  
  if (titre.includes('equat')) base.push('equation', 'inconnue', 'resolution');
  if (titre.includes('derive') || titre.includes('derivation')) base.push('derivee', 'pente', 'taux');
  if (titre.includes('suite')) base.push('terme', 'raison', 'convergence');
  if (titre.includes('probab')) base.push('probabilite', 'evenement', 'favorable');
  if (titre.includes('geometr') || titre.includes('pythagore')) base.push('triangle', 'aire', 'perimetre');
  if (titre.includes('trigonometr')) base.push('sinus', 'cosinus', 'tangente', 'angle');
  if (titre.includes('logarithme') || titre.includes('expo')) base.push('log', 'ln', 'exponentielle');
  if (titre.includes('complexe') || titre.includes('imaginaire')) base.push('reel', 'imaginaire', 'module');
  if (titre.includes('matrice') || titre.includes('determinant')) base.push('matrice', 'determinant', 'systeme');
  if (titre.includes('integr')) base.push('integrale', 'primitive', 'aire');
  if (titre.includes('limite') || titre.includes('continu')) base.push('limite', 'continuite', 'asymptote');
  if (titre.includes('vecteur') || titre.includes('vectoriel')) base.push('vecteur', 'norme', 'projection');
  
  return [...new Set(base)];
}
// 🎓 NOTIONS CURÉES — couverture COMPLÈTE des chapitres du programme.
// L'extraction heuristique du texte de cours échoue sur bien des chapitres
// (format non structuré → morceaux génériques type "Définition", "Exemple").
// Quand le TITRE du chapitre contient un des mots-clés d'un groupe, on
// renvoie directement les vraies notions du programme — priorité absolue.
// ⚠️ L'ORDRE des groupes compte : les groupes les plus SPÉCIFIQUES d'abord
// (la première correspondance gagne).
// Format compact : groupe = [motsClésDuTitre, notions] et une notion =
// [titre, extrait, "mots cles separes par des espaces"].
type NotionCur = [string, string, string];
type GroupeCur = { id: string; matieres: string[]; motsChapitre: string[]; notions: NotionCur[] };

// NOTIONS CURÉES par chapitre (programmes de Mathématiques, Physique-Chimie et SVT).
// Les ids sont stables (`cur_<groupe>_<index>`) afin que la maîtrise enregistrée
// localement survive aux rechargements de l'application.
// `matieres` restreint un groupe à une matière ('mathematiques', 'physique chimie',
// 'svt') : un groupe sans `matieres` s'applique à toutes les matières.
// IMPORTANT - L'ORDRE EST SIGNIFICATIF : le premier groupe dont un mot-clé est
// contenu dans le titre normalisé du chapitre l'emporte, du plus spécifique au plus générique.
const NOTIONS_CURATEES: GroupeCur[] = [

  // --- Atome, classification périodique et liaison chimique ---
  {
    id: 'pc_atome_classification',
    matieres: ['physique chimie'],
    motsChapitre: [
      'structure de l atome',
      'classification periodique',
      'liaison covalente',
      'ions monoatomiques',
      'chlorure de sodium',
      'loi de lavoisier',
    ],
    notions: [
      ['L\'atome et ses constituants', 'Un atome est constitué d\'un noyau (protons et neutrons) et d\'électrons. Un atome est électriquement neutre.', 'atome noyau proton neutron electron'],
      ['Symbole et écriture du noyau', 'Écriture A/Z X : Z est le numéro atomique (nombre de protons) et A le nombre de masse (protons + neutrons).', 'symbole noyau numero atomique masse'],
      ['Élément chimique et isotopes', 'Les isotopes d\'un élément ont le même Z mais des A différents : même chimie, masses différentes.', 'element isotope numero atomique masse'],
      ['Configuration électronique', 'Répartition des électrons en couches (K, L, M) : c\'est elle qui explique les propriétés chimiques de l\'élément.', 'configuration electronique couche regle'],
      ['La classification périodique', 'Les éléments sont rangés par Z croissant, en lignes (périodes) et colonnes (familles) aux propriétés voisines.', 'classification periodique periode groupe'],
      ['Familles chimiques', 'Les alcalins, alcalino-terreux, halogènes et gaz nobles partagent une configuration électronique externe.', 'famille colonne alcalin halogene gaz noble'],
      ['Propriétés périodiques', 'Le rayon atomique et l\'électronégativité varient régulièrement dans le tableau périodique.', 'rayon atomique electronegativite periode'],
      ['La liaison covalente', 'Une liaison covalente résulte de la mise en commun de deux électrons entre deux atomes : c\'est une liaison forte.', 'liaison covalente doublet partage'],
      ['Représentation de Lewis', 'Schéma de Lewis : les doublets liants et les doublets non liants représentent les électrons de valence.', 'lewis doublet valence schema'],
      ['Ions monoatomiques', 'Un ion monoatomique provient d\'un atome ayant gagné ou perdu des électrons : il est chargé.', 'ion monoatomique charge electron'],
      ['Ions polyatomiques', 'Un ion polyatomique est un groupement d\'atomes liés qui porte une charge globale.', 'ion polyatomique charge groupement'],
      ['Le chlorure de sodium', 'Solide ionique formé d\'un empilement régulier d\'ions Na+ et Cl− : c\'est un cristal ionique.', 'chlorure sodium cristal ionique reseau'],
      ['Loi de conservation de la masse', 'Loi de Lavoisier : lors d\'une réaction chimique, la masse totale des produits est égale à celle des réactifs.', 'lavoisier conservation masse reaction'],
      ['Équation bilan et stœchiométrie', 'Écrire l\'équation bilan en ajustant les coefficients pour équilibrer les nombres d\'atomes de chaque élément.', 'equation bilan coefficient stoechiometrie ajuster'],
    ],
  },

  // --- Chimie organique et combustibles fossiles ---
  {
    id: 'pc_chimie_organique',
    matieres: ['physique chimie'],
    motsChapitre: [
      'alcanes',
      'alcenes',
      'alcynes',
      'aromatiques',
      'combustibles fossiles',
    ],
    notions: [
      ['Le carbone tétravalent', 'Le carbone établit quatre liaisons : la structure des molécules organiques découle de cette propriété.', 'carbone tetravalent liaison organique'],
      ['Les alcanes', 'Alcanes saturés : formule générale CnH(2n+2), liaisons simples, peu réactifs.', 'alcanes satures formule generale'],
      ['Nomenclature des alcanes', 'Nommer une chaîne carbonée : préfixe du nombre de carbones, terminaison -ane (méthane, éthane, propane, butane…).', 'nomenclature alcane chaine nommer'],
      ['Isomérie de chaîne', 'Deux molécules de même formule brute mais de structure différente sont des isomères.', 'isomerie chaine formule brute structure'],
      ['Les alcènes', 'Alcènes insaturés : formule générale CnH2n, présence d\'une double liaison C=C, très réactifs.', 'alcenes insatures double liaison'],
      ['Isomérie Z/E des alcènes', 'La double liaison bloque la rotation : les isomères Z (zusammen) et E (entgegen) sont des stéréoisomères.', 'isomerie z e stereoisomere alcene'],
      ['Les alcynes', 'Alcynes : formule générale CnH(2n−2), présence d\'une triple liaison C≡C (éthyne, propyne…).', 'alcynes triple liaison insatures'],
      ['Réactions d\'addition', 'Les alcènes et alcynes additionnent H2, H2O ou les halogènes sur leur liaison multiple.', 'addition hydrogenation halogenation alcene'],
      ['Les composés aromatiques', 'Le benzène et ses dérivés comportent un cycle à six carbones à électrons délocalisés, très stable.', 'aromatique benzene cycle delocalisation'],
      ['Groupes caractéristiques', 'Les groupes caractéristiques (hydroxyle, carboxyle, carbonyle) définissent les familles fonctionnelles.', 'groupe caracteristique fonction hydroxyle carboxyle'],
      ['Les combustibles fossiles', 'Pétrole, charbon et gaz naturel sont des ressources fossiles issues de la transformation de matières organiques.', 'combustibles fossiles petrole charbon gaz'],
      ['Raffinage et produits pétroliers', 'Le raffinage sépare le pétrole brut par distillation fractionnée en coupes utilisées comme carburants.', 'raffinage distillation fractionnee carburant'],
      ['Combustion et pollution', 'Une combustion complète produit CO2 et H2O ; une combustion incomplète libère du CO toxique et des suies.', 'combustion pollution dioxyde carbone'],
      ['Effet de serre et énergies fossiles', 'L\'usage massif des combustibles fossiles augmente le CO2 atmosphérique et renforce l\'effet de serre.', 'effet de serre co2 environnement fossile'],
    ],
  },

  // --- Solutions aqueuses et réactions acido-basiques ---
  {
    id: 'pc_solutions_acido_basique',
    matieres: ['physique chimie'],
    motsChapitre: [
      'role du solvant',
      'solutions aqueuses acides',
      'acide base et ph',
      'acide chlorhydrique et d hydroxyde de sodium',
      'couples acide base',
    ],
    notions: [
      ['Dissolution d\'un composé ionique', 'Un cristal ionique se dissocie dans l\'eau en ions libres : la solution devient conductrice.', 'dissolution ionique dissociation conductrice'],
      ['Rôle du solvant', 'L\'eau, molécule polaire, hydrate les ions et assure la séparation des charges : c\'est le solvant des solutions aqueuses.', 'solvant polaire eau hydratation'],
      ['Concentration molaire', 'La concentration molaire d\'une espèce en solution est le rapport de la quantité de matière au volume de solution (mol/L).', 'concentration molaire quantite volume'],
      ['Concentration massique', 'La concentration massique exprime une masse de soluté par litre de solution (g/L).', 'concentration massique g par litre'],
      ['Acides et bases de Brønsted', 'Un acide libère un proton H+ ; une base capte un proton : le modèle de Brønsted décrit les échanges de protons.', 'bronsted acide base proton'],
      ['Couples acide/base', 'Un couple acide/base est formé d\'un acide et de sa base conjuguée, reliés par l\'échange d\'un proton.', 'couple acide base conjuguee'],
      ['Autoprotolyse de l\'eau', 'L\'eau est amphotère : 2 H2O ⇌ H3O+ + OH−, avec le produit ionique Ke = [H3O+][OH−] = 10^-14 à 25 °C.', 'eau amphotere produit ionique ke'],
      ['pH d\'une solution', 'pH = −log[H3O+] : il mesure l\'acidité d\'une solution aqueuse diluée.', 'ph acidite concentration h3o'],
      ['Acides forts et faibles', 'Un acide fort est totalement dissocié ; un acide faible l\'est partiellement : la constante d\'acidité Ka compare ce comportement.', 'acide fort faible ka dissociation'],
      ['Solution d\'acide chlorhydrique', 'L\'acide chlorhydrique est un acide fort : dans l\'eau il libère totalement les ions H3O+ et Cl−.', 'chlorhydrique acide fort ions'],
      ['Solution d\'hydroxyde de sodium', 'La soude est une base forte : elle libère totalement les ions Na+ et OH− et donne un pH élevé.', 'hydroxyde sodium soude base forte'],
      ['Réaction acido-basique', 'Une réaction acido-basique est un transfert de proton de l\'acide d\'un couple vers la base d\'un autre couple.', 'reaction transfert proton acido basique'],
      ['Dosage acido-basique', 'Le dosage permet de déterminer une concentration inconnue : l\'équivalence est atteinte quand les réactifs sont en proportions stœchiométriques.', 'dosage equivalence concentration burette'],
      ['Indicateurs colorés et pH-métrie', 'Un indicateur coloré change de couleur à un pH voisin de son pKa ; le pH-mètre suit l\'évolution du pH au cours du dosage.', 'indicateur colore ph metre courbe'],
    ],
  },

  // --- Oxydoréduction, piles et potentiels ---
  {
    id: 'pc_oxydoreduction_piles',
    matieres: ['physique chimie'],
    motsChapitre: [
      'oxydant reducteur',
      'piles et potentiels',
      'generalisation de l oxydoreduction',
    ],
    notions: [
      ['Oxydant et réducteur', 'Un oxydant capte des électrons, un réducteur en cède : un couple redox associe les deux.', 'oxydant reducteur couple redox'],
      ['Demi-équations électroniques', 'Une demi-équation électronique traduit la transformation d\'une espèce du couple : Ox + n e− ⇌ Red, avec conservation de la charge.', 'demi equation electronique conservation'],
      ['Réaction d\'oxydoréduction', 'En combinant deux demi-équations on obtient le bilan d\'une réaction d\'oxydoréduction ; les électrons doivent s\'éliminer.', 'reaction oxydoreduction bilan electrons'],
      ['Nombre d\'oxydation', 'Le nombre d\'oxydation repère l\'état d\'oxydation d\'un élément : il augmente lors d\'une oxydation.', 'nombre oxydation element oxydation'],
      ['Généralisation de l\'oxydoréduction', 'Les réactions d\'oxydoréduction concernent aussi les oxydes et les espèces non ioniques (ex. : combustion du fer).', 'generalisation oxydoreduction oxyde'],
      ['Fonctionnement d\'une pile', 'Une pile transforme l\'énergie chimique en énergie électrique grâce à deux demi-piles reliées par un pont salin.', 'pile electrochimique energie conversion'],
      ['Anode et cathode', 'À l\'anode se produit l\'oxydation, à la cathode la réduction : la borne négative est celle où l\'oxydation a lieu.', 'anode cathode oxydation reduction borne'],
      ['Fem et polarité', 'La force électromotrice d\'une pile est la différence de potentiel entre ses bornes à courant nul.', 'fem force electromotrice tension'],
      ['Potentiel d\'électrode', 'Le potentiel d\'un couple se mesure par rapport à l\'électrode standard à hydrogène, prise comme référence.', 'potentiel electrode reference hydrogene'],
      ['Loi de Nernst', 'Le potentiel d\'électrode dépend des concentrations : la relation de Nernst relie E, E° et les concentrations.', 'nernst potentiel concentration relation'],
      ['Prévision des réactions', 'La comparaison des potentiels d\'électrode permet de prévoir le sens spontané d\'une réaction d\'oxydoréduction.', 'prevision potentiel sens spontane'],
      ['Accumulateurs et corrosion', 'Les accumulateurs sont des systèmes réversibles ; la corrosion résulte d\'une oxydation non désirée du métal.', 'accumulateur corrosion metal reversible'],
    ],
  },

  // --- Centre d'inertie ---
  {
    id: 'pc_centre_inertie',
    matieres: ['physique chimie'],
    motsChapitre: [
      'centre d inertie',
      'mouvement du centre d inertie',
    ],
    notions: [
      ['Centre d\'inertie d\'un solide', 'Point du solide où la masse peut être considérée comme concentrée : le centre de gravité d\'un solide homogène coïncide avec son centre géométrique.', 'centre inertie gravite solide'],
      ['Mouvement du centre d\'inertie', 'Le centre d\'inertie d\'un solide isolé ou pseudo-isolé est animé d\'un mouvement rectiligne uniforme.', 'mouvement inertie isole uniforme'],
      ['Principe de l\'inertie', 'Tout corps persévère dans son état de repos ou de mouvement rectiligne uniforme si les forces qui s\'exercent sur lui se compensent.', 'principe inertie repos uniforme'],
      ['Quantité de mouvement', 'Le vecteur quantité de mouvement est le produit de la masse par la vitesse : p = m · v.', 'quantite mouvement masse vitesse'],
      ['Conservation de la quantité de mouvement', 'La quantité de mouvement totale d\'un système isolé se conserve : elle permet d\'étudier les chocs et la propulsion.', 'conservation quantite mouvement isole'],
      ['Mouvement dans le champ de pesanteur', 'La chute libre verticale est un mouvement rectiligne uniformément accéléré ; le mouvement d\'un projectile est parabolique.', 'chute libre projectile parabole'],
      ['Mouvement circulaire uniforme', 'Vitesse de valeur constante et accélération centripète : a = v² / R dirigée vers le centre.', 'circulaire uniforme centripete'],
      ['Travail d\'une force constante', 'W = F · AB · cos(α) : le travail est moteur si l\'angle est aigu, résistant s\'il est obtus.', 'travail force deplacement angle'],
      ['Puissance d\'une force', 'Puissance moyenne : P = W / t ; puissance instantanée : P = F · v.', 'puissance travail temps vitesse'],
      ['Énergie cinétique', 'Ec = ½ · m · v² : énergie liée à la vitesse du solide.', 'energie cinetique masse vitesse'],
      ['Énergie potentielle de pesanteur', 'Ep = m · g · z : énergie liée à l\'altitude dans le champ de pesanteur.', 'energie potentielle altitude pesanteur'],
      ['Énergie mécanique', 'Em = Ec + Ep : elle se conserve en l’absence de frottements, elle diminue quand il y a des frottements.', 'energie mecanique conservation frottement'],
    ],
  },

  // --- Statique et fluides ---
  {
    id: 'pc_statique_fluides',
    matieres: ['physique chimie'],
    motsChapitre: [
      'la force',
      'equilibre d un solide',
      'statique des fluides',
    ],
    notions: [
      ['Équilibre d’un solide soumis à 3 forces', 'Trois forces non parallèles en équilibre sont concourantes et leur somme vectorielle est nulle.', 'equilibre trois forces concourantes'],
      ['Équilibre d’un solide en rotation', 'La somme des moments des forces par rapport à l\'axe est nulle ; le moment d\'une force vaut F · d.', 'rotation moment axe equilibre'],
      ['Pression dans un fluide', 'p = F / S : la pression se mesure en pascals ; la pression atmosphérique vaut environ 10⁵ Pa.', 'pression force surface pascal'],
      ['Principe fondamental de l’hydrostatique', 'La différence de pression entre deux points d’un liquide au repos vaut ρ · g · h.', 'hydrostatique pression profondeur densite'],
      ['Poussée d’Archimède', 'Tout corps plongé subit une poussée verticale vers le haut égale au poids du fluide déplacé.', 'archimede poussee flottabilite poids'],
      ['Conditions de flottaison', 'Un corps flotte si sa densité moyenne est inférieure à celle du fluide.', 'flottaison densite equilibre corps'],
      ['La force', 'Une force est une action mécanique modélisée par un vecteur : point d’application, direction, sens, intensité en newtons.', 'force vecteur newton action'],
      ['Forces usuelles', 'Poids, réaction du support, tension d\'un fil, force de frottement : caractéristiques et représentations.', 'poids reaction tension frottement'],
    ],
  },

  // --- Mouvement dans les champs ---
  {
    id: 'pc_mouvement_champs',
    matieres: ['physique chimie'],
    motsChapitre: [
      'mouvement dans le champ de pesanteur',
      'mouvement de particules chargees',
    ],
    notions: [
      ['Mouvement dans le champ de pesanteur terrestre', 'Dans le champ de pesanteur uniforme g, un projectile est soumis à son seul poids : sa trajectoire est parabolique et sa portée dépend de la vitesse initiale et de l\'angle de tir.', 'pesanteur projectile parabole portee'],
      ['Mouvement d\'une particule chargée dans un champ électrique uniforme', 'Une particule de charge q dans un champ E uniforme subit la force q·E : elle est déviée vers l\'armature de signe opposé, principe du tube cathodique.', 'particule chargee deviation champ electrique'],
      ['Chute libre verticale', 'Un corps en chute libre n\'est soumis qu\'à son poids : son mouvement est rectiligne uniformément accéléré d\'accélération g ≈ 9,8 m/s².', 'chute libre poids acceleration'],
      ['Équations horaires du mouvement', 'Pour un mouvement uniformément accéléré : v(t) = v₀ + a·t et x(t) = x₀ + v₀·t + a·t²/2.', 'equations horaires vitesse position'],
    ],
  },

  // --- Cinématique ---
  {
    id: 'pc_cinematique',
    matieres: ['physique chimie'],
    motsChapitre: [
      'cinematique',
      'referentiel',
    ],
    notions: [
      ['Référentiel et trajectoire', 'Le mouvement est relatif au référentiel choisi (terrestre, géocentrique, héliocentrique) : la trajectoire est l\'ensemble des positions successives du point mobile.', 'referentiel trajectoire relativite'],
      ['Vecteurs position, vitesse et accélération', 'Le vecteur vitesse est la dérivée du vecteur position et le vecteur accélération la dérivée du vecteur vitesse.', 'position vitesse acceleration derivee'],
      ['Mouvement rectiligne uniforme', 'Vitesse constante en direction et en valeur : les positions sont proportionnelles au temps, x(t) = x₀ + v·t.', 'rectiligne uniforme vitesse constante'],
      ['Mouvement rectiligne uniformément varié', 'Accélération constante : v(t) = v₀ + a·t et relation indépendante du temps v² − v₀² = 2·a·(x − x₀).', 'rectiligne accelere equations horaires'],
      ['Mouvement circulaire uniforme', 'Vitesse de valeur constante, accélération centripète a = v²/R dirigée vers le centre ; la période est T = 2πR/v.', 'circulaire uniforme centripete periode'],
      ['Vitesse angulaire', 'Pour un point à distance r de l\'axe : v = ω·r avec ω = 2π/T = 2π·f, et l\'angle balayé est θ = ω·t.', 'vitesse angulaire periode frequence'],
      ['Relativité du mouvement', 'Un passager immobile dans un train en marche est en mouvement par rapport au quai : la description du mouvement dépend du référentiel.', 'relativite referentiel observateur'],
      ['Composition des vitesses', 'La vitesse d\'un point dans un référentiel est la somme de sa vitesse relative et de la vitesse d\'entraînement du référentiel mobile.', 'composition vitesses entrainement'],
    ],
  },

  // --- Mouvement et oscillateurs ---
  {
    id: 'pc_mouvement_general',
    matieres: ['physique chimie'],
    motsChapitre: [
      'mouvement',
      'oscillateurs mecaniques',
    ],
    notions: [
      ['Description générale du mouvement', 'Un mouvement est caractérisé par sa trajectoire (rectiligne, circulaire, curviligne) et l\'évolution de sa vitesse (uniforme, accéléré, ralenti).', 'mouvement trajectoire vitesse'],
      ['Vitesse moyenne et vitesse instantanée', 'La vitesse moyenne est la distance parcourue divisée par la durée ; la vitesse instantanée est la limite de la vitesse moyenne sur un très petit intervalle.', 'vitesse moyenne instantanee'],
      ['Mouvement du centre d’inertie', 'Le centre d’inertie d’un solide isolé ou pseudo-isolé est animé d\'un mouvement rectiligne uniforme : c\'est le principe de l\'inertie.', 'inertie centre uniforme isole'],
      ['Quantité de mouvement', 'Le vecteur quantité de mouvement p = m·v caractérise l\'état de mouvement ; pour un système isolé il se conserve.', 'quantite mouvement conservation isole'],
      ['Oscillateur mécanique', 'Un oscillateur (pendule, masse-ressort) effectue des oscillations autour de sa position d\'équilibre, avec une période propre T₀.', 'oscillateur periode equilibre'],
      ['Pendule simple', 'Pour de petites oscillations, la période T = 2π√(L/g) ne dépend ni de la masse ni de l\'amplitude : c\'est l\'isochronisme.', 'pendule periode isochronisme longueur'],
      ['Masse accrochée à un ressort', 'La période propre T₀ = 2π√(m/k) augmente avec la masse et diminue quand le ressort est plus raide.', 'ressort masse raideur periode'],
      ['Énergie mécanique', 'La somme énergie cinétique + énergie potentielle se conserve en l\'absence de frottements et diminue sinon : c\'est le bilan d\'énergie.', 'energie mecanique conservation frottement'],
    ],
  },

  // --- Travail et puissance ---
  {
    id: 'pc_travail_puissance',
    matieres: ['physique chimie'],
    motsChapitre: ['travail et puissance'],
    notions: [
      ['Travail d\'une force constante', 'Le travail d\'une force constante F sur un déplacement AB vaut W = F · AB = F × AB × cos α.', 'travail force constante deplacement'],
      ['Travail moteur, résistant, nul', 'Moteur si l\'angle est aigu (W > 0), résistant si obtus (W < 0), nul si la force est perpendiculaire au déplacement.', 'travail moteur resistant nul angle'],
      ['Travail du poids', 'Le travail du poids ne dépend que de la différence de hauteur : W(P) = m × g × (z_départ − z_arrivée).', 'travail poids hauteur pesanteur'],
      ['Puissance d\'une force', 'La puissance moyenne est le travail par unité de temps : P = W / Δt, en watts. La puissance instantanée vaut P = F × v.', 'puissance travail temps force vitesse'],
      ['Rendement d\'une machine', 'Le rendement est le rapport de la puissance utile sur la puissance absorbée : η = P_utile / P_absorbée, toujours inférieur à 1.', 'rendement machine utile absorbee'],
    ],
  },

  // --- Énergie cinétique ---
  {
    id: 'pc_energie_cinetique',
    matieres: ['physique chimie'],
    motsChapitre: ['energie cinetique'],
    notions: [
      ['Définition de l\'énergie cinétique', 'L\'énergie cinétique d\'un solide de masse m animé d\'une vitesse v vaut Ec = ½ × m × v², en joules.', 'energie cinetique masse vitesse'],
      ['Théorème de l\'énergie cinétique', 'Dans un référentiel galiléen, la variation d\'énergie cinétique est égale à la somme des travaux des forces : ΔEc = ΣW.', 'theoreme energie cinetique travaux'],
      ['Application : chute libre', 'Pour une chute sans frottement, le théorème de l\'énergie cinétique donne v² = v₀² + 2g × h.', 'chute energie cinetique vitesse'],
      ['Application : freinage d\'un véhicule', 'La distance de freinage est proportionnelle au carré de la vitesse : on la déduit de ΔEc = W(frottements).', 'freinage distance vitesse frottements'],
    ],
  },

  // --- Énergie potentielle ---
  {
    id: 'pc_energie_potentielle',
    matieres: ['physique chimie'],
    motsChapitre: [
      'energie potentielle',
      'potentielle',
    ],
    notions: [
      ['Énergie potentielle de pesanteur', 'Epp = m × g × z, définie à une constante près : seul compte l\'écart entre deux niveaux.', 'energie potentielle pesanteur hauteur'],
      ['Énergie potentielle élastique', 'Epe = ½ × k × x² pour un ressort de raideur k allongé ou comprimé de x.', 'energie potentielle elastique ressort'],
      ['Forces conservatives et non conservatives', 'Le travail d\'une force conservative ne dépend pas du chemin suivi ; celui des frottements en dépend.', 'force conservative dissipative chemin'],
      ['Variation d\'énergie potentielle', 'La variation d\'énergie potentielle est l\'opposé du travail des forces conservatives : ΔEp = −W_conservatif.', 'variation energie potentielle travail'],
    ],
  },

  // --- Énergie mécanique ---
  {
    id: 'pc_energie_mecanique',
    matieres: ['physique chimie'],
    motsChapitre: ['energie mecanique'],
    notions: [
      ['Définition de l\'énergie mécanique', 'L\'énergie mécanique est la somme des énergies cinétique et potentielle : Em = Ec + Ep.', 'energie mecanique cinetique potentielle'],
      ['Conservation de l\'énergie mécanique', 'En l\'absence de frottements, l\'énergie mécanique se conserve : Em = constante, Ec et Ep s\'échangent.', 'conservation energie mecanique echange'],
      ['Non-conservation en présence de frottements', 'La variation d\'énergie mécanique est égale au travail des forces non conservatives : ΔEm = W(frottements).', 'frottements energie mecanique travail'],
      ['Application : pendule simple', 'Les oscillations d\'un pendule illustrent l\'échange entre énergie cinétique maximale en bas et potentielle maximale en haut.', 'pendule oscillation echange energie'],
    ],
  },

  // --- Énergie électrique ---
  {
    id: 'pc_energie_electrique',
    matieres: ['physique chimie'],
    motsChapitre: ['energie electrique'],
    notions: [
      ['Énergie électrique reçue par un récepteur', 'W = U × I × Δt pour un récepteur traversé par un courant I sous une tension U pendant Δt.', 'energie electrique tension intensite temps'],
      ['Effet Joule', 'Un conducteur ohmique de résistance R dissipe par effet Joule : W = R × I² × Δt.', 'effet joule resistance chaleur'],
      ['Puissance électrique', 'P = U × I en régime continu ; pour un conducteur ohmique P = R × I² = U² / R.', 'puissance electrique tension intensite'],
      ['Compteur et facture', 'L\'énergie se facture en kilowattheures : 1 kWh = 3,6 × 10⁶ J.', 'kilowattheure facture energie compteur'],
    ],
  },

  // --- Dipôles ---
  {
    id: 'pc_dipoles',
    matieres: ['physique chimie'],
    motsChapitre: [
      'dipoles non lineaires',
      'dipoles',
    ],
    notions: [
      ['Caractéristique courant-tension', 'La caractéristique U = f(I) d\'un dipôle décrit son comportement : droite pour un dipôle linéaire, courbe sinon.', 'caracteristique courant tension dipole'],
      ['Dipôles linéaires passifs', 'Conducteur ohmique : U = R × I. Bobine idéale et condensateur en régime continu : comportements limites.', 'dipole lineaire ohm resistance'],
      ['Dipôles non linéaires', 'Diode, lampe à filament, électrolyseur : la résistance n\'est plus constante, la caractéristique est courbe.', 'dipole non lineaire diode lampe'],
      ['Point de fonctionnement', 'L\'intersection de la caractéristique du dipôle avec la droite de charge du générateur donne le point de fonctionnement.', 'point fonctionnement droite charge'],
    ],
  },

  // --- Condensateurs ---
  {
    id: 'pc_condensateurs',
    matieres: ['physique chimie'],
    motsChapitre: [
      'condensateurs',
      'condensateur',
    ],
    notions: [
      ['Capacité et charge', 'La charge q d\'un condensateur est proportionnelle à la tension : q = C × u, avec C la capacité en farads.', 'capacite charge tension farad'],
      ['Énergie stockée dans un condensateur', 'E = ½ × C × u² : le condensateur stocke de l\'énergie dans son champ électrique.', 'energie condensateur champ electrique'],
      ['Charge et décharge à travers une résistance', 'La tension suit une exponentielle de constante de temps τ = R × C, en charge comme en décharge.', 'charge decharge exponentielle constante temps'],
      ['Condensateur en régime continu', 'En régime continu établi, le condensateur chargé se comporte comme un interrupteur ouvert.', 'regime continu interrupteur ouvert'],
    ],
  },

  // --- Tensions continue et variables ---
  {
    id: 'pc_tensions_variables',
    matieres: ['physique chimie'],
    motsChapitre: [
      'tensions variables',
      'tension continue',
      'tension',
    ],
    notions: [
      ['Tension continue', 'Une tension continue garde une valeur constante au cours du temps : droite horizontale à l\'oscilloscope.', 'tension continue constante temps'],
      ['Tension alternative périodique', 'Une tension périodique se répète : période T, fréquence f = 1/T, valeur maximale et valeur efficace.', 'tension alternative periode frequence efficace'],
      ['Tension sinusoïdale', 'u(t) = Umax × sin(2πft + φ) : la valeur efficace vaut Umax / √2 ; le déphasage φ situe la courbe dans le temps.', 'sinusoidale efficace dephasage amplitude'],
      ['Visualisation à oscilloscope', 'L\'oscilloscope affiche u(t) : sensibilité verticale, base de temps et synchronisation permettent la mesure.', 'oscilloscope sensibilite base temps mesure'],
    ],
  },

  // --- Loi d'Ohm pour un récepteur ---
  {
    id: 'pc_loi_ohm_recepteur',
    matieres: ['physique chimie'],
    motsChapitre: [
      'loi d ohm',
      'ohm',
    ],
    notions: [
      ['Électrolyseur et loi de fonctionnement', 'U = E\' + r × I : E\' est la force contre-électromotrice et r la résistance interne.', 'electrolyseur contre electromotrice resistance'],
      ['Rendement d\'un électrolyseur', 'Le rendement est la part d\'énergie convertie en énergie chimique : η = E\' / (E\' + r × I).', 'rendement electrolyseur chimique'],
      ['Récepteur non ohmique', 'Moteur, électrolyseur : la caractéristique n\'est pas une droite passant par l\'origine.', 'recepteur non ohmique moteur'],
      ['Bilan de puissance dans un circuit', 'La puissance fournie par le générateur égale la somme des puissances reçues et dissipées.', 'bilan puissance generateur recepteur'],
    ],
  },

  // --- Électronique : transistor et amplificateur ---
  {
    id: 'pc_electronique',
    matieres: ['physique chimie'],
    motsChapitre: [
      'transistor',
      'amplificateur operationnel',
      'ampli op',
    ],
    notions: [
      ['Transistor bipolaire : principe', 'Un faible courant de base commande un courant collecteur bien plus grand : effet amplificateur de courant.', 'transistor base collecteur amplificateur'],
      ['Montage émetteur commun', 'Le montage émetteur commun amplifie en tension : le signal de sortie est en opposition de phase avec l\'entrée.', 'emetteur commun amplification tension'],
      ['Amplificateur opérationnel idéal', 'Gain infini en boucle ouverte, courants d\'entrée nuls : deux règles d\'or pour l\'analyse des montages.', 'ampli operationnel ideal gain'],
      ['Montages fondamentaux à ampli op', 'Suiveur, amplificateur inverseur et non inverseur : gains déterminés par les résistances.', 'suiveur inverseur non inverseur gain'],
    ],
  },

  // --- Circuits oscillants et régime sinusoïdal forcé ---
  {
    id: 'pc_circuits_rlc',
    matieres: ['physique chimie'],
    motsChapitre: [
      'circuit oscillant',
      'circuit en regime sinusoidal force',
      'sinusoidal force',
    ],
    notions: [
      ['Circuit oscillant LC idéal', 'L\'échange entre énergie magnétique de la bobine et énergie électrique du condensateur produit des oscillations de période T₀ = 2π√(LC).', 'circuit lc oscillations periode'],
      ['Amortissement dans un circuit RLC', 'La résistance dissipe l\'énergie : oscillations amorties, régime critique, régime apériodique.', 'amortissement rlc resistance regime'],
      ['Régime sinusoïdal forcé', 'Un générateur sinusoïdal impose sa fréquence : le circuit répond avec une amplitude maximale à la résonance.', 'regime force resonance amplitude frequence'],
      ['Résonance en courant et en tension', 'À la résonance, l\'impédance est minimale : surtension possible aux bornes de la bobine et du condensateur.', 'resonance impedance surtension'],
    ],
  },

  // --- Phénomènes vibratoires : généralités ---
  {
    id: 'pc_vibrations_generalites',
    matieres: ['physique chimie'],
    motsChapitre: [
      'generalites sur les phenomenes vibratoires',
      'phenomenes vibratoires',
    ],
    notions: [
      ['Oscillateur et vibration', 'Un oscillateur écarte de sa position d\'équilibre y revient : la grandeur vibrante oscille autour de cette position.', 'oscillateur vibration equilibre'],
      ['Période, fréquence, amplitude', 'La période T est la durée d\'une oscillation, f = 1/T la fréquence en hertz, l\'amplitude l\'écart maximal.', 'periode frequence amplitude hertz'],
      ['Vibration sinusoïdale', 'x(t) = Xmax × sin(2πt/T + φ) : la phase à l\'origine φ fixe l\'état initial de l\'oscillateur.', 'vibration sinusoidale phase equation'],
      ['Énergie d\'un oscillateur', 'L\'énergie mécanique d\'un oscillateur non amorti se conserve et s\'échange entre formes cinétique et potentielle.', 'energie oscillateur conservation echange'],
    ],
  },

  // --- Propagation d'un phénomène vibratoire ---
  {
    id: 'pc_propagation_ondes',
    matieres: ['physique chimie'],
    motsChapitre: [
      'propagation d un phenomene vibratoire',
      'propagation',
    ],
    notions: [
      ['Onde mécanique progressive', 'La perturbation se propage de proche en proche sans transport de matière, à la célérité v de l\'onde.', 'onde progressive celerite matiere'],
      ['Longueur donde', 'λ = v × T = v / f : distance parcourue par l\'onde pendant une période.', 'longueur onde periode frequence'],
      ['Onde transversale et longitudinale', 'Transversale si la vibration est perpendiculaire à la propagation (corde), longitudinale sinon (ressort, son).', 'transversale longitudinale corde son'],
      ['Retard à la propagation', 'Un point à distance d reproduit la source avec un retard τ = d / v.', 'retard propagation distance celerite'],
    ],
  },

  // --- Superposition de deux phénomènes vibratoires ---
  {
    id: 'pc_superposition_ondes',
    matieres: ['physique chimie'],
    motsChapitre: [
      'superposition de deux phenomenes vibratoires',
      'superposition',
    ],
    notions: [
      ['Principe de superposition', 'En un point, l\'élongation résultante est la somme des élongations de chaque onde prise isolément.', 'superposition somme elongations'],
      ['Interférences constructives et destructives', 'Les ondes s\'ajoutent quand elles arrivent en phase, et s\'annulent quand elles arrivent en opposition de phase.', 'interferences phase opposition'],
      ['Conditions d\'interférences', 'Deux ondes interfèrent durablement si elles sont synchrones et de même nature : différence de marche et déphasage constants.', 'synchrones difference marche dephasage'],
      ['Ondes stationnaires', 'La superposition de deux ondes contraires crée des nœuds fixes et des ventres : cas de la corde vibrante.', 'stationnaire noeuds ventres corde'],
    ],
  },

  // --- Interférences d'ondes lumineuses ---
  {
    id: 'pc_interferences_lumineuses',
    matieres: ['physique chimie'],
    motsChapitre: [
      'interferences d ondes lumineuses',
      'interferences lumineuses',
    ],
    notions: [
      ['Dispositif des fentes d\'Young', 'Deux fentes fines éclairées par une même source produisent sur un écran des franges brillantes et sombres.', 'young fentes franges ecran'],
      ['Interfrange', 'L\'interfrange i = λ × D / a dépend de la longueur d\'onde, de la distance écran-fentes D et de l\'écart a entre fentes.', 'interfrange longueur onde distance'],
      ['Couleurs et lumière blanche', 'Chaque radiation a son système de franges : en lumière blanche, on observe des irisations et une frange centrale blanche.', 'couleurs blanche irisations radiation'],
      ['Mesure d\'une longueur d\'onde', 'La mesure de l\'interfrange donne accès à la longueur d\'onde de la lumière utilisée.', 'mesure longueur onde interfrange'],
    ],
  },

  // --- Réfraction de la lumière ---
  {
    id: 'pc_refraction',
    matieres: ['physique chimie'],
    motsChapitre: [
      'refraction de la lumiere',
      'refraction',
    ],
    notions: [
      ['Lois de Snell-Descartes', 'Le rayon réfracté reste dans le plan d\'incidence et n₁ × sin i₁ = n₂ × sin i₂.', 'snell descartes indice incidence'],
      ['Indice de réfraction', 'n = c / v caractérise le milieu : plus n est grand, plus la lumière y circule lentement.', 'indice refraction celerite milieu'],
      ['Réflexion totale', 'Quand la lumière va vers un milieu moins réfringent, au-delà de l\'angle limite il n\'y a plus de rayon réfracté.', 'reflexion totale angle limite'],
      ['Applications : fibre optique, mirage', 'La fibre optique guide la lumière par réflexions totales successives ; le mirage vient d\'un gradient d\'indice.', 'fibre optique mirage gradient'],
    ],
  },

  // --- Lentilles minces ---
  {
    id: 'pc_lentilles',
    matieres: ['physique chimie'],
    motsChapitre: [
      'lentilles minces',
      'lentilles',
    ],
    notions: [
      ['Lentilles convergentes et divergentes', 'Une lentille convergente fait converger un faisceau parallèle en son foyer image ; une divergente l\'écarte.', 'convergente divergente foyer faisceau'],
      ['Distance focale et vergence', 'La vergence C = 1 / f\' en dioptries mesure la puissance de la lentille.', 'vergence dioptrie distance focale'],
      ['Construction géométrique des images', 'Trois rayons particuliers (centre, parallèles à l\'axe, passant par les foyers) suffisent à construire l\'image.', 'construction rayons image objet'],
      ['Relation de conjugaison', '1/OA\' − 1/OA = 1/OF\' relie les positions de l\'objet et de l\'image ; le grandissement vaut OA\'/OA.', 'conjugaison grandissement objet image'],
    ],
  },

  // --- Dispersion et diffraction de la lumière ---
  {
    id: 'pc_dispersion_diffraction',
    matieres: ['physique chimie'],
    motsChapitre: [
      'dispersion',
      'diffraction',
    ],
    notions: [
      ['Dispersion par un prisme', 'L\'indice dépend de la couleur : le prisme dévie le bleu plus que le rouge et décompose la lumière blanche.', 'prisme indice couleur deviation'],
      ['Spectre de la lumière blanche', 'La lumière blanche contient toutes les radiations visibles, du violet au rouge.', 'spectre blanche radiations couleurs'],
      ['Diffraction par une fente', 'Une fente fine élargit le faisceau : la tache centrale a une largeur proportionnelle à λ / a.', 'diffraction fente tache centrale'],
      ['Diffraction et longueur donde', 'Plus la fente est étroite, plus la diffraction est marquée : elle prouve la nature ondulatoire de la lumière.', 'diffraction onde preuve nature'],
    ],
  },

  // --- Champ magnétique ---
  {
    id: 'pc_champ_magnetique',
    matieres: ['physique chimie'],
    motsChapitre: ['champ magnetique'],
    notions: [
      ['Sources de champ magnétique', 'Aimants, courants électriques et solénoïdes créent un champ magnétique visualisé par des lignes de champ.', 'aimant courant solenoide lignes'],
      ['Vecteur champ magnétique', 'B se mesure en teslas : il est tangent aux lignes de champ, orienté du pôle nord vers le pôle sud.', 'vecteur tesla lignes orientation'],
      ['Champ magnétique terrestre', 'La Terre se comporte comme un aimant : sa composante horizontale oriente l\'aiguille aimantée.', 'terrestre boussole horizontale aimant'],
      ['Spectres magnétiques', 'La limaille de fer révèle les spectres : champ uniforme au centre d\'un solénoïde long.', 'spectre limaille solenoide uniforme'],
    ],
  },

  // --- Force de Lorentz ---
  {
    id: 'pc_force_lorentz',
    matieres: ['physique chimie'],
    motsChapitre: [
      'force de lorentz',
      'lorentz',
    ],
    notions: [
      ['Expression de la force de Lorentz', 'Une charge q de vitesse v dans un champ B subit F = q × v ∧ B, perpendiculaire au plan (v, B).', 'lorentz charge vitesse perpendiculaire'],
      ['Mouvement dans un champ uniforme', 'Si v est perpendiculaire à B, la trajectoire est un cercle de rayon r = m × v / (|q| × B).', 'cercle rayon vitesse masse'],
      ['Applications : spectromètre, cyclotron', 'Le spectromètre de masse sépare les isotopes ; le cyclotron accélère les particules en spirale.', 'spectrometre cyclotron isotopes acceleration'],
    ],
  },

  // --- Force de Laplace ---
  {
    id: 'pc_force_laplace',
    matieres: ['physique chimie'],
    motsChapitre: [
      'force de laplace',
      'laplace',
    ],
    notions: [
      ['Expression de la force de Laplace', 'Un conducteur de longueur l parcouru par I dans un champ B subit F = I × l ∧ B.', 'laplace conducteur intensite longueur'],
      ['Règle des trois doigts', 'Le trièdre (force, courant, champ) donne le sens de la force : main droite, doigts ordonnés.', 'trois doigts sens trièdre'],
      ['Applications : moteur, haut-parleur', 'Le moteur électrique tourne grâce aux forces de Laplace ; le haut-parleur vibre avec le courant.', 'moteur haut parleur rotation'],
    ],
  },

  // --- Induction électromagnétique ---
  {
    id: 'pc_induction',
    matieres: ['physique chimie'],
    motsChapitre: ['induction electromagnetique'],
    notions: [
      ['Flux magnétique', 'Φ = B × S × cos α : le flux à travers un circuit mesure combien de champ le traverse.', 'flux surface angle champ'],
      ['Loi de Faraday et loi de Lenz', 'e = −dΦ/dt : la f.é.m. induite s\'oppose par ses effets à la cause qui lui donne naissance.', 'faraday lenz oppose fem'],
      ['Production de courant induit', 'Un aimant qui bouge devant une bobine y fait naître un courant : principe de l\'alternateur.', 'alternateur aimant bobine courant'],
    ],
  },

  // --- Auto-induction ---
  {
    id: 'pc_auto_induction',
    matieres: ['physique chimie'],
    motsChapitre: [
      'auto induction',
      'auto-induction',
    ],
    notions: [
      ['Phénomène d\'auto-induction', 'Un circuit inductif s\'oppose aux variations de son propre courant : surtension à l\'ouverture.', 'auto induction surtension ouverture'],
      ['Inductance dune bobine', 'Φ = L × I : l\'inductance L en henrys mesure l\'aptitude de la bobine à s\'opposer aux variations.', 'inductance henry bobine flux'],
      ['Établissement du courant en RL', 'Le courant monte vers E/R avec une constante de temps τ = L/R.', 'etablissement constante temps rl'],
      ['Énergie stockée dans une bobine', 'E = ½ × L × I² : la bobine stocke de l\'énergie dans son champ magnétique.', 'energie bobine champ magnetique'],
    ],
  },

  // --- Effet photoélectrique ---
  {
    id: 'pc_photoelectrique',
    matieres: ['physique chimie'],
    motsChapitre: ['effet photoelectrique'],
    notions: [
      ['Mise en évidence de l\'effet', 'Une lumière ultraviolette arrache des électrons à une plaque métallique : aucun effet avec une lumière rouge intense.', 'ultraviolet electrons arrachement seuil'],
      ['Photon et quantum dénergie', 'La lumière transporte l\'énergie par paquets : E = h × ν, avec h la constante de Planck.', 'photon planck frequence quantum'],
      ['Travail d\'extraction et vitesse', '½ × m × v² = h × ν − W₀ : les électrons sortent si la fréquence dépasse le seuil du métal.', 'extraction seuil vitesse cinetique'],
      ['Dualité onde-corpuscule', 'La lumière est à la fois onde (interférences) et flux de photons (effet photoélectrique).', 'dualite onde corpuscule photon'],
    ],
  },

  // --- Noyau atomique ---
  {
    id: 'pc_noyau_atomique',
    matieres: ['physique chimie'],
    motsChapitre: [
      'noyau atomique',
      'noyau',
    ],
    notions: [
      ['Composition du noyau', 'Z protons et N neutrons (A = Z + N nucléons) : les isotopes diffèrent par leur nombre de neutrons.', 'protons neutrons isotopes nucleons'],
      ['Stabilité et vallée de stabilité', 'Les noyaux trop riches en protons ou en neutrons sont instables et se désintègrent.', 'stabilite instable desintegration'],
      ['Énergie de liaison', 'Le défaut de masse Δm correspond à l\'énergie qui lie les nucléons : E = Δm × c².', 'liaison defaut masse einstein'],
      ['Radioactivité naturelle', 'Émissions α, β et γ : la radioactivité est spontanée, aléatoire et inéluctable.', 'alpha beta gamma spontanee'],
    ],
  },

  // --- Réactions nucléaires ---
  {
    id: 'pc_reactions_nucleaires',
    matieres: ['physique chimie'],
    motsChapitre: ['reactions nucleaires'],
    notions: [
      ['Lois de conservation', 'Conservation du nombre de masse A et du nombre de charge Z (lois de Soddy).', 'soddy conservation masse charge'],
      ['Fission nucléaire', 'Un noyau lourd se casse en deux noyaux plus légers sous impact neutronique : principe des réacteurs.', 'fission lourd reacteur neutron'],
      ['Fusion nucléaire', 'Deux noyaux légers fusionnent en libérant de l\'énergie : source d\'énergie du Soleil.', 'fusion leger soleil energie'],
      ['Bilan énergétique', 'L\'énergie libérée égale la perte de masse fois c² : elle est un million de fois celle d\'une réaction chimique.', 'bilan masse energie chimique'],
    ],
  },

  // --- Couples acide-base ---
  {
    id: 'pc_couples_acide_base',
    matieres: ['physique chimie'],
    motsChapitre: [
      'couples acide base',
      'couple acide base',
      'acide base',
    ],
    notions: [
      ['Définition de Brönsted', 'Un acide donne un proton H⁺, une base le capte : à tout acide correspond sa base conjuguée.', 'bronsted proton donateur accepteur'],
      ['Couples de l\'eau et pH', 'H₃O⁺/H₂O et H₂O/HO⁻ : à 25 °C, une solution est neutre si pH = 7, acide si pH < 7.', 'eau ph neutre oxonium hydroxyde'],
      ['Acides et bases usuels', 'Acide chlorhydrique, acide sulfurique, soude, ammoniac : formules et couples à connaître.', 'chlorhydrique sulfurique soude ammoniac'],
      ['Réaction acide-base', 'L\'acide d\'un couple réagit avec la base d\'un autre : H₃O⁺ + HO⁻ → 2 H₂O.', 'reaction neutralisation proton echange'],
    ],
  },

  // --- Solutions aqueuses ---
  {
    id: 'pc_solutions_aqueuses',
    matieres: ['physique chimie'],
    motsChapitre: [
      'solutions aqueuses',
      'solutions aqueuses acides',
      'solutions aqueuses basiques',
      'acide chlorhydrique',
      'd\'hydroxyde de sodium',
      'role du solvant',
      'loi de lavoisier',
      'chlorure de sodium',
      'lavoisier',
      'reactions chimiques et equations',
      'dissolution',
      'composes ioniques',
    ],
    notions: [
      ['Préparation dune solution', 'Dissolution d\'un solide, dilution d\'une solution mère : C₁ × V₁ = C₂ × V₂.', 'dissolution dilution concentration mere'],
      ['Acide chlorhydrique et soude', 'HCl apporte H₃O⁺, NaOH apporte HO⁻ : toutes deux sont totalement dissociées en solution.', 'chlorhydrique soude dissociation totale'],
      ['Mesure du pH', 'Papier pH, indicateur coloré ou pH-mètre : la mesure précise se fait au pH-mètre étalonné.', 'papier indicateur ph metre etalon'],
      ['Ions monoatomiques et polyatomiques', 'Cations comme Na+ et anions comme Cl- ou SO4-- : ils forment des composes ioniques tel le chlorure de sodium.', 'ions cations anions composes ioniques'],
      ['Loi de Lavoisier et equation equilibree', 'Au cours d\'une reaction chimique, les atomes se conservent : on equilibre l\'equation en ajustant les coefficients.', 'lavoisier conservation equation equilibree'],
      ['Role du solvant et dissolution', 'L\'eau dissout les composes ioniques en separant les ions : le solvant conditionne la dissolution.', 'solvant eau dissolution ions'],
      ['Dilution et effet sur le pH', 'Diluer dix fois une solution d\'acide fort augmente son pH de 1 unité.', 'dilution ph dix fois'],
    ],
  },

  // --- Organisation de la cellule vivante ---
  {
    id: 'svt_cellule',
    matieres: ['svt'],
    motsChapitre: [
      'organisation de la cellule',
      'cellule vivante',
    ],
    notions: [
      ['Théorie cellulaire', 'Tous les êtres vivants sont constitués de cellules : la cellule est l\'unité structurale et fonctionnelle du vivant.', 'theorie cellulaire unite vivant'],
      ['Cellule animale et cellule végétale', 'Membrane, cytoplasme, noyau dans les deux ; paroi, chloroplastes et grande vacuole en plus chez les végétaux.', 'animale vegetale paroi chloroplaste vacuole'],
      ['Le noyau et linformation génétique', 'Le noyau renferme les chromosomes, support de l\'information génétique transmise à chaque division.', 'noyau chromosomes information genetique'],
      ['Organites et énergie', 'Mitochondries (respiration) et chloroplastes (photosynthèse) convertissent l\'énergie pour la cellule.', 'mitochondrie chloroplaste respiration photosynthese'],
    ],
  },

  // --- Nutrition minérale du végétal chlorophyllien ---
  {
    id: 'svt_nutrition_minerale',
    matieres: ['svt'],
    motsChapitre: ['nutrition minerale'],
    notions: [
      ['Absorption de l\'eau et des sels minéraux', 'Les poils absorbants de la racine pompent l\'eau et les ions du sol vers la sève brute.', 'racine poils absorbants eau sels'],
      ['Rôle des éléments minéraux', 'Azote, phosphore, potassium et oligo-éléments : chacun joue un rôle précis dans la croissance.', 'azote phosphore potassium oligoelements'],
      ['Transport de la sève brute', 'Le xylème conduit la sève brute des racines vers les feuilles, moteur de la transpiration.', 'xyleme seve brute transpiration'],
      ['Carences et fertilisation', 'Le jaunissement ou le nanisme signalent une carence : les engrais apportent les éléments manquants.', 'carence engrais jaunissement fertilisation'],
    ],
  },

  // --- Nutrition carbonée du végétal chlorophyllien ---
  {
    id: 'svt_nutrition_carbonee',
    matieres: ['svt'],
    motsChapitre: ['nutrition carbonee'],
    notions: [
      ['Photosynthèse : équation et siège', '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ grâce à la chlorophylle, dans les chloroplastes des feuilles.', 'photosynthese chlorophylle equation lumiere'],
      ['Échanges gazeux de la feuille', 'Les stomates laissent entrer le CO₂ et sortir l\'O₂ et la vapeur d\'eau.', 'stomates echanges gazeux dioxyde oxygene'],
      ['Facteurs de la photosynthèse', 'Lumière, CO₂, eau et température limitent l\'intensité photosynthétique.', 'facteurs lumiere dioxyde temperature'],
      ['Mise en évidence', 'Test à l\'eau iodée sur une feuille insolée : les zones bleues révèlent l\'amidon fabriqué.', 'amidon eau iodee feuille insolée'],
    ],
  },

  // --- Devenir des substances synthétisées ---
  {
    id: 'svt_devenir_substances',
    matieres: ['svt'],
    motsChapitre: [
      'devenir des substances',
      'substances synthetisees',
    ],
    notions: [
      ['Sève élaborée et phloème', 'Les sucres fabriqués circulent dans le phloème vers les organes consommateurs ou de réserve.', 'phloeme seve elaboree sucres'],
      ['Stockage : amidon et réserves', 'Le glucose en excès est stocké sous forme d\'amidon dans les tubercules, graines et racines.', 'amidon stockage tubercules graines reserves'],
      ['Utilisation pour la croissance', 'Les substances servent à construire parois, protéines et nouveaux organes du végétal.', 'croissance parois proteines construction'],
    ],
  },

  // --- Respiration et fermentations ---
  {
    id: 'svt_respiration_fermentation',
    matieres: ['svt'],
    motsChapitre: [
      'respiration et fermentations',
      'respiration',
      'fermentation',
    ],
    notions: [
      ['Respiration cellulaire', 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + énergie : elle libère l\'énergie du glucose dans les mitochondries.', 'respiration mitochondrie energie glucose'],
      ['Fermentation alcoolique et lactique', 'Sans dioxygène, la levure produit éthanol + CO₂ et le muscle de l\'acide lactique.', 'alcoolique lactique levure muscle dioxygene'],
      ['Échanges gazeux respiratoires', 'Absorption d\'O₂ et rejet de CO₂ : mis en évidence à l\'eau de chaux.', 'echanges gazeux eau chaux dioxyde'],
      ['Respiration et photosynthèse', 'Le jour, la plante fait les deux ; la nuit, seule la respiration : bilan gazeux inversé.', 'jour nuit bilan complementaire'],
    ],
  },

  // --- Séisme et structure interne de la Terre ---
  {
    id: 'svt_seisme_terre',
    matieres: ['svt'],
    motsChapitre: [
      'seisme',
      'structure interne de la terre',
    ],
    notions: [
      ['Origine d\'un séisme', 'La rupture brutale de roches libère l\'énergie accumulée : foyer en profondeur, épicentre en surface.', 'foyer epicentre rupture faille'],
      ['Ondes sismiques et enregistrement', 'Ondes P, S et L enregistrées par le sismographe : leur vitesse révèle la structure traversée.', 'ondes sismographe vitesse propagation'],
      ['Magnitude et intensité', 'La magnitude (Richter) mesure l\'énergie libérée ; l\'intensité (MSK) décrit les dégâts observés.', 'magnitude richter intensite degats'],
      ['Structure interne de la Terre', 'Croûte, manteau et noyau : les discontinuités de Mohorovicic et Gutenberg marquent les frontières.', 'croute manteau noyau discontinuites'],
    ],
  },

  // --- Tectonique des plaques ---
  {
    id: 'svt_tectonique',
    matieres: ['svt'],
    motsChapitre: [
      'tectonique des plaques',
      'tectonique',
    ],
    notions: [
      ['Plaques lithosphériques', 'La lithosphère rigide est découpée en plaques mobiles sur l\'asthénosphère ductile.', 'plaques lithosphere asthenosphere mobiles'],
      ['Divergence : dorsales', 'Aux dorsales, le magma remonte et crée du plancher océanique : les plaques s\'écartent.', 'dorsale divergence magma oceanique'],
      ['Convergence : subduction et collision', 'La plaque dense plonge (subduction) ou les continents s\'écrasent (collision, chaînes de montagnes).', 'subduction collision montagne fosse'],
      ['Dérive des continents et preuves', 'Complémentarité des côtes, fossiles et roches identiques : Wegener puis la tectonique des plaques.', 'wegener derive fossiles preuves'],
    ],
  },

  // --- Conséquences de la tectonique des plaques ---
  {
    id: 'svt_consequences_tectonique',
    matieres: ['svt'],
    motsChapitre: ['consequences de la tectonique'],
    notions: [
      ['Séismes aux frontières', '90 % des séismes frappent les zones de subduction, de dorsales et de failles transformantes.', 'frontieres subduction dorsale failles'],
      ['Volcanisme associé', 'Volcans effusifs des dorsales et points chauds, explosifs des zones de subduction.', 'volcans effusif explosif subduction'],
      ['Formation des chaînes de montagnes', 'La collision comprime et plisse les sédiments : exemple de l\'Atlas et de l\'Himalaya.', 'montagnes collision plissement atlas'],
    ],
  },

  // --- Altération et sédimentation ---
  {
    id: 'svt_alteration_sedimentation',
    matieres: ['svt'],
    motsChapitre: [
      'alteration et sedimentation',
      'sedimentation',
    ],
    notions: [
      ['Altération des roches', 'L\'altération physique (gel, dilatation) et chimique (hydrolyse) désagrège les roches en surface.', 'alteration physique chimique hydrolyse'],
      ['Érosion et transport', 'L\'eau, le vent et la glace arrachent et transportent les débris : le relief s\'aplanit.', 'erosion transport eau vent debris'],
      ['Sédimentation et diagenèse', 'Les particules se déposent en strates puis se compactent : la diagenèse transforme le sédiment en roche.', 'sedimentation strates diagenese compaction'],
    ],
  },

  // --- Stratigraphie et méthodes de datation ---
  {
    id: 'svt_stratigraphie_datation',
    matieres: ['svt'],
    motsChapitre: [
      'principes de stratigraphie',
      'stratigraphie',
      'datation',
    ],
    notions: [
      ['Principes de stratigraphie', 'Superposition, continuité et recoupement : ils ordonnent les couches du plus ancien au plus récent.', 'superposition continuite recoupement couches'],
      ['Datation relative et fossiles', 'Les fossiles stratigraphiques datent les couches : ammonites du Jurassique, trilobites du Primaire.', 'fossiles relative ammonites trilobites'],
      ['Datation absolue et radioactivité', 'La désintégration du carbone 14 ou du potassium 40 donne l\'âge en années.', 'carbone potassium absolue radioactivite'],
    ],
  },

  // --- L'échelle des temps géologiques ---
  {
    id: 'svt_echelle_temps',
    matieres: ['svt'],
    motsChapitre: ['echelle des temps'],
    notions: [
      ['Ères géologiques', 'Précambrien, Primaire, Secondaire, Tertiaire, Quaternaire : découpées par les grandes crises.', 'eres precambrien primaire secondaire'],
      ['Crises biologiques majeures', 'Fin du Permien et fin du Crétacé (dinosaures) : extinctions massives puis diversifications.', 'crises extinction dinosaures permien'],
      ['Apparition de lHomme', 'Hominisation au Quaternaire : les temps géologiques replacent l\'Homme dans une histoire de 4,6 milliards d\'années.', 'homme quaternaire hominisation'],
    ],
  },

  // --- Carte et coupe géologiques ---
  {
    id: 'svt_carte_geologique',
    matieres: ['svt'],
    motsChapitre: [
      'carte geologique',
      'coupe geologique',
    ],
    notions: [
      ['Lecture dune carte géologique', 'Couleurs = âges, symboles = roches : la légende et l\'échelle sont les clés de lecture.', 'legende couleurs symboles roches ages'],
      ['Coupe géologique', 'La coupe reconstitue le sous-sol le long d\'un trait : pendage, failles et plis y apparaissent.', 'coupe pendage failles plis sous-sol'],
    ],
  },

  // --- Ressources géologiques du Niger ---
  {
    id: 'svt_ressources_niger',
    matieres: ['svt'],
    motsChapitre: [
      'ressources geologiques',
      'uranium',
      'charbon',
      'calcaire',
      'gypse',
    ],
    notions: [
      ['Les ressources géologiques exploitées au Niger', 'Uranium d\'Arlit, charbon d\'Anou-Araren, calcaire et gypse : le sous-sol nigérien recèle des richesses variées.', 'ressources niger sous sol richesses'],
      ['L\'uranium d\'Arlit', 'Exploité dans l\'Aïr depuis les années 1970, l\'uranium nigérien alimente les centrales nucléaires : extraction, traitement et exportation.', 'uranium arlit air extraction exportation'],
      ['Le charbon d\'Anou-Araren', 'Énergie fossile du nord du Niger : le charbon d\'Anou-Araren alimente la centrale thermique et l\'industrie locale.', 'charbon anou araren fossile centrale'],
      ['Calcaire et gypse', 'Le calcaire sert à la cimenterie, le gypse au plâtre et à l\'amendement des sols : deux roches utiles au quotidien.', 'calcaire cimenterie gypse platre amendement'],
    ],
  },

  // --- Reproduction humaine ---
  {
    id: 'svt_reproduction_humaine',
    matieres: ['svt'],
    motsChapitre: [
      'appareils genitaux',
      'fecondation',
      'nidation',
    ],
    notions: [
      ['Appareils genitaux masculin et feminin', 'Testicules et ovaires produisent les gametes ; voies genitales et organes externes permettent la rencontre.', 'genitaux gametes testicules ovaires'],
      ['Fecondation et nidation', 'La fusion spermatozoide-ovule forme l\'oeuf, qui migre puis s\'implante dans la muqueuse uterine.', 'fecondation oeuf nidation uterus'],
      ['Grossesse et accouchement', 'Le placenta nourrit l\'embryon puis le foetus ; contractions et dilatation du col precedent l\'expulsion.', 'placenta embryon foetus accouchement'],
    ],
  },

  // --- Regulation des naissances ---
  {
    id: 'svt_regulation_naissances',
    matieres: ['svt'],
    motsChapitre: [
      'regulation des naissances',
      'contraception',
    ],
    notions: [
      ['Methodes contraceptives', 'Pilule, preservatif, DIU ou methodes naturelles : elles empechent la fecondation ou la nidation.', 'contraception pilule preservatif diu'],
      ['Interruption volontaire de grossesse', 'Pratique encadree par la loi, elle met fin a une grossesse non desiree dans un delai legal.', 'ivg loi grossesse interruption'],
      ['Planification familiale au Niger', 'Espacement des naissances et sante maternelle : la planification ameliore la vie des familles.', 'planification espacement maternelle famille'],
    ],
  },

  // --- Regulation de la glycemie ---
  {
    id: 'svt_glycemie',
    matieres: ['svt'],
    motsChapitre: ['regulation de la glycemie'],
    notions: [
      ['Glycemie et ses variations', 'La glycemie oscille autour de 1 g/L : elle monte apres le repas et baisse pendant le jeune.', 'glycemie repas jeune variations'],
      ['Insuline et glucagon', 'Le pancreas secrete l\'insuline qui fait baisser la glycemie et le glucagon qui la fait monter.', 'insuline glucagon pancreas hormones'],
      ['Diabete et depistage', 'Le diabete est une hyperglycemie chronique par defaut d\'insuline : depistage et regime adaptes.', 'diabete hyperglycemie depistage regime'],
    ],
  },

  // --- Information genetique et division cellulaire ---
  {
    id: 'svt_information_genetique',
    matieres: ['svt'],
    motsChapitre: [
      'information genetique',
      'clonage',
      'mitose',
    ],
    notions: [
      ['Support de l\'information genetique', 'Les chromosomes du noyau portent les genes, segments d\'ADN qui commandent les caracteres.', 'chromosomes genes adn caracteres'],
      ['Mitose et transmission fidele', 'La mitose copie puis repartit les chromatides : les deux cellules filles sont identiques.', 'mitose chromatides filles identiques'],
      ['Clonage et biotechnologies', 'Le clonage produit des copies genetiquement identiques : applications agricoles et limites ethiques.', 'clonage copies identiques ethique'],
    ],
  },

  // --- Expression et brassage genetique ---
  {
    id: 'svt_expression_brassage',
    matieres: ['svt'],
    motsChapitre: [
      'expression de l information',
      'reproduction sexuee',
      'brassage',
    ],
    notions: [
      ['Expression de l\'information genetique', 'L\'ADN est transcrit en ARN puis traduit en proteines : genotype et environnement font le phenotype.', 'transcription traduction proteines phenotype'],
      ['Meiose et brassage genetique', 'La meiose melange les chromosomes puis les chromatides : chaque gamete est unique.', 'meiose gametes melange unique'],
      ['Fecondation et diversite', 'La rencontre aleatoire des gametes amplifie la diversite : aucun individu n\'est identique.', 'fecondation aleatoire diversite individus'],
    ],
  },

  // --- Heredite et anomalies chromosomiques ---
  {
    id: 'svt_heredite_anomalies',
    matieres: ['svt'],
    motsChapitre: [
      'heredite',
      'anomalies chromosomiques',
    ],
    notions: [
      ['Transmission des caracteres', 'Alleles dominants et recessifs, genotypes et croisements : les lois de Mendel prevoient les proportions.', 'alleles mendel croisements proportions'],
      ['Heredite humaine et groupes sanguins', 'Groupes ABO, daltonisme ou hemophilie : exemples d\'heredite liee au sexe ou autosomique.', 'groupes sanguins daltonisme sexe'],
      ['Anomalies chromosomiques', 'Trisomie 21 ou monosomie : un chromosome en trop ou en moins provoque des troubles du developpement.', 'trisomie monosomie developpement troubles'],
    ],
  },

  // --- Immunite et reponses immunitaires ---
  {
    id: 'svt_immunite',
    matieres: ['svt'],
    motsChapitre: [
      'systeme immunitaire',
      'soi et le non-soi',
      'reponses immunitaires',
      'mecanismes de l immunite',
      'immunite',
    ],
    notions: [
      ['Soi et non-soi', 'Les molecules HLA distinguent le soi du non-soi : tout element etranger declenche une reponse.', 'hla soi etranger reconnaissance'],
      ['Immunite innee', 'Peau, phagocytes et inflammation : la defense immediate et non specifique contre les microbes.', 'innee phagocytes inflammation microbes'],
      ['Immunite adaptative', 'Lymphocytes B et anticorps, lymphocytes T tueurs : une reponse specifique avec memoire immunitaire.', 'adaptative lymphocytes anticorps memoire'],
      ['Vaccination et serotherapie', 'Le vaccin entraine le systeme immunitaire ; le serum apporte des anticorps tout prets.', 'vaccin serum anticorps prevention'],
    ],
  },

  // --- VIH et SIDA ---
  {
    id: 'svt_vih_sida',
    matieres: ['svt'],
    motsChapitre: [
      'vih',
      'sida',
    ],
    notions: [
      ['Le virus du SIDA', 'Le VIH detruit les lymphocytes T4 : sans defense, les infections opportunistes s\'installent.', 'vih virus lymphocytes opportunistes'],
      ['Transmission et prevention', 'Voies sexuelle, sanguine et mere-enfant : preservatif, depistage et traitement des meres seropositives.', 'transmission preservatif depistage prevention'],
      ['Depistage et traitement ARV', 'Le test detecte les anticorps anti-VIH ; les antiretroviraux bloquent la replication du virus.', 'arv test replication traitement'],
    ],
  },

  // --- Systeme nerveux et muscle ---
  {
    id: 'svt_systeme_nerveux',
    matieres: ['svt'],
    motsChapitre: [
      'systeme nerveux',
      'tissu nerveux',
      'messages nerveux',
      'synapses',
      'reflexes',
      'muscle',
    ],
    notions: [
      ['Tissu nerveux et neurones', 'Les neurones conduisent l\'influx nerveux ; la moelle et l\'encephale forment les centres nerveux.', 'neurones influx centres moelle encephale'],
      ['Reflexes et arcs reflexes', 'Le reflexe est une reponse involontaire : recepteur, nerf sensitif, centre, nerf moteur, effecteur.', 'reflexe arc involontaire recepteur effecteur'],
      ['Messages nerveux et synapses', 'L\'influx electrique devient chimique a la synapse : les neurotransmetteurs franchissent la fente.', 'synapse neurotransmetteurs influx chimique'],
      ['Muscle et contraction', 'La jonction neuromusculaire transmet l\'ordre : actine et myosine glissent, le muscle se raccourcit.', 'muscle actine myosine jonction contraction'],
    ],
  },

  // --- Ecosystemes et relations trophiques ---
  {
    id: 'svt_ecosystemes',
    matieres: ['svt'],
    motsChapitre: [
      'ecosystemes',
      'relations trophiques',
      'flux de matiere',
      'biodiversite',
      'production primaire',
      'roles des vegetaux',
    ],
    notions: [
      ['Ecosystemes et biotope', 'Un ecosysteme unit un milieu et les etres qui l\'habitent : savane, mare ou foret du Niger.', 'ecosysteme biotope milieu savane'],
      ['Chaines et reseaux trophiques', 'Producteurs, herbivores, carnivores et decompositeurs : la matiere circule de maillon en maillon.', 'chaines producteurs herbivores carnivores'],
      ['Flux de matiere et d\'energie', 'La production primaire capte l\'energie solaire ; une partie se perd a chaque niveau trophique.', 'flux primaire solaire niveau pyramide'],
      ['Biodiversite et impacts humains', 'Defrichement, surpaturage et pollution reduisent la biodiversite : parcs et aires protegees la preservent.', 'biodiversite defrichement parcs protegees'],
    ],
  },

  // --- Sols : formation et gestion ---
  {
    id: 'svt_sols',
    matieres: ['svt'],
    motsChapitre: [
      'formation d un sol',
      'proprietes d un sol',
      'gestion des sols',
    ],
    notions: [
      ['Formation et profil d\'un sol', 'La roche mere s\'altere, la matiere organique s\'y mele : horizons A, B et C du profil.', 'profil horizons roche humus'],
      ['Proprietes et fertilite', 'Texture, structure et pH conditionnent l\'eau et les sels : un sol fertile nourrit bien la plante.', 'texture structure fertilite eau'],
      ['Gestion et lutte contre l\'erosion', 'Cordons pierreux, demi-lunes et fumure restaurent les sols degrades du Sahel.', 'cordons demi lunes fumure sahel'],
    ],
  },

  // --- Environnement : protection et gestion ---
  {
    id: 'svt_environnement',
    matieres: ['svt'],
    motsChapitre: [
      'constituants de l environnement',
      'degradations',
      'gestion de l environnement',
    ],
    notions: [
      ['Constituants de l\'environnement', 'Air, eau, sol, faune et flore forment notre cadre de vie : chacun merite protection.', 'air eau sol faune flore'],
      ['Degradations et pollutions', 'Dechets plastiques, eaux usees et coupe abusive : les villes du Niger subissent pressions croissantes.', 'dechets pollution coupe pression'],
      ['Gestion durable et reboisement', 'Reboisement, assainissement et energies propres : gerer aujourd\'hui pour demain.', 'reboisement assainissement durable demain'],
    ],
  },

  // --- Energies fossiles ---
  {
    id: 'svt_energies_fossiles',
    matieres: ['svt'],
    motsChapitre: [
      'energie fossile',
      'charbon',
    ],
    notions: [
      ['Formation des energies fossiles', 'Restes organiques enfouis et transformes pendant des millions d\'annees : charbon, petrole et gaz.', 'formation fossiles millions organiques'],
      ['Charbon d\'Anou-Araren', 'Exploite au nord du Niger, le charbon alimente la centrale thermique et l\'artisanat local.', 'anou araren thermique artisanat'],
      ['Limites et alternatives', 'Ressources epuisables et polluantes : le solaire et l\'eolien offrent des relais d\'avenir.', 'epuisables solaire eolien relais'],
    ],
  },

  // --- Arithmétique ---
  {
    id: 'arithmetique',
    matieres: ['mathematiques'],
    motsChapitre: ['arithmetique'],
    notions: [
      ['Divisibilité', 'a divise b s\'il existe un entier k tel que b = k·a. Vocabulaire : multiple, diviseur, quotient, reste.', 'divisibilite divise multiple'],
      ['Division euclidienne', 'Pour a entier et b > 0, il existe un unique couple (q, r) tel que a = b·q + r avec 0 ≤ r < b.', 'division euclidienne reste quotient'],
      ['Nombres premiers entre eux', 'a et b sont premiers entre eux si leur seul diviseur commun est 1 : PGCD(a, b) = 1.', 'premiers entre eux pgcd'],
      ['PGCD et PPCM', 'Plus grand diviseur commun et plus petit multiple commun, par décomposition ou algorithme d\'Euclide.', 'pgcd ppcm arithmetique'],
      ['Algorithme d\'Euclide', 'Divisions successives jusqu\'à un reste nul : le dernier reste non nul est le PGCD.', 'pgcd euclide arithmetique'],
      ['Théorème de Bézout', 'a et b sont premiers entre eux si et seulement si il existe u, v tels que u·a + v·b = 1.', 'bezout pgcd premiers entre eux'],
      ['Théorème de Gauss', 'Si a divise le produit b·c et si a est premier avec b, alors a divise c.', 'gauss divisibilite pgcd'],
      ['Nombres premiers', 'Un entier > 1 est premier si ses seuls diviseurs sont 1 et lui-même : 2, 3, 5, 7, 11…', 'nombre premier premier'],
      ['Décomposition en facteurs premiers', 'Tout entier > 1 s\'écrit de façon unique comme produit de nombres premiers.', 'nombre premier decomposition divisibilite'],
      ['Congruences', 'a ≡ b (mod n) si n divise a − b. Compatibles avec +, × et les puissances.', 'congruence modulo arithmetique'],
      ['Petit théorème de Fermat', 'Si p est premier et ne divise pas a, alors a^(p−1) ≡ 1 (mod p).', 'fermat congruence nombre premier'],
    ],
  },

  // --- Second degré ---
  {
    id: 'second_degre',
    matieres: ['mathematiques'],
    motsChapitre: ['second degre'],
    notions: [
      ['Équation du second degré', 'ax²+bx+c = 0 : discriminant Δ = b²−4ac, racines x = (−b±√Δ)/2a.', 'second degre discriminant racines'],
      ['Signe du trinôme', 'Du signe de a à l\'extérieur des racines, du signe contraire entre elles.', 'trinome signe second degre'],
      ['Somme et produit des racines', 'S = −b/a et P = c/a : trouver deux nombres à partir de leur somme et de leur produit.', 'somme produit racines'],
      ['Inéquation du second degré', 'Résolution à l\'aide du tableau de signes du trinôme.', 'inequation trinome tableau signes'],
      ['Forme canonique', 'a(x−α)²+β avec α = −b/2a : le point (α ; β) est le sommet de la parabole.', 'forme canonique sommet parabole'],
      ['Factorisation du trinôme', 'ax²+bx+c = a(x−x₁)(x−x₂) lorsque Δ > 0.', 'factorisation trinome racines'],
    ],
  },

  // --- Polynômes, équations et systèmes ---
  {
    id: 'polynomes',
    matieres: ['mathematiques'],
    motsChapitre: [
      'polynomes et systemes',
      'equations inequations polynomes',
      'equations lineaires',
      'systeme d equations',
      'systeme lineaire',
      'equations du premier degre',
      'identites remarquables',
      'polynomes',
      'racine d un polynome',
      'division euclidienne de polynomes',
      'factorisation',
    ],
    notions: [
      ['Équations du premier degré à une inconnue', 'ax + b = 0 (a ≠ 0) : solution unique x = −b/a.', 'premier degre equation'],
      ['Équations produit', 'Un produit est nul si et seulement si l\'un de ses facteurs est nul.', 'equation produit facteur nul'],
      ['Équations quotient', 'Un quotient est nul si et seulement si son numérateur est nul, le dénominateur étant non nul.', 'equation quotient numerateur'],
      ['Inéquations du premier degré', 'ax + b > 0 ou ax + b < 0 : attention au signe de a qui renverse l\'inégalité.', 'inequation premier degre'],
      ['Inéquations produit et quotient', 'On étudie le signe de chaque facteur dans un tableau de signes.', 'inequation produit quotient tableau'],
      ['Système de deux équations linéaires', 'Deux équations à deux inconnues : résolution par substitution ou par combinaison.', 'systeme deux equations substitution combinaison'],
      ['Système de trois équations linéaires', 'Trois équations à trois inconnues : combinaisons successives ou méthode de Cramer.', 'systeme trois equations cramer'],
      ['Identités remarquables', '(a+b)² = a²+2ab+b² ; (a−b)² = a²−2ab+b² ; (a+b)(a−b) = a²−b².', 'identites remarquables developpement'],
      ['Polynôme du second degré', 'P(x) = ax²+bx+c avec a ≠ 0 : forme développée, discriminant Δ = b²−4ac.', 'polynome second degre forme generale'],
      ['Racine d\'un polynôme', 'a est racine de P si P(a) = 0. Alors P(x) se factorise par (x−a).', 'racine polynome factorisation'],
      ['Division euclidienne de polynômes', 'P = D·Q + R avec deg(R) < deg(D) et D non nul.', 'division polynome reste quotient'],
      ['Règle de Ruffini', 'Si a est racine de P alors P(x) = (x−a)·Q(x) : division synthétique.', 'ruffini division synthese polynome'],
    ],
  },

  // --- Dérivation ---
  {
    id: 'derivation',
    matieres: ['mathematiques'],
    motsChapitre: ['derivation'],
    notions: [
      ['Nombre dérivé en un point', 'f\'(a) est la limite de (f(a+h) − f(a))/h quand h tend vers 0 : c\'est le coefficient directeur de la tangente.', 'nombre derive tangente coefficient'],
      ['Taux d\'accroissement', '(f(b) − f(a))/(b − a) est le coefficient directeur de la droite (AB) : taux de variation de f entre a et b.', 'taux accroissement variation secante'],
      ['Fonction dérivée', 'La fonction f\' associe à chaque x le nombre dérivé de f en x, là où il existe.', 'fonction derivee nombre derive'],
      ['Dérivées des fonctions usuelles', '(x^n)\' = n·x^(n−1) ; (1/x)\' = −1/x² ; (√x)\' = 1/(2√x) ; (sin x)\' = cos x ; (cos x)\' = −sin x.', 'derivee usuelle puissance trigonometrique'],
      ['Dérivée d\'une somme', '(u + v)\' = u\' + v\' et (k·u)\' = k·u\' : la dérivation est linéaire.', 'derivee somme linearite'],
      ['Dérivée d\'un produit', '(u·v)\' = u\'·v + u·v\' : règle du produit.', 'derivee produit regle'],
      ['Dérivée d\'un quotient', '(u/v)\' = (u\'·v − u·v\')/v², valable là où v ne s\'annule pas.', 'derivee quotient regle'],
      ['Dérivée d\'une composée', '(v ∘ u)\' = u\' × v\'(u) : on dérive la fonction extérieure puis on multiplie par la dérivée de la fonction intérieure.', 'derivee composee chaine'],
      ['Dérivée de la racine carrée composée', '(√u)\' = u\'/(2√u), pour u strictement positif.', 'derivee racine composee'],
      ['Dérivée de sinus et cosinus composés', '(sin(ax+b))\' = a·cos(ax+b) et (cos(ax+b))\' = −a·sin(ax+b).', 'derivee sinus cosinus composee'],
      ['Équation de la tangente', 'La tangente à la courbe de f au point d\'abscisse a a pour équation y = f\'(a)(x − a) + f(a).', 'tangente equation courbe'],
      ['Dérivée et sens de variation', 'Sur un intervalle, f dérivable est croissante si et seulement si f\' ≥ 0, décroissante si et seulement si f\' ≤ 0.', 'derivee signe monotonie variation'],
      ['Dérivée et extremum local', 'Si f est dérivable en a et admet un extremum local en a alors f\'(a) = 0 ; la réciproque est fausse (x³ en 0).', 'extremum local derivee annulation'],
    ],
  },

  // --- Limites et continuité ---
  {
    id: 'limites_continuite',
    matieres: ['mathematiques'],
    motsChapitre: ['limites et continuite'],
    notions: [
      ['Limite finie en un point', 'f(x) tend vers L quand x tend vers a : on peut rendre f(x) aussi proche de L que voulu, pour x assez proche de a.', 'limite finie point'],
      ['Limite en l\'infini', 'Comportement de f(x) quand x tend vers +∞ ou −∞ : limite finie, limite infinie, ou aucune limite.', 'limite infini comportement'],
      ['Limite infinie en un point', 'f(x) tend vers +∞ quand x tend vers a : la droite x = a est asymptote verticale.', 'limite infinie point asymptote'],
      ['Limites des fonctions de référence', 'Limites de x^n, 1/x, √x et de sin x / x en les bornes de leur domaine de définition.', 'limite reference puissance racine'],
      ['Opérations sur les limites', 'Somme, produit, quotient et composée : on combine les limites lorsqu\'elles existent.', 'operations limites somme produit'],
      ['Formes indéterminées', 'Cas 0/0, ∞/∞, ∞ − ∞ et 0 × ∞ : transformer l\'expression (factoriser, multiplier par le conjugué) avant de conclure.', 'forme indeterminee conjugue factorisation'],
      ['Théorèmes de comparaison', 'Encadrement et théorème des gendarmes : si g ≤ f ≤ h et si g et h tendent vers L, alors f tend vers L.', 'comparaison gendarmes encadrement'],
      ['Asymptote horizontale', 'Si la limite de f en +∞ ou en −∞ est le réel L, la droite y = L est asymptote horizontale à la courbe.', 'asymptote horizontale limite'],
      ['Asymptote verticale', 'Si la limite de f en a est infinie, la droite x = a est asymptote verticale.', 'asymptote verticale limite'],
      ['Asymptote oblique', 'Si f(x) − (ax + b) tend vers 0 en ±∞, la droite y = ax + b est asymptote oblique.', 'asymptote oblique droite'],
      ['Continuité en un point', 'f est continue en a si f(a) est définie, si la limite existe en a et si cette limite est égale à f(a).', 'continuite point limite'],
      ['Prolongement par continuité', 'Si la limite de f en a existe mais que f n\'est pas définie en a, on prolonge f en posant f(a) = L.', 'prolongement continuite limite'],
      ['Théorème des valeurs intermédiaires', 'Si f est continue sur [a ; b] et si k est compris entre f(a) et f(b), alors l\'équation f(x) = k admet au moins une solution dans [a ; b].', 'valeurs intermediaires continuite'],
      ['Méthode de dichotomie', 'Encadrement de plus en plus fin d\'une solution de f(x) = 0 en divisant l\'intervalle en deux à chaque étape.', 'dichotomie encadrement approximation'],
    ],
  },

  // --- Propriétés des fonctions continues ou dérivables ---
  {
    id: 'fonctions_continues',
    matieres: ['mathematiques'],
    motsChapitre: [
      'proprietes des fonctions continues',
      'fonctions continues ou derivables',
    ],
    notions: [
      ['Continuité sur un intervalle', 'f est continue sur I si elle est continue en tout point de I : la courbe se trace sans lever le stylo.', 'continuite intervalle courbe'],
      ['Image d\'un intervalle', 'L\'image d\'un intervalle par une fonction continue est un intervalle.', 'image intervalle continuite'],
      ['Théorème des valeurs intermédiaires', 'Si f est continue sur [a ; b] alors f prend toutes les valeurs comprises entre f(a) et f(b).', 'valeurs intermediaires continuite'],
      ['Fonction continue strictement monotone', 'Si f est continue et strictement monotone sur [a ; b], alors f réalise une bijection de [a ; b] sur [f(a) ; f(b)].', 'continue monotone bijection'],
      ['Théorème de la bijection', 'L\'équation f(x) = k admet une unique solution dans [a ; b] si f est continue, strictement monotone et si k est compris entre f(a) et f(b).', 'bijection unique solution'],
      ['Dérivabilité et continuité', 'Toute fonction dérivable en a est continue en a ; la réciproque est fausse (valeur absolue en 0).', 'derivable continue implication'],
      ['Théorème de Rolle', 'Si f est continue sur [a ; b], dérivable sur ]a ; b[ et si f(a) = f(b), alors il existe c dans ]a ; b[ tel que f\'(c) = 0.', 'rolle derivee annulation'],
      ['Égalité des accroissements finis', 'Il existe c dans ]a ; b[ tel que f\'(c) = (f(b) − f(a))/(b − a).', 'accroissements finis taf'],
      ['Inégalité des accroissements finis', 'Si |f\'| ≤ M sur I alors |f(b) − f(a)| ≤ M·|b − a| pour tous a et b de I.', 'inegalite accroissements finis'],
      ['Caractérisation de la monotonie', 'f est constante sur I si et seulement si f\' = 0 sur I ; f est croissante si et seulement si f\' ≥ 0 sur I.', 'monotonie derivee constante'],
      ['Extremum local et dérivée nulle', 'Un extremum local sur un intervalle ouvert se produit en un point où la dérivée s\'annule ou n\'existe pas.', 'extremum local derivee'],
      ['Dérivée d\'une fonction réciproque', 'Si f est dérivable en a et f\'(a) ≠ 0, la réciproque f⁻¹ est dérivable en f(a) et (f⁻¹)\'(f(a)) = 1/f\'(a).', 'reciproque derivee inverse'],
    ],
  },

  // --- Fonctions exponentielles ---
  {
    id: 'exponentielles',
    matieres: ['mathematiques'],
    motsChapitre: [
      'fonctions exponentielles',
      'fonction exponentielle',
    ],
    notions: [
      ['Définition de la fonction exponentielle', 'L\'unique fonction dérivable sur ℝ telle que f\' = f et f(0) = 1 : notée exp, strictement positive et strictement croissante.', 'definition exponentielle derivee'],
      ['Propriétés algébriques de exp', 'exp(x + y) = exp(x)·exp(y) ; exp(−x) = 1/exp(x) ; exp(x − y) = exp(x)/exp(y).', 'proprietes exponentielle produit'],
      ['Notation e^x et nombre e', 'On note exp(x) = e^x avec e = exp(1) ≈ 2,718 : e^(a+b) = e^a · e^b et e^(a−b) = e^a/e^b.', 'notation exponentielle nombre e'],
      ['Dérivée de l\'exponentielle', '(e^x)\' = e^x et (e^u)\' = u\'·e^u.', 'derivee exponentielle composee'],
      ['Limites de référence de l\'exponentielle', 'La limite de e^x est 0 en −∞ et +∞ en +∞ ; la limite de (e^x − 1)/x est 1 quand x tend vers 0.', 'limites exponentielle reference'],
      ['Croissance comparée', 'Pour tout entier n > 0 : la limite de e^x / x^n est +∞ en +∞ et la limite de x^n·e^x est 0 en −∞.', 'croissance comparee exponentielle'],
      ['Exponentielle de base a', 'Pour a > 0 : a^x = e^(x·ln a) et (a^x)\' = a^x · ln a.', 'exponentielle base a logarithme'],
      ['Équations et inéquations avec exp', 'e^x = e^y équivaut à x = y ; e^x < e^y équivaut à x < y car exp est strictement croissante.', 'equation inequation exponentielle'],
      ['Étude de la fonction exponentielle', 'Tableau de variations, limites aux bornes, asymptote y = 0 en −∞ et tangente y = x + 1 au point 0.', 'etude exponentielle asymptote tangente'],
    ],
  },

  // --- Fonctions logarithmes ---
  {
    id: 'logarithmes',
    matieres: ['mathematiques'],
    motsChapitre: [
      'fonctions logarithmes',
      'fonction logarithme',
      'logarithme neperien',
    ],
    notions: [
      ['Définition du logarithme népérien', 'ln est la bijection réciproque de exp : ln x est l\'unique réel y tel que e^y = x, défini pour x > 0.', 'definition logarithme neperien reciproque'],
      ['Propriétés algébriques de ln', 'ln(ab) = ln a + ln b ; ln(a/b) = ln a − ln b ; ln(a^n) = n·ln a ; ln(1/a) = −ln a.', 'proprietes logarithme produit quotient'],
      ['Dérivée de ln', '(ln x)\' = 1/x pour x > 0 et (ln u)\' = u\'/u pour u strictement positif.', 'derivee logarithme neperien'],
      ['Limites de référence de ln', 'La limite de ln x est +∞ en +∞ et −∞ en 0⁺ ; la limite de ln(1+x)/x est 1 quand x tend vers 0.', 'limites logarithme reference'],
      ['Croissance comparée du logarithme', 'La limite de (ln x)/x est 0 en +∞ : ln x croît plus lentement que toute puissance de x.', 'croissance comparee logarithme'],
      ['Logarithme décimal', 'log x = ln x / ln 10 : log 10 = 1 et log 1 = 0 ; utilisé pour les échelles (pH, décibels).', 'logarithme decimal base dix'],
      ['Équations et inéquations avec ln', 'ln x = ln y équivaut à x = y pour x et y positifs ; ln x < ln y équivaut à x < y car ln est strictement croissante.', 'equation inequation logarithme'],
      ['Étude de la fonction logarithme', 'Tableau de variations, asymptote verticale x = 0 et tangente y = x − 1 au point d\'abscisse 1.', 'etude logarithme asymptote tangente'],
      ['Exponentielle et logarithme réciproques', 'e^(ln x) = x pour x > 0 et ln(e^x) = x pour tout x : les deux courbes sont symétriques par rapport à la droite y = x.', 'reciproque exponentielle logarithme symetrie'],
    ],
  },

  // --- Primitives et calcul intégral ---
  {
    id: 'integrales',
    matieres: ['mathematiques'],
    motsChapitre: [
      'calcul integral',
      'primitives',
      'integrale',
      'primitive',
    ],
    notions: [
      ['Primitive d\'une fonction', 'F est une primitive de f sur I si F\' = f sur I ; deux primitives de f sur un intervalle diffèrent d\'une constante.', 'primitive derivee constante'],
      ['Primitives des fonctions usuelles', 'Tableau des primitives de x^n, 1/x², 1/√x, e^x et 1/x : à connaître par cœur.', 'primitives usuelles tableau'],
      ['Primitive et condition initiale', 'La primitive est unique si l\'on impose sa valeur en un point : F(x₀) = y.', 'primitive condition initiale'],
      ['Intégrale et aire sous la courbe', 'Si f ≥ 0, l\'intégrale de a à b de f(t)dt est l\'aire du domaine limité par la courbe, l\'axe des abscisses et les droites x = a et x = b.', 'integrale aire courbe domaine'],
      ['Théorème fondamental du calcul intégral', 'Si f est continue sur [a ; b], la fonction F(x) = intégrale de a à x de f(t)dt est la primitive de f qui s\'annule en a.', 'theoreme fondamental primitive integrale'],
      ['Linéarité de l\'intégrale', 'L\'intégrale de (α·f + β·g) vaut α·(intégrale de f) + β·(intégrale de g).', 'linearite integrale somme'],
      ['Relation de Chasles', 'Intégrale de a à c = intégrale de a à b + intégrale de b à c : on découpe le domaine d\'intégration.', 'chasles decoupage integrale'],
      ['Positivité et ordre', 'Si f ≤ g sur [a ; b] alors l\'intégrale de f ≤ l\'intégrale de g ; si f ≥ 0 alors l\'intégrale de f ≥ 0.', 'positivite ordre inegalite integrale'],
      ['Intégration par parties', 'Intégrale de u\'·v = [u·v] − intégrale de u·v\' : méthode pour x·e^x, x·ln x ou x·sin x.', 'integration par parties'],
      ['Valeur moyenne', 'La valeur moyenne de f sur [a ; b] est (1/(b − a)) fois l\'intégrale de a à b de f(t)dt.', 'valeur moyenne integrale'],
      ['Aire entre deux courbes', 'Si f ≥ g sur [a ; b], l\'aire entre les deux courbes vaut l\'intégrale de a à b de (f − g).', 'aire deux courbes difference'],
      ['Méthode de calcul d\'une intégrale', 'Chercher une primitive F de f, puis calculer F(b) − F(a) : c\'est le calcul pratique d\'une intégrale.', 'methode calcul integrale primitive'],
    ],
  },

  // --- Nombres complexes ---
  {
    id: 'complexes',
    matieres: ['mathematiques'],
    motsChapitre: [
      'nombres complexes',
      'nombre complexe',
    ],
    notions: [
      ['Forme algébrique', 'z = x + i·y avec x = Re(z) partie réelle et y = Im(z) partie imaginaire, et i² = −1.', 'forme algebrique partie reelle imaginaire'],
      ['Conjugué d\'un complexe', 'Le conjugué de z = x + i·y est z̄ = x − i·y : le produit z·z̄ = x² + y² est un réel positif.', 'conjugue complexe reel'],
      ['Module d\'un complexe', '|z| = √(x² + y²) est la distance OM ; |z·z\'| = |z|·|z\'| et |z/z\'| = |z|/|z\'|.', 'module complexe distance'],
      ['Argument et forme trigonométrique', 'z = r(cos θ + i·sin θ) avec r = |z| et θ = arg(z), angle entre l\'axe des réels et le vecteur OM.', 'argument forme trigonometrique'],
      ['Forme exponentielle', 'z = r·e^(iθ) avec r = |z| > 0 : la notation la plus pratique pour les produits et les puissances.', 'forme exponentielle complexe'],
      ['Opérations sur les complexes', 'Somme, produit et quotient en formes algébrique et exponentielle : le produit multiplie les modules et additionne les arguments.', 'operations produit quotient complexe'],
      ['Formule de Moivre', '(cos θ + i·sin θ)^n = cos(nθ) + i·sin(nθ) : calcul de la puissance d\'un complexe.', 'moivre puissance complexe'],
      ['Formules d\'Euler', 'cos θ = (e^(iθ) + e^(−iθ))/2 et sin θ = (e^(iθ) − e^(−iθ))/(2i) : linéarisation des expressions trigonométriques.', 'euler cosinus sinus linearisation'],
      ['Équation du second degré dans ℂ', 'az² + bz + c = 0 avec Δ < 0 admet deux racines complexes conjuguées : z = (−b ± i√(−Δ))/(2a).', 'equation second degre complexe discriminant'],
      ['Racines n-ièmes de l\'unité', 'Les solutions de z^n = 1 sont z_k = e^(2ikπ/n) pour k = 0, 1, …, n−1 : elles forment un polygone régulier.', 'racines n iemes unite complexe'],
      ['Interprétation géométrique', 'z est l\'affixe du point M(x ; y) ; z\' − z est l\'affixe du vecteur MM\' et |z\' − z| = MM\'.', 'affixe point vecteur geometrie'],
      ['Complexes et transformations', 'Une rotation de centre Ω d\'affixe ω et d\'angle θ a pour écriture complexe z\' − ω = e^(iθ)(z − ω).', 'complexe rotation transformation'],
    ],
  },

  // --- Suites numériques ---
  {
    id: 'suites',
    matieres: ['mathematiques'],
    motsChapitre: [
      'suites numeriques',
      'suites arithmetiques',
      'suites geometriques',
    ],
    notions: [
      ['Définition d\'une suite', 'Une suite (u_n) est une fonction de ℕ (ou ℕ*) vers ℝ : u_n est le terme de rang n.', 'definition suite terme rang'],
      ['Suite majorée, minorée, bornée', 'Majorée si u_n ≤ M pour tout n ; minorée si u_n ≥ m pour tout n ; bornée si elle est majorée et minorée.', 'suite bornee majoree minoree'],
      ['Suite monotone', 'Croissante si u_(n+1) ≥ u_n pour tout n ; décroissante si u_(n+1) ≤ u_n ; constante si u_(n+1) = u_n.', 'suite monotone croissante decroissante'],
      ['Suite arithmétique', 'u_(n+1) = u_n + r : terme général u_n = u_0 + n·r. La différence entre deux termes consécutifs est constante.', 'suite arithmetique raison difference'],
      ['Suite géométrique', 'u_(n+1) = q·u_n : terme général u_n = u_0·q^n. Le rapport entre deux termes consécutifs est constant.', 'suite geometrique raison quotient'],
      ['Somme des termes d\'une suite', 'Somme des n premiers termes d\'une suite arithmétique et d\'une suite géométrique : formules de référence.', 'somme termes suite serie'],
      ['Sens de variation d\'une suite', 'Suite arithmétique : croissante si r > 0. Suite géométrique : croissante si q > 1 et u_0 > 0.', 'variation suite raison signe'],
      ['Convergence d\'une suite', 'Une suite converge vers L si u_n devient aussi proche de L que l\'on veut à partir d\'un certain rang.', 'convergence suite limite'],
      ['Suite de limite infinie', 'Une suite tend vers +∞ si tout intervalle ]M ; +∞[ contient tous les termes à partir d\'un certain rang.', 'limite infinie suite divergence'],
      ['Raisonnement par récurrence', 'Pour prouver qu\'une propriété P(n) est vraie pour tout n : initialisation au rang de départ, puis hérédité (P(n) ⟹ P(n+1)).', 'recurrence initialisation heredite'],
      ['Théorèmes de comparaison pour les suites', 'Encadrement et gendarmes : si v_n ≤ u_n ≤ w_n et si v_n et w_n convergent vers L, alors u_n converge vers L.', 'comparaison gendarmes suite encadrement'],
      ['Théorème de convergence monotone', 'Une suite croissante et majorée converge ; une suite décroissante et minorée converge.', 'convergence monotone bornee'],
      ['Suite récurrente u_(n+1) = f(u_n)', 'Étude d\'une suite définie par récurrence : on cherche les points fixes de f et on étudie le signe de f(x) − x.', 'suite recurrente point fixe signe'],
      ['Suites adjacentes', 'Deux suites adjacentes (l\'une croissante, l\'autre décroissante, d\'écart tendant vers 0) convergent vers la même limite.', 'suites adjacentes convergence'],
    ],
  },

  // --- Probabilités ---
  {
    id: 'probabilites',
    matieres: ['mathematiques'],
    motsChapitre: ['probabilite'],
    notions: [
      ['Vocabulaire des probabilités', 'Expérience aléatoire, univers Ω (ensemble des issues), événement (partie de Ω), événement élémentaire.', 'vocabulaire univers evenement'],
      ['Équiprobabilité', 'Si les n issues sont équiprobables, la probabilité d\'un événement A est le nombre de cas favorables divisé par n.', 'equiprobabilite cas favorables'],
      ['Probabilité et événement contraire', 'Une probabilité est comprise entre 0 et 1 ; P(Ω) = 1 et P(Ā) = 1 − P(A).', 'probabilite contraire complementaire'],
      ['Réunion et intersection', 'P(A ∪ B) = P(A) + P(B) − P(A ∩ B) ; si A et B sont incompatibles, P(A ∪ B) = P(A) + P(B).', 'reunion intersection incompatible'],
      ['Probabilité conditionnelle', 'P(A|B) = P(A ∩ B)/P(B) : probabilité de A sachant que B est réalisé (avec P(B) ≠ 0).', 'probabilite conditionnelle sachant'],
      ['Arbre pondéré', 'Représentation d\'une expérience à plusieurs étapes : on multiplie les probabilités le long d\'un chemin et on additionne les chemins.', 'arbre pondere chemin produit'],
      ['Indépendance de deux événements', 'A et B sont indépendants si P(A ∩ B) = P(A)·P(B), ce qui équivaut à P(A|B) = P(A).', 'independance evenements produit'],
      ['Formule des probabilités totales', 'Si les événements B_i forment une partition de Ω, alors P(A) est la somme des P(A ∩ B_i).', 'probabilites totales partition'],
      ['Formule de Bayes', 'P(B_i|A) = P(A|B_i)·P(B_i)/P(A) : révision des probabilités après une observation.', 'bayes revision conditionnelle'],
      ['Dénombrement et probabilités', 'Quand l\'univers fini est équiprobable, on compte les cas favorables à l\'aide des arrangements et des combinaisons.', 'denombrement probabilite combinaison'],
      ['Épreuve et schéma de Bernoulli', 'Épreuve de Bernoulli : deux issues (succès de probabilité p, échec de probabilité 1 − p). Schéma : n épreuves identiques et indépendantes.', 'bernoulli succes echec schema'],
      ['Loi binomiale', 'Si X compte les succès dans un schéma de Bernoulli : P(X = k) = C(n ; k)·p^k·(1 − p)^(n−k).', 'loi binomiale coefficients schema'],
    ],
  },

  // --- Variables aléatoires ---
  {
    id: 'variables_aleatoires',
    matieres: ['mathematiques'],
    motsChapitre: ['variables aleatoires'],
    notions: [
      ['Variable aléatoire discrète', 'Une variable aléatoire X associe un nombre réel à chaque issue de l\'univers : X : Ω → ℝ.', 'variable aleatoire discrete univers'],
      ['Loi de probabilité', 'On donne P(X = x_i) pour chaque valeur possible : la somme de ces probabilités vaut 1.', 'loi probabilite valeurs somme'],
      ['Fonction de répartition', 'F(x) = P(X ≤ x) : fonction en escalier, croissante, de limite 0 en −∞ et 1 en +∞.', 'fonction repartition cumul'],
      ['Espérance mathématique', 'E(X) est la somme des x_i·P(X = x_i) : moyenne théorique sur un très grand nombre d\'expériences.', 'esperance mathematique moyenne'],
      ['Variance et écart-type', 'V(X) = E(X²) − (E(X))² et σ(X) = √V(X) : mesurent la dispersion autour de l\'espérance.', 'variance ecart type dispersion'],
      ['Linéarité de l\'espérance', 'E(aX + b) = a·E(X) + b et V(aX + b) = a²·V(X) : effets d\'un changement d\'unité.', 'linearite esperance variance unite'],
      ['Loi de Bernoulli', 'X vaut 1 avec la probabilité p et 0 avec la probabilité 1 − p : E(X) = p et V(X) = p(1 − p).', 'bernoulli esperance variance'],
      ['Loi binomiale', 'X suit la loi B(n ; p) : E(X) = n·p et V(X) = n·p·(1 − p).', 'binomiale esperance variance'],
      ['Loi uniforme discrète', 'Les n valeurs possibles ont la même probabilité 1/n : espérance égale à la moyenne de ces valeurs.', 'loi uniforme discrete equiprobable'],
      ['Loi de Poisson', 'Modélise un nombre d\'événements rares : P(X = k) = e^(−λ)·λ^k/k!, avec E(X) = V(X) = λ.', 'poisson evenement rare lambda'],
      ['Variables aléatoires indépendantes', 'X et Y sont indépendantes si P(X = x et Y = y) = P(X = x)·P(Y = y) ; alors V(X + Y) = V(X) + V(Y).', 'independance variables somme variance'],
    ],
  },

  // --- Statistique ---
  {
    id: 'statistique',
    matieres: ['mathematiques'],
    motsChapitre: [
      'statistique',
      'series statistiques',
    ],
    notions: [
      ['Série statistique à une variable', 'Effectifs, fréquences et regroupement en classes d\'un caractère quantitatif.', 'serie statistique effectif frequence'],
      ['Moyenne d\'une série statistique', 'Moyenne pondérée : x̄ = somme des n_i·x_i divisée par l\'effectif total N.', 'moyenne ponderee effectif total'],
      ['Médiane et quartiles', 'Médiane : valeur qui partage la série en deux ; Q1 et Q3 : premier et troisième quartiles ; écart interquartile Q3 − Q1.', 'mediane quartile interquartile'],
      ['Mode et classe modale', 'Valeur (ou classe) de plus grand effectif : elle caractérise la valeur la plus fréquente de la série.', 'mode classe modale effectif'],
      ['Variance et écart-type d\'une série', 'V est la moyenne des carrés moins le carré de la moyenne ; σ = √V mesure la dispersion des valeurs.', 'variance ecart type dispersion serie'],
      ['Diagramme en boîte', 'Représentation de la médiane, des quartiles et des valeurs extrêmes : permet de comparer visuellement plusieurs séries.', 'diagramme boite moustache quartile'],
      ['Série statistique double', 'Série de couples (x_i ; y_i) : on étudie le lien statistique entre les deux caractères.', 'serie double couple caractere'],
      ['Nuage de points', 'Représentation graphique des couples (x_i ; y_i) dans le plan : forme du nuage et allure de la liaison.', 'nuage de points graphique liaison'],
      ['Point moyen', 'Le point moyen G a pour coordonnées les moyennes x̄ et ȳ des deux séries.', 'point moyen coordonnees moyenne'],
      ['Ajustement affine par les moindres carrés', 'La droite de régression de y en x minimise la somme des carrés des écarts : y = a·x + b (a = Cov(x ; y)/V(x)).', 'ajustement affine moindres carres regression'],
      ['Coefficient de corrélation linéaire', 'r est compris entre −1 et 1 ; |r| proche de 1 traduit une forte liaison linéaire entre x et y.', 'coefficient correlation lineaire'],
      ['Prévision par ajustement', 'On utilise la droite d\'ajustement pour estimer une valeur (interpolation ou extrapolation) puis on discute la fiabilité.', 'prevision interpolation extrapolation'],
    ],
  },

  // --- Dénombrements ---
  {
    id: 'denombrements',
    matieres: ['mathematiques'],
    motsChapitre: [
      'denombrements',
      'denombrement',
    ],
    notions: [
      ['Principe additif et principe multiplicatif', 'Un choix en k étapes successives se compte en multipliant le nombre de possibilités de chaque étape.', 'principe multiplicatif additif'],
      ['p-uplets', 'Un p-uplet est une liste ordonnée de p éléments choisis parmi n, avec répétition possible : n^p possibilités.', 'p uplets liste repetee'],
      ['Arrangements', 'Un arrangement est une liste ordonnée sans répétition de p éléments parmi n : A(n ; p) = n!/(n − p)!.', 'arrangement ordonne sans repetition'],
      ['Permutations', 'Une permutation est un arrangement de tous les éléments : n! dispositions possibles.', 'permutation factorielle ordre'],
      ['Combinaisons', 'Une combinaison est un sous-ensemble de p éléments parmi n : C(n ; p) = n!/(p!·(n − p)!) ; l\'ordre ne compte pas.', 'combinaison sous ensemble ordre'],
      ['Formule de Pascal', 'C(n ; p) = C(n − 1 ; p − 1) + C(n − 1 ; p), pour 1 ≤ p ≤ n − 1.', 'pascal relation coefficients'],
      ['Triangle de Pascal', 'Disposition des coefficients binomiaux : chaque nombre est la somme des deux nombres situés au-dessus de lui.', 'triangle pascal coefficients binomiaux'],
      ['Binôme de Newton', '(a + b)^n est la somme des C(n ; k)·a^k·b^(n−k) : développement d\'une puissance de binôme.', 'binome newton developpement'],
      ['Propriétés des coefficients binomiaux', 'C(n ; 0) = C(n ; n) = 1 ; C(n ; p) = C(n ; n − p) ; la somme de tous les coefficients vaut 2^n.', 'coefficients binomiaux symetrie somme'],
    ],
  },

  // --- Angles orientés et trigonométrie ---
  {
    id: 'trigonometrie',
    matieres: ['mathematiques'],
    motsChapitre: [
      'trigonometrie',
      'angles orientes',
    ],
    notions: [
      ['Cercle trigonométrique', 'Cercle de rayon 1 orienté : on y enroule la droite des réels, un tour complet correspondant à 2π radians.', 'cercle trigonometrique radian'],
      ['Mesure d\'un angle orienté', 'Mesure principale en radians dans ]−π ; π] ; conversion degrés/radians : 180° = π rad.', 'angle oriente radian mesure principale'],
      ['Cosinus et sinus', 'Pour un point M du cercle trigonométrique : cos θ est son abscisse et sin θ son ordonnée ; cos²θ + sin²θ = 1.', 'cosinus sinus relation fondamentale'],
      ['Angles associés', 'Relations entre cos et sin de θ, −θ, π − θ, π + θ et π/2 − θ : elles simplifient les expressions trigonométriques.', 'angles associes symetrie formule'],
      ['Formules d\'addition', 'cos(a + b) = cos a·cos b − sin a·sin b et sin(a + b) = sin a·cos b + cos a·sin b.', 'formules addition cosinus sinus'],
      ['Formules de duplication', 'cos(2a) = cos²a − sin²a = 2cos²a − 1 et sin(2a) = 2·sin a·cos a.', 'duplication cosinus sinus double'],
      ['Tangente', 'tan θ = sin θ/cos θ, définie pour cos θ ≠ 0 ; tan(π/4) = 1 et tan(π/3) = √3.', 'tangente trigonometrie quotient'],
      ['Équations trigonométriques', 'cos x = cos a équivaut à x = ±a + 2kπ ; sin x = sin a équivaut à x = a + 2kπ ou x = π − a + 2kπ.', 'equations trigonometriques solutions'],
      ['Représentations graphiques de sin et cos', 'Courbes périodiques de période 2π, comprises entre −1 et 1 et décalées de π/2 l\'une par rapport à l\'autre.', 'courbes sinus cosinus periode'],
      ['Théorème du cosinus (Al-Kashi)', 'a² = b² + c² − 2·b·c·cos Â : généralisation du théorème de Pythagore aux triangles quelconques.', 'al kashi cosinus triangle'],
      ['Linéarisation et factorisation', 'Transformations de produits en sommes (et inversement) pour simplifier les expressions trigonométriques.', 'linearisation factorisation trigonometrique'],
    ],
  },

  // --- Produit scalaire ---
  {
    id: 'produit_scalaire',
    matieres: ['mathematiques'],
    motsChapitre: ['produit scalaire'],
    notions: [
      ['Définition du produit scalaire', 'Le produit scalaire de deux vecteurs est le réel |u|·|v|·cos(u ; v) : ce n\'est pas un vecteur.', 'definition produit scalaire cosinus'],
      ['Propriétés du produit scalaire', 'Symétrie : u · v = v · u ; bilinéarité : u · (v + w) = u · v + u · w et (k·u) · v = k·(u · v).', 'proprietes bilinearite symetrie'],
      ['Expression analytique', 'Dans un repère orthonormé : u(x ; y) · v(x\' ; y\') = x·x\' + y·y\'.', 'expression analytique coordonnees'],
      ['Norme et distance', '|u|² = u · u, et la distance AB est la norme du vecteur AB.', 'norme distance vecteur'],
      ['Orthogonalité', 'Deux vecteurs non nuls sont orthogonaux si et seulement si leur produit scalaire est nul.', 'orthogonalite vecteurs nul'],
      ['Théorème d\'Al-Kashi', 'a² = b² + c² − 2·b·c·cos Â : lien entre produit scalaire et longueurs dans un triangle.', 'al kashi longueurs triangle'],
      ['Théorème de la médiane', 'AB² + AC² = 2·AI² + BC²/2, où I est le milieu du segment [BC].', 'theoreme mediane milieu triangle'],
      ['Équation d\'un cercle', 'Le cercle de centre A et de rayon r est l\'ensemble des points M tels que AM² = r².', 'equation cercle rayon centre'],
      ['Lignes de niveau', 'Ensemble des points M tels que MA · MB = k : selon la valeur de k, on obtient un cercle, un point ou l\'ensemble vide.', 'lignes de niveau ensemble points'],
      ['Applications du produit scalaire', 'Calcul de longueurs, d\'angles et de distances, et démonstrations d\'orthogonalité ou d\'alignement.', 'applications distances angles orthogonalite'],
    ],
  },

  // --- Vecteurs du plan et barycentre ---
  {
    id: 'vecteurs_barycentre',
    matieres: ['mathematiques'],
    motsChapitre: ['vecteurs du plan'],
    notions: [
      ['Vecteur et translation', 'Un vecteur AB est caractérisé par sa direction, son sens et sa norme : il représente la translation de A vers B.', 'vecteur translation direction norme'],
      ['Coordonnées d\'un vecteur', 'Dans un repère, les coordonnées du vecteur AB sont (x_B − x_A ; y_B − y_A).', 'coordonnees vecteur repere'],
      ['Colinéarité', 'u et v sont colinéaires si l\'un est le produit de l\'autre par un réel : det(u ; v) = x·y\' − x\'·y = 0.', 'colinearite determinant vecteurs'],
      ['Barycentre de deux points', 'Le barycentre de (A ; a) et (B ; b), avec a + b ≠ 0, est le point G tel que a·GA + b·GB = 0.', 'barycentre deux points ponderes'],
      ['Barycentre de n points', 'Le barycentre des points (A_i ; a_i) est le point G vérifiant la somme des a_i·GA_i = 0 (somme des a_i non nulle).', 'barycentre n points definition'],
      ['Coordonnées du barycentre', 'x_G est la moyenne des abscisses pondérée par les coefficients a_i, et de même pour y_G.', 'coordonnees barycentre moyenne ponderee'],
      ['Associativité du barycentre', 'On peut remplacer un sous-ensemble de points pondérés par son barycentre affecté de la somme des coefficients.', 'associativite barycentre regroupement'],
      ['Barycentre, alignement et concours', 'Le barycentre permet de démontrer des alignements de points et des concours de droites.', 'alignement concours barycentre'],
      ['Construction à partir d une égalité vectorielle', 'Pour placer un point défini par une égalité vectorielle, on décompose chaque vecteur dans une base puis on construit pas à pas : par exemple AE = AB + AC place E au sommet du parallélogramme ABEC.', 'construction point egalite vectorielle base'],
      ['Barycentre avec paramètre et centre de gravité', 'Si A prime vérifie A prime B + k A prime C = 0 avec k différent de -1, alors pour tout M : MB + k MA = (1 + k) MA prime. En prenant M = G centre de gravité du triangle, on retrouve GA + GB + GC = 0.', 'barycentre parametre centre gravite'],
      ['Problème vectoriel paramétré', 'Quand un point dépend d un réel k (par exemple AM = k AB), on exprime les vecteurs cherchés en fonction de k puis on résout : milieu si MK = KN, parallélisme si les vecteurs sont colinéaires.', 'parametre reel milieu parallele resolution'],
      ['Équation d\'une droite', 'Une droite est l\'ensemble des points M dont les coordonnées vérifient une équation cartésienne ax + by + c = 0.', 'equation cartesienne droite'],
    ],
  },

  // --- Calculs barycentriques ---
  {
    id: 'calculs_barycentriques',
    matieres: ['mathematiques'],
    motsChapitre: ['barycentr'],
    notions: [
      ['Barycentre de deux points pondérés', 'Construction : le barycentre se situe sur la droite (AB), plus près du point affecté du plus grand coefficient.', 'barycentre ponderes construction'],
      ['Barycentre de trois points et plus', 'G existe si la somme des coefficients est non nulle : il réduit la somme vectorielle des a_i·MA_i.', 'barycentre trois points reduction'],
      ['Coordonnées barycentriques', 'Les coordonnées du barycentre sont les moyennes pondérées des coordonnées des points du système.', 'coordonnees barycentriques ponderees'],
      ['Associativité et regroupement', 'Le regroupement de points pondérés simplifie les calculs vectoriels et permet de placer le barycentre.', 'associativite regroupement calculs'],
      ['Barycentre et milieux', 'Le milieu d\'un segment est l\'isobarycentre de ses extrémités ; le centre de gravité d\'un triangle est l\'isobarycentre de ses sommets.', 'milieu isobarycentre centre gravite'],
      ['Réduction vectorielle', 'Si G est le barycentre des (A_i ; a_i), alors la somme des a_i·MA_i = (somme des a_i)·MG.', 'reduction vectorielle relation'],
      ['Isobarycentre', 'Barycentre dont tous les coefficients sont égaux : il est équidistant, en moyenne pondérée, des points du système.', 'isobarycentre coefficients egaux'],
      ['Applications du barycentre', 'Alignements, intersections de droites, recherche de lieux géométriques et problèmes d\'équilibre.', 'applications barycentre lieux equilibre'],
    ],
  },

  // --- Transformations du plan ---
  {
    id: 'transformations',
    matieres: ['mathematiques'],
    motsChapitre: ['transformations du plan'],
    notions: [
      ['Translation', 'La translation de vecteur u associe au point M le point M\' tel que MM\' = u : c\'est un déplacement sans rotation.', 'translation vecteur deplacement'],
      ['Rotation', 'La rotation de centre O et d\'angle θ associe à M le point M\' tel que OM\' = OM et l\'angle (OM ; OM\') = θ.', 'rotation centre angle'],
      ['Symétrie axiale', 'La symétrie d\'axe (d) est l\'involution qui conserve les distances et renverse l\'orientation.', 'symetrie axiale reflexion'],
      ['Symétrie centrale', 'La symétrie de centre O associe à M le point M\' tel que O soit le milieu de [MM\'].', 'symetrie centrale milieu'],
      ['Applications affines et transformations', 'Une application affine du plan est définie par une application linéaire associée et un vecteur de translation.', 'application affine transformation composee'],
      ['Propriétés de conservation', 'Les transformations conservent les distances, les angles, l\'alignement, les milieux et les aires.', 'conservation distances angles alignement'],
      ['Composée de transformations', 'Composer deux transformations revient à appliquer successivement leurs actions : la composée peut être une translation ou une rotation.', 'composee transformation rotation translation'],
      ['Transformations et figures', 'Les transformations permettent d\'étudier les symétries d\'une figure et de construire des images de points.', 'figures images construction'],
    ],
  },

  // --- Géométrie dans l'espace ---
  {
    id: 'geometrie_espace',
    matieres: ['mathematiques'],
    motsChapitre: ['geometrie dans l espace'],
    notions: [
      ['Points, droites et plans', 'Dans l\'espace, une droite est déterminée par deux points, un plan par trois points non alignés.', 'droite plan points alignes'],
      ['Positions relatives de droites et de plans', 'Deux droites peuvent être coplanaires (sécantes ou parallèles) ou non coplanaires ; une droite et un plan peuvent être sécants ou parallèles.', 'positions relatives coplanaire parallele'],
      ['Droites orthogonales', 'Deux droites sont orthogonales si elles ont des directions orthogonales : leurs parallèles se coupent à angle droit.', 'droites orthogonales directions'],
      ['Droite perpendiculaire à un plan', 'Une droite est perpendiculaire à un plan si elle est orthogonale à deux droites sécantes de ce plan.', 'perpendiculaire plan orthogonale'],
      ['Plans perpendiculaires', 'Deux plans sont perpendiculaires si l\'un contient une droite perpendiculaire à l\'autre.', 'plans perpendiculaires droite'],
      ['Vecteurs de l\'espace', 'Un vecteur de l\'espace est un triplet de coordonnées ; la colinéarité et la coplanarité se traduisent par des déterminants nuls.', 'vecteur espace coordonnees coplanaire'],
      ['Équation cartésienne d\'un plan', 'Un plan admet une équation de la forme ax + by + cz + d = 0, où (a ; b ; c) est un vecteur normal.', 'equation plan vecteur normal'],
      ['Représentation paramétrique de droite', 'La droite passant par A de vecteur directeur u a pour représentation M = A + t·u, avec t réel.', 'representation parametrique droite vecteur'],
      ['Produit scalaire dans l\'espace', 'Le produit scalaire et la norme se calculent comme dans le plan, en ajoutant la troisième coordonnée.', 'produit scalaire espace trois coordonnees'],
      ['Sphère', 'La sphère de centre A et de rayon r est l\'ensemble des points M tels que AM = r.', 'sphere centre rayon'],
      ['Distance d\'un point à un plan', 'La distance du point M au plan d\'équation ax+by+cz+d=0 vaut |ax_M+by_M+cz_M+d| divisé par √(a²+b²+c²).', 'distance point plan normale'],
      ['Volumes et sections', 'Calculs de volumes (pavé, cylindre, cône, sphère) et sections planes de solides pour les problèmes de géométrie dans l\'espace.', 'volume section solide espace'],
    ],
  },

  // --- Coniques ---
  {
    id: 'coniques',
    matieres: ['mathematiques'],
    motsChapitre: ['coniques'],
    notions: [
      ['Parabole', 'La parabole est l\'ensemble des points équidistants d\'un point F (foyer) et d\'une droite (d) (directrice).', 'parabole foyer directrice excentricite'],
      ['Équation réduite de la parabole', 'Dans un repère bien choisi, son équation est y² = 2·p·x ; l\'axe de la parabole passe par le foyer.', 'parabole equation reduite axe'],
      ['Ellipse', 'L\'ellipse est l\'ensemble des points M tels que MF + MF\' = 2a, avec F et F\' les foyers et 2a le grand axe.', 'ellipse foyer grand axe'],
      ['Équation réduite de l\'ellipse', 'Son équation réduite est x²/a² + y²/b² = 1, avec a demi-grand axe et b demi-petit axe (a ≥ b > 0).', 'ellipse equation reduite demi axes'],
      ['Hyperbole', 'L\'hyperbole est l\'ensemble des points M tels que |MF − MF\'| = 2a : elle possède deux branches et deux asymptotes.', 'hyperbole foyer branches asymptotes'],
      ['Équation réduite de l\'hyperbole', 'Son équation réduite est x²/a² − y²/b² = 1 et ses asymptotes sont les droites y = ±(b/a)·x.', 'hyperbole equation reduite asymptotes'],
      ['Conique et excentricité', 'Les coniques sont les courbes obtenues par section d\'un cône : parabole, ellipse et hyperbole selon l\'inclinaison du plan.', 'conique section cone excentricite'],
      ['Foyers et directrices', 'La définition par foyer et directrice unifie les trois coniques à l\'aide de l\'excentricité e.', 'foyer directrice excentricite conique'],
      ['Représentation paramétrique des coniques', 'Ellipse : x = a·cos t et y = b·sin t ; hyperbole : cosinus hyperbolique et sinus hyperbolique.', 'representation parametrique conique parametre'],
      ['Tangente à une conique', 'On obtient l\'équation de la tangente en un point de la conique à partir de l\'équation réduite (méthode du dédoublement).', 'tangente conique point contact'],
    ],
  },

  // --- Applications affines du plan ---
  {
    id: 'applications_affines_plan',
    matieres: ['mathematiques'],
    motsChapitre: ['applications affines du plan'],
    notions: [
      ['Application affine du plan', 'Définie par z\' = a·z + b (avec a ≠ 0) en écriture complexe : elle se décompose en une similitude et une translation.', 'application affine plan ecriture complexe'],
      ['Application linéaire associée', 'L\'application linéaire associée à z\' = a·z + b est z ↦ a·z : elle porte l\'action sur les vecteurs.', 'application lineaire associee vecteur'],
      ['Éléments caractéristiques', 'Rapport |a|, angle arg(a) et l\'image de l\'origine b déterminent complètement l\'application affine.', 'rapport angle image origine'],
      ['Point fixe', 'Le point fixe, s\'il existe, vérifie ω = a·ω + b : c\'est le centre de la transformation.', 'point fixe centre transformation'],
      ['Classification des applications affines', 'Selon |a| et arg(a), on obtient une translation, une rotation, une homothétie ou une similitude directe.', 'classification translation rotation homothetie'],
      ['Image d\'une droite ou d\'un cercle', 'Une application affine transforme une droite en une droite et un cercle en un cercle (ou une ellipse) selon son rapport.', 'image droite cercle transformation'],
      ['Composition des applications affines', 'La composée de deux applications affines est encore une application affine ; la structure est celle du groupe affine.', 'composition groupe affine structure'],
      ['Applications affines et problèmes', 'Résolution de problèmes de lieux géométriques et de constructions à l\'aide des applications affines.', 'lieux geometriques constructions'],
    ],
  },

  // --- Similitudes planes directes ---
  {
    id: 'similitudes',
    matieres: ['mathematiques'],
    motsChapitre: ['similitudes planes'],
    notions: [
      ['Définition d\'une similitude directe', 'Une similitude directe de centre Ω, de rapport k > 0 et d\'angle θ transforme M en M\' avec ΩM\' = k·ΩM et l\'angle (ΩM ; ΩM\') = θ.', 'similitude directe rapport angle'],
      ['Écriture complexe', 'z\' − ω = a·(z − ω) avec a = k·e^(iθ) : rapport |a| = k et angle arg(a) = θ.', 'ecriture complexe similitude rapport'],
      ['Similitude directe et transformations', 'Une similitude directe de rapport 1 est une rotation ou une translation ; de rapport k ≠ 1, une rotation composée avec une homothétie.', 'rotation translation homothetie rapport'],
      ['Similitude indirecte', 'Une similitude indirecte est la composée d\'une similitude directe et d\'une symétrie : son écriture complexe fait intervenir le conjugué.', 'similitude indirecte conjugue symetrie'],
      ['Centre et point fixe', 'Le centre de la similitude est son unique point fixe, obtenu en résolvant ω = a·ω + b.', 'centre point fixe similitude'],
      ['Propriétés de conservation', 'Une similitude conserve les angles, les rapports de longueurs et transforme les cercles en cercles.', 'conservation angles rapports cercles'],
      ['Similitudes et figures semblables', 'Deux figures sont semblables si l\'une est l\'image de l\'autre par une similitude : même forme, échelle éventuellement différente.', 'figures semblables forme echelle'],
      ['Applications des similitudes', 'Résolution de problèmes de construction et de lieux géométriques, en particulier dans les triangles rectangles (spirale des carrés).', 'applications constructions lieux'],
    ],
  },

  // --- Applications affines de l'espace ---
  {
    id: 'applications_affines_espace',
    matieres: ['mathematiques'],
    motsChapitre: ['applications affines de l espace'],
    notions: [
      ['Application affine de l\'espace', 'Définie par une application linéaire de l\'espace vectoriel associé et un vecteur de translation.', 'application affine espace vecteur'],
      ['Repère et coordonnées', 'Dans un repère (O ; i ; j ; k), une application affine s\'écrit à l\'aide d\'une matrice 3×3 et d\'un vecteur colonne.', 'repere coordonnees matrice espace'],
      ['Points fixes', 'L\'ensemble des points fixes est vide, un point unique, une droite ou un plan selon le rang de l\'application linéaire associée.', 'points fixes rang droite plan'],
      ['Transformations de l\'espace', 'Translations, rotations autour d\'un axe, symétries et homothéties de l\'espace sont des applications affines particulières.', 'translation rotation axe symetrie'],
      ['Propriétés de conservation', 'Les applications affines bijectives conservent l\'alignement, le parallélisme et les milieux, et multiplient les volumes par un facteur constant.', 'conservation alignement volumes'],
      ['Composée et applications réciproques', 'La composée de deux applications affines est affine ; une application affine bijective admet une application réciproque affine.', 'composee reciproque bijective'],
      ['Applications aux solides', 'Étude de la symétrie des solides et des transformations conservant leurs propriétés géométriques.', 'solides symetrie proprietes'],
      ['Problèmes de géométrie dans l\'espace', 'Utilisation des applications affines pour démontrer des propriétés de droites et de plans de l\'espace.', 'problemes demonstration droites plans'],
    ],
  },

  // --- Équations différentielles ---
  {
    id: 'equations_differentielles',
    matieres: ['mathematiques'],
    motsChapitre: ['equations differentielles'],
    notions: [
      ['Équation différentielle linéaire du premier ordre', 'Équation de la forme y\' = a·y + b (a ≠ 0) : on cherche la solution générale puis la solution vérifiant une condition initiale.', 'equation differentielle premier ordre'],
      ['Équation y\' = a·y', 'Les solutions sont les fonctions x ↦ C·e^(a·x), où C est une constante réelle.', 'equation homogene solutions constante'],
      ['Équation y\' = a·y + b', 'Solution particulière constante y = −b/a, puis solution générale : y = C·e^(a·x) − b/a.', 'solution particuliere constante generale'],
      ['Détermination de la constante', 'La condition initiale y(x₀) = y₀ permet de calculer la constante C et de trouver la solution unique du problème.', 'condition initiale constante unique'],
      ['Équation différentielle du second ordre', 'Équation de la forme y\'\' + a·y\' + b·y = 0 : on écrit l\'équation caractéristique r² + a·r + b = 0.', 'second ordre equation caracteristique'],
      ['Discriminant et solutions', 'Selon le signe du discriminant de l\'équation caractéristique, la solution générale fait intervenir deux exponentielles ou des exponentielles-cosinus.', 'discriminant racines solution generale'],
      ['Modélisation et applications', 'Refroidissement de Newton, charge d\'un condensateur, décroissance radioactive : de nombreux phénomènes se modélisent par une équation différentielle.', 'modelisation refroidissement condensateur'],
      ['Vérification et sens de la solution', 'On vérifie toujours qu\'une fonction proposée est solution en la dérivant, et on discute la validité physique du résultat.', 'verification solution coherence'],
    ],
  },

  // --- Calculs dans ℝ et encadrements ---
  {
    id: 'calculs_reels',
    matieres: ['mathematiques'],
    motsChapitre: [
      'calculs dans',
      'encadrements et approximations',
    ],
    notions: [
      ['Nombres et intervalles', 'Notations des ensembles de nombres (ℕ, ℤ, ℚ, ℝ) et des intervalles ouverts, fermés et non bornés.', 'nombres intervalles ensembles'],
      ['Calcul littéral', 'Développement, factorisation et réduction d\'expressions littérales à l\'aide des identités remarquables.', 'calcul litteral developpement factorisation'],
      ['Puissances et racines carrées', 'Règles de calcul sur les puissances entières et rationnelles, et manipulation des radicaux (a·√b = √(a²b)).', 'puissances racines calcul regles'],
      ['Équations et inéquations du premier degré', 'Résolution algébrique puis représentation des solutions sur la droite graduée.', 'equation inequation premier degre solution'],
      ['Valeurs absolues', '|x| est la distance de x à 0 ; |x| = a équivaut à x = a ou x = −a et |x| ≤ a équivaut à −a ≤ x ≤ a.', 'valeur absolue distance encadrement'],
      ['Encadrements et approximations', 'Encadrer un réel à l\'aide d\'inégalités, donner une valeur approchée par défaut ou par excès et déterminer un ordre de grandeur.', 'encadrement approximation ordre grandeur'],
      ['Valeur approchée et arrondi', 'Arrondir à un rang donné (unité, dixième, centième) et estimer l\'erreur d\'arrondi commise.', 'arrondi valeur approchee erreur'],
      ['Proportionnalité et pourcentages', 'Coefficient de proportionnalité, pourcentages d\'augmentation ou de diminution et calcul de quantités.', 'proportionnalite pourcentage coefficient'],
    ],
  },

  // --- Généralités sur les fonctions ---
  {
    id: 'generalites_fonctions',
    matieres: ['mathematiques'],
    motsChapitre: [
      'generalites sur les fonctions',
      'fonctions numeriques d une variable',
      'ensemble de definition',
      'image et antecedent',
      'parite',
      'sens de variation',
      'tableau de variations',
      'extremum',
      'fonctions de reference',
      'fonction carre',
      'fonction inverse',
      'fonction racine',
      'fonction affine',
      'fonction lineaire',
    ],
    notions: [
      ['Ensemble de définition', 'L\'ensemble des réels x pour lesquels f(x) est définie : exclure les dénominateurs nuls et les radicaux négatifs.', 'domaine definition ensemble'],
      ['Image d\'un réel', 'f(a) est l\'unique réel obtenu en remplaçant x par a dans l\'expression de f.', 'image fonction valeur'],
      ['Antécédents d\'un réel', 'Les réels x tels que f(x) = b : on résout l\'équation f(x) = b.', 'antecedent equation resolution'],
      ['Fonction paire', 'f(−x) = f(x) pour tout x : courbe symétrique par rapport à l\'axe des ordonnées.', 'parite paire symetrie axe vertical'],
      ['Fonction impaire', 'f(−x) = −f(x) pour tout x : courbe symétrique par rapport à l\'origine du repère.', 'parite impaire symetrie origine'],
      ['Sens de variation', 'Croissante : a < b entraîne f(a) < f(b). Décroissante : a < b entraîne f(a) > f(b).', 'variation croissante decroissante definition'],
      ['Tableau de variations', 'Synthèse des variations : flèches montrant la croissance ou la décroissance entre les valeurs clés.', 'tableau variations notation'],
      ['Maximum et minimum', 'Maximum M en x₀ si f(x) ≤ M pour tout x ; minimum m si f(x) ≥ m pour tout x.', 'extremum maximum minimum global'],
      ['Fonction carré', 'x ↦ x² : paire, décroissante sur ]−∞ ; 0] et croissante sur [0 ; +∞[, minimum 0 en 0.', 'fonction carre variation'],
      ['Fonction inverse', 'x ↦ 1/x : impaire, décroissante sur chacun des deux intervalles, asymptote y = 0.', 'fonction inverse asymptote'],
      ['Fonction racine carrée', 'x ↦ √x : définie sur [0 ; +∞[, strictement croissante, courbe dans le premier quadrant.', 'fonction racine carree variation'],
      ['Fonction affine', 'x ↦ ax+b avec a ≠ 0 : croissante si a > 0, décroissante si a < 0 ; linéaire si b = 0.', 'fonction affine variation'],
      ['Fonction linéaire', 'x ↦ ax : situation de proportionnalité, droite passant par l\'origine du repère.', 'fonction lineaire proportionnalite'],
    ],
  },

  // --- Exemples d'études de fonctions ---
  {
    id: 'etudes_fonctions',
    matieres: ['mathematiques'],
    motsChapitre: ['exemples d etudes de fonctions'],
    notions: [
      ['Étude complète d\'une fonction', 'Plan : domaine de définition, limites, dérivée, tableau de variations, asymptotes, courbe.', 'etude fonction plan complet'],
      ['Dérivée et sens de variation', 'Le signe de la dérivée f\' donne le sens de variation de f sur chaque intervalle.', 'derivee signe variation'],
      ['Tableau de variations', 'Tableau regroupant les limites aux bornes, les valeurs de la dérivée et les extremums.', 'tableau variations limites extremum'],
      ['Asymptotes verticales et horizontales', 'Asymptote verticale en a si la limite est infinie en a ; horizontale en +∞ si la limite est finie.', 'asymptote verticale horizontale'],
      ['Branches paraboliques', 'Direction asymptotique quand f(x)/x tend vers une limite infinie ou finie.', 'branche parabolique direction asymptotique'],
      ['Centre et axe de symétrie', 'Courbe symétrique par rapport à une droite ou à un point : on peut réduire le domaine d\'étude.', 'symetrie axe centre courbe'],
      ['Position relative de deux courbes', 'On étudie le signe de la différence f(x) − g(x) pour situer les courbes l\'une par rapport à l\'autre.', 'position relative difference courbes'],
      ['Problème d\'optimisation', 'Traduire le problème en une fonction, puis chercher son maximum ou son minimum à l\'aide de la dérivée.', 'optimisation maximum minimum derivee'],
    ],
  },
];

export async function chargerNotionsChapitre(
  chapitreId: string,
  coursCache: { titre?: string; matiere?: string; theorie?: string; methode_content?: string } | null,
  contenuFirebase?: { titre?: string; matiere?: string; theorie?: string; methode_content?: string } | null,
  matiereExplicite?: string
): Promise<MicroNotion[]> {
  const source = contenuFirebase || coursCache;
  if (!source) return [];

  // Priorité aux notions curées : si le titre du chapitre correspond à un
  // groupe curé, on renvoie les vraies notions du programme (ids stables
  // `cur_<groupe>_<index>` pour que la maîtrise enregistrée survive aux rechargements).
  // Gating par matière : un chapitre ne déclenche que les groupes de sa matière.
  const titreChapitre = normaliserCle(source.titre || '');
  const matiereChapitre = normaliserCle(
    matiereExplicite || source.matiere || ''
  );
  for (const groupe of NOTIONS_CURATEES) {
    // Un groupe avec `matieres: []` couvre toutes les matières ; sinon la
    // matière du chapitre (si connue) doit figurer dans la liste du groupe.
    if (
      groupe.matieres.length > 0 &&
      matiereChapitre &&
      !groupe.matieres.includes(matiereChapitre)
    ) {
      continue;
    }
    const correspond = groupe.motsChapitre.some((m) => titreChapitre.includes(m));
    if (correspond) {
      return groupe.notions.map((n, i) => {
        const [titre, extrait, motsCles] = n;
        return {
          id: `cur_${groupe.id}_${i}`,
          titre,
          extrait,
          motsCles: motsCles.split(' ').filter((m) => m.length >= 3),
          ordre: i,
          maitrise: 0,
        };
      });
    }
  }

  const texte = `${source.theorie || ''}\n${source.methode_content || ''}`;
  const notions = extraireMicroNotions(texte);
  
  if (notions.length === 0 && texte.trim().length > 40) {
    const morceaux = texte.trim().split(/\n\n|\.\s+/).filter(m => m.trim().length > 20);
    return morceaux.slice(0, 15).map((m, i) => ({
      id: `notion_${i}`,
      titre: m.trim().split(' ').slice(0, 6).join(' '),
      extrait: m.trim().slice(0, 200),
      motsCles: m.trim().toLowerCase().split(' ').filter(w => w.length >= 3).slice(0, 5),
      ordre: i,
      maitrise: 0,
    }));
  }
  
  return notions;
}

export function couvrirNotions(
  notions: MicroNotion[],
  exercices: { enonce: string; chapitre?: string }[]
): { notion: MicroNotion; nbExercices: number }[] {
  return notions.map((notion) => {
    const mots = notion.motsCles.filter((m) => m.length >= 3);
    const nb = exercices.filter((exo) => {
      const cible = normaliserCle(`${exo.enonce} ${exo.chapitre || ''}`);
      return mots.some((m) => cible.includes(m));
    }).length;
    return { notion, nbExercices: nb };
  });
}
