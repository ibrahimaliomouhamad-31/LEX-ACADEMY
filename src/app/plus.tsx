import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BADGES, chargerContexte, evaluerBadges, liguePourXp } from '../services/motivation';
import { getExamenActif, getLangue } from '../services/parametres';
import { getCredits, getStats, tauxMaitrise } from '../services/statsSuivi';
import { getUserItem } from '../services/userStorage';
import { lireStreakActuel, lireXpTotal } from '../services/xpLocal';

/** Type exact accepté par router.push (union des routes typées expo-router). */
type HrefApp = Parameters<ReturnType<typeof useRouter>['push']>[0];

/**
 * 📊 ÉTAT RÉEL DE L'ÉLÈVE — bandeau en tête de l'écran.
 * Tout est lu depuis les données LOCALES (aucune requête réseau) : l'écran
 * reste utile hors-ligne et AUCUN chiffre affiché n'est inventé.
 */
interface EtatEleve {
  xp: number;
  serie: number;
  credits: number;
  erreurs: number;
  tentes: number;
  qcmRecord: number;
  badges: number;
  badgesTotal: number;
  chapitresFaibles: number;
}

const ETAT_VIDE: EtatEleve = {
  xp: 0, serie: 0, credits: 0, erreurs: 0, tentes: 0, qcmRecord: 0,
  badges: 0, badgesTotal: BADGES.length, chapitresFaibles: 0,
};

/** Clé du journal d'erreurs (la même que `app/journal_erreurs.tsx`). */
const CLE_JOURNAL_ERREURS = 'lex_journal_erreurs';

interface Fonctionnalite {
  emoji: string;
  titre: string; titreEn: string;
  description: string; descriptionEn: string;
  route: HrefApp;
  couleur: string;
  /** Info RÉELLE calculée depuis les données locales (jamais une promesse). */
  detail?: (e: EtatEleve) => string | null;
}

// Routes verrouillées quand le 🔒 Mode examen est actif (anti-triche).
// 🛡️ LISTE COMPLÈTE : elle couvre aussi les écrans qui ne sont plus affichés
// ici, car c'est l'accès DIRECT (deep link) qu'il faut bloquer, pas seulement
// la carte. Garde partagée via parametres.ts (bloquerSiExamen), appliquée dans
// chaque écran d'outil.
const ROUTES_STRICT_EXAMEN: HrefApp[] = [
  '/exercices', '/cours', '/formulaire', '/calculatrice', '/flashcards',
  '/recherche', '/entrainement_infini', '/badges', '/boutique',
  '/calcul_mental', '/journal_erreurs', '/solveur',
];

const ONGLETS = [
  { cle: 'apprendre', fr: '📚 Apprendre', en: '📚 Learn' },
  { cle: 'outils', fr: '🧰 Outils', en: '🧰 Tools' },
  { cle: 'reglages', fr: '⚙️ Réglages', en: '⚙️ Settings' },
];

// ─── 📚 APPRENDRE — ce qui fait progresser ──────────────────────────────────
const APPRENDRE: Fonctionnalite[] = [
  { emoji: '🎧', titre: 'Cours en audio', titreEn: 'Audio lessons', description: 'Écoute tes cours à voix haute, même sans internet', descriptionEn: 'Listen to your lessons, even offline', route: '/audio_cours', couleur: '#8B5CF6' },
  {
    emoji: '📊', titre: 'Ma maîtrise', titreEn: 'My mastery', description: 'Chapitre par chapitre, du plus faible au plus fort', descriptionEn: 'Chapter by chapter, weakest first', route: '/maitrise', couleur: '#10B981',
    detail: (e) => (e.chapitresFaibles > 0 ? `${e.chapitresFaibles} chapitre${e.chapitresFaibles > 1 ? 's' : ''} sous 50 % de réussite` : null),
  },
  {
    emoji: '📓', titre: 'Journal d\'erreurs', titreEn: 'Error journal', description: 'Chaque faute devient un automatisme corrigé', descriptionEn: 'Every mistake becomes a fixed reflex', route: '/journal_erreurs', couleur: '#F59E0B',
    detail: (e) => (e.erreurs > 0 ? `${e.erreurs} erreur${e.erreurs > 1 ? 's' : ''} en attente de révision` : 'Aucune erreur enregistrée : continue !'),
  },
  {
    emoji: '⚡', titre: 'QCM Éclair', titreEn: 'Lightning quiz', description: '60 secondes pour un maximum de bonnes réponses', descriptionEn: '60 seconds, max correct answers', route: '/qcm_eclair', couleur: '#FBBF24',
    detail: (e) => (e.qcmRecord > 0 ? `Ton record : ${e.qcmRecord} bonnes réponses` : null),
  },
  {
    emoji: '📈', titre: 'Statistiques', titreEn: 'Statistics', description: 'Ton activité, ton taux de réussite, ta progression', descriptionEn: 'Your activity, success rate, progress', route: '/statistiques', couleur: '#06B6D4',
    detail: (e) => (e.tentes > 0 ? `${e.tentes} exercice${e.tentes > 1 ? 's' : ''} tenté${e.tentes > 1 ? 's' : ''} au total` : null),
  },
  { emoji: '📖', titre: 'Glossaire', titreEn: 'Glossary', description: 'Le vocabulaire scientifique expliqué simplement', descriptionEn: 'Scientific vocabulary explained simply', route: '/glossaire', couleur: '#0EA5E9' },
];

