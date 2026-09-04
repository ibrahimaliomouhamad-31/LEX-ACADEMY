import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { QCM_SVT, themesSvt, type QcmSvt } from '../services/qcmSvt';

const CLE_SCORES = 'lex_qcm_svt_scores';

function melanger<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function QcmSvtEcran() {
  const router = useRouter();
  const [phase, setPhase] = useState<'accueil' | 'quiz'>('accueil');
  const [filtre, setFiltre] = useState<string>('Tous');
  const [questions, setQuestions] = useState<QcmSvt[]>([]);
  const [index, setIndex] = useState(0);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [meilleur, setMeilleur] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const brut = await AsyncStorage.getItem(CLE_SCORES);
        if (brut) {
          const s = JSON.parse(brut) as { [theme: string]: number };
          setMeilleur(Object.values(s).reduce((a, b) => Math.max(a, b), 0));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const demarrer = (theme: string) => {
    setFiltre(theme);
    const selection = (theme === 'Tous' ? QCM_SVT : QCM_SVT.filter((q) => q.theme === theme));
    setQuestions(melanger(selection));
    setIndex(0);
    setChoisi(null);
    setScore(0);
    setPhase('quiz');
  };

  const repondre = async (i: number) => {
    if (choisi !== null) return;
    setChoisi(i);
    if (i === questions[index].bonneIndex) setScore((s) => s + 1);
  };

  const suivant = async () => {
    if (index + 1 >= questions.length) {
      const nouveauMeilleur = Math.max(meilleur, score);
      setMeilleur(nouveauMeilleur);
      try {
        const brut = await AsyncStorage.getItem(CLE_SCORES);
        const s = brut ? JSON.parse(brut) : {};
        s[filtre] = Math.max(s[filtre] || 0, score);
        await AsyncStorage.setItem(CLE_SCORES, JSON.stringify(s));
      } catch {
        // ignore
      }
      setPhase('accueil');
      setQuestions([]);
    } else {
      setIndex(index + 1);
      setChoisi(null);
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backBtn}>‹ Retour</Text>
      </TouchableOpacity>
      <Text style={styles.subject}>SVT EN QCM</Text>
      <Text style={styles.title}>🧬 QCM SVT</Text>
    </View>
  );

  if (phase === 'accueil') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.intro}>
            {QCM_SVT.length} questions à choix multiples, de la Seconde à la Terminale. 100% hors-ligne. 🏆 Record : {meilleur} pts
          </Text>
          <TouchableOpacity style={[styles.carte, { borderLeftColor: '#10B981' }]} onPress={() => demarrer('Tous')}>
            <Text style={styles.carteTitre}>🎲 Toutes les questions ({QCM_SVT.length})</Text>
          </TouchableOpacity>
          {themesSvt().map((th) => (
            <TouchableOpacity key={th} style={styles.carte} onPress={() => demarrer(th)}>
              <Text style={styles.carteTitre}>{th} ({QCM_SVT.filter((q) => q.theme === th).length})</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: 30 }} />
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
        <Text style={styles.info}>{index + 1}/{questions.length}</Text>
        <Text style={styles.infoScore}>Score : {score}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.question}>{q.question}</Text>
        {q.options.map((opt, i) => {
          const estBonne = i === q.bonneIndex;
          const estChoisie = i === choisi;
          let style = styles.option;
          if (choisi !== null) {
            if (estBonne) style = styles.optionJuste;
            else if (estChoisie) style = styles.optionFausse;
          }
          return (
            <TouchableOpacity key={i} style={style} onPress={() => repondre(i)} disabled={choisi !== null}>
              <Text style={styles.optionText}>{String.fromCharCode(65 + i)}. {opt}</Text>
            </TouchableOpacity>
          );
        })}
        {choisi !== null && (
          <View style={styles.explication}>
            <Text style={styles.explicationText}>
              {choisi === q.bonneIndex ? '✅ EXACT ! ' : '❌ Raté. '}
              {q.explication}
            </Text>
            <TouchableOpacity style={styles.bouton} onPress={suivant}>
              <Text style={styles.boutonText}>{index + 1 >= questions.length ? 'Voir mon score 🏁' : 'Question suivante →'}</Text>
            </TouchableOpacity>
          </View>
        )}
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
  intro: { color: '#94A3B8', fontSize: 13, lineHeight: 19, marginBottom: 15 },
  carte: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  carteTitre: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  barreInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#1E293B', marginHorizontal: 20, borderRadius: 10, marginBottom: 10 },
  info: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  infoScore: { color: '#10B981', fontSize: 12, fontWeight: 'bold' },
  question: { color: '#F8FAFC', fontSize: 17, fontWeight: 'bold', lineHeight: 25, marginBottom: 20 },
  option: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 16, marginBottom: 10 },
  optionJuste: { backgroundColor: '#064E3B', borderWidth: 1.5, borderColor: '#10B981', borderRadius: 10, padding: 16, marginBottom: 10 },
  optionFausse: { backgroundColor: '#7F1D1D', borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 10, padding: 16, marginBottom: 10 },
  optionText: { color: '#F8FAFC', fontSize: 15, lineHeight: 21 },
  explication: { marginTop: 10 },
  explicationText: { color: '#CBD5E1', fontSize: 13, lineHeight: 20, marginBottom: 15 },
  bouton: { backgroundColor: '#10B981', padding: 15, borderRadius: 10, alignItems: 'center' },
  boutonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
