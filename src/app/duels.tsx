import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAllCachedChapterIds, getExercices, type Exercice } from '../services/cacheHorsLigne';
import { getCours } from '../services/cacheHorsLigne';
import { estJuste } from '../services/outilsReponse';
import { genererExercice } from '../services/generateurLocal';
import { enregistrerDuel, getFantome } from '../services/duelService';
import { melangeFisherYates } from '../utils/correctifsAudit';

type Phase = 'choix' | 'duel' | 'fin';

export default function Duels() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('choix');
  const [chapitres, setChapitres] = useState<string[]>([]);
  const [fantomes, setFantomes] = useState<{ [id: string]: number }>({});
  const [loading, setLoading] = useState(true);

  const [chapitreChoisi, setChapitreChoisi] = useState<string>('');
  const [questions, setQuestions] = useState<Exercice[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [chrono, setChrono] = useState(0);
  const [scoreFantome, setScoreFantome] = useState(6);
  const chronoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const ids = await getAllCachedChapterIds();
      setChapitres(ids);
      const f: { [id: string]: number } = {};
      for (const id of ids) {
        f[id] = await getFantome(id);
      }
      setFantomes(f);
      setLoading(false);
    })();
    return () => {
      if (chronoRef.current) clearInterval(chronoRef.current);
    };
  }, []);

  const demarrerDuel = async (chapitreId: string) => {
    setChapitreChoisi(chapitreId);
    setScoreFantome(await getFantome(chapitreId));

    let exos = await getExercices(chapitreId);
    // 🛡️ AUDIT : Fisher-Yates non biaisé (l'ancien sort(random-0.5) biaise).
    exos = exos ? melangeFisherYates(exos) : [];
    if (exos.length > 10) exos = exos.slice(0, 10);

    // Complète avec le générateur si le cache est trop maigre
    const cours = await getCours(chapitreId);
    const titre = cours?.titre || chapitreId;
    while (exos.length < 10) {
      const g = genererExercice(chapitreId, titre, 25);
      exos.push({
        id: `gen_duel_${exos.length}`,
        classe: '', matiere: '', chapitre: titre, chapitre_id: chapitreId,
        difficulte: '1', ...g,
      });
    }

    setQuestions(exos);
    setIndex(0);
    setScore(0);
    setReponse('');
    setFeedback('');
    setChrono(0);
    setPhase('duel');
    if (chronoRef.current) clearInterval(chronoRef.current);
    chronoRef.current = setInterval(() => setChrono((c) => c + 1), 1000);
  };

  const terminer = async (scoreFinal: number) => {
    if (chronoRef.current) clearInterval(chronoRef.current);
    // Score de duel : bonnes réponses ×10 − pénalité de temps (1 pt par 10 s)
    const scoreCalcule = Math.max(0, scoreFinal * 10 - Math.floor(chrono / 10));
    setScore(scoreCalcule);
    await enregistrerDuel(chapitreChoisi, scoreCalcule);
    setScoreFantome(await getFantome(chapitreChoisi));
    setPhase('fin');
  };

  const valider = async () => {
    const exo = questions[index];
    if (!exo || reponse.trim() === '' || feedback !== '') return;
    const juste = estJuste(reponse, exo.bonne_reponse);
    const nouveauScore = score + (juste ? 1 : 0);
    setScore(nouveauScore);
    setFeedback(juste ? '✅ YES ! Continue comme ça !' : `❌ Rate ! La réponse était : ${exo.bonne_reponse.split('|')[0]}`);
  };

  const suivant = async () => {
    if (index + 1 >= questions.length) {
      await terminer(score);
    } else {
      setIndex(index + 1);
      setReponse('');
      setFeedback('');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => (phase === 'duel' ? null : router.back())}>
        <Text style={[styles.backBtn, phase === 'duel' && { opacity: 0.3 }]}>‹ Retour</Text>
      </TouchableOpacity>
      <Text style={styles.subject}>DÉFI</Text>
      <Text style={styles.title}>⚔️ Duel</Text>
    </View>
  );

  if (phase === 'choix') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            Choisis un chapitre et bats le fantôme : ton meilleur score sur ce chapitre !
            {'\n'}Score = bonnes réponses × 10 − 1 pt par 10 secondes. ⏱️
          </Text>
          {chapitres.length === 0 ? (
            <Text style={styles.vide}>Aucun chapitre téléchargé. Télécharge des chapitres pour pouvoir te battre en duel !</Text>
          ) : (
            chapitres.map((id) => (
              <TouchableOpacity key={id} style={styles.carteChapitre} onPress={() => demarrerDuel(id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chapitreTitre} numberOfLines={1}>{id.replace(/_/g, ' ')}</Text>
                  <Text style={styles.chapitreFantome}>👻 Fantôme : {fantomes[id] ?? 6} pts</Text>
                </View>
                <Text style={styles.fleche}>⚔️</Text>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    );
  }

  if (phase === 'fin') {
    const victoire = score >= scoreFantome;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.centered}>
          <Text style={styles.finEmoji}>{victoire ? '🎉' : '😤'}</Text>
          <Text style={styles.finTitre}>{victoire ? 'VICTOIRE !' : 'DÉFAITE...'}</Text>
          <Text style={styles.finScores}>Toi : {score} pts{'\n'}👻 Fantôme : {scoreFantome} pts</Text>
          {!victoire && <Text style={styles.finMot}>Le fantôme garde ton ancien record. Prends ta revanche !</Text>}
          {victoire && <Text style={styles.finMot}>Tu deviens le nouveau fantôme de ce chapitre 👻</Text>}
          <TouchableOpacity style={styles.btnRejouer} onPress={() => setPhase('choix')}>
            <Text style={styles.btnRejouerText}>⚔️ Autre duel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnRetour} onPress={() => router.back()}>
            <Text style={styles.btnRetourText}>‹ Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // phase 'duel'
  const exo = questions[index];
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {header}
      <View style={styles.barreDuel}>
        <Text style={styles.infoDuel}>Question {index + 1}/{questions.length}</Text>
        <Text style={styles.chronoDuel}>⏱️ {chrono}s</Text>
        <Text style={styles.scoreDuel}>{score * 10} pts</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
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
                  {index + 1 >= questions.length ? 'Voir le résultat 🏁' : 'Question suivante →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  intro: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginBottom: 15 },
  vide: { color: '#94A3B8', fontSize: 15, textAlign: 'center', marginTop: 40, lineHeight: 22 },

  carteChapitre: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 18, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  chapitreTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', textTransform: 'capitalize' },
  chapitreFantome: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  fleche: { fontSize: 24, marginLeft: 10 },

  barreDuel: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#1E293B', marginHorizontal: 20, borderRadius: 10, marginBottom: 10 },
  infoDuel: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  chronoDuel: { color: '#FBBF24', fontSize: 12, fontWeight: 'bold' },
  scoreDuel: { color: '#10B981', fontSize: 12, fontWeight: 'bold' },

  carte: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  question: { color: '#F8FAFC', fontSize: 16, lineHeight: 24, marginBottom: 20, fontWeight: 'bold' },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, color: '#F8FAFC', fontSize: 16, marginBottom: 15 },
  validerBtn: { backgroundColor: '#EF4444', padding: 15, borderRadius: 8, alignItems: 'center' },
  validerBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  feedback: { padding: 15, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  fbOk: { backgroundColor: '#0F2A1A', borderColor: '#10B981' },
  fbKo: { backgroundColor: '#2A1010', borderColor: '#EF4444' },
  feedbackText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  suivantBtn: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  suivantBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  finEmoji: { fontSize: 60, marginBottom: 15 },
  finTitre: { color: '#F8FAFC', fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
  finScores: { color: '#FBBF24', fontSize: 18, textAlign: 'center', lineHeight: 28, marginBottom: 12 },
  finMot: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 25 },
  btnRejouer: { backgroundColor: '#EF4444', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 10, marginBottom: 10 },
  btnRejouerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  btnRetour: { padding: 10 },
  btnRetourText: { color: '#FBBF24', fontSize: 14 },
});
