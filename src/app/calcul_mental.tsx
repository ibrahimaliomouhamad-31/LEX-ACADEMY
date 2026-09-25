import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { bloquerSiExamen } from '../services/parametres';
import { estJuste } from '../services/outilsReponse';
import { gagnerXp, validerStreakDuJour } from '../services/xpLocal';

/**
 * 🧮 CALCUL MENTAL — 10 questions chronométrées (XP gagné à chaque réussite).
 *
 * L'onglet « Pis BAC » (6 pièges) a été RETIRÉ : il dupliquait 📓 Journal
 * d'erreurs et 🧠 Pièges du BAC, qui sont les surfaces prévues pour ça.
 *
 * 🐞 DÉFAUT CORRIGÉ : à la fin d'une série (ou au temps écoulé), l'écran
 * restait sur le score final SANS aucun bouton → l'élève devait sortir de
 * l'écran et le rouvrir pour rejouer. Il y a maintenant un bouton « Rejouer ».
 */
interface QuestionCalculMental { enonce: string; reponse: string; tempsLimite: number; }

const CALCULS_MENTAL: QuestionCalculMental[] = [
  { enonce: '7 x 8', reponse: '56', tempsLimite: 5 },
  { enonce: '12 x 15', reponse: '180', tempsLimite: 8 },
  { enonce: '25 x 4', reponse: '100', tempsLimite: 5 },
  { enonce: '144 / 12', reponse: '12', tempsLimite: 6 },
  { enonce: '15% de 200', reponse: '30', tempsLimite: 8 },
  { enonce: 'sqrt(144)', reponse: '12', tempsLimite: 5 },
  { enonce: '2^3', reponse: '8', tempsLimite: 5 },
  { enonce: '3/4 + 1/2', reponse: '5/4', tempsLimite: 10 },
  { enonce: '0.25 x 40', reponse: '10', tempsLimite: 6 },
  { enonce: '17^2', reponse: '289', tempsLimite: 10 },
];

