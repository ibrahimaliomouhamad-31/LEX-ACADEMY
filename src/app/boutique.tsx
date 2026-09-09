import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { depenserCredits, getCredits } from '../services/statsSuivi';
import { couleurTheme, getTheme, setTheme, type Theme } from '../services/parametres';
import { ajouterStreakFreezes, activerBoosterDoubleXp, lireStreakFreezes } from '../services/xpLocal';

// 50 — BOUTIQUE : les crédits se gagnent en résolvant des exercices
// (+5 par bonne réponse) et s'échangent contre des thèmes, titres et emojis.

interface Article {
  id: string;
  emoji: string;
  titre: string;
  description: string;
  prix: number;
  type: 'theme' | 'titre' | 'avatar' | 'boost';
  valeur: string;
}

const CATALOGUE: Article[] = [
  { id: 'theme_bleu', emoji: '🔵', titre: 'Thème Bleu Océan', description: 'Accent bleu sur l\'écran d\'accueil', prix: 200, type: 'theme', valeur: 'bleu' },
  { id: 'theme_vert', emoji: '🟢', titre: 'Thème Vert Excellence', description: 'Accent vert sur l\'écran d\'accueil', prix: 200, type: 'theme', valeur: 'vert' },
  { id: 'theme_violet', emoji: '🟣', titre: 'Thème Violet Nuit', description: 'Accent violet sur l\'écran d\'accueil', prix: 200, type: 'theme', valeur: 'violet' },
  { id: 'theme_rose', emoji: '🩷', titre: 'Thème Rose Aurore', description: 'Accent rose sur l\'écran d\'accueil', prix: 300, type: 'theme', valeur: 'rose' },
  { id: 'titre_gardien', emoji: '🛡️', titre: 'Titre : Gardien du LEX', description: 'Ton titre s\'affiche dans ton profil', prix: 500, type: 'titre', valeur: '🛡️ Gardien du LEX' },
  { id: 'titre_strategie', emoji: '♟️', titre: 'Titre : Stratège du BAC', description: 'Pour les cerveaux tactiques', prix: 800, type: 'titre', valeur: '♟️ Stratège du BAC' },
  { id: 'titre_legende', emoji: '👑', titre: 'Titre : Légende de Tessaoua', description: 'Le titre ultime, très cher', prix: 2500, type: 'titre', valeur: '👑 Légende de Tessaoua' },
  // ❄️ Streak Freeze : protège ta série 1 jour (achat multiple, max 5)
  { id: 'boost_freeze', emoji: '❄️', titre: 'Streak Freeze', description: 'Ta série survit si tu rates UN jour. Indispensable quand le wifi coupe !', prix: 150, type: 'boost', valeur: 'freeze' },
  // ⚡ Double XP 24h : chaque exercice réussi rapporte 2× plus
  { id: 'boost_x2', emoji: '⚡', titre: 'Double XP 24h', description: 'Tous tes XP sont doublés pendant 24 heures. Parfait avant les compositions !', prix: 300, type: 'boost', valeur: 'x2' },
];

const CLE_ACHATS = 'lex_boutique_achats';
const CLE_TITRE_ACTIF = 'lex_titre_actif';

