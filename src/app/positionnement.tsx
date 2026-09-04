import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { genererExerciceSeede, type ExoGenere } from '../services/generateurLocal';
import { estJuste } from '../services/outilsReponse';

// 75 — TEST DE POSITIONNEMENT : 20 questions à difficulté croissante (10→90).
// Situe l'élève dès la rentrée et donne des recommandations personnalisées.

const SUJETS = ['Calcul et équations', 'Second degré et factorisation', 'Dérivation', 'Suites numériques', 'Arithmétique et PGCD', 'Probabilités'];

function construireTest(): { exo: ExoGenere; theme: string }[] {
  const questions: { exo: ExoGenere; theme: string }[] = [];
  for (let i = 0; i < 20; i++) {
    const niveau = 10 + Math.round((i / 19) * 80); // 10 → 90
    const theme = SUJETS[i % SUJETS.length];
    questions.push({ exo: genererExerciceSeede(`positionnement_${theme}`, theme, niveau, 4242 + i), theme });
  }
  return questions;
}

export default function Positionnement() {
  const router = useRouter();
  const questions = useMemo(construireTest, []);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [parTheme, setParTheme] = useState<{ [theme: string]: { ok: number; total: number } }>({});
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [termine, setTermine] = useState(false);

  const valider = () => {
    const q = questions[index];
    if (!q || reponse.trim() === '' || feedback !== '') return;
    const juste = estJuste(reponse, q.exo.bonne_reponse);
    if (juste) setScore((s) => s + 1);
    const t = parTheme[q.theme] || { ok: 0, total: 0 };
    setParTheme({ ...parTheme, [q.theme]: { ok: t.ok + (juste ? 1 : 0), total: t.total + 1 } });
    setFeedback(juste ? '✅ EXACT !' : `❌ C'était : ${q.exo.bonne_reponse.split('|')[0]}`);
  };

  const suivant = async () => {
    if (index + 1 >= questions.length) {
      setTermine(true);
      await AsyncStorage.setItem('lex_positionnement', JSON.stringify({ score, sur: 20, date: new Date().toISOString().slice(0, 10) }));
    } else {
      setIndex(index + 1);
      setReponse('');
      setFeedback('');
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backBtn}>‹ Retour</Text>
      </TouchableOpacity>
      <Text style={styles.subject}>OÙ EN ES-TU VRAIMENT ?</Text>
      <Text style={styles.title}>🧪 Test de positionnement</Text>
    </View>
  );

  if (termine) {
    const niveau = score <= 6 ? 'Débutant' : score <= 11 ? 'Intermédiaire' : score <= 16 ? 'Avancé' : 'Excellence';
    const faibles = Object.entries(parTheme).filter(([, v]) => v.ok / v.total < 0.5).map(([k]) => k);
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.note}>{score}/20</Text>
          <Text style={styles.niveau}>Niveau estimé : {niveau}</Text>
          <Text style={styles.conseil}>
            {faibles.length > 0
              ? `👉 Priorités détectées : ${faibles.join(', ')}. Commence par ces chapitres dans l'Entraînement Infini (niveau 20-40), puis monte.`
              : '👉 Aucune faiblesse détectée : attaque les niveaux 60-100 et les Olympiades ! 🏅'}
          </Text>
          <TouchableOpacity style={styles.bouton} onPress={() => router.push('/pieges')}>
            <Text style={styles.boutonText}>🎯 Voir mes recommandations</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const q = questions[index];
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {header}
      <View style={styles.barreInfo}>
        <Text style={styles.info}>Question {index + 1}/20 · {q.theme}</Text>
        <Text style={styles.infoScore}>Score : {score}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.carte}>
          <Text style={styles.question}>{q.exo.enonce}</Text>
          <TextInput style={styles.input} placeholder="Ta réponse..." placeholderTextColor="#64748B" value={reponse} onChangeText={setReponse} editable={feedback === ''} />
          {feedback === '' ? (
            <TouchableOpacity style={styles.bouton} onPress={valider}>
              <Text style={styles.boutonText}>Valider</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={styles.feedback}>{feedback}</Text>
              <TouchableOpacity style={styles.bouton} onPress={suivant}>
                <Text style={styles.boutonText}>{index + 1 >= questions.length ? 'Voir mon niveau 🏁' : 'Suivante →'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  barreInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#1E293B', marginHorizontal: 20, borderRadius: 10, marginBottom: 10 },
  info: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  infoScore: { color: '#10B981', fontSize: 12, fontWeight: 'bold' },
  carte: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, borderLeftWidth: 3, borderLeftColor: '#06B6D4' },
  question: { color: '#F8FAFC', fontSize: 16, lineHeight: 24, marginBottom: 20, fontWeight: 'bold' },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, color: '#F8FAFC', fontSize: 16, marginBottom: 15 },
  bouton: { backgroundColor: '#06B6D4', padding: 15, borderRadius: 8, alignItems: 'center' },
  boutonText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
  feedback: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  note: { color: '#FBBF24', fontSize: 64, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  niveau: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 5 },
  conseil: { color: '#94A3B8', fontSize: 14, lineHeight: 21, marginTop: 15, marginBottom: 20, textAlign: 'center' },
});