// ─── 🧰 OUTILS — calculer, comprendre, partager ─────────────────────────────
const OUTILS: Fonctionnalite[] = [
  { emoji: '📐', titre: 'Formulaire', titreEn: 'Formula sheet', description: 'Toutes les formules Maths & PC, même hors-ligne', descriptionEn: 'All Math & Physics formulas, offline', route: '/formulaire', couleur: '#3B82F6' },
  { emoji: '🧮', titre: 'Solveur pas-à-pas', titreEn: 'Step-by-step solver', description: 'Tape une équation : chaque étape est expliquée', descriptionEn: 'Type an equation: every step explained', route: '/solveur', couleur: '#3B82F6' },
  { emoji: '⚡', titre: 'Calcul mental', titreEn: 'Mental math', description: '10 questions chronométrées, 2 minutes par jour', descriptionEn: '10 timed questions, 2 minutes a day', route: '/calcul_mental', couleur: '#FBBF24' },
  { emoji: '📡', titre: 'Partager un chapitre', titreEn: 'Share a chapter', description: 'Envoie un cours à un camarade, même sans internet', descriptionEn: 'Send a lesson to a friend, even offline', route: '/partage', couleur: '#10B981' },
  {
    emoji: '🏆', titre: 'Badges & citations', titreEn: 'Badges & quotes', description: 'Débloque des badges et des citations motivantes', descriptionEn: 'Unlock badges and motivational quotes', route: '/badges', couleur: '#8B5CF6',
    detail: (e) => `${e.badges} / ${e.badgesTotal} badges débloqués`,
  },
  {
    emoji: '🛍️', titre: 'Boutique', titreEn: 'Shop', description: 'Dépense tes crédits : titres, gel ❄️, double XP ⚡', descriptionEn: 'Spend credits: titles, freezes, double XP', route: '/boutique', couleur: '#EC4899',
    detail: (e) => `💰 ${e.credits} crédit${e.credits > 1 ? 's' : ''} disponible${e.credits > 1 ? 's' : ''}`,
  },
];

// ─── ⚙️ RÉGLAGES — compte, appareil, encadrement ───────────────────────────
const REGLAGES: Fonctionnalite[] = [
  { emoji: '📦', titre: 'Transfert & sauvegarde', titreEn: 'Transfer & backup', description: 'Change de téléphone sans rien perdre de ta progression', descriptionEn: 'Switch phones without losing progress', route: '/transfert', couleur: '#64748B' },
  { emoji: '⚙️', titre: 'Paramètres', titreEn: 'Settings', description: 'Langue, thème, dortoir 🌙, rappel ⏰, mode examen 🔒', descriptionEn: 'Language, theme, dorm, reminder, exam mode', route: '/parametres', couleur: '#475569' },
  { emoji: '🏛️', titre: 'Administration', titreEn: 'Administration', description: 'Signalements, rôles et journal — réservé aux admins', descriptionEn: 'Reports, roles and log — admins only', route: '/admin', couleur: '#065F46' },
];