export default function Boutique() {
  const router = useRouter();
  const [credits, setCredits] = useState(0);
  const [achats, setAchats] = useState<string[]>([]);
  const [theme, setT] = useState<Theme>('jaune');
  const [titreActif, setTitreActif] = useState<string>('');

  useEffect(() => {
    (async () => {
      setCredits(await getCredits());
      setT(await getTheme());
      try {
        const brut = await AsyncStorage.getItem(CLE_ACHATS);
        if (brut) setAchats(JSON.parse(brut));
        setTitreActif((await AsyncStorage.getItem(CLE_TITRE_ACTIF)) || '');
      } catch {
        // ignore
      }
    })();
  }, []);

  const acheter = async (article: Article) => {
    // ⚡ BOOSTS CONSOMMABLES : pas de "possession", on applique l'effet
    // immédiatement (Streak Freeze / Double XP 24h), 100% hors-ligne.
    if (article.type === 'boost') {
      const ok = await depenserCredits(article.prix);
      if (!ok) return;
      if (article.valeur === 'freeze') {
        await ajouterStreakFreezes(1);
        Alert.alert('❄️ Streak Freeze acheté !', 'Ta série est protégée pour un jour manqué. Tu en possèdes ' + (await lireStreakFreezes()) + '.');
      } else if (article.valeur === 'x2') {
        await activerBoosterDoubleXp();
        Alert.alert('⚡ Double XP actif !', 'Pendant 24 heures, chaque exercice réussi te rapporte 2× plus d\'XP. À toi de jouer !');
      }
      setCredits(await getCredits());
      return;
    }

    if (achats.includes(article.id)) {
      // Déjà possédé : on l'active
      if (article.type === 'theme') {
        setT(article.valeur as Theme);
        await setTheme(article.valeur as Theme);
      } else if (article.type === 'titre') {
        setTitreActif(article.valeur);
        await AsyncStorage.setItem(CLE_TITRE_ACTIF, article.valeur);
      }
      return;
    }
    const ok = await depenserCredits(article.prix);
    if (!ok) return;
    const nouveaux = [...achats, article.id];
    setAchats(nouveaux);
    await AsyncStorage.setItem(CLE_ACHATS, JSON.stringify(nouveaux));
    setCredits(await getCredits());
    if (article.type === 'theme') {
      setT(article.valeur as Theme);
      await setTheme(article.valeur as Theme);
    } else if (article.type === 'titre') {
      setTitreActif(article.valeur);
      await AsyncStorage.setItem(CLE_TITRE_ACTIF, article.valeur);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>TES CRÉDITS, TA STYLE</Text>
        <Text style={styles.title}>🛍️ Boutique</Text>
      </View>

      <View style={styles.solde}>
        <Text style={styles.soldeTexte}>💰 {credits} crédits</Text>
        <Text style={styles.soldeAide}>+5 crédits par bonne réponse — bosse pour briller !</Text>
        {titreActif !== '' && <Text style={styles.titreActif}>Ton titre : {titreActif}</Text>}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {CATALOGUE.map((article) => {
          const possede = achats.includes(article.id);
          const actif = (article.type === 'theme' && theme === article.valeur) || (article.type === 'titre' && titreActif === article.valeur);
          return (
            <TouchableOpacity
              key={article.id}
              style={[styles.carte, possede && styles.cartePossedee, actif && styles.carteActive]}
              onPress={() => acheter(article)}
            >
              <Text style={styles.carteEmoji}>{article.emoji}</Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.carteTitre}>{article.titre}</Text>
                <Text style={styles.carteDesc}>{article.description}</Text>
              </View>
              <Text style={[styles.prix, possede && styles.prixPossede, { color: possede ? '#10B981' : couleurTheme(theme) }]}>
                {possede ? (actif ? 'ACTIF ✓' : 'Activer') : `${article.prix} 💰`}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  solde: { alignItems: 'center', paddingVertical: 15, backgroundColor: '#1E293B', marginHorizontal: 20, borderRadius: 12, marginBottom: 15 },
  soldeTexte: { color: '#FBBF24', fontSize: 26, fontWeight: 'bold' },
  soldeAide: { color: '#64748B', fontSize: 11, marginTop: 4 },
  titreActif: { color: '#C4B5FD', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  carte: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10 },
  cartePossedee: { opacity: 0.9 },
  carteActive: { borderWidth: 1.5, borderColor: '#10B981' },
  carteEmoji: { fontSize: 30 },
  carteTitre: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  carteDesc: { color: '#64748B', fontSize: 11, marginTop: 3 },
  prix: { fontSize: 13, fontWeight: 'bold', marginLeft: 8 },
  prixPossede: { fontSize: 12 },
});