export default function CalculMental() {
  const router = useRouter();

  // 🛡️ VERROU EXAMEN DIRECT : bloque même en accès direct (deep link).
  useEffect(() => { bloquerSiExamen(router, 'Calcul mental'); }, [router]);

  const [index, setIndex] = useState(0);
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [tempsRestant, setTempsRestant] = useState(0);
  const [actif, setActif] = useState(false);
  const [scoreFinal, setScoreFinal] = useState<number | null>(null);

  useEffect(() => {
    if (!actif) return;
    const timer = setInterval(() => {
      setTempsRestant((t) => {
        if (t <= 1) {
          setFeedback('⏰ Temps écoulé !');
          setActif(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [actif]);

  const demarrer = () => {
    setIndex(0);
    setScore(0);
    setReponse('');
    setFeedback('');
    setScoreFinal(null);
    setActif(true);
    setTempsRestant(CALCULS_MENTAL[0].tempsLimite);
  };

  const valider = async () => {
    const calcul = CALCULS_MENTAL[index];
    const juste = estJuste(reponse, calcul.reponse);
    const nouveauScore = score + (juste ? 1 : 0);

    if (juste) {
      setScore(nouveauScore);
      await gagnerXp(20);
      await validerStreakDuJour();
      setFeedback('✅ Correct ! +20 XP');
    } else {
      setFeedback(`❌ Réponse : ${calcul.reponse}`);
    }

    setTimeout(() => {
      if (index + 1 >= CALCULS_MENTAL.length) {
        setActif(false);
        setScoreFinal(nouveauScore);
        setFeedback('');
      } else {
        setIndex(index + 1);
        setReponse('');
        setFeedback('');
        setTempsRestant(CALCULS_MENTAL[index + 1].tempsLimite);
      }
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>ENTRAÎNEMENT</Text>
        <Text style={styles.title}>🧮 Calcul mental</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {!actif && feedback === '' && scoreFinal === null && (
          <View style={styles.centre}>
            <Text style={styles.emoji}>🔢</Text>
            <Text style={styles.titreMode}>Calcul mental</Text>
            <Text style={styles.descMode}>
              10 questions, un chrono par question.{'\n'}Une bonne réponse = +20 XP.
            </Text>
            <TouchableOpacity style={styles.boutonDemarrer} onPress={demarrer}>
              <Text style={styles.boutonDemarrerText}>Commencer ▶</Text>
            </TouchableOpacity>
          </View>
        )}

        {actif && (
          <View>
            <View style={styles.barreTemps}>
              <Text style={styles.tempsText}>⏱ {tempsRestant}s</Text>
              <Text style={styles.progression}>{index + 1}/{CALCULS_MENTAL.length} · score {score}</Text>
            </View>
            <View style={styles.carteQuestion}>
              <Text style={styles.questionEnonce}>{CALCULS_MENTAL[index]?.enonce}</Text>
              <TextInput
                style={styles.input}
                placeholder="Ta réponse…"
                placeholderTextColor="#64748B"
                value={reponse}
                onChangeText={setReponse}
                keyboardType="numeric"
                autoFocus
              />
              {feedback === '' ? (
                <TouchableOpacity style={styles.boutonValider} onPress={valider}>
                  <Text style={styles.boutonValiderText}>Valider</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.feedbackBox, feedback.startsWith('✅') ? styles.fbOk : styles.fbKo]}>
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {!actif && feedback !== '' && (
          <View style={styles.centre}>
            <Text style={styles.emoji}>⏰</Text>
            <Text style={styles.titreMode}>{feedback}</Text>
            <Text style={styles.descMode}>
              Série interrompue : {score} bonne{score > 1 ? 's' : ''} réponse{score > 1 ? 's' : ''}.
            </Text>
            <TouchableOpacity style={styles.boutonDemarrer} onPress={demarrer}>
              <Text style={styles.boutonDemarrerText}>🔄 Rejouer</Text>
            </TouchableOpacity>
          </View>
        )}

        {scoreFinal !== null && (
          <View style={styles.centre}>
            <Text style={styles.emoji}>{scoreFinal >= 8 ? '🏆' : scoreFinal >= 5 ? '👏' : '💪'}</Text>
            <Text style={styles.titreMode}>Score : {scoreFinal}/{CALCULS_MENTAL.length}</Text>
            <Text style={styles.descMode}>
              {scoreFinal >= 8
                ? 'Excellent ! Tes réflexes sont affûtés.'
                : scoreFinal >= 5
                  ? 'Bien joué — encore une série pour consolider.'
                  : 'Continue : c\'est en répétant que ça devient automatique.'}
            </Text>
            <TouchableOpacity style={styles.boutonDemarrer} onPress={demarrer}>
              <Text style={styles.boutonDemarrerText}>🔄 Rejouer</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10, backgroundColor: '#0F172A' },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10, fontWeight: '600' },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F9FAFB', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  centre: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emoji: { fontSize: 60, marginBottom: 20 },
  titreMode: { color: '#F9FAFB', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  descMode: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  boutonDemarrer: { backgroundColor: '#FBBF24', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14 },
  boutonDemarrerText: { color: '#0F172A', fontSize: 16, fontWeight: 'bold' },
  barreTemps: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#111827', borderRadius: 10, marginBottom: 15 },
  tempsText: { color: '#FBBF24', fontSize: 16, fontWeight: 'bold' },
  progression: { color: '#9CA3AF', fontSize: 14 },
  carteQuestion: { backgroundColor: '#111827', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#374151' },
  questionEnonce: { color: '#F9FAFB', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#1F2937', borderWidth: 2, borderColor: '#374151', borderRadius: 12, padding: 16, color: '#F9FAFB', fontSize: 20, textAlign: 'center', marginBottom: 15 },
  boutonValider: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  boutonValiderText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  feedbackBox: { padding: 16, borderRadius: 12, borderWidth: 2, marginTop: 10 },
  fbOk: { backgroundColor: '#064E3B', borderColor: '#10B981' },
  fbKo: { backgroundColor: '#7F1D1D', borderColor: '#EF4444' },
  feedbackText: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
});
