import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { estJuste } from '../services/outilsReponse';
import { gagnerXp, validerStreakDuJour } from '../services/xpLocal';

interface CalculMental { enonce: string; reponse: string; tempsLimite: number; }

const CALCULS_MENTAL: CalculMental[] = [
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

const PIEGES_BAC = [
  { titre: 'Oubli du domaine de definition', enonce: 'sqrt(x+3) = x-1', piege: 'Ne pas verifier que x-1 >= 0', solution: 'Domaine : x >= 1. Solutions : x = 2 (x = -1 rejete)', matiere: 'Maths' },
  { titre: 'Erreur de signe dans les exposants', enonce: 'Simplifie : (-2)^3', piege: 'Confondre (-2)^3 et -2^3', solution: '(-2)^3 = -8 (pas 8!)', matiere: 'Maths' },
  { titre: 'Oubli de l\'unite', enonce: 'Rectangle 5cm x 3cm. Aire?', piege: 'Donner 15 au lieu de 15 cm2', solution: 'Aire = 15 cm2 (toujours avec l\'unite!)', matiere: 'Maths' },
  { titre: 'Confusion vitesse/temps', enonce: 'Voiture 60 km/h pendant 2h. Distance?', piege: 'Diviser au lieu de multiplier', solution: 'Distance = 60 x 2 = 120 km', matiere: 'Physique' },
  { titre: 'Loi d\'Ohm inversee', enonce: 'U = 12V, R = 4 ohms. Calcule I.', piege: 'Faire I = R/U au lieu de I = U/R', solution: 'I = U/R = 12/4 = 3 A', matiere: 'Physique' },
  { titre: 'Oubli conversion unite', enonce: 'Convertis 500 cm3 en m3', piege: 'Diviser par 100 au lieu de 100^3', solution: '500 cm3 = 0.0005 m3', matiere: 'Physique' },
];

export default function CalculMental() {
  const router = useRouter();
  const [mode, setMode] = useState<'calcul' | 'pieges'>('calcul');
  const [index, setIndex] = useState(0);
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [tempsRestant, setTempsRestant] = useState(0);
  const [actif, setActif] = useState(false);

  useEffect(() => {
    if (!actif || mode !== 'calcul') return;
    const timer = setInterval(() => {
      setTempsRestant(t => {
        if (t <= 1) {
          setFeedback('Temps ecoule!');
          setActif(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [actif, mode]);

  const demarrerCalcul = () => {
    setIndex(0);
    setScore(0);
    setReponse('');
    setFeedback('');
    setActif(true);
    setTempsRestant(CALCULS_MENTAL[0].tempsLimite);
  };

  const validerCalcul = async () => {
    const calcul = CALCULS_MENTAL[index];
    const juste = estJuste(reponse, calcul.reponse);
    if (juste) {
      setScore(s => s + 1);
      await gagnerXp(20);
      await validerStreakDuJour();
      setFeedback('Correct!');
    } else {
      setFeedback('Reponse : ' + calcul.reponse);
    }
    setTimeout(() => {
      if (index + 1 >= CALCULS_MENTAL.length) {
        setFeedback('Termine! Score : ' + (score + (juste ? 1 : 0)) + '/' + CALCULS_MENTAL.length);
        setActif(false);
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
          <Text style={styles.backBtn}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>ENTRAINEMENT</Text>
        <Text style={styles.title}>Calcul Mental & Pies</Text>
      </View>
      <View style={styles.onglets}>
        <TouchableOpacity style={[styles.onglet, mode === 'calcul' && styles.ongletActif]} onPress={() => setMode('calcul')}>
          <Text style={[styles.ongletText, mode === 'calcul' && styles.ongletTextActif]}>Calcul Mental</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.onglet, mode === 'pieges' && styles.ongletActif]} onPress={() => setMode('pieges')}>
          <Text style={[styles.ongletText, mode === 'pieges' && styles.ongletTextActif]}>Pis BAC</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {mode === 'calcul' ? (
          <View>
            {!actif && feedback === '' ? (
              <View style={styles.centre}>
                <Text style={styles.emoji}>🔢</Text>
                <Text style={styles.titreMode}>Calcul Mental</Text>
                <Text style={styles.descMode}>10 questions Temps limite</Text>
                <TouchableOpacity style={styles.boutonDemarrer} onPress={demarrerCalcul}>
                  <Text style={styles.boutonDemarrerText}>Commencer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {actif && (
                  <View style={styles.barreTemps}>
                    <Text style={styles.tempsText}>⏱ {tempsRestant}s</Text>
                    <Text style={styles.progression}>{index + 1}/{CALCULS_MENTAL.length}</Text>
                  </View>
                )}
                <View style={styles.carteQuestion}>
                  <Text style={styles.questionEnonce}>{CALCULS_MENTAL[index]?.enonce}</Text>
                  {actif && (
                    <TextInput style={styles.input} placeholder="Ta reponse..." placeholderTextColor="#64748B" value={reponse} onChangeText={setReponse} keyboardType="numeric" autoFocus />
                  )}
                  {actif && feedback === '' && (
                    <TouchableOpacity style={styles.boutonValider} onPress={validerCalcul}>
                      <Text style={styles.boutonValiderText}>Valider</Text>
                    </TouchableOpacity>
                  )}
                  {feedback !== '' && (
                    <View style={[styles.feedbackBox, feedback.includes('Correct') ? styles.fbOk : styles.fbKo]}>
                      <Text style={styles.feedbackText}>{feedback}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.titreMode}>⚠ Pis du BAC</Text>
            <Text style={styles.descMode}>Apprends a eviter les erreurs classiques</Text>
            {PIEGES_BAC.map((piege, idx) => (
              <View key={idx} style={styles.cartePiege}>
                <View style={styles.piegeHeader}>
                  <Text style={styles.piegeTitre}>{piege.titre}</Text>
                  <Text style={styles.piegeMatiere}>{piege.matiere}</Text>
                </View>
                <Text style={styles.piegeEnonce}>{piege.enonce}</Text>
                <View style={styles.piegeBox}>
                  <Text style={styles.piegeLabel}>⚠ Piege :</Text>
                  <Text style={styles.piegeText}>{piege.piege}</Text>
                </View>
                <View style={styles.solutionBox}>
                  <Text style={styles.solutionLabel}>✅ Solution :</Text>
                  <Text style={styles.solutionText}>{piege.solution}</Text>
                </View>
              </View>
            ))}
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
  onglets: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10 },
  onglet: { flex: 1, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingVertical: 12, marginHorizontal: 5, alignItems: 'center' },
  ongletActif: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  ongletText: { color: '#D1D5DB', fontSize: 13, fontWeight: '500' },
  ongletTextActif: { color: '#0F172A', fontWeight: 'bold' },
  centre: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emoji: { fontSize: 60, marginBottom: 20 },
  titreMode: { color: '#F9FAFB', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  descMode: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 30 },
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
  cartePiege: { backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#374151' },
  piegeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  piegeTitre: { color: '#F9FAFB', fontSize: 15, fontWeight: 'bold', flex: 1 },
  piegeMatiere: { color: '#FBBF24', fontSize: 11, fontWeight: 'bold' },
  piegeEnonce: { color: '#E5E7EB', fontSize: 14, marginBottom: 10 },
  piegeBox: { backgroundColor: '#2D1F1F', borderRadius: 8, padding: 10, marginBottom: 8 },
  piegeLabel: { color: '#FCA5A5', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  piegeText: { color: '#FCA5A5', fontSize: 13 },
  solutionBox: { backgroundColor: '#1F2937', borderRadius: 8, padding: 10 },
  solutionLabel: { color: '#10B981', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  solutionText: { color: '#D1D5DB', fontSize: 13 },
});
