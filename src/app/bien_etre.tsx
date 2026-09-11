import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { jourLocal } from '../utils/correctifsAudit';
import { rapporterErreur } from '../utils/logger';

type Mode = 'bienetre' | 'pomodoro' | 'planning';

const EXERCICES_PAUSE = [
  { emoji: '👀', titre: 'Regard au loin', description: 'Regarde a 20 metres pendant 20 secondes' },
  { emoji: '🧘', titre: 'Respiration', description: '5 respirations profondes' },
  { emoji: '🤸', titre: 'Etirements', description: 'Etire ton cou, epaules et poignets' },
  { emoji: '🚶', titre: 'Marche', description: 'Leve-toi et marche 2 minutes' },
  { emoji: '💧', titre: 'Hydratation', description: "Bois un verre d'eau" },
  { emoji: '😊', titre: 'Sourire', description: 'Detends tes muscles faciaux' },
];

const RAPPELS_HYDRATATION = [
  "💧 Boire 1.5L a 2L d'eau par jour ameliore la concentration",
  "🧠 Le cerveau est compose a 75% d'eau",
  "⚡ La deshydratation cause fatigue et maux de tete",
  "🍋 Ajoute du citron pour plus de vitamine C",
  "⏰ Bois un verre toutes les heures",
];

export default function BienEtre() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('bienetre');
  const [tempsRestant, setTempsRestant] = useState(25 * 60);
  const [pomodoroActif, setPomodoroActif] = useState(false);
  const [sessionPomodoro, setSessionPomodoro] = useState(0);
  const [eauConsomme, setEauConsomme] = useState(0);

  useEffect(() => { chargerHydratation(); }, []);

  useEffect(() => {
    if (!pomodoroActif) return;
    const timer = setInterval(() => {
      setTempsRestant(t => {
        if (t <= 1) { setPomodoroActif(false); setSessionPomodoro(s => s + 1); return 25 * 60; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomodoroActif]);

  const chargerHydratation = async () => {
    try {
      const data = await AsyncStorage.getItem('lex_eau_aujourd_hui');
      if (data) { const parsed = JSON.parse(data); if (parsed.date === jourLocal()) setEauConsomme(parsed.verres); }
    } catch (erreurSilencieuse) {
      rapporterErreur('[audit] Erreur silencieuse', erreurSilencieuse);
    }
  };

  const boireEau = async () => {
    const nouveau = eauConsomme + 1;
    setEauConsomme(nouveau);
    try { await AsyncStorage.setItem('lex_eau_aujourd_hui', JSON.stringify({ date: jourLocal(), verres: nouveau })); } catch (erreurSilencieuse) {
      rapporterErreur('[audit] Erreur silencieuse', erreurSilencieuse);
    }
  };

  const formaterTemps = (s: number): string => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backBtn}>Retour</Text></TouchableOpacity>
        <Text style={styles.subject}>BIEN-ETRE</Text>
        <Text style={styles.title}>Bien-etre & Concentration</Text>
      </View>
      <View style={styles.onglets}>
        <TouchableOpacity style={[styles.onglet, mode === 'bienetre' && styles.ongletActif]} onPress={() => setMode('bienetre')}><Text style={[styles.ongletText, mode === 'bienetre' && styles.ongletTextActif]}>Bien-etre</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.onglet, mode === 'pomodoro' && styles.ongletActif]} onPress={() => setMode('pomodoro')}><Text style={[styles.ongletText, mode === 'pomodoro' && styles.ongletTextActif]}>Pomodoro</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.onglet, mode === 'planning' && styles.ongletActif]} onPress={() => setMode('planning')}><Text style={[styles.ongletText, mode === 'planning' && styles.ongletTextActif]}>Planning</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {mode === 'bienetre' && (<View>
          <Text style={styles.sectionTitle}>Hydratation</Text>
          <View style={styles.carteEau}>
            <Text style={styles.eauCompteur}>{eauConsomme} / 8 verres</Text>
            <View style={styles.barreEau}><View style={[styles.remplissageEau, { width: `${Math.min(100, (eauConsomme / 8) * 100)}%` }]} /></View>
            <TouchableOpacity style={styles.boutonEau} onPress={boireEau}><Text style={styles.boutonEauText}>J'ai bu un verre</Text></TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>Conseils</Text>
          {RAPPELS_HYDRATATION.map((c, i) => (<View key={i} style={styles.carteConseil}><Text style={styles.conseilText}>{c}</Text></View>))}
          <Text style={styles.sectionTitle}>Pause Active</Text>
          {EXERCICES_PAUSE.map((exo, i) => (<View key={i} style={styles.cartePause}><Text style={styles.pauseEmoji}>{exo.emoji}</Text><View style={styles.pauseInfo}><Text style={styles.pauseTitre}>{exo.titre}</Text><Text style={styles.pauseDesc}>{exo.description}</Text></View></View>))}
        </View>)}
        {mode === 'pomodoro' && (<View>
          <Text style={styles.sectionTitle}>Minuteur Pomodoro</Text>
          <View style={styles.cartePomodoro}>
            <Text style={styles.pomodoroTemps}>{formaterTemps(tempsRestant)}</Text>
            <Text style={styles.pomodoroSession}>Session {sessionPomodoro + 1}</Text>
            <View style={styles.pomodoroBoutons}>
              <TouchableOpacity style={[styles.boutonPomodoro, pomodoroActif && styles.boutonPause]} onPress={() => setPomodoroActif(!pomodoroActif)}><Text style={styles.boutonPomodoroText}>{pomodoroActif ? 'Pause' : 'Demarrer'}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.boutonReset} onPress={() => { setPomodoroActif(false); setTempsRestant(25 * 60); }}><Text style={styles.boutonResetText}>Reset</Text></TouchableOpacity>
            </View>
          </View>
        </View>)}
        {mode === 'planning' && (<View>
          <Text style={styles.sectionTitle}>Planning de Revision</Text>
          {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((jour, i) => (
            <View key={i} style={styles.carteJour}>
              <Text style={styles.jourNom}>{jour}</Text>
              <View style={styles.jourCreneaux}>
                <View style={styles.creneau}><Text style={styles.creneauTemps}>08h-10h</Text><Text style={styles.creneauMatiere}>{['Maths', 'Physique', 'SVT', 'Maths', 'Physique', 'SVT', 'Revision'][i]}</Text></View>
                <View style={styles.creneau}><Text style={styles.creneauTemps}>14h-16h</Text><Text style={styles.creneauMatiere}>{['Physique', 'SVT', 'Maths', 'SVT', 'Maths', 'Physique', 'Repos'][i]}</Text></View>
                <View style={styles.creneau}><Text style={styles.creneauTemps}>19h-21h</Text><Text style={styles.creneauMatiere}>{['Exos', 'Exos', 'Exos', 'Exos', 'BAC Blanc', 'Exos', 'Libre'][i]}</Text></View>
              </View>
            </View>
          ))}
        </View>)}
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
  onglet: { flex: 1, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 10, paddingVertical: 10, marginHorizontal: 3, alignItems: 'center' },
  ongletActif: { backgroundColor: '#10B981', borderColor: '#10B981' },
  ongletText: { color: '#D1D5DB', fontSize: 11, fontWeight: '500' },
  ongletTextActif: { color: '#FFFFFF', fontWeight: 'bold' },
  sectionTitle: { color: '#FBBF24', fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  carteEau: { backgroundColor: '#111827', borderRadius: 14, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#374151' },
  eauCompteur: { color: '#3B82F6', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  barreEau: { height: 10, backgroundColor: '#1E3A5F', borderRadius: 5, overflow: 'hidden', marginBottom: 15 },
  remplissageEau: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 5 },
  boutonEau: { backgroundColor: '#1E3A5F', padding: 14, borderRadius: 12, alignItems: 'center' },
  boutonEauText: { color: '#93C5FD', fontWeight: 'bold', fontSize: 14 },
  carteConseil: { backgroundColor: '#111827', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#374151' },
  conseilText: { color: '#D1D5DB', fontSize: 13 },
  cartePause: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#374151' },
  pauseEmoji: { fontSize: 30, marginRight: 12 },
  pauseInfo: { flex: 1 },
  pauseTitre: { color: '#F9FAFB', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  pauseDesc: { color: '#9CA3AF', fontSize: 12 },
  cartePomodoro: { backgroundColor: '#111827', borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#374151' },
  pomodoroTemps: { color: '#10B981', fontSize: 48, fontWeight: 'bold' },
  pomodoroSession: { color: '#9CA3AF', fontSize: 14, marginTop: 8, marginBottom: 20 },
  pomodoroBoutons: { flexDirection: 'row', gap: 10 },
  boutonPomodoro: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  boutonPause: { backgroundColor: '#F59E0B' },
  boutonPomodoroText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  boutonReset: { backgroundColor: '#374151', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  boutonResetText: { color: '#D1D5DB', fontWeight: 'bold', fontSize: 14 },
  carteJour: { backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#374151' },
  jourNom: { color: '#FBBF24', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  jourCreneaux: { gap: 6 },
  creneau: { flexDirection: 'row', justifyContent: 'space-between' },
  creneauTemps: { color: '#9CA3AF', fontSize: 12, width: 60 },
  creneauMatiere: { color: '#D1D5DB', fontSize: 13, flex: 1 },
});
