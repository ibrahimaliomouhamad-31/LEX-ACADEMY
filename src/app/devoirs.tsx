import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { listeDevoirs, rendreDevoir, type Devoir } from '../services/devoirsService';
import { estJuste } from '../services/outilsReponse';
import { genererExercice, niveauLabel, type ExoGenere } from '../services/generateurLocal';

export default function Devoirs() {
  const router = useRouter();
  const [classe, setClasse] = useState<string>('');
  const [devoirs, setDevoirs] = useState<Devoir[]>([]);
  const [chargement, setChargement] = useState(true);

  // État "faire un devoir"
  const [devoirActif, setDevoirActif] = useState<Devoir | null>(null);
  const [questions, setQuestions] = useState<ExoGenere[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [termine, setTermine] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await AsyncStorage.getItem('lex_classe_actuelle');
      if (c) setClasse(c);
      try {
        setDevoirs(await listeDevoirs(c || '1ère C'));
      } catch {
        // hors-ligne
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const demarrerDevoir = (d: Devoir) => {
    const qs: ExoGenere[] = [];
    for (let i = 0; i < d.nbExercices; i++) {
      qs.push(genererExercice(`devoir_${d.id}`, 'Équations et calcul', d.niveauGenerateur));
    }
    setDevoirActif(d);
    setQuestions(qs);
    setIndex(0);
    setScore(0);
    setReponse('');
    setFeedback('');
    setTermine(false);
  };

  const valider = () => {
    const exo = questions[index];
    if (!exo || reponse.trim() === '' || feedback !== '') return;
    const juste = estJuste(reponse, exo.bonne_reponse);
    if (juste) setScore((s) => s + 1);
    setFeedback(juste ? '✅ EXACT !' : `❌ Réponse : ${exo.bonne_reponse.split('|')[0]}\n📖 ${exo.explication}`);
  };

  const suivant = async () => {
    if (index + 1 >= questions.length) {
      setTermine(true);
      const nom = (await AsyncStorage.getItem('lex_user_nom')) || 'Anonyme';
      if (devoirActif) {
        const envoye = await rendreDevoir({ devoirId: devoirActif.id, eleveNom: nom, score, total: questions.length });
        if (!envoye) {
          Alert.alert('Hors-ligne', 'Ta note est enregistrée sur ton téléphone. Reviens au wifi pour l\'envoyer à ton prof !');
        }
      }
    } else {
      setIndex(index + 1);
      setReponse('');
      setFeedback('');
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => (devoirActif ? setDevoirActif(null) : router.back())}>
        <Text style={styles.backBtn}>‹ {devoirActif ? 'Devoirs' : 'Retour'}</Text>
      </TouchableOpacity>
      <Text style={styles.subject}>DONNÉS PAR TES PROFESSEURS</Text>
      <Text style={styles.title}>📝 Devoirs</Text>
    </View>
  );

  // Résultat
  if (devoirActif && termine) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.centre}>
          <Text style={styles.grandeNote}>{score}/{questions.length}</Text>
          <Text style={styles.texteNote}>
            {devoirActif.titre} — {devoirActif.classe}{'\n'}
            {score / questions.length >= 0.5 ? '✅ Devoir validé, bravo !' : '💪 Courage, révise et réessaie !'}
          </Text>
          <TouchableOpacity style={styles.bouton} onPress={() => setDevoirActif(null)}>
            <Text style={styles.boutonText}>‹ Mes devoirs</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // En train de faire le devoir
  if (devoirActif) {
    const exo = questions[index];
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.barreInfo}>
          <Text style={styles.info}>Exercice {index + 1}/{questions.length}</Text>
          <Text style={styles.infoScore}>Score : {score}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={styles.carte}>
            <Text style={styles.question}>{exo?.enonce}</Text>
            <TextInput style={styles.input} placeholder="Ta réponse..." placeholderTextColor="#64748B" value={reponse} onChangeText={setReponse} editable={feedback === ''} />
            {feedback === '' ? (
              <TouchableOpacity style={styles.boutonVert} onPress={valider}>
                <Text style={styles.boutonVertText}>Valider</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={[styles.feedback, feedback.startsWith('✅') ? styles.fbOk : styles.fbKo]}>
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
                <TouchableOpacity style={styles.boutonVert} onPress={suivant}>
                  <Text style={styles.boutonVertText}>{index + 1 >= questions.length ? 'Terminer 🏁' : 'Suivant →'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Liste des devoirs
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {header}
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {chargement ? (
          <ActivityIndicator color="#FBBF24" />
        ) : devoirs.length === 0 ? (
          <Text style={styles.vide}>
            {classe
              ? `Aucun devoir publié pour ${classe} pour le moment.`
              : 'Choisis ta classe une fois dans les exercices, puis reviens ici !'}
          </Text>
        ) : (
          devoirs.map((d) => (
            <TouchableOpacity key={d.id} style={styles.carteDevoir} onPress={() => demarrerDevoir(d)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.devoirTitre} numberOfLines={1}>{d.titre}</Text>
                <Text style={styles.devoirDetail}>
                  {d.classe} · {d.nbExercices} exercices · {niveauLabel(d.niveauGenerateur)}{'\n'}
                  📅 À rendre avant le {d.dateLimite} · par {d.profNom}
                </Text>
              </View>
              <Text style={styles.fleche}>▶</Text>
            </TouchableOpacity>
          ))
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
  barreInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#1E293B', marginHorizontal: 20, borderRadius: 10, marginBottom: 10 },
  info: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  infoScore: { color: '#10B981', fontSize: 12, fontWeight: 'bold' },
  carte: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  question: { color: '#F8FAFC', fontSize: 16, lineHeight: 24, marginBottom: 20, fontWeight: 'bold' },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, color: '#F8FAFC', fontSize: 16, marginBottom: 15 },
  boutonVert: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  boutonVertText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  feedback: { padding: 15, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  fbOk: { backgroundColor: '#0F2A1A', borderColor: '#10B981' },
  fbKo: { backgroundColor: '#2A1010', borderColor: '#EF4444' },
  feedbackText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  grandeNote: { color: '#FBBF24', fontSize: 64, fontWeight: 'bold' },
  texteNote: { color: '#94A3B8', fontSize: 15, textAlign: 'center', marginTop: 10, marginBottom: 25, lineHeight: 22 },
  bouton: { backgroundColor: '#334155', paddingHorizontal: 25, paddingVertical: 13, borderRadius: 10 },
  boutonText: { color: '#F8FAFC', fontWeight: 'bold' },
  vide: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  carteDevoir: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  devoirTitre: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  devoirDetail: { color: '#64748B', fontSize: 11, marginTop: 4, lineHeight: 17 },
  fleche: { color: '#F59E0B', fontSize: 20, marginLeft: 10 },
});
