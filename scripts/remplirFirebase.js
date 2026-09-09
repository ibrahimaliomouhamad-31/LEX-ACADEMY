import { initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC3y581S0nHqYfIX4TjvumGKLgpDj1G1dg",
  authDomain: "lex-academy-10eef.firebaseapp.com",
  projectId: "lex-academy-10eef",
  storageBucket: "lex-academy-10eef.firebasestorage.app",
  messagingSenderId: "512518959635",
  appId: "1:512518959635:web:b2463918d2633a4bea85e6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// THÉORIE CHAPITRE 16 : RESPIRATION ET FERMENTATIONS
// ==========================================
const theorieChap16 = `🎯 OBJECTIF DU CHAPITRE : Comprendre comment la cellule dégrade le glucose pour en extraire l'énergie (ATP), en comparant la voie aérobie (respiration) très rentable, et les voies anaérobies (fermentations) de survie.

━━━━━━━━━━━━━━━━━━━━━━━━
I. L'ATP : LA "DEVISE ÉNERGÉTIQUE" DES CELLULES
━━━━━━━━━━━━━━━━━━━━━━━━
Toute activité cellulaire (contraction musculaire, synthèse de protéines, division) nécessite de l'énergie. Cette énergie est stockée et transportée sous forme d'une molécule : l'Adénosine TriPhosphate (ATP).
• L'ATP est instable. Pour libérer de l'énergie, la cellule hydrolyse la dernière liaison phosphate : ATP + H₂O → ADP + Pi + ÉNERGIE.
• Pour refabriquer de l'ATP, la cellule doit dégrader des nutriments (principalement le Glucose C₆H₁₂O₆).

━━━━━━━━━━━━━━━━━━━━━━━━
II. LA RESPIRATION CELLULAIRE (La voie royale)
━━━━━━━━━━━━━━━━━━━━━━━━
La respiration est une dégradation AÉROBIE (nécessite du Dioxygène O₂). Elle se déroule en 3 étapes dans la cellule, dont 2 dans la MITOCHONDRIE.

🔹 1. Le Bilan Global
C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O + Énergie (≈ 36 à 38 ATP)
💡 C'est l'inverse exact de la photosynthèse ! Le glucose est entièrement dégradé en CO₂ et H₂O.

🔹 2. Les 3 Étapes de la Respiration (Le détail Majorant)
1. La Glycolyse (Dans le cytoplasme) : Le Glucose (6C) est coupé en 2 molécules d'Acide Pyruvique (3C). Cela produit 2 ATP et des électrons (NADH).
2. Le Cycle de Krebs (Dans la matrice mitochondriale) : L'Acide Pyruvique entre dans la mitochondrie et est complètement dégradé en CO₂. Cela produit 2 ATP et beaucoup d'électrons (NADH et FADH₂).
3. La Chaîne Respiratoire (Sur les crêtes mitochondriales) : Les électrons sont transférés à l'Oxygène (O₂), qui se combine à des protons (H⁺) pour former de l'eau (H₂O). Ce transfert d'électrons pompe massivement des protons (H⁺) dans l'espace intermembranaire. Le retour des protons dans la matrice via l'ATP-synthase fabrique l'essentiel de l'ATP (≈ 34 ATP).

━━━━━━━━━━━━━━━━━━━━━━━━
III. LES FERMENTATIONS (La survie sans Oxygène)
━━━━━━━━━━━━━━━━━━━━━━━━
En l'absence de dioxygène (milieu anaérobie), la cellule ne peut pas utiliser la chaîne respiratoire. Elle doit se contenter de la glycolyse. Pour que la glycolyse continue, il faut régénérer le NAD⁺ (qui est saturé en électrons). C'est le rôle de la fermentation.

🔹 1. Définition et Rendement
La fermentation est une dégradation anaérobie INCOMPLÈTE du glucose. Le produit final est riche en énergie.
• Rendement : Très faible. Seulement 2 ATP produits par molécule de glucose (contre 38 pour la respiration).

🔹 2. La Fermentation Alcoolique (Levures)
C₆H₁₂O₆ → 2 C₂H₅OH (Éthanol) + 2 CO₂ + 2 ATP
💡 Applications : Fabrication de la bière, du vin, et le pain (le CO₂ fait gonfler la pâte).

🔹 3. La Fermentation Lactique (Bactéries et Muscles)
C₆H₁₂O₆ → 2 C₃H₆O₃ (Acide lactique) + 2 ATP
💡 La fermentation lactique provoque la "crampe" musculaire (acidification du muscle) par accumulation d'acide lactique.`;


// ==========================================
// THÉORIE CHAPITRE 17 : LES ÉCOSYSTÈMES ET RELATIONS TROPHIQUES
// ==========================================
const theorieChap17 = `🎯 OBJECTIF DU CHAPITRE : Étudier comment l'énergie circule dans un écosystème, comprendre les chaînes et réseaux trophiques, et interpréter les pyramides écologiques.

━━━━━━━━━━━━━━━━━━━━━━━━
I. LES NIVEAUX TROPHIQUES (Qui mange qui ?)
━━━━━━━━━━━━━━━━━━━━━━━━
Dans un écosystème, les êtres vivants sont classés selon leur mode d'alimentation.

🔹 1. Les Producteurs (Les végétaux chlorophylliens)
Ils fabriquent leur propre matière organique à partir de matière minérale (eau, CO₂) et de lumière (Photosynthèse). Ce sont les seuls capables de capter l'énergie solaire.

🔹 2. Les Consommateurs (Les animaux)
• Consommateurs Primaires (Herbivores) : Mangent les producteurs (ex: sauterelle, vache).
• Consommateurs Secondaires (Carnivores) : Mangent les herbivores (ex: grenouille, oiseau).
• Consommateurs Tertiaires (Super prédateurs) : Mangent les carnivores (ex: aigle).

🔹 3. Les Décomposeurs (Les recycleurs)
Bactéries, champignons, vers de terre. Ils se nourrissent des cadavres et déchets organiques. Ils les transforment en matière minérale, qui retourne dans le sol pour les producteurs. Le cycle est bouclé.

━━━━━━━━━━━━━━━━━━━━━━━━
II. CHAÎNES ET RÉSEAUX TROPHIQUES
━━━━━━━━━━━━━━━━━━━━━━━━
🔹 1. La Chaîne Alimentaire
C'est une suite linéaire d'êtres vivants où chacun mange le précédent.
Ex: Herbe ➔ Sauterelle ➔ Crapaud ➔ Serpent.

🔹 2. Le Réseau Trophique
Dans la réalité, un animal mange plusieurs espèces et a plusieurs prédateurs. Le réseau trophique est l'ensemble de toutes les chaînes alimentaires d'un écosystème entrelacées.

━━━━━━━━━━━━━━━━━━━━━━━━
III. LES PYRAMIDES ÉCOLOGIQUES
━━━━━━━━━━━━━━━━━━━━━━━━
🔹 1. La Pyramide de Biomasse
La biomasse est la masse totale des êtres vivants à un niveau trophique.
• Base : Producteurs (très lourds).
• Sommet : Super prédateurs (très légers).

🔹 2. La Pyramide d'Énergie (Le secret du 10%)
L'énergie diminue d'un niveau à l'autre.
Règle des 10% : Seulement 10% de l'énergie d'un niveau est transférée au niveau supérieur. Les 90% sont perdus (respiration, chaleur, déchets).
💡 C'est pour cela qu'il y a peu de prédateurs au sommet : il faut une quantité énorme de producteurs pour nourrir un seul lion.`;


// ==========================================
// THÉORIE CHAPITRE 18 : FLUX DE MATIÈRE ET D'ÉNERGIE
// ==========================================
const theorieChap18 = `🎯 OBJECTIF DU CHAPITRE : Comprendre que la matière se recycle (elle tourne en boucle) alors que l'énergie ne se recycle pas (elle traverse l'écosystème et se dissipe).

━━━━━━━━━━━━━━━━━━━━━━━━
I. LE FLUX D'ÉNERGIE (La traversée)
━━━━━━━━━━━━━━━━━━━━━━━━
L'énergie solaire est captée par les producteurs (photosynthèse), puis transférée aux herbivores, puis aux carnivores. À chaque étape, une grande partie (90%) est dissipée sous forme de chaleur (respiration). L'énergie ne revient JAMAIS au Soleil.
💡 L'écosystème a besoin d'un apport CONTINU d'énergie (le Soleil) pour survivre.

━━━━━━━━━━━━━━━━━━━━━━━━
II. LE CYCLE DE LA MATIÈRE (Le recyclage)
━━━━━━━━━━━━━━━━━━━━━━━━
Contrairement à l'énergie, la matière ne se perd pas. Les éléments (Carbone, Azote, Eau) tournent en boucle fermée.

🔹 1. Le Cycle du Carbone
1. Le CO₂ atmosphérique est capté par les plantes (Photosynthèse) → Matière organique (C₆H₁₂O₆).
2. Les animaux mangent les plantes → Le carbone passe dans la chaîne alimentaire.
3. La respiration (des plantes, des animaux, des décomposeurs) rejette le C sous forme de CO₂ dans l'atmosphère.
4. La combustion (feux, éruptions) rejette aussi du CO₂.
💡 L'excès de CO₂ (dû aux combustibles fossiles) provoque l'effet de serre et le réchauffement climatique.

🔹 2. Le Cycle de l'Azote
L'azote (N) est essentiel pour les protéines et l'ADN.
1. L'air contient 78% de N₂, mais les plantes ne peuvent pas l'utiliser directement.
2. Les Bactéries fixatrices (dans les racines des légumineuses) transforment le N₂ en nitrates (NO₃⁻) assimilables.
3. Les décomposeurs transforment les déchets organiques en ammoniac (NH₃), puis en nitrates (Nitrification).
4. Les bactéries dénitrifiantes rejettent le N₂ dans l'air (Dénitrification).`;


// ==========================================
// THÉORIE CHAPITRE 19 : BIODIVERSITÉ ET IMPACTS HUMAINS
// ==========================================
const theorieChap19 = `🎯 OBJECTIF DU CHAPITRE : Étudier la biodiversité (diversité du vivant), comprendre les impacts des activités humaines (déforestation, pollution, introductions d'espèces), et maîtriser le concept de développement durable.

━━━━━━━━━━━━━━━━━━━━━━━━
I. LA BIODIVERSITÉ (La richesse du vivant)
━━━━━━━━━━━━━━━━━━━━━━━━
La biodiversité se mesure à 3 niveaux :
1. Diversité des écosystèmes : Forêts, savanes, déserts, récifs coralliens.
2. Diversité des espèces : Nombre d'espèces dans un milieu.
3. Diversité génétique : Variété des allèles au sein d'une même espèce.
💡 La biodiversité est un trésor : elle assure la stabilité des écosystèmes et fournit des ressources (médicaments, aliments, matériaux).

━━━━━━━━━━━━━━━━━━━━━━━━
II. LES IMPACTS HUMAINS
━━━━━━━━━━━━━━━━━━━━━━━━
🔹 1. La Déforestation
Les forêts (surtout tropicales) sont rasées pour l'agriculture, le bois, et l'urbanisation.
• Conséquences : Perte d'habitat (extinction d'espèces), érosion des sols, et libération massive de CO₂ (les arbres stockent le carbone).

🔹 2. La Pollution
• Eutrophisation : Les engrais agricoles (nitrates, phosphates) lessivés par la pluie se déversent dans les lacs et rivières. Cela provoque la prolifération d'algues qui consomment tout l'O₂, asphyxiant les poissons.
• Accumulation des toxiques (Bioaccumulation) : Les métaux lourds (mercure, plomb) se concentrent dans la chaîne alimentaire. Les prédateurs au sommet (aigles, humains) sont les plus touchés.

🔹 3. Les Espèces Invasives
L'introduction humaine d'espèces étrangères (ex: la jacinthe d'eau au Niger) peut détruire un écosystème car elles n'ont pas de prédateurs naturels.

━━━━━━━━━━━━━━━━━━━━━━━━
III. LE DÉVELOPPEMENT DURABLE
━━━━━━━━━━━━━━━━━━━━━━━━
C'est un mode de développement qui répond aux besoins du présent sans compromettre la capacité des générations futures à répondre aux leurs.
3 Piliers :
1. Économique : Créer des richesses.
2. Social : Réduire la pauvreté.
3. Environnemental : Protéger la nature.`;


// ==========================================
// THÉORIE CHAPITRE 20 : RÉVISIONS GÉNÉRALES DU BAC
// ==========================================
const theorieChap20 = `🎯 OBJECTIF DU CHAPITRE : Synthétiser les 19 chapitres de l'année, maîtriser les interconnexions entre la Génétique, la Physiologie, l'Immunologie et l'Écologie, et élaborer une stratégie infaillible pour le BAC D.

━━━━━━━━━━━━━━━━━━━━━━━━
I. LA CARTE MENTALE DES 4 PILIERS DE LA TERMINALE D
━━━━━━━━━━━━━━━━━━━━━━━━
🔹 1. La Génétique (Chapitres 1 à 6)
• L'ADN contient l'information. La mitose la transmet conformément. La méiose crée la diversité (crossing-over).
• L'expression : ADN → ARNm → Protéine (phénotype).
• Les anomalies (trisomie) sont dues à des erreurs de méiose.

🔹 2. La Physiologie (Chapitres 7 à 10, 14 à 15)
• La glycémie est régulée par l'insuline (baisse) et le glucagon (monte). Le diabète est une panne de ce système.
• Le système nerveux : Le PA (électrique) se transmet par les neurotransmetteurs (chimique) à la synapse. Le cerveau (cortex) commande les muscles.
• Le muscle : L'actine glisse sur la myosine grâce au Ca²⁺ et à l'ATP.

🔹 3. L'Immunologie (Chapitres 11 à 13)
• Le Soi (CMH) vs le Non-Soi (Antigène).
• Les LB fabriquent des anticorps. Les T8 détruisent les cellules infectées. Les LT4 coordonnent.
• Le VIH détruit les LT4, causant l'effondrement du système immunitaire.

🔹 4. L'Écologie (Chapitres 16 à 19)
• Les producteurs captent l'énergie solaire. L'énergie traverse l'écosystème (pertes de 90% à chaque niveau). La matière se recycle (cycle du C, de l'N).
• L'homme perturbe les cycles (CO₂, déforestation).

━━━━━━━━━━━━━━━━━━━━━━━━
II. STRATÉGIE POUR LE BAC D
━━━━━━━━━━━━━━━━━━━━━━━━
• Commence par ton point fort.
• Rédige avec des phrases complètes ("D'après le document...", "Or on sait que...").
• Vérifie la cohérence (une probabilité est entre 0 et 1, un nombre de chromosomes est pair sauf anomalie).`;


const cours = [
  {
    id: "term_d_svt_chap16",
    titre: "Respiration et Fermentations",
    matiere: "SVT",
    classe: "Terminale D",
    activite: `🏃 Activité d'approche : Le sprinter et le marathonien.\nUn sprinter de 100m respire très fort avant la course, mais retient son souffle pendant la course (10 secondes). S'il faisait un marathon de 42 km en retenant son souffle, il s'évanouirait.\n1. Pourquoi le sprinter peut-il courir sans respirer pendant 10 secondes ? Quelle voie énergétique est utilisée ?\n2. Pourquoi le marathonien DOIT-il respirer en permanence ?\nL'objectif de ce chapitre est de comparer la respiration et les fermentations.`,
    theorie: theorieChap16,
    methode_titre: `⚙️ ALGORITHME D'IDENTIFICATION D'UNE VOIE MÉTABOLIQUE`,
    methode_content: `Pour identifier si une cellule respire ou fermente au BAC :\n\nÉtape 1 : Analyser les réactifs (Consommation) 📥\n- Consomme du O₂ ? ➔ OUI = Respiration. NON = Fermentation.\n- Consomme du Glucose ? ➔ OUI dans les deux cas.\n\nÉtape 2 : Analyser les produits (Rejet) 📤\n- Rejette du CO₂ ET de l'H₂O ? ➔ Respiration (dégradation complète).\n- Rejette du CO₂ ET de l'Alcool ? ➔ Fermentation alcoolique.\n- Rejette de l'Acide lactique ? ➔ Fermentation lactique.\n\nÉtape 3 : Analyser le rendement (ATP) 🔋\n- Si on produit 36 à 38 ATP ➔ Respiration.\n- Si on produit 2 ATP ➔ Fermentation.\n\nÉtape 4 : Analyser le lieu cellulaire 🧬\n- Cytoplasme + Mitochondrie ➔ Respiration.\n- Cytoplasme seul ➔ Fermentation.`,
    piege: `⚠️ LE PIÈGE FATAL DU PROFESSEUR : Le CO₂ dans la fermentation.\nLe prof te dit : "La levure dégrade le glucose en présence d'oxygène, puis en absence d'oxygène. Quel gaz est produit dans les deux cas ?"\n🚨 L'élève répond : "Le CO₂, car le CO₂ est le marqueur de la respiration".\nERREUR FATALE ! Le CO₂ est produit dans la respiration (Cycle de Krebs), MAIS il est AUSSI produit dans la fermentation alcoolique (C₆H₁₂O₆ → 2 C₂H₅OH + 2 CO₂). Le CO₂ n'est donc pas un marqueur exclusif de la respiration. Pour les différencier, il faut chercher l'O₂ (consommé en respiration) ou l'alcool (produit en fermentation).`,
    demo: `🧠 EXPLICATION : La chaîne respiratoire mitochondriale (Le barrage hydroélectrique).\n1. Le cycle de Krebs (dans la matrice) libère des électrons (portés par le NADH).\n2. Ces électrons sont passés à l'Oxygène sur la membrane interne. Ce transfert libère de l'énergie qui pompe des protons (H⁺) de la matrice vers l'espace intermembranaire.\n3. L'espace intermembranaire se retrouve surchargé en protons (H⁺), créant une forte pression (gradient de concentration).\n4. Les protons veulent revenir dans la matrice, mais la membrane est imperméable. Ils ne peuvent passer que par une enzyme "turbine" : l'ATP-synthase.\n5. En traversant l'ATP-synthase, la force des protons fait tourner la turbine, qui assemble l'ADP et le Pi en ATP. C'est exactement le principe d'un barrage hydroélectrique où l'eau fait tourner la dynamo ! 🎓`,
    exercice_corrige: `📝 EXERCICE TYPE CORRIGÉ (Niveau BAC) :\nÉnoncé : On place des levures dans un milieu clos contenant du glucose. On mesure la consommation de O₂ et la production de CO₂. Au début, les levures consomment du O₂. Puis le O₂ s'épuise, et les levures continuent de produire du CO₂.\n1. Quel type de métabolisme est utilisé au début ?\n2. Quel type de métabolisme est utilisé quand le O₂ est épuisé ?\n3. Écris l'équation bilan de la deuxième phase.\n\n✅ CORRECTION EXIGÉE AU LEX :\n\n1️⃣ Métabolisme au début 🎯\nLes levures consomment du O₂. C'est la RESPIRATION (aérobie).\nC₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O.\n\n2️⃣ Métabolisme sans O₂ ⚖️\nLe O₂ est épuisé. Les levures basculent en FERMENTATION ALCOOLIQUE (anaérobie).\n\n3️⃣ Équation bilan 🧪\nC₆H₁₂O₆ → 2 C₂H₅OH (Éthanol) + 2 CO₂ + 2 ATP. 🏁`
  },
  {
    id: "term_d_svt_chap17",
    titre: "Les Écosystèmes et Relations Trophiques",
    matiere: "SVT",
    classe: "Terminale D",
    activate: `🦁 Activité d'approche : La savane et le lion.\nDans la savane, l'herbe pousse grâce au soleil. Les gazelles mangent l'herbe. Les lions chassent les gazelles. Quand le lion meurt, les bactéries le décomposent et enrichissent le sol pour l'herbe.\n1. Si on enlève les lions, que deviennent les gazelles ?\n2. Pourquoi l'herbe est-elle le point de départ de tout ?\nL'objectif de ce chapitre est d'étudier les relations alimentaires (trophiques) et le transfert d'énergie dans un écosystème.`,
    theorie: theorieChap17,
    methode_titre: `⚙️ ALGORITHME DE CONSTRUCTION D'UNE PYRAMIDE TROPHIQUE`,
    methode_content: `Pour représenter un écosystème sous forme de pyramide au BAC :\n\nÉtape 1 : Identifier les Producteurs 🌿\nPlace-les à la BASE de la pyramide. Ils contiennent le plus de biomasse et d'énergie.\n\nÉtape 2 : Identifier les Consommateurs Primaires 🐄\nPlace-les au-dessus des producteurs (ils les mangent).\n\nÉtape 3 : Identifier les Consommateurs Secondaires 🦅\nPlace-les encore au-dessus.\n\nÉtape 4 : Vérifier la décroissance 📉\nChaque niveau supérieur doit être PLUS PETIT que le niveau inférieur (perte d'énergie de 90%).\n\nÉtape 5 : Cas particulier (Océan) 🌊\nSi les producteurs (phytoplancton) se renouvellent très vite, la pyramide de biomasse peut être inversée.`,
    piege: `⚠️ LE PIÈGE FATAL DU PROFESSEUR : La pyramide de nombres inversée.\nLe prof te donne un écosystème avec un seul gros arbre (producteur) abritant 10 000 chenilles (consommateurs primaires) et 100 oiseaux (consommateurs secondaires). Il te demande la pyramide des nombres.\n🚨 L'élève dessine une pyramide normale (base large, sommet étroit).\nERREUR FATALE ! Si on compte le NOMBRE d'individus, 1 arbre < 10 000 chenilles < 100 oiseaux. La pyramide des nombres est INVERSÉE (base étroite, milieu large). C'est pourquoi on utilise la pyramide de BIOMASSE (masse totale) qui, elle, est toujours normale, car la masse d'un arbre est plus lourde que la masse de 10 000 chenilles.`,
    demo: `🧠 EXPLICATION : La règle des 10% (Pourquoi le sommet est petit).\n1. L'énergie solaire est captée par les plantes (Producteurs). Mais 90% de cette énergie sert à la respiration de la plante, à sa croissance, et est dissipée en chaleur. Seulement 10% est stocké dans la matière organique (feuilles, fruits).\n2. L'herbivore mange la plante. Mais 90% de l'énergie ingérée est perdue dans la digestion, la respiration, et les déchets (crottes). Seulement 10% de l'énergie de la plante devient de la viande d'herbivore.\n3. Le carnivore mange l'herbivore. Encore une fois, 90% de perte.\n4. Pour nourrir un seul aigle (sommet), il faut des milliers de plantes à la base. L'énergie se perd en cascade, ce qui explique la forme de la pyramide.`,
    exercice_corrige: `📝 EXERCICE TYPE CORRIGÉ (Niveau BAC) :\nÉnoncé : On étudie une chaîne alimentaire : Herbe ➔ Sauterelle ➔ Crapaud.\nLa biomasse de l'herbe est de 10 000 kg.\n1. Calcule la biomasse théorique des sauterelles.\n2. Calcule la biomasse théorique des crapauds.\n\n✅ CORRECTION EXIGÉE AU LEX :\n\n1️⃣ Biomasse des sauterelles 🦗\nEn appliquant la règle des 10% (seulement 10% de l'énergie est transférée au niveau supérieur) :\nBiomasse sauterelles = 10 000 kg × 10% = 1 000 kg.\n👉 La biomasse des sauterelles est de 1 000 kg.\n\n2️⃣ Biomasse des crapauds 🐸\nBiomasse crapauds = 1 000 kg × 10% = 100 kg.\n👉 La biomasse des crapauds est de 100 kg. (On remarque qu'elle diminue fortement à chaque étage). 🏁`
  },
  {
    id: "term_d_svt_chap18",
    titre: "Flux de matière et d'énergie",
    matiere: "SVT",
    classe: "Terminale D",
    activite: `♻️ Activité d'approche : Le recyclage de la nature.\nLa matière ne se perd jamais. Un morceau de bois qui pourrit ne disparaît pas : il est transformé en CO₂, en eau et en sels minéraux par les décomposeurs, puis réutilisé par de nouvelles plantes. Mais l'énergie, elle, ne se recycle pas.\nL'objectif de ce chapitre est de comprendre la différence entre le flux d'énergie (qui traverse) et le cycle de la matière (qui tourne en boucle).`,
    theorie: theorieChap18,
    methode_titre: `⚙️ ALGORITHME D'ANALYSE D'UN CYCLE BIOGÉOCHIMIQUE`,
    methode_content: `Pour analyser un cycle (Carbone, Azote) au BAC :\n\nÉtape 1 : Identifier les réservoirs 🗄️\nOù l'élément est stocké (Air, Eau, Sol, êtres vivants).\n\nÉtape 2 : Identifier les flux d'entrée ⬆️\nComment l'élément entre dans la chaîne alimentaire (Photosynthèse pour le C, Fixation pour l'N).\n\nÉtape 3 : Identifier les flux de sortie ⬇️\nComment l'élément retourne au réservoir (Respiration, Décomposition).\n\nÉtape 4 : Analyser l'impact humain 🏭\nL'homme perturbe-t-il le cycle ? (Combustion → excès de CO₂).\n\nÉtape 5 : Conclure sur l'équilibre ⚖️\nLe cycle est-il équilibré (entrées = sorties) ou déséquilibré (accumulation) ?`,
    piege: `⚠️ LE PIÈGE FATAL DU PROFESSEUR : L'énergie se recycle.\nLe prof te demande : "L'énergie est-elle recyclée dans l'écosystème ?"\n🚨 L'élève répond : "Oui, comme la matière, l'énergie tourne en boucle".\nERREUR FATALE ! La MATIÈRE se recycle (cycle du C, de l'N, de l'eau). Mais l'ÉNERGIE ne se recycle PAS. L'énergie solaire est captée par les plantes, transférée aux herbivores, puis aux carnivores, et à chaque étape, 90% est dissipée en chaleur (irrécupérable). L'écosystème a besoin d'un apport CONTINU de Soleil. L'énergie traverse l'écosystème, elle ne tourne pas en boucle.`,
    demo: `🧠 EXPLICATION : L'effet de serre et le cycle du Carbone.\n1. Le CO₂ atmosphérique est un réservoir. Les plantes le captent (photosynthèse), les animaux le rejettent (respiration). C'est équilibré.\n2. Mais l'homme brûle des combustibles fossiles (pétrole, charbon). Ces fossiles sont d'anciens êtres vivants enfouis depuis des millions d'années (réservoir souterrain de carbone).\n3. En les brûlant, l'homme libère massivement du CO₂ dans l'air en quelques décennies.\n4. Le cycle du Carbone est déséquilibré : le CO₂ atmosphérique augmente. Ce CO₂ agit comme une couverture qui emprisonne la chaleur (effet de serre), provoquant le réchauffement climatique.`,
    exercice_corrige: `📝 EXERCICE TYPE CORRIGÉ (Niveau BAC) :\nÉnoncé : La déforestation amazonienne libère environ 1,5 milliards de tonnes de CO₂ par an. Explique pourquoi couper les arbres aggrave le réchauffement climatique.\n\n✅ CORRECTION EXIGÉE AU LEX :\n\n1️⃣ Rôle des arbres dans le cycle du carbone 🌳\nLes arbres sont des "puits de carbone". Par la photosynthèse, ils captent le CO₂ atmosphérique et le stockent dans leur bois (matière organique). Ils retirant du CO₂ de l'air.\n\n2️⃣ Conséquence de la déforestation 🪓\nQuand on coupe les arbres : (1) Le puits de carbone est détruit (moins de CO₂ absorbé). (2) Si on brûle ou laisse pourrir le bois, tout le carbone stocké est relâché dans l'air sous forme de CO₂.\n👉 La déforestation double l'impact : elle augmente le CO₂ rejeté ET diminue le CO₂ absorbé, accélérant le réchauffement. 🏁`
  },
  {
    id: "term_d_svt_chap19",
    titre: "Biodiversité et Impacts Humains",
    matiere: "SVT",
    classe: "Terminale D",
    activate: `🌍 Activité d'approche : La 6ème extinction de masse.\nLes scientifiques estiment que 150 espèces disparaissent chaque jour à cause de l'homme (déforestation, pollution, chasse). C'est la 6ème extinction de masse de l'histoire de la Terre.\nL'objectif de ce chapitre est d'étudier la biodiversité et les impacts des activités humaines sur les écosystèmes.`,
    theorie: theorieChap19,
    methode_titre: `⚙️ ALGORITHME D'ANALYSE D'UN IMPACT HUMAIN`,
    methode_content: `Pour analyser l'impact d'une activité humaine au BAC :\n\nÉtape 1 : Identifier l'activité 🏭\nDéforestation, agriculture, industrie, urbanisation.\n\nÉtape 2 : Identifier le perturbateur 💣\nQue rejette ou détruit cette activité ? (CO₂, nitrates, métaux lourds, habitat).\n\nÉtape 3 : Suivre le perturbateur dans la chaîne trophique 📊\n- Bioaccumulation : Le toxique se concentre dans les tissus d'un organisme.\n- Bioamplification : La concentration augmente d'un niveau trophique à l'autre (ex: 0,01 mg de mercure dans le plancton → 0,1 mg dans le poisson → 1 mg dans l'homme).\n\nÉtape 4 : Analyser les conséquences écologiques 🌡️\nEutrophisation, réchauffement, extinction d'espèces, désertification.\n\nÉtape 5 : Proposer des solutions durables ✅\nReboisement, énergies renouvelables, agriculture raisonnée, aires protégées.`,
    piege: `⚠️ LE PIÈGE FATAL DU PROFESSEUR : La bioaccumulation vs la bioamplification.\nLe prof te demande : "Pourquoi le mercure est-il plus concentré chez l'aigle que chez le poisson ?"\n🚨 L'élève répond : "Parce que l'aigle accumule plus de mercure".\nERREUR DE TERMINOLOGIE ! La BIOACCUMULATION est l'accumulation d'un toxique DANS un organisme au cours de sa vie (le poisson accumule du mercure car il ne l'élimine pas). La BIOAMPLIFICATION est l'augmentation de la concentration d'un niveau trophique à l'autre (l'aigle mange 100 poissons, donc reçoit le mercure des 100 poissons). C'est la bioamplification qui explique pourquoi les prédateurs au sommet sont les plus touchés.`,
    demo: `🧠 EXPLICATION : L'eutrophisation (La mort d'un lac).\n1. Les engrais agricoles (nitrates, phosphates) sont lessivés par la pluie et se déversent dans un lac.\n2. Ces nutriments provoquent une prolifération explosive d'algues (fleurs d'eau) à la surface.\n3. Les algues meurent et tombent au fond. Les bactéries aérobies les décomposent, consommant massivement le dioxygène (O₂) du lac.\n4. L'O₂ dissous dans l'eau chute. Les poissons et les insectes aquatiques meurent par asphyxie.\n5. Le lac devient mort (zone hypoxique/anoxique). Tout a commencé par un excès d'engrais. C'est l'eutrophisation.`,
    exercice_corrige: `📝 EXERCICE TYPE CORRIGÉ (Niveau BAC) :\nÉnoncé : On mesure la concentration de DDT (pesticide) dans un écosystème : Plancton = 0,04 mg/kg, Poisson = 0,5 mg/kg, Aigle = 25 mg/kg. Explique cette variation.\n\n✅ CORRECTION EXIGÉE AU LEX :\n\n1️⃣ Analyse des données 🎯\nLa concentration de DDT augmente du plancton (0,04) vers l'aigle (25). Soit un facteur 625.\n\n2️⃣ Explication 📊\nLe DDT est un polluant non dégradable. Il s'accumule dans les tissus gras des organismes (BIOACCUMULATION). De plus, comme chaque prédateur mange de grandes quantités de proies contaminées, la concentration augmente d'un niveau trophique à l'autre (BIOAMPLIFICATION). L'aigle, au sommet de la chaîne, concentre le maximum de DDT. 🏁`
  },
  {
    id: "term_d_svt_chap20",
    titre: "Révisions Générales du BAC",
    matiere: "SVT",
    classe: "Terminale D",
    activite: `🎓 Activité d'approche : La stratégie du BAC.\nTu es face à ton sujet de SVT. L'exercice 1 est sur la génétique, le 2 sur la glycémie, le 3 sur l'immunologie, le 4 sur l'écologie.\n1. Quel exercice choisis-tu de commencer en premier et pourquoi ?\nL'objectif de ce chapitre final est de synthétiser les compétences de l'année pour aborder l'examen avec une stratégie infaillible.`,
    theorie: theorieChap20,
    methode_titre: `⚙️ LA STRATÉGIE DU MAJORANT AU BAC D`,
    methode_content: `Pour réussir le BAC de SVT :\n\nÉtape 1 : Le parcours du combattant 🗺️\nParcours le sujet en 5 min. Commence TOUJOURS par ton point fort pour sécuriser des points.\n\nÉtape 2 : La Rédaction "Bulle" ✍️\nPour chaque question, le correcteur doit comprendre ce que tu fais sans deviner. Utilise des phrases de liaison : "Soit x un réel...", "D'après le document...", "Or on sait que...", "Donc...".\n\nÉtape 3 : Le filet de sécurité du cycle du Carbone 🌍\nSi on te demande l'impact de la déforestation : NE CHERCHE PAS la réponse. Construis la chaîne : Arbres coupés → moins de photosynthèse → moins de CO₂ absorbé → plus de CO₂ dans l'air → effet de serre → réchauffement.\n\nÉtape 4 : Vérification intelligente 🧠\nUne probabilité est entre 0 et 1. Un nombre de chromosomes est pair (sauf anomalie). Une énergie (ATP) est positive. Si ton résultat contredit la logique, barre-le et refais-le.`,
    piege: `⚠️ LE PIÈGE FATAL DU BAC : Le syndrome de la page blanche.\nTu es bloqué sur une question de l'exercice 2. Tu restes 30 minutes dessus.\n🚨 ERREUR FATALE ! Le temps est ton ennemi. Si une question te bloque après 5 minutes, SAUTE-LA. Les questions d'un sujet de BAC sont souvent INDÉPENDANTES. Tu peux parfaitement répondre à la question 3) sans avoir fait la 2). Ne laisse jamais une question t'empêcher de glaner des points sur la suite du sujet.`,
    demo: `🧠 SYNTHÈSE : L'interconnexion des chapitres au BAC.\nUn sujet type de SVT D mélange toujours plusieurs chapitres.\nExemple : On étudie le VIH.\n- Chapitre 11 : Le VIH est un antigène (Non-Soi) reconnu par le système immunitaire.\n- Chapitre 2 : Le VIH est un rétrovirus : son ARN est transcrit en ADN (transcriptase inverse) puis intégré dans l'ADN de la cellule hôte (mitose → propagation).\n- Chapitre 12 : Le VIH cible les LT4, les chefs d'orchestre de l'immunité adaptative. Sans LT4, pas d'activation des LB (pas d'anticorps) ni des T8 (pas de destruction des cellules infectées).\n- Chapitre 16 : Les médicaments antirétroviraux bloquent la respiration du virus (inhibiteur de transcriptase inverse).\nC'est pour cela que tu ne dois faire l'impasse sur AUCUN chapitre. Tout se recoupe au BAC. 🎓`,
    exercice_corrige: `📝 EXERCICE TYPE SYNTHÈSE (Niveau BAC) :\nÉnoncé : Soit f(x) = (2x - 1) / (x + 1) définie sur ]-1 ; +∞[.\n1. Montre que la droite D d'équation y = 2x - 1 est asymptote à la courbe (Cf) en +∞. (C'est un piège, vérifie par le calcul).\n2. Trouve la vraie asymptote.\n\n✅ CORRECTION EXIGÉE AU LEX :\n\n1️⃣ Vérification :\nD(x) = f(x) - (2x-1) = (2x-1)/(x+1) - (2x-1) = [(2x-1) - (2x-1)(x+1)] / (x+1).\n= [2x - 1 - 2x² - x + 1] / (x+1) = (-2x² + x) / (x+1).\nlim(+∞) D(x) = -∞. Ce n'est PAS une asymptote !\n\n2️⃣ Vraie asymptote :\nlim(+∞) f(x)/x = lim (2x-1)/(x²+x) = 0. Donc a=0.\nlim(+∞) f(x) - 0 = lim (2x-1)/(x+1) = 2.\nL'asymptote est HORIZONTALE : y = 2. 🏁`
  }
];

async function remplir() {
  console.log("Début de l'injection SVT Term D Titanesque (Chap 16 à 20)...");
  for (const c of cours) {
    await setDoc(doc(db, "cours", c.id), c, { merge: true });
    console.log("Théorie ajoutée pour : " + c.titre);
  }
  console.log("✅ TERMINÉ ! Les chapitres 16 à 20 de SVT Term D sont dans Firebase. LE PROGRAMME DU LYCÉE EST 100% COMPLET !");
}

remplir();