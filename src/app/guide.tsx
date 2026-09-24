import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 3 — GUIDE ULTRA-DÉTAILLÉ : tout savoir sur l'app, organisé par sections.
// Accessible depuis l'accueil (❓ Guide) ET au premier lancement (onboarding).

/** Route typée d'expo-router (union des routes valides de l'app). */
type HrefApp = Parameters<ReturnType<typeof useRouter>['push']>[0];

interface Entree {
  q: string;
  r: string;
  /** Écran à ouvrir directement depuis le guide (optionnel). */
  route?: HrefApp;
}

interface Section {
  emoji: string;
  titre: string;
  entrees: Entree[];
}

// ❓ GUIDE COMPLET — le manuel officiel de LEX ACADEMY.
// Chaque réponse est VÉRIFIÉE contre le code réel de l'app : aucune
// fonctionnalité fantôme. (Les anciennes mentions « 🗺️ Conquête » et
// « 📸 Photo d'exercice » ont été retirées : elles n'existent nulle part
// dans l'application, elles faisaient douter les élèves pour rien.)
const SECTIONS: Section[] = [
  {
    emoji: '🚀', titre: '1. Bien démarrer', entrees: [
      { q: 'C\'est quoi LEX ACADEMY ?', r: 'Ton professeur de poche : les cours et les exercices officiels de ta classe, l\'entraînement infini, les révisions intelligentes, les jeux et LEX.AI (au wifi). Tout est pensé pour le Lycée d\'Excellence de Tessaoua — et surtout pour vivre SANS internet toute la semaine.', route: '/classes' },
      { q: 'Première fois ? Fais ces 5 choses dans l\'ordre :', r: '1) Connecte-toi ou crée ton compte (c\'est ce qui fait monter tes XP) ; 2) passe le 🧪 Test de positionnement (🎯 Plus → Réviser) ; 3) AU WIFI : télécharge tes chapitres (section 2) ; 4) fixe-toi un objectif (🎯 Objectifs & 📖 Notes) ; 5) lance une première série d\'exercices — 10 minutes suffisent.', route: '/plus' },
      { q: 'Que veulent dire les chiffres de l\'accueil ?', r: '🔥 SÉRIE = le nombre de jours d\'affilée où tu as révisé ; 🧠 RÉVISIONS = le nombre d\'exercices qui t\'attendent aujourd\'hui. Touche l\'un ou l\'autre : la carte t\'emmène directement au bon écran.', route: '/revisions' },
      { q: 'Les XP, les crédits et les ligues, à quoi ça sert ?', r: 'Chaque bonne réponse rapporte des XP (classement + ligues) et +5 crédits 💰 (Boutique). Les ligues vont de Bronze 🥉 à Légende 👑. Plus tu es régulier, plus tu montes : ce qui paye, c\'est la régularité, pas la veille d\'un seul soir.', route: '/classement' },
      { q: 'Les 3 boutons les plus importants de l\'app', r: '🟦 LE COURS (comprendre), 🟩 EXERCICES (s\'entraîner sur le programme officiel), 🩷 RÉVISIONS DU JOUR (ne rien oublier). Tout le reste (jeux, badges, outils) est un bonus : ces trois-là font la note.', route: '/classes' },
      { q: 'Mot de passe oublié / connexion impossible ?', r: 'Sur l\'écran de connexion, touche « Mot de passe oublié ? » : ta demande part à l\'administrateur (elle arrive dans 🆘 Demandes d\'aide, même si tu la fais hors-ligne). Va le voir au lycée avec ton nom et ta classe. Sans connexion, l\'app reste utilisable, mais tes scores ne montent pas au classement.', route: '/login' },
    ],
  },
  {
    emoji: '📴', titre: '2. Vivre sans internet (le cœur de l\'app)', entrees: [
      { q: 'Pourquoi l\'app est faite pour le hors-ligne ?', r: 'Le wifi du LEX ne couvre qu\'un endroit. Donc tout ce que tu télécharges UNE fois (cours + exercices + corrections) reste sur ton téléphone et s\'ouvre instantanément toute la semaine, sans réseau ni forfait. Règle d\'or : ce que tu télécharges au wifi, tu le gardes.' },
      { q: '📥 Télécharger un chapitre — pas à pas', r: 'Au wifi : ✍️ Exercices → ta classe → ta matière → le chapitre → « 📥 Tout télécharger ». Attends la fin (cours + exercices + corrections). Pour gagner du temps, télécharge toute la matière d\'un coup avant de quitter la zone wifi.', route: '/classes_exos' },
      { q: 'Qu\'est-ce qui marche SANS rien télécharger ?', r: 'L\'♾️ Entraînement infini (niveaux 1 à 100), le ⚡ QCM Éclair, le 🧮 Calcul mental, la 🖩 Calculatrice, le 📐 Formulaire (118 formules), les ⚔️ Duels, les 🎮 Mini-jeux, les 🏅 Olympiades et les 🧠 Révisions du jour. Tu n\'es donc jamais bloqué, même sans aucune donnée.', route: '/plus' },
      { q: 'L\'app télécharge-t-elle toute seule ?', r: 'Oui : à chaque ouverture, elle pré-télécharge en silence tes chapitres (1 fois par jour, seulement si tu as du réseau) et nettoie le cache pour ne pas remplir ton téléphone. Tu n\'as rien à faire — mais un « Tout télécharger » avant de quitter le wifi reste le plus sûr.' },
      { q: 'Mes scores faits hors-ligne sont-ils perdus ?', r: 'Non, jamais. Tout ce qui n\'a pas pu partir (XP, série, signalements, demandes de mot de passe) attend dans une file d\'attente locale et s\'envoie automatiquement à ta prochaine connexion. Le badge ☁️ de l\'accueil te montre où en est l\'envoi.' },
      { q: 'Comment lire le badge de synchronisation ☁️ ?', r: 'Tout est parti = tu es tranquille. S\'il reste des éléments en attente, c\'est NORMAL et sans risque : ils partiront au prochain wifi. Ne désinstalle jamais l\'app tant que la file n\'est pas vidée, et ouvre-la 1 minute au réseau.', route: '/profil' },
      { q: 'Un camarade peut m\'envoyer un chapitre', r: 'Oui : 📡 Partager → il choisit un chapitre TÉLÉCHARGÉ → l\'app génère un code LEX1:… → il te l\'envoie par WhatsApp (ou te le montre) → dans ton 📡 Partager, colle le code → le chapitre complet est installé, même sans réseau. L\'entraide du LEX !', route: '/partage' },
      { q: '📡 Mode économie de données', r: 'Dans ⚙️ Paramètres : il allège les contenus et le téléchargement automatique. Active-le si ton forfait 3G/4G est limité ou si tu paies au méga — c\'est fait exactement pour ça.', route: '/parametres' },
      { q: 'Le réseau coupe pendant un exercice ?', r: 'Aucune panne : correction, feedback et suite fonctionnent sur le téléphone. Tes XP sont comptés localement et l\'envoi se fait dès que le réseau revient. Tu peux tout fermer, rien n\'est perdu.' },
      { q: 'Changer de téléphone sans rien perdre ?', r: '📦 Transfert : génère ton code de sauvegarde, garde-le (WhatsApp ou papier), puis colle-le sur le nouveau téléphone. XP, série, révisions, objectifs et notes reviennent. Un rappel t\'y invite chaque 1er du mois.', route: '/transfert' },
    ],
  },
  {
    emoji: '📚', titre: '3. Le cours & les exercices officiels', entrees: [
      { q: 'Le chemin à connaître par cœur', r: 'Classe → Matière → Chapitre → Cours ou Exercices. C\'est le même chemin pour le cours (bouton bleu LE COURS) et pour les exercices (bouton vert EXERCICES). Si tu hésites, repars toujours de ces deux boutons de l\'accueil.', route: '/classes' },
      { q: 'Comment lire un cours efficacement ?', r: '1) Lis la THÉORIE en entier (5-10 min) ; 2) refais les EXEMPLES de méthode sans regarder la solution ; 3) note ce que tu n\'as pas compris ; 4) enchaîne tout de suite 5 exercices du même chapitre. Lire sans faire ne fait jamais monter le niveau.', route: '/classes' },
      { q: '🎧 Le cours en audio', r: 'Dans 🎯 Plus → Réviser → Cours en audio : choisis un chapitre téléchargé et écoute la théorie en marchant, dans le taxi ou avant de dormir. Parfait pour réviser sans écran, sans données, les yeux reposés.', route: '/audio_cours' },
      { q: '🧺 Mon cahier : coller le cahier LEX', r: '🎯 Plus → Outils → Mon cahier : colle le texte du cahier de la salle pour ce chapitre. L\'app le découpe en micro-notions et l\'ajoute à ton chapitre — 100 % sur ton téléphone, jamais envoyé — puis te propose des exercices dessus.', route: '/mon_cahier' },
      { q: 'Résoudre un exercice officiel, étape par étape', r: 'Tape ta réponse, valide, puis lis la correction MÊME quand c\'est juste : la méthode compte autant que le résultat. Tu peux retenter autant de fois que tu veux, personne ne te voit, et chaque tentative t\'apprend quelque chose.', route: '/classes_exos' },
      { q: 'Ma réponse est bonne mais refusée !', r: 'Le correcteur accepte plusieurs écritures (0,5 = 1/2 = 0.5, m/s…), mais certaines réponses exigent une forme précise : fraction irréductible, unité demandée, signe correct. Relis la consigne deux fois — et si c\'est vraiment faux, touche ⚠️ pour le signaler.' },
      { q: '⚠️ Signaler un exercice faux', r: 'Touche ⚠️ sur l\'exercice et choisis la raison. Même hors-ligne : le signalement part au prochain wifi et arrive dans l\'espace de l\'administrateur. Tu améliores l\'app pour tous les élèves du LEX — c\'est comme ça qu\'elle devient fiable.' },
      { q: '📖 Mes notes personnelles', r: 'Dans 🎯 Objectifs & 📖 Notes : attache une note à un chapitre (une formule à retenir, une erreur à ne plus refaire, une question à poser au prof). Tes notes restent sur ton téléphone et reviennent quand tu reprends le chapitre.', route: '/objectifs' },
      { q: 'Le cours ne s\'ouvre pas ?', r: 'C\'est presque toujours un chapitre non téléchargé : l\'app te le dit. Va dans ✍️ Exercices → ta matière → le chapitre → « 📥 Tout télécharger » au wifi, puis rouvre le cours. Fais-le pour TOUTE la matière, pas seulement un chapitre.', route: '/classes_exos' },
    ],
  },
  {
    emoji: '🧠', titre: '4. Réviser intelligemment (répétition espacée)', entrees: [
      { q: '🧠 Révisions du jour : comment ça marche ?', r: 'Chaque exercice raté est reprogrammé 1, 3, 7, 16, 35, 70 puis 140 jours plus tard — pile quand ta mémoire commence à lâcher. Réussi du premier coup, il s\'éloigne ; raté, il revient demain. C\'EST la méthode la plus prouvée pour retenir longtemps.', route: '/revisions' },
      { q: 'Pourquoi seulement 20 révisions par jour ?', r: 'L\'app plafonne volontairement à 20 pour éviter le bourrage : 10 minutes bien faites consolident plus que 200 cartes avalées. Fais tes 20, puis va jouer ou lire un cours : ton cerveau finit le travail en dormant.' },
      { q: '🃏 Flashcards', r: 'Des cartes question/réponse générées depuis tes cours téléchargés, avec « je savais / à revoir ». Deux usages : révision active rapide (5 min) et vérification juste avant une composition. Accessible depuis 🎯 Plus → Flashcards.', route: '/flashcards' },
      { q: '📓 Journal d\'erreurs : ta faute, bien rangée', r: 'Tes erreurs sont classées par TYPE : signe ➖, calcul 🔢, notion 📚, inattention 👀, unité 📏, équation ✏️ — avec le concept à revoir. C\'est ce qui transforme une faute en point gagné : tu découvres ton motif d\'erreur préféré.', route: '/journal_erreurs' },
      { q: '🧠 Pièges du BAC', r: 'L\'app détecte automatiquement tes points noirs (chapitres et notions où tu te trompes le plus) et les confronte aux pièges classiques du BAC. C\'est l\'écran à ouvrir en priorité dès qu\'un bandeau rouge MODE INTENSIF apparaît sur l\'accueil.', route: '/pieges' },
      { q: 'Le mode intensif, c\'est quoi ?', r: 'À partir de 21 jours avant les compositions (15 novembre, 10 mars, BAC du 1er juin), l\'accueil affiche un bandeau rouge qui t\'envoie droit vers tes pièges. C\'est le signal : on arrête de découvrir, on consolide à fond.', route: '/pieges' },
      { q: '📊 Ma maîtrise', r: 'La photo de tes chapitres, du plus faible au plus fort, avec un pourcentage. Utilise-la pour décider quoi travailler aujourd\'hui : prends toujours le chapitre faible du haut de la liste, jamais celui que tu préfères.', route: '/maitrise' },
      { q: '🎯 Objectifs & 📈 Statistiques', r: 'Fixe un objectif concret (exercices officiels, exercices infinis, défis, QCM ou révisions) : l\'app suit ta progression toute seule. Les 📈 Statistiques montrent ton activité réelle des 7 derniers jours, ton taux de réussite, et t\'alertent si tu stagnes.', route: '/objectifs' },
      { q: 'Je n\'ai vraiment que 10 minutes', r: 'Fais exactement ceci : 🧠 Révisions du jour (tes 20, ou moins si c\'est fini) → puis 3 exercices dans le chapitre où tu es le plus faible (📊 Ma maîtrise). C\'est le programme minimum qui fait quand même progresser.' },
    ],
  },
  {
    emoji: '♾️', titre: '5. Entraînement infini & progresser', entrees: [
      { q: 'Qu\'est-ce que l\'♾️ Entraînement infini ?', r: 'Un générateur d\'exercices qui tourne SUR TON TÉLÉPHONE : il crée des millions d\'exercices différents pour chaque micro-notion d\'un chapitre. Zéro téléchargement, zéro réseau, correction immédiate. C\'est l\'outil qui fait vraiment monter le niveau.', route: '/entrainement_infini' },
      { q: 'Choisir sa micro-notion et son niveau', r: 'Étape 1 : le chapitre ; étape 2 : la micro-notion (ex. « Théorème de Thalès ») ; étape 3 : le niveau, de 1 (notions de base) à 100 (niveau olympiade). Commence au 20-30 et monte de 10 en 10 quand tu enchaînes 5 bonnes réponses.' },
      { q: 'C\'est trop dur / trop facile', r: 'Trop dur : redescends de 10 niveaux, refais 10 exercices propres, puis remonte. Trop facile : monte au 60-100, puis va aux 🏅 Olympiades et aux 🧠 Pièges du BAC. Le bon niveau, c\'est celui où tu réussis environ 7 fois sur 10.', route: '/olympiades' },
      { q: 'Comment savoir si je progresse vraiment ?', r: 'La maîtrise par micro-notion monte à chaque bonne réponse, et le 📊 niveau de maîtrise du chapitre augmente. Regarde-la une fois par semaine, pas toutes les 5 minutes : la vraie progression se voit sur la durée.', route: '/maitrise' },
      { q: '🧮 Calcul mental', r: '2 minutes par jour pour des réflexes qui te font gagner du temps partout et t\'évitent les erreurs bêtes en composition. C\'est aussi le meilleur échauffement avant une séance d\'exercices.', route: '/calcul_mental' },
      { q: '🧪 Test de positionnement', r: '20 questions pour situer ton vrai niveau. Fais-le une fois à l\'arrivée (et après les grandes vacances) : il t\'évite de perdre du temps sur des chapitres déjà maîtrisés, ou d\'attaquer trop haut et de te décourager.', route: '/positionnement' },
    ],
  },
  {
    emoji: '🎮', titre: '6. Jouer & se mesurer', entrees: [
      { q: '⚡ QCM Éclair', r: '60 secondes, un maximum de bonnes réponses. Ton record est gardé sur le téléphone. Parfait pour 3 minutes de pause utile entre deux cours, ou pour réveiller tes réflexes avant une séance.', route: '/qcm_eclair' },
      { q: '⚔️ Duels', r: 'Choisis un chapitre : 10 questions, et tu affrontes ton « fantôme » (ton meilleur score sur ce chapitre). Score = bonnes réponses ×10 − 1 point par 10 secondes : mieux vaut juste et rapide que hésitant. Battre son fantôme est le défi le plus motivant de l\'app.', route: '/duels' },
      { q: '🎮 Mini-jeux', r: 'Deux jeux à faire à deux sur un même téléphone : la COURSE DE CALCUL (10 questions chacun, avec abandon possible — celui qui abandonne perd la manche) et le MEMORY DES FORMULES (6 paires formule/énoncé à retrouver). Idéal à la récré.', route: '/mini_jeux' },
      { q: '🏅 Olympiades & Concours', r: '20 problèmes de niveau concours, filtrables par difficulté. Certains sont des démonstrations : pas de réponse automatique — tu compares ta démonstration à la solution officielle et tu t\'auto-évalues. Pour ceux qui trouvent tout trop facile.', route: '/olympiades' },
      { q: '🏆 Le classement du LEX', r: 'Les élèves classés par XP, avec un filtre par niveau (ta classe/ton niveau par défaut). Ton profil public se publie automatiquement ; hors-ligne, tu vois au moins ta position et tes XP en local. En mode invité, tu n\'apparais pas au classement.', route: '/classement' },
      { q: 'Les jeux font-ils gagner des XP ?', r: 'Oui : chaque bonne réponse compte (+5 crédits, comme partout, plus les XP du mode). Les jeux musclent surtout la vitesse et les réflexes, mais ce sont les 📚 exercices officiels et les 🧠 révisions du jour qui font progresser le plus.', route: '/plus' },
      { q: 'Avec quoi je commence ce soir ?', r: 'Le trio gagnant : 10 min de 🧠 révisions du jour (obligatoire) + 1 ⚔️ Duel ou 1 ⚡ QCM Éclair (plaisir) + 5 min d\'♾️ entraînement infini sur ton point faible (efficacité). C\'est ce mélange qui fait monter les XP ET le niveau.' },
    ],
  },
  {
    emoji: '🏆', titre: '7. XP, ligues, crédits, boutique & badges', entrees: [
      { q: 'Comment je gagne des XP ?', r: 'En résolvant des exercices (officiels, infinis, QCM, duels, jeux) et en validant tes révisions du jour. Plus tu es régulier, plus ton total grimpe : l\'XP est cumulé à vie, il ne redescend jamais.' },
      { q: 'Les 6 ligues (seuils exacts)', r: 'Bronze 🥉 0 → Argent 🥈 500 → Or 🥇 1 500 → Platine 💎 3 000 → Diamant 💠 6 000 → Légende 👑 10 000 XP. Ta ligue s\'affiche sur ton profil et motive le mois suivant : vise le palier juste au-dessus, pas 10 000 d\'un coup.', route: '/classement' },
      { q: 'Les crédits 💰 et la 🛍️ Boutique', r: 'Chaque bonne réponse te donne +5 crédits. Tu les dépenses en 🛍️ Boutique : titres à afficher, ❄️ Streak Freeze et ⚡ Double XP 24h. Si tu ne dépenses rien, tu ne perds rien : les crédits s\'accumulent.', route: '/boutique' },
      { q: 'Ce que vend la boutique (prix exacts)', r: '🛡️ Titre « Gardien du LEX » 500 · ♟️ « Stratège du BAC » 800 · 👑 « Légende de Tessaoua » 2 500 · ❄️ Streak Freeze 150 (protège 1 jour manqué, 5 maximum en réserve) · ⚡ Double XP 24h 300. Les thèmes de couleur, eux, sont GRATUITS dans ⚙️ Réglages.', route: '/boutique' },
      { q: '❄️ Streak Freeze : le plus utile', r: 'Ta série 🔥 survit à UN jour manqué grâce à un freeze : coupure de réseau, maladie, panne de téléphone… Achète-en dès que tu as des crédits — perdre une série de 40 jours coûte bien plus cher que 150 crédits.', route: '/boutique' },
      { q: '⚡ Double XP 24h : quand l\'activer ?', r: 'La veille de ton plus gros moment de révision (week-end, préparation de composition) : tous tes XP sont doublés pendant 24 h. Inutile de l\'activer avant une journée où tu ne révises pas.' },
      { q: 'La série 🔥 (streak) et sa logique', r: 'Un jour = au moins un exercice fait. La série s\'affiche sur l\'accueil ; l\'app peut t\'alerter à 20 h si tu ne l\'as pas entretenue (🔔 Rappels intelligents). Un jour manqué SANS freeze remet la série à zéro.', route: '/parametres' },
      { q: '🏅 Les 9 badges secrets', r: '👣 Premier Pas (1 exercice) · 🔥 En Feu (série de 5) · ⚡ Inarrêtable (série de 10) · 🌅 Lève-tôt (avant 7 h) · 🌙 Veilleur (après 22 h) · 💯 Centurion (100 exercices) · 💎 Perfection (20 sans erreur) · 🏆 Champion de Tessaoua (1er du classement) · 📅 Assidu (7 jours d\'affilée). Raretés : commun → rare → épique → légendaire.', route: '/badges' },
      { q: '🥇 Les badges par matière', r: 'Maths 🧮 (50 et 200 exercices réussis), Physique-Chimie ⚗️ (50 et 200), SVT 🌿 (50 et 200), Anglais 🇬🇧 (50). La barre de progression s\'affiche dans Badges : repère la matière où tu es à 40 et pousse jusqu\'au badge.', route: '/badges' },
      { q: '💬 Citations et 🧑‍🎨 avatar', r: 'L\'écran Badges affiche une citation motivante aléatoire à chaque ouverture (parfait avant une composition), et tu personnalises ton avatar et ton titre dans 👤 Profil. Ces récompenses pèsent plus qu\'on ne le croit sur la motivation.', route: '/avatars' },
    ],
  },
  {
    emoji: '🧰', titre: '8. Les outils du quotidien', entrees: [
      { q: '🔍 Recherche globale', r: 'Un mot-clé et tu fouilles TOUT : exercices, formules, cours et olympiades. Exemple : tape « dérivée » ou « muscle » pour retrouver instantanément tout ce que contient l\'app. Verrouillée en 🔒 mode examen (anti-triche).', route: '/recherche' },
      { q: '📐 Fiches de formules', r: '118 formules de Maths et Physique-Chimie, classées et 100 % hors-ligne : LA page à ouvrir avant un devoir. Parcours-les une fois par semaine pour qu\'elles restent familières, au lieu de les découvrir le jour de la composition.', route: '/formulaire' },
      { q: '🖩 Calculatrice scientifique', r: 'sin, cos, tan, ln, log, √, puissances, π… tout ce qu\'il faut, sans réseau. Pratique pour vérifier un calcul — et désactivée en mode examen, pour ton honnêteté et celle du lycée.', route: '/calculatrice' },
      { q: '🧮 Solveur pas-à-pas', r: 'Tape une équation et suis CHAQUE étape expliquée : c\'est fait pour comprendre la méthode, pas pour copier un résultat. Le bon réflexe : essaie d\'abord sur papier, puis compare avec le solveur pour repérer l\'étape où tu bloques.', route: '/solveur' },
      { q: '📖 Glossaire', r: 'Le vocabulaire scientifique expliqué simplement : un mot = une définition claire. Utile quand un énoncé te bloque sur un terme (« chromoplaste », « force conservative », « valence »…).', route: '/glossaire' },
      { q: '🤖 LEX.AI : ce qu\'il fait (et ne fait pas)', r: 'Ton assistant, uniquement AU WIFI. Il explique, questionne et te guide sur le cours. Il ne fait PAS ton devoir à ta place et peut se tromper : vérifie toujours avec ton cours ou ton professeur.', route: '/lexai' },
      { q: 'LEX.AI : poser une bonne question', r: 'Sois précis : « Explique-moi pourquoi on met un signe moins ici dans l\'équation du second degré » marche mieux que « explique les maths ». Écris court, décompose ta question, et n\'envoie pas 30 messages d\'affilée : il faut lui laisser respirer.', route: '/lexai' },
      { q: 'LEX.AI en panne ou hors-ligne ?', r: 'L\'IA a besoin du réseau. Hors-ligne, l\'app peut te resservir une question DÉJÀ posée un jour avec du wifi. Si le message parle de « serveur non activé » ou de « trop de questions », ce n\'est pas ta connexion : espace tes questions et réessaie plus tard.', route: '/lexai' },
      { q: 'Les outils verrouillés en 🔒 mode examen', r: 'Verrouillés : exercices, cours, formulaire, calculatrice, flashcards, recherche, entraînement infini, badges, boutique, calcul mental, journal d\'erreurs et solveur — même en accès direct. Désactive le mode dans ⚙️ Réglages juste après l\'épreuve.', route: '/parametres' },
      { q: 'Mon kit « devoir maison »', r: '1) 📖 le cours du chapitre ; 2) 🧮 le solveur pour une équation difficile ; 3) 📐 le formulaire pour vérifier les formules ; 4) 📡 Partager si un camarade a besoin du chapitre ; 5) ⚠️ signaler un énoncé bizarre. Tu as tout dans l\'app.', route: '/plus' },
    ],
  },
  {
    emoji: '🌿', titre: '9. Bien-être, focus & bon rythme', entrees: [
      { q: '🫁 Les pauses guidées', r: 'Dans 🎯 Plus → Bien-être : regard au loin (20 secondes), respiration profonde, étirements cou/épaules/poignets, marche de 2 minutes, un verre d\'eau, sourire. Fais-en une toutes les 30-40 minutes : ta concentration remonte vraiment.', route: '/bien_etre' },
      { q: '⏳ Pomodoro 25 minutes', r: 'Travaille 25 minutes, pause 5, et recommence. L\'écran compte tes sessions : vise 4 sessions pour une heure et demie de travail réel. C\'est le meilleur moyen de ne pas passer 3 heures à « faire semblant ».', route: '/bien_etre' },
      { q: '💧 Hydratation', r: 'Le suivi d\'eau compte tes verres de la journée : objectif 1,5 à 2 L. Le cerveau est composé à environ 75 % d\'eau, et la déshydratation provoque fatigue et maux de tête — donc des fautes d\'inattention.', route: '/bien_etre' },
      { q: '🗓️ Planning de révision', r: 'Le planning répartit tes matières dans la semaine pour éviter de tout garder pour le dernier soir. Remplis-le une fois, tiens-le 2 semaines, puis ajuste : un planning respecté à 70 % bat un planning parfait jamais suivi.', route: '/bien_etre' },
      { q: '☕ L\'alerte 2 heures', r: 'Après 2 h cumulées dans la journée, l\'app te propose une pause (tu peux continuer, c\'est ton choix). Ne l\'ignore pas systématiquement : au-delà, on lit sans retenir. La pause fait partie du travail.', route: '/bien_etre' },
      { q: '🍻 La règle d\'or du LEX', r: 'Petites doses régulières > grosses veilles. 30 minutes par jour, 6 jours sur 7, battent 4 heures le dimanche soir. Le jour où tu n\'es pas motivé, fais juste tes 20 révisions : la régularité garde ta série et ton cerveau en marche.' },
    ],
  },
  {
    emoji: '📦', titre: '10. Sauvegarde, transfert & entraide', entrees: [
      { q: '💾 Générer ton code de transfert', r: '🎯 Plus → Réglages → 📦 Transfert → « Générer mon code ». L\'app empaquette ta progression dans un code à recopier. Envoie-le-toi par WhatsApp ou note-le sur papier, et garde-le dans un endroit sûr.', route: '/transfert' },
      { q: 'Ce qui est sauvegardé (et ce qui ne l\'est jamais)', r: 'Sauvegardé : XP, série, révisions programmées, maîtrise, badges, objectifs, notes, scores et titres. JAMAIS inclus : ton mot de passe, ta session et les cours téléchargés. Un code de transfert ne donne donc pas accès à ton compte.', route: '/transfert' },
      { q: '📱 Restaurer sur un nouveau téléphone', r: 'Installe l\'app, puis 🎯 Plus → Réglages → 📦 Transfert → colle ton code → confirme. Ta progression revient (XP, série, révisions, objectifs, notes). Ensuite reconnecte-toi et passe 1 minute au wifi pour que tout remonte.', route: '/transfert' },
      { q: '🗓️ Le rappel du 1er du mois', r: 'Chaque début de mois, l\'app te propose de refaire ta sauvegarde. Prends cette minute : le jour où ton téléphone tombe ou se fait voler, ce code vaut plus que tout le reste.', route: '/transfert' },
      { q: '👥 Deux élèves sur un même téléphone', r: 'Les progressions, achats et titres sont rangés PAR UTILISATEUR : si ton petit frère se connecte, il ne voit ni tes achats ni tes titres. Pense quand même à vous DÉCONNECTER avant de passer le téléphone, et ne partage jamais un code de transfert.', route: '/profil' },
      { q: 'Code de transfert perdu ?', r: 'Si ton compte est bien connecté et que tu passes au wifi, ta progression se resynchronise depuis le cloud. Sans code ET sans connexion, la progression locale est perdue : c\'est exactement pour ça que l\'app te rappelle de sauvegarder chaque mois.', route: '/transfert' },
    ],
  },
  {
    emoji: '⚙️', titre: '11. Réglages, accessibilité & confidentialité', entrees: [
      { q: '🌍 Langue FR / EN', r: '⚙️ Paramètres → Langue : Français ou English (les écrans principaux sont traduits). Redémarre l\'app après le changement pour que tout s\'applique partout.', route: '/parametres' },
      { q: '🔤 Taille de police', r: 'Trois tailles : petit, normal, grand. À monter si tu lis l\'app le soir, dans le taxi, ou si tu montres l\'écran à plusieurs. Redémarrage nécessaire pour l\'appliquer partout.', route: '/parametres' },
      { q: '🎨 Cinq thèmes, tous gratuits 🆓', r: 'Jaune (par défaut), bleu, vert, violet, rose : choisis ta couleur — c\'est gratuit et ça n\'a AUCUN impact sur tes XP. Rien ne se vend dans les réglages : ce que tu vois est à toi.', route: '/parametres' },
      { q: '🌙 Mode dortoir & 🌒 sombre auto', r: 'Le mode dortoir pose un filtre ambre pour réviser sans éblouir et protéger ton sommeil. Le « sombre auto » l\'active tout seul entre 19 h et 7 h — pratique si tu étudies souvent à la lampe.', route: '/parametres' },
      { q: '🔆 Contraste élevé & 🔤 police dyslexie', r: 'Le contraste élevé passe en texte noir sur fond clair : plus lisible en plein soleil, dehors. La police dyslexie augmente l\'espacement des lettres pour les lecteurs dyslexiques. Les deux se cumulent avec la taille de police.', route: '/parametres' },
      { q: '⏰ Rappel quotidien (tu choisis l\'heure)', r: 'Active « Me rappeler de réviser » puis règle l\'heure de 6 h à 23 h. La notification est LOCALE : elle marche sans réseau et sans données. Choisis l\'heure où tu es vraiment libre, sinon tu finiras par la désactiver.', route: '/parametres' },
      { q: '🔔 Rappels intelligents', r: 'Si ta série 🔥 est en danger, l\'app te prévient à 20 h : « un seul exercice ce soir la garde en vie ». C\'est le rappel le plus utile de l\'app pour ne pas casser une longue série.', route: '/parametres' },
      { q: '🔒 Mode examen', r: 'Il verrouille tous les outils (formulaire, calculatrice, flashcards, recherche, solveur…) pendant une épreuve : la correction reste, l\'aide disparaît. À activer avant l\'épreuve, à désactiver juste après — autrement tes outils restent bloqués.', route: '/parametres' },
      { q: '🔒 Où vont mes données ?', r: 'Tes scores, XP et demandes partent au compte LEX (cloud). Restent SUR TON TÉLÉPHONE : le cahier collé, le journal d\'erreurs, tes notes, ton avatar et tes réglages. Aucun mot de passe ni secret n\'est stocké en clair dans ton code de sauvegarde.', route: '/parametres' },
      { q: '🚪 Se déconnecter proprement', r: 'Dans 👤 Profil, le bouton déconnexion retire ton nom et ton identifiant du téléphone : à faire avant de prêter l\'appareil. Pense à générer un code de transfert AVANT, si tu ne sais pas quand tu reviendras.', route: '/profil' },
    ],
  },
  {
    emoji: '🗓️', titre: '12. Ton plan de semaine gagnant', entrees: [
      { q: 'Le rituel de 10 minutes (tous les jours)', r: '1) Ouvre l\'app ; 2) 🧠 Révisions du jour ; 3) 3 exercices au choix ; 4) regarde ta série 🔥 monter. Fais-le toujours à la même heure (au réveil, après le dîner) : c\'est l\'heure fixe qui crée l\'habitude, pas la motivation.' },
      { q: '🌐 Le jour du wifi : ta checklist', r: '1) ✍️ Exercices → ta classe → « 📥 Tout télécharger » pour chaque matière utile de la semaine ; 2) vérifie le badge de synchronisation ☁️ (rien en attente) ; 3) 📡 Partager si un camarade a besoin d\'un chapitre ; 4) pose 2-3 questions à LEX.AI ; 5) ouvre l\'app pour que tes scores hors-ligne remontent.' },
      { q: 'La semaine type', r: 'Lundi : télécharger + révisions. Mardi-jeudi : 10 min de révisions + 1 séance d\'entraînement infini sur ton point faible. Vendredi : 1 Duel ou QCM Éclair + Flashcards. Samedi : chapitre faible (📊 Ma maîtrise) + notes. Dimanche : révisions, objectif/badge, sauvegarde. Séance manquée ? Reprogramme-la — n\'abandonne pas la semaine.' },
      { q: 'Avant une composition : J-7 → J-1', r: 'J-7 : liste tes chapitres (📊 Ma maîtrise) et attaque le plus faible. J-5 → J-3 : exercices officiels + ♾️ infini niveau 40-60 sur les chapitres du programme. J-2 : 🧠 Pièges du BAC + journal d\'erreurs. J-1 : révisions du jour, 📐 formules, et DORS. Le jour J : relis l\'énoncé deux fois avant d\'écrire.', route: '/maitrise' },
      { q: 'Le jour du BAC', r: 'Le matin : 🧠 révisions du jour (10 min maximum), 📐 formulaire, une citation motivante dans Badges — puis plus aucun écran nouveau. Souligne les données de l\'énoncé, écris proprement, place les unités, et vérifie. Tu as fait le travail : fais confiance à tes automatismes.', route: '/badges' },
      { q: 'Les 6 erreurs qui coûtent des points', r: '1) Réviser sans faire d\'exercices ; 2) Sauter les révisions du jour parce qu\'« on verra demain » ; 3) Ignorer ses pièges du BAC ; 4) Lire la correction AVANT d\'essayer ; 5) Oublier les unités ; 6) Rester sur les chapitres qu\'on aime. Corrige une seule de ces six cette semaine : tu verras la différence.' },
    ],
  },
  {
    emoji: '🛠️', titre: '13. Dépannage express', entrees: [
      { q: 'L\'app met du temps à s\'ouvrir ou l\'écran reste figé', r: 'Ferme complètement l\'app puis rouvre-la. Si ça persiste : redémarre le téléphone, vérifie l\'espace libre, et active le mode économie de données. Ne désinstalle jamais avant d\'avoir généré ton code de transfert.', route: '/transfert' },
      { q: 'Le wifi marche mais l\'app semble ne rien envoyer', r: 'Ouvre l\'accueil et regarde le badge ☁️ : s\'il reste en attente, laisse l\'app ouverte 1 minute au réseau, la file se vide toute seule. Ta progression est sauvegardée localement : aucun exercice n\'est perdu pendant ce temps.', route: '/profil' },
      { q: 'Mes XP n\'apparaissent pas dans le classement', r: 'Le classement se met à jour à la prochaine connexion et exclut les comptes invités. Vérifie que tu es connecté avec ton compte, puis ouvre l\'app au wifi : tes XP locaux partent au cloud et remontent au classement.', route: '/classement' },
      { q: 'LEX.AI ne répond pas', r: 'L\'IA fonctionne uniquement en ligne. Si le message parle de « serveur non activé » ou de « trop de questions », ce n\'est pas ta connexion : espace tes questions et réessaie plus tard. Hors-ligne, seules les questions déjà posées peuvent revenir de la mémoire.', route: '/lexai' },
      { q: 'Je n\'entends pas le cours en audio', r: 'Monte le volume MÉDIA (pas celui de la sonnerie) et désactive le mode silencieux. Le chapitre doit être téléchargé pour que l\'audio soit disponible : sinon, télécharge-le au wifi puis réessaie.', route: '/audio_cours' },
      { q: 'Ma notification de rappel n\'arrive pas', r: 'Autorise les notifications pour LEX ACADEMY dans les réglages du téléphone, désactive l\'optimisation de batterie pour l\'app, puis vérifie l\'heure choisie dans ⚙️ Paramètres (entre 6 h et 23 h).', route: '/parametres' },
      { q: 'On me dit « mauvaise réponse » alors que mon résultat est juste', r: 'Donne la forme la plus simple (fraction irréductible), l\'unité exactement demandée, et surveille les signes et les parenthèses. Si c\'est toujours refusé, touche ⚠️ sur l\'exercice : le signalement arrive à l\'administrateur et sera corrigé.', route: '/classes_exos' },
      { q: 'Téléphone lent ou mémoire pleine', r: 'Active 📡 Mode économie de données dans ⚙️ Paramètres et limite les téléchargements aux matières de la semaine. L\'app nettoie déjà son cache toute seule : moins tu stockes de chapitres inutiles, plus ton téléphone respire.', route: '/parametres' },
      { q: 'Comment signaler un problème pour de bon', r: 'Exercice bizarre → ⚠️ sur l\'exercice. Problème de compte ou de mot de passe → « Mot de passe oublié ? » puis va voir l\'administrateur au lycée. Bug d\'application → dis-le à l\'administrateur : les erreurs de l\'app sont enregistrées et remontent au panneau d\'administration.', route: '/plus' },
    ],
  },
  {
    emoji: '🏛️', titre: '14. Espace encadrants (administrateurs)', entrees: [
      { q: 'Qui a accès à l\'administration ?', r: 'Le SUPERADMIN et les comptes promus administrateurs. Les élèves ne voient pas cet écran. L\'accès exige une connexion : l\'administration ne fonctionne pas hors-ligne (elle affiche un message clair).', route: '/admin' },
      { q: 'À quoi sert le panneau 🏛️ Administration ?', r: 'Suivre ⚠️ les exercices signalés par les élèves, 🆘 les demandes d\'aide (mots de passe), 🩺 la santé de la synchronisation de l\'appareil, 👥 la liste des administrateurs, 👑 le superadmin et 🕓 le journal des actions d\'administration.', route: '/admin' },
      { q: 'Ajouter un professeur ou un administrateur', r: 'Depuis l\'espace administration → rôles : on attribue des permissions précises (modération, contenus, comptes). Chaque promotion est inscrite dans le journal d\'administration, avec son auteur et sa date.', route: '/admin_roles' },
      { q: 'Modération et qualité du contenu', r: 'Les signalements d\'exercices et les demandes d\'aide remontent au panneau central : c\'est le circuit qui permet de corriger un énoncé fautif ou de rendre un mot de passe perdu, sans chercher l\'élève dans toute la cour.' },
    ],
  },
];