export default function Plus() {
  const router = useRouter();
  const [examenActif, setExamenActif] = useState(false);
  const [langue, setLangue] = useState<'fr' | 'en'>('fr');
  const [onglet, setOnglet] = useState('apprendre');
  const [etat, setEtat] = useState<EtatEleve>(ETAT_VIDE);

  useEffect(() => {
    getExamenActif().then(setExamenActif).catch(() => setExamenActif(false));
    getLangue().then(setLangue).catch(() => undefined);

    // 📊 Bandeau : indicateurs LOCAUX. Un échec laisse simplement les zéros
    // (l'écran doit toujours s'afficher, même hors-ligne ou premier lancement).
    (async () => {
      try {
        const [xp, serie, credits, contexte, stats, journalBrut] = await Promise.all([
          lireXpTotal(),
          lireStreakActuel(),
          getCredits(),
          chargerContexte(),
          getStats(),
          getUserItem(CLE_JOURNAL_ERREURS),
        ]);

        let erreurs = 0;
        if (journalBrut) {
          const parse: unknown = JSON.parse(journalBrut);
          erreurs = Array.isArray(parse) ? parse.length : 0;
        }

        const chapitres = Object.values(stats.chapitres || {});
        setEtat({
          xp,
          serie,
          credits,
          erreurs,
          tentes: stats.totalTentes,
          qcmRecord: contexte.qcmRecord,
          badges: evaluerBadges(contexte).filter((r) => r.debloque).length,
          badgesTotal: BADGES.length,
          chapitresFaibles: chapitres.filter((c) => tauxMaitrise(c) < 50).length,
        });
      } catch {
        // valeurs par défaut
      }
    })();
  }, []);

  const en = langue === 'en';
  const entrees = onglet === 'apprendre' ? APPRENDRE : onglet === 'outils' ? OUTILS : REGLAGES;
  const ligue = liguePourXp(etat.xp);

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

      {/* 📊 Ton état — lu localement dans tes données, jamais inventé */}
      <View style={styles.bandeau}>
        <View style={styles.statBloc}>
          <Text style={styles.statVal}>{etat.xp}</Text>
          <Text style={styles.statLbl}>{ligue.emoji} {ligue.nom}</Text>
        </View>
        <View style={styles.separateur} />
        <View style={styles.statBloc}>
          <Text style={styles.statVal}>🔥 {etat.serie}</Text>
          <Text style={styles.statLbl}>{en ? 'day streak' : 'jours de série'}</Text>
        </View>
        <View style={styles.separateur} />
        <View style={styles.statBloc}>
          <Text style={styles.statVal}>💰 {etat.credits}</Text>
          <Text style={styles.statLbl}>{en ? 'credits' : 'crédits'}</Text>
        </View>
      </View>

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
            const verrouille = examenActif && ROUTES_STRICT_EXAMEN.includes(f.route);
            const detail = verrouille || !f.detail ? null : f.detail(etat);
            return (
              <TouchableOpacity
                key={typeof f.route === 'string' ? f.route : f.route.pathname}
                style={[styles.carte, { borderLeftColor: f.couleur }, verrouille && styles.carteVerrouillee]}
                onPress={() => router.push(f.route)}
                disabled={verrouille}
              >
                <Text style={styles.carteEmoji}>{verrouille ? '🔒' : f.emoji}</Text>
                <Text style={styles.carteTitre}>{en ? f.titreEn : f.titre}</Text>
                <Text style={styles.carteDesc}>
                  {verrouille ? (en ? 'Locked by exam mode' : 'Verrouillé par le mode examen') : en ? f.descriptionEn : f.description}
                </Text>
                {detail ? <Text style={styles.carteDetail}>{detail}</Text> : null}
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
  bandeau: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 12, backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 12 },
  statBloc: { flex: 1, alignItems: 'center' },
  statVal: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  statLbl: { color: '#94A3B8', fontSize: 10, marginTop: 3, textAlign: 'center' },
  separateur: { width: 1, height: 28, backgroundColor: '#334155' },
  rowOnglets: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 14 },
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
  carteDetail: { color: '#FBBF24', fontSize: 11, fontWeight: 'bold', marginTop: 6, lineHeight: 15 },
});

