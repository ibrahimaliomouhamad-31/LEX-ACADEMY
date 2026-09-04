import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 3 — GUIDE ULTRA-DÉTAILLÉ : tout savoir sur l'app, organisé par sections.
// Accessible depuis l'accueil (❓ Guide) ET au premier lancement (onboarding).

interface Section {
  emoji: string;
  titre: string;
  entrees: { q: string; r: string }[];
}

const SECTIONS: Section[] = [
  {
    emoji: '🚀', titre: '1. Bien démarrer',
    entrees: [
      { q: 'C\'est quoi LEX ACADEMY ?', r: 'Ton professeur de poche : cours, exercices infinis, révisions intelligentes et jeux — faits pour le Lycée d\'Excellence de Tessaoua, et pensés pour vivre SANS internet toute la semaine.' },
      { q: 'Première fois ici ? Fais ceci :', r: '1) Connecte-toi ou crée ton compte (pour les XP). 2) Fais le 🧪 Test de positionnement (🎯 Plus). 3) Télécharge tes chapitres au wifi (voir section Hors-ligne). 4) Fixe-toi un objectif dans 🎯 Objectifs.' },
      { q: 'Les XP, ça sert à quoi ?', r: 'À grimper au classement du LEX 🏆, monter de ligue (Bronze → Légende 👑) et gagner des crédits 💰 (5 par bonne réponse) pour la 🛍️ Boutique (thèmes, titres).' },
      { q: 'Mot de passe oublié ?', r: 'Sur l\'écran de connexion, touche « Mot de passe oublié ? » : ta demande part à l\'administrateur, va le voir au lycée pour le récupérer.' },
    ],
  },
  {
    emoji: '📴', titre: '2. Vivre sans internet (très important !)',
    entrees: [
      { q: 'Le wifi ne marche qu\'à un endroit du LEX. Comment je révise chez moi ?', r: 'Au wifi : va dans ✍️ Exercices → ta classe → ta matière → « 📥 Tout télécharger ». Exercices ET cours complets sont stockés sur ton téléphone. Toute la semaine, tout s\'ouvre instantanément, sans réseau.' },
      { q: 'Pas eu le temps de télécharger ?', r: 'Aucun souci : l\'🧠 Entraînement Infini (niveaux 1 à 100), le QCM Éclair, la Calculatrice, le Formulaire, les Flashcards, les Duels et les Révisions marchent SANS aucun téléchargement.' },
      { q: 'Un camarade a déjà tout téléchargé', r: 'Il peut te l\'envoyer : 📡 Partager → il génère un code, te l\'envoie par WhatsApp (ou te le montre) → tu le colles → chapitre complet installé. L\'entraide du LEX !' },
      { q: 'Mes scores partis hors-ligne sont-ils perdus ?', r: 'Non : tout ce qui échoue sans réseau part dans une file d\'attente et s\'envoie automatiquement à ton prochain passage au wifi.' },
      { q: 'Changer de téléphone ?', r: '🎯 Plus → 📦 Transfert : génère ton code de sauvegarde, garde-le (WhatsApp), et restaure-le sur le nouveau téléphone. Un rappel t\'y aidera chaque début de mois.' },
    ],
  },
  {
    emoji: '📚', titre: '3. Réviser efficacement',
    entrees: [
      { q: '🧠 Révisions du jour : c\'est quoi ?', r: 'La répétition espacée : chaque exercice raté revient 1, 3, 7, 16, 35, 70 puis 140 jours plus tard — exactement quand ton mémoire commence à lâcher. 10 minutes par jour suffisent. C\'EST la méthode la plus prouvée scientifiquement.' },
      { q: 'Comment marche l\'Entraînement Infini ?', r: 'Choisis une micro-notion du chapitre et un niveau de 1 (base) à 100 (olympiade). L\'app crée des millions d\'exercices différents, calculés juste sur ton téléphone. Niveau 2 ≈ 3× plus dur que 1, etc.' },
      { q: 'J\'ai tout trop facile / trop dur', r: 'Trop facile : monte au niveau 60-100 puis va aux 🏅 Olympiades. Trop dur : 📊 Ma maîtrise montre tes chapitres faibles, et 🧠 Pièges du BAC t\'explique tes erreurs récurrentes.' },
      { q: '📝 BAC Blanc', r: 'Une épreuve chronométrée (30 min à 2 h), notée sur 20, avec corrigé. Ton niveau s\'adapte automatiquement à tes stats : plus tu es fort, plus l\'épreuve est dure.' },
      { q: '📅 Planning', r: 'Ton programme de la semaine, construit sur tes points faibles réels : 30 minutes par jour, un chapitre par jour.' },
      { q: '🎧 et 🃏 ?', r: 'Cours en audio (révise en marchant) et Flashcards (cartes question/réponse générées de tes cours, mode « je savais / à revoir »).' },
    ],
  },
  {
    emoji: '🎮', titre: '4. Jouer et rester motivé',
    entrees: [
      { q: '📰 Défi du jour', r: 'Chaque jour, 3 questions IDENTIQUES pour toute ta classe : qui sera le plus rapide ? Le classement de la classe se met à jour en direct. En mode 👥 Duo, jouez à deux sur le même téléphone.' },
      { q: '🏆 Coupe inter-classes', r: 'La moyenne des défis de la semaine oppose les 5 classes du LEX. Faites participer un maximum de camarades !' },
      { q: '⚔️ Duels, 🎮 Mini-jeux, 🗺️ Conquête', r: 'Duel : bats le fantôme (ton record). Mini-jeux : course de calcul à 2 + memory des formules. Conquête : chaque chapitre maîtrisé à 70 % devient un territoire 🏰 à toi.' },
      { q: '🏅 Badges, quêtes, ligues', r: 'Des quêtes changent chaque semaine, 15 badges à débloquer, 6 ligues selon tes XP. La régularité rapporte plus que le farming.' },
    ],
  },
  {
    emoji: '🤖', titre: '5. L\'IA : LEX.AI, photo',
    entrees: [
      { q: 'LEX.AI (au wifi)', r: 'Ton grand frère pote : il pose des exercices sur TON cours, te relance sans jamais donner la réponse, et connaît tes points faibles pour te cibler.' },
      { q: '📸 Photo d\'exercice (au wifi)', r: 'Photographie un exercice papier du manuel : l\'IA le lit et te guide étape par étape — sans tricher.' },
    ],
  },
  {
    emoji: '⚙️', titre: '6. Réglages et bonnes pratiques',
    entrees: [
      { q: '🌙 Mode dortoir, 🔒 Mode examen, ⏰ Rappel', r: 'Dortoir : filtre ambre pour réviser la nuit. Examen : verrouille formulaire/calculatrice/flashcards pendant une épreuve (honnêteté d\'honneur). Rappel : notification quotidienne à l\'heure que TU choisis — en pause pendant les vacances, doublée avant les compositions.' },
      { q: '🌍 Langue et 🔤 police', r: 'Français/Anglais (écrans principaux) et 3 tailles de police dans ⚙️ Paramètres.' },
      { q: '⚠️ Un exercice est faux ?', r: 'Touche ⚠️ sur l\'exercice : ton signalement part à l\'équipe (même hors-ligne, il s\'envoie au prochain wifi). Tu améliores l\'app pour tous.' },
      { q: '🍻 Règle d\'or', r: 'Petites doses régulières > grosses veilles. Après 2 h par jour, l\'app te proposera une pause : écoute-la, ton cerveau consolide en dormant.' },
    ],
  },
];

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
        <Text style={styles.subject}>TOUT SAVOIR SUR L'APP</Text>
        <Text style={styles.title}>❓ Guide complet</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Le manuel officiel de LEX ACADEMY — tout, dans l'ordre, expliqué simplement.
        </Text>
        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <TouchableOpacity style={styles.sectionTete} onPress={() => setOuvert(ouvert === i ? null : i)}>
              <Text style={styles.sectionTitre}>{s.emoji} {s.titre}</Text>
              <Text style={styles.fleche}>{ouvert === i ? '▾' : '▸'}</Text>
            </TouchableOpacity>
            {ouvert === i && (
              <View style={styles.sectionCorps}>
                {s.entrees.map((en, j) => (
                  <View key={j} style={styles.entree}>
                    <Text style={styles.question}>{en.q}</Text>
                    <Text style={styles.reponse}>{en.r}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.bouton} onPress={() => router.push('/classes_exos')}>
          <Text style={styles.boutonText}>C'est parti — premier exercice ! ▶</Text>
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
  bouton: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  boutonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
