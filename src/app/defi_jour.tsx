import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { estJuste } from '../services/outilsReponse';
import {
  classementDuJour,
  defiDuJour,
  envoyerScoreDefi,
  matiereDuJour,
  type EntreeClassementDefi,
} from '../services/defiService';
import type { ExoGenere } from '../services/generateurLocal';

const CLASSES = ['2nde C', '1ère C', '1ère D', 'Tle C', 'Tle D'];
const CLE_CLASSE = 'lex_classe_actuelle';
const CLE_DEFI_JOUR = 'lex_defi_fait_';

export default function DefiJour() {
  const router = useRouter();
  const [classe, setClasse] = useState<string>('');
  const [questions, setQuestions] = useState<ExoGenere[]>([]);
  const [phase, setPhase] = useState<'classe' | 'jeu' | 'fin'>('classe');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [temps, setTemps] = useState(0);
  const [nom, setNom] = useState('');
  const [classement, setClassement] = useState<EntreeClassementDefi[] | null>(null);
  const [dejaFait, setDejaFait] = useState(false);
  const [estDuo, setEstDuo] = useState(false);
  const [nom2, setNom2] = useState('');
  const chronoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const c = await AsyncStorage.getItem(CLE_CLASSE);
      if (c) setClasse(c);
      const n = await AsyncStorage.getItem('lex_user_nom');
      if (n) setNom(n);
      if (c) {
        const fait = await AsyncStorage.getItem(`${CLE_DEFI_JOUR}${c}`);
        setDejaFait(fait === new Date().toISOString().slice(0, 10));
      }
    })();
    return () => {
      if (chronoRef.current) clearInterval(chronoRef.current);
    };
  }, []);

  const demarrer = async (c: string) => {
    setClasse(c);
    await AsyncStorage.setItem(CLE_CLASSE, c);
    setQuestions(defiDuJour(c));
    setPhase('jeu');
    setIndex(0);
    setScore(0);
    setReponse('');
    setFeedback('');
    setTemps(0);
    if (chronoRef.current) clearInterval(chronoRef.current);
    chronoRef.current = setInterval(() => setTemps((t) => t + 1), 1000);
  };

  const valider = () => {
    const exo = questions[index];
    if (!exo || reponse.trim() === '' || feedback !== '') return;
    const juste = estJuste(reponse, exo.bonne_reponse);
    if (juste) setScore((s) => s + 1);
    setFeedback(
      juste ? '✅ EXACT !' : `❌ La réponse était : ${exo.bonne_reponse.split('|')[0]}\n📖 ${exo.explication}`
    );
  };

  const suivant = async () => {
    if (index + 1 >= questions.length) {
      if (chronoRef.current) clearInterval(chronoRef.current);
      const jour = new Date().toISOString().slice(0, 10);
      await AsyncStorage.setItem(`${CLE_DEFI_JOUR}${classe}`, jour);
      await envoyerScoreDefi(estDuo ? `${nom || 'Anonyme'} & ${nom2 || 'Joueur 2'}` : (nom || 'Anonyme'), classe, score, temps);
      setClassement(await classementDuJour(classe));
      setDejaFait(true);
      setPhase('fin');
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
      <Text style={styles.subject}>TOUTE LA CLASSE EN MÊME TEMPS</Text>
      <Text style={styles.title}>📰 Défi du jour — {matiereDuJour()}</Text>
    </View>
  );

  if (phase === 'classe') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.intro}>
          <Text style={styles.introTexte}>
            3 questions identiques pour toute ta classe, nouvelles chaque jour 🎯{'\n'}
            Qui sera le plus rapide aujourd'hui ?
          </Text>
          {dejaFait && <Text style={styles.déjàFait}>✅ Tu as déjà fait le défi d'aujourd'hui — rejoue pour t'améliorer !</Text>}
          <TouchableOpacity style={styles.boutonDuo} onPress={() => setEstDuo(!estDuo)}>
            <Text style={styles.boutonDuoText}>{estDuo ? '✅ Mode DUO activé (à deux sur ce téléphone)' : '👥 Mode DUO : jouer à deux ?'}</Text>
          </TouchableOpacity>
          {estDuo && (
            <TextInput
              style={styles.inputDuo}
              placeholder="Nom du 2e joueur"
              placeholderTextColor="#64748B"
              value={nom2}
              onChangeText={setNom2}
            />
          )}
          {CLASSES.map((c) => (
            <TouchableOpacity key={c} style={[styles.btnClasse, classe === c && styles.btnClasseActive]} onPress={() => demarrer(c)}>
              <Text style={[styles.btnClasseText, classe === c && styles.btnClasseTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  if (phase === 'fin') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.scoreFinal}>{score}/{questions.length}</Text>
          <Text style={styles.tempsFinal}>en {temps} secondes — {classe}</Text>

          <Text style={styles.sectionTitre}>🏆 Classement de {classe} (aujourd'hui)</Text>
          {classement === null ? (
            <Text style={styles.horsLigne}>📴 Hors-ligne : ton score sera envoyé au prochain passage au wifi !</Text>
          ) : classement.length === 0 ? (
            <Text style={styles.horsLigne}>Sois le premier de ta classe aujourd'hui !</Text>
          ) : (
            classement.map((e, i) => (
              <View key={i} style={[styles.ligne, e.nom === nom && styles.ligneMoi]}>
                <Text style={styles.rang}>{['🥇', '🥈', '🥉'][i] || `${i + 1}.`}</Text>
                <Text style={styles.ligneNom} numberOfLines={1}>{e.nom || 'Anonyme'}</Text>
                <Text style={styles.ligneScore}>{e.score}/3 · {e.tempsS}s</Text>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.btnRetour} onPress={() => router.back()}>
            <Text style={styles.btnRetourText}>‹ Retour</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const exo = questions[index];
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {header}
      <View style={styles.barreInfo}>
        <Text style={styles.info}>{estDuo ? `👤 ${index % 2 === 0 ? (nom || 'Joueur 1') : (nom2 || 'Joueur 2')} · ` : ''}Question {index + 1}/{questions.length}</Text>
        <Text style={styles.infoScore}>Score : {score}</Text>
        <Text style={styles.chrono}>⏱️ {temps}s</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.carte}>
          <Text style={styles.question}>{exo?.enonce}</Text>
          <TextInput
            style={styles.input}
            placeholder="Ta réponse..."
            placeholderTextColor="#64748B"
            value={reponse}
            onChangeText={setReponse}
            editable={feedback === ''}
          />
          {feedback === '' ? (
            <TouchableOpacity style={styles.validerBtn} onPress={valider}>
              <Text style={styles.validerBtnText}>Valider</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <View style={[styles.feedback, feedback.startsWith('✅') ? styles.fbOk : styles.fbKo]}>
                <Text style={styles.feedbackText}>{feedback}</Text>
              </View>
              <TouchableOpacity style={styles.suivantBtn} onPress={suivant}>
                <Text style={styles.suivantBtnText}>
                  {index + 1 >= questions.length ? 'Voir le classement 🏁' : 'Question suivante →'}
                </Text>
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
  intro: { padding: 20 },
  introTexte: { color: '#94A3B8', fontSize: 14, lineHeight: 22, marginBottom: 20, textAlign: 'center' },
  déjàFait: { color: '#10B981', fontSize: 12, textAlign: 'center', marginBottom: 15 },
  boutonDuo: { backgroundColor: '#2D1F40', borderWidth: 1, borderColor: '#8B5CF6', borderRadius: 12, padding: 14, marginBottom: 12, alignItems: 'center' },
  boutonDuoText: { color: '#C4B5FD', fontSize: 13, fontWeight: 'bold' },
  inputDuo: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 12, color: '#F8FAFC', fontSize: 14, marginBottom: 12 },
  btnClasse: { backgroundColor: '#1E293B', borderRadius: 12, padding: 18, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  btnClasseActive: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  btnClasseText: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  btnClasseTextActive: { color: '#0F172A' },
  barreInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#1E293B', marginHorizontal: 20, borderRadius: 10, marginBottom: 10 },
  info: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  infoScore: { color: '#10B981', fontSize: 12, fontWeight: 'bold' },
  chrono: { color: '#FBBF24', fontSize: 12, fontWeight: 'bold' },
  carte: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, borderLeftWidth: 3, borderLeftColor: '#EC4899' },
  question: { color: '#F8FAFC', fontSize: 16, lineHeight: 24, marginBottom: 20, fontWeight: 'bold' },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, color: '#F8FAFC', fontSize: 16, marginBottom: 15 },
  validerBtn: { backgroundColor: '#EC4899', padding: 15, borderRadius: 8, alignItems: 'center' },
  validerBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  feedback: { padding: 15, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  fbOk: { backgroundColor: '#0F2A1A', borderColor: '#10B981' },
  fbKo: { backgroundColor: '#2A1010', borderColor: '#EF4444' },
  feedbackText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  suivantBtn: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  suivantBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  scoreFinal: { color: '#FBBF24', fontSize: 64, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  tempsFinal: { color: '#94A3B8', fontSize: 15, textAlign: 'center', marginBottom: 25 },
  sectionTitre: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  horsLigne: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic' },
  ligne: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, padding: 14, marginBottom: 8 },
  ligneMoi: { borderWidth: 1.5, borderColor: '#FBBF24' },
  rang: { fontSize: 18, marginRight: 12, width: 34 },
  ligneNom: { color: '#F8FAFC', fontSize: 14, flex: 1, fontWeight: 'bold' },
  ligneScore: { color: '#FBBF24', fontSize: 13 },
  btnRetour: { marginTop: 20, alignItems: 'center', padding: 10 },
  btnRetourText: { color: '#FBBF24', fontSize: 14 },
});
