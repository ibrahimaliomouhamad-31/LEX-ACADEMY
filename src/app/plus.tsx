import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getExamenActif, getLangue } from '../services/parametres';

interface Fonctionnalite {
  emoji: string;
  titre: string; titreEn: string;
  description: string; descriptionEn: string;
  route: string;
  couleur: string;
}

// Routes verrouillées quand le 🔒 Mode examen est actif (anti-triche)
const ROUTES_VERROUILLEES_EXAMEN = ['/formulaire', '/calculatrice', '/flashcards', '/recherche', '/figures'];

const REVISER: Fonctionnalite[] = [
  { emoji: '📚', titre: 'Annales BAC', titreEn: 'Past BAC exams', description: 'Vrais sujets du BAC à télécharger', descriptionEn: 'Real BAC papers to download', route: '/annales', couleur: '#B91C1C' },
  { emoji: '📝', titre: 'Devoirs', titreEn: 'Homework', description: 'Les devoirs donnés par tes professeurs', descriptionEn: 'Assignments from your teachers', route: '/devoirs', couleur: '#F59E0B' },
  { emoji: '📝', titre: 'BAC Blanc', titreEn: 'Mock exam', description: 'Épreuves chronométrées, note sur 20 et corrigé', descriptionEn: 'Timed exams, graded /20 with answers', route: '/bac_blanc', couleur: '#EF4444' },
  { emoji: '🧪', titre: 'Test de positionnement', titreEn: 'Placement test', description: '20 questions pour situer ton niveau exact', descriptionEn: '20 questions to find your exact level', route: '/positionnement', couleur: '#06B6D4' },
  { emoji: '🃏', titre: 'Flashcards', titreEn: 'Flashcards', description: 'Cartes de révision générées depuis tes cours', descriptionEn: 'Revision cards made from your lessons', route: '/flashcards', couleur: '#8B5CF6' },
  { emoji: '🧬', titre: 'QCM SVT', titreEn: 'Biology quiz', description: '40 questions à choix multiples, 2nde → Tle', descriptionEn: '40 multiple-choice questions', route: '/qcm_svt', couleur: '#84CC16' },
  { emoji: '🎧', titre: 'Cours en audio', titreEn: 'Audio lessons', description: 'Écoute tes cours à voix haute, hors-ligne', descriptionEn: 'Listen to your lessons, offline', route: '/audio_cours', couleur: '#8B5CF6' },
  { emoji: '📅', titre: 'Planning', titreEn: 'Study plan', description: 'Ton programme de révision hebdomadaire', descriptionEn: 'Your weekly study plan', route: '/planning', couleur: '#0EA5E9' },
  { emoji: '📊', titre: 'Ma maîtrise', titreEn: 'My mastery', description: 'Progression par chapitre, du plus faible au plus fort', descriptionEn: 'Progress per chapter', route: '/maitrise', couleur: '#10B981' },
  { emoji: '📈', titre: 'Statistiques', titreEn: 'Statistics', description: 'Activité, taux de réussite, progression', descriptionEn: 'Activity, success rate, progress', route: '/stats_detail', couleur: '#06B6D4' },
  { emoji: '🧠', titre: 'Pièges du BAC', titreEn: 'BAC traps', description: 'Tes points noirs détectés + pièges classiques', descriptionEn: 'Your weak spots + classic traps', route: '/pieges', couleur: '#EF4444' },
  { emoji: '🎯', titre: 'Objectifs & Notes', titreEn: 'Goals & Notes', description: 'Fixe tes buts + notes attachées aux chapitres', descriptionEn: 'Set goals + chapter notes', route: '/objectifs', couleur: '#EC4899' },
];