/** Nombre total de questions du guide (affiché dans l'intro). */
const NB_ENTREES = SECTIONS.reduce((n, s) => n + s.entrees.length, 0);

export default function Guide() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<number | null>(0);

  // marquer le guide comme vu (sert à l'onboarding de l'accueil)
  useEffect(() => {
    AsyncStorage.setItem('lex_guide_vu', '1').catch(() => undefined);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>TOUT SAVOIR SUR L’APP</Text>
        <Text style={styles.title}>❓ Guide complet</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          {SECTIONS.length} sections · {NB_ENTREES} questions — le manuel officiel de LEX ACADEMY, vérifié contre l’app elle-même. Touche une section pour l’ouvrir.
        </Text>
        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <TouchableOpacity style={styles.sectionTete} onPress={() => setOuvert(ouvert === i ? null : i)}>
              <Text style={styles.sectionTitre}>{s.emoji} {s.titre}</Text>
              <Text style={styles.fleche}>{ouvert === i ? '▾' : '▸'}</Text>
            </TouchableOpacity>
            {ouvert === i && (
              <View style={styles.sectionCorps}>
                {s.entrees.map((en, j) => {
                  const route = en.route;
                  return (
                    <View key={j} style={styles.entree}>
                      <Text style={styles.question}>{en.q}</Text>
                      <Text style={styles.reponse}>{en.r}</Text>
                      {route ? (
                        <TouchableOpacity style={styles.lien} onPress={() => router.push(route)}>
                          <Text style={styles.lienText}>Ouvrir cet écran ▸</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.bouton} onPress={() => router.push('/classes_exos')}>
          <Text style={styles.boutonText}>C’est parti — premier exercice ! ▶</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  intro: { color: '#FBBF24', fontSize: 14, fontStyle: 'italic', marginBottom: 15, textAlign: 'center' },
  section: { backgroundColor: '#1E293B', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  sectionTete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  sectionTitre: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', flex: 1 },
  fleche: { color: '#FBBF24', fontSize: 18, marginLeft: 10 },
  sectionCorps: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#334155' },
  entree: { marginTop: 14 },
  question: { color: '#FBBF24', fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  reponse: { color: '#CBD5E1', fontSize: 13, lineHeight: 20 },
  lien: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#FBBF24', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  lienText: { color: '#FBBF24', fontSize: 12, fontWeight: 'bold' },
  bouton: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  boutonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