const JOUER: Fonctionnalite[] = [
  { emoji: '📰', titre: 'Défi du jour', titreEn: 'Daily challenge', description: 'Le même défi pour toute ta classe (mode duo !)', descriptionEn: 'Same challenge for your class (duo mode!)', route: '/defi_jour', couleur: '#EC4899' },
  { emoji: '🏆', titre: 'Coupe inter-classes', titreEn: 'Class cup', description: 'La classe championne de la semaine', descriptionEn: 'Weekly champion class', route: '/coupe', couleur: '#FBBF24' },
  { emoji: '⚡', titre: 'QCM Éclair', titreEn: 'Lightning quiz', description: '60 secondes pour un max de bonnes réponses', descriptionEn: '60 seconds, max correct answers', route: '/qcm_eclair', couleur: '#FBBF24' },
  { emoji: '⚔️', titre: 'Duels', titreEn: 'Duels', description: 'Bats le fantôme de ton meilleur score', descriptionEn: 'Beat your ghost score', route: '/duels', couleur: '#F97316' },
  { emoji: '🎮', titre: 'Mini-jeux', titreEn: 'Mini-games', description: 'Course de calcul à 2 joueurs + memory', descriptionEn: '2-player math race + memory', route: '/mini_jeux', couleur: '#F97316' },
  { emoji: '🗺️', titre: 'Conquête du LEX', titreEn: 'LEX conquest', description: 'Conquis des territoires en maîtrisant les chapitres', descriptionEn: 'Conquer territories by mastering chapters', route: '/conquete', couleur: '#8B5CF6' },
  { emoji: '🏅', titre: 'Olympiades', titreEn: 'Olympiads', description: '20 problèmes de concours pour les génies', descriptionEn: '20 competition problems for geniuses', route: '/olympiades', couleur: '#F59E0B' },
];

const OUTILS: Fonctionnalite[] = [
  { emoji: '🔍', titre: 'Recherche globale', titreEn: 'Global search', description: 'Un mot-clé → exercices, formules, cours, olympiades', descriptionEn: 'One keyword → everything', route: '/recherche', couleur: '#0EA5E9' },
  { emoji: '📐', titre: 'Formulaire', titreEn: 'Formula sheet', description: '118 formules Maths & PC, même hors-ligne', descriptionEn: '118 Math & Physics formulas, offline', route: '/formulaire', couleur: '#3B82F6' },
  { emoji: '🖩', titre: 'Calculatrice', titreEn: 'Calculator', description: 'Scientifique : sin, cos, ln, √, puissances...', descriptionEn: 'Scientific: sin, cos, ln, √, powers...', route: '/calculatrice', couleur: '#64748B' },
  { emoji: '🧮', titre: 'Solveur pas-à-pas', titreEn: 'Step-by-step solver', description: 'Tape une équation, chaque étape expliquée', descriptionEn: 'Type an equation, every step explained', route: '/solveur', couleur: '#3B82F6' },
  { emoji: '🖼️', titre: 'Figures', titreEn: 'Figures', description: 'Traceur de fonctions et Pythagore visuel', descriptionEn: 'Function plotter & visual Pythagoras', route: '/figures', couleur: '#06B6D4' },
  { emoji: '📸', titre: "Photo d'exercice", titreEn: 'Exercise photo', description: "Photographie un exo papier, l'IA te guide (wifi)", descriptionEn: 'Snap a paper exercise, AI guides you (wifi)', route: '/photo_exo', couleur: '#EC4899' },
  { emoji: '📡', titre: 'Partager', titreEn: 'Share', description: 'Envoie un chapitre à un camarade par code', descriptionEn: 'Send a chapter to a friend via code', route: '/partage', couleur: '#10B981' },
];

const REGLAGES: Fonctionnalite[] = [
  { emoji: '📦', titre: 'Transfert', titreEn: 'Transfer', description: 'Sauvegarde tes données et restaure-les ailleurs', descriptionEn: 'Backup & restore your data', route: '/transfert', couleur: '#64748B' },
  { emoji: '⚙️', titre: 'Paramètres', titreEn: 'Settings', description: 'Langue, police, dortoir 🌙, rappel ⏰', descriptionEn: 'Language, font, dorm 🌙, reminder ⏰', route: '/parametres', couleur: '#475569' },
  { emoji: '🏛️', titre: 'Administration', titreEn: 'Administration', description: "Réservé au proviseur de l'app et aux admins", descriptionEn: 'App principal & admins only', route: '/admin', couleur: '#065F46' },
];

const ONGLETS = [
  { cle: 'reviser', fr: '📚 Réviser', en: '📚 Study' },
  { cle: 'jouer', fr: '🎮 Jouer', en: '🎮 Play' },
  { cle: 'outils', fr: '🧰 Outils', en: '🧰 Tools' },
  { cle: 'reglages', fr: '⚙️ Réglages', en: '⚙️ Settings' },
];

export default function Plus() {
  const router = useRouter();
  const [examenActif, setExamenActif] = useState(false);
  const [langue, setLangue] = useState<'fr' | 'en'>('fr');
  const [onglet, setOnglet] = useState('reviser');

  useEffect(() => {
    getExamenActif().then(setExamenActif).catch(() => setExamenActif(false));
    getLangue().then(setLangue).catch(() => undefined);
  }, []);

  const en = langue === 'en';
  const entrees =
    onglet === 'reviser' ? REVISER : onglet === 'jouer' ? JOUER : onglet === 'outils' ? OUTILS : REGLAGES;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>{en ? 'TOOLBOX' : 'BOÎTE À OUTILS'}</Text>
        <Text style={styles.title}>{en ? '🎯 More features' : '🎯 Plus de fonctionnalités'}</Text>
      </View>

      {examenActif && (
        <Text style={styles.banniereExamen}>
          {en ? '🔒 EXAM MODE — tools locked (⚙️ to disable)' : '🔒 MODE EXAMEN ACTIF — outils verrouillés (⚙️ pour désactiver)'}
        </Text>
      )}

      {/* Onglets */}
      <View style={styles.rowOnglets}>
        {ONGLETS.map((o) => (
          <TouchableOpacity
            key={o.cle}
            style={[styles.onglet, onglet === o.cle && styles.ongletActif]}
            onPress={() => setOnglet(o.cle)}
          >
            <Text style={[styles.ongletText, onglet === o.cle && styles.ongletTextActif]}>{en ? o.en : o.fr}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.grille}>
          {entrees.map((f) => {
            const verrouille = examenActif && ROUTES_VERROUILLEES_EXAMEN.includes(f.route);
            return (
              <TouchableOpacity
                key={f.route}
                style={[styles.carte, { borderLeftColor: f.couleur }, verrouille && styles.carteVerrouillee]}
                onPress={() => router.push(f.route as never)}
                disabled={verrouille}
              >
                <Text style={styles.carteEmoji}>{verrouille ? '🔒' : f.emoji}</Text>
                <Text style={styles.carteTitre}>{en ? f.titreEn : f.titre}</Text>
                <Text style={styles.carteDesc}>
                  {verrouille ? (en ? 'Locked by exam mode' : 'Verrouillé par le mode examen') : en ? f.descriptionEn : f.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 30 }} />
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
  banniereExamen: { backgroundColor: '#7F1D1D', color: '#FCA5A5', fontSize: 12, paddingHorizontal: 20, paddingVertical: 10, lineHeight: 17 },
  rowOnglets: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12 },
  onglet: { flex: 1, marginHorizontal: 3, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center' },
  ongletActif: { backgroundColor: '#FBBF24' },
  ongletText: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  ongletTextActif: { color: '#0F172A' },
  grille: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  carte: { width: '48.5%', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 3 },
  carteVerrouillee: { opacity: 0.35 },
  carteEmoji: { fontSize: 28, marginBottom: 8 },
  carteTitre: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  carteDesc: { color: '#94A3B8', fontSize: 11, marginTop: 5, lineHeight: 16 },
});
