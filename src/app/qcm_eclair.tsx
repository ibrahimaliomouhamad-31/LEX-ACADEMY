import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getAllCachedChapterIds,
  getExercices,
  type Exercice,
} from '../services/cacheHorsLigne';
import { genererExercice } from '../services/generateurLocal';
import { estJuste } from '../services/outilsReponse';

// QCM ÉCLAIR — 60 secondes, maximum de bonnes réponses, 100% hors-ligne
// 3 états : INTRO → JEU → FIN

const CLE_RECORD = 'lex_qcm_meilleur';
const DUREE_PARTIE = 60;

type Phase = 'intro' | 'jeu' | 'fin';

interface QuestionEclair {
  enonce: string;
  bonne_reponse: string;
}

interface Feedback {
  ok: boolean;
  texte: string;
}

function melanger<T>(arr: T[]): T[] {
  const copie = [...arr];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copie[i];
    copie[i] = copie[j];
    copie[j] = tmp;
  }
  return copie;
}

function messageFinal(score: number): string {
  if (score >= 9) return 'Machine de guerre 🏆';
  if (score >= 6) return 'Costaud 💪';
  if (score >= 3) return 'Pas mal !';
  return 'Il faut réviser 😅';
}

export default function QcmEclair() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('intro');
  const [record, setRecord] = useState(0);
  const [score, setScore] = useState(0);
  const [secondes, setSecondes] = useState(DUREE_PARTIE);
  const [question, setQuestion] = useState<QuestionEclair | null>(null);
  const [numQuestion, setNumQuestion] = useState(0);
  const [saisie, setSaisie] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [bloque, setBloque] = useState(false);

  // Refs : miroirs fiables pour le chrono / les timeouts
  const scoreRef = useRef(0);
  const recordRef = useRef(0);
  const poolRef = useRef<Exercice[]>([]);
  const alternanceRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Charge le record local au montage
  useEffect(() => {
    (async () => {
      try {
        const brut = await AsyncStorage.getItem(CLE_RECORD);
        if (brut !== null) {
          const n = parseInt(brut, 10);
          if (!Number.isNaN(n) && n >= 0) {
            recordRef.current = n;
            setRecord(n);
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Nettoyage du timeout à la destruction du composant
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Chrono de 60 s
  useEffect(() => {
    if (phase !== 'jeu') return;
    const id = setInterval(() => {
      setSecondes((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Temps écoulé → fin
  const terminerRef = useRef<() => void>(() => {});
  useEffect(() => {
    terminerRef.current = terminer;
  });
  useEffect(() => {
    if (phase === 'jeu' && secondes <= 0) {
      terminerRef.current();
    }
  }, [secondes, phase]);

  // ---------- Questions ----------

  // Alterne : exercice en cache → exercice généré → cache → généré…
  const questionSuivante = (): QuestionEclair => {
    const alternance = alternanceRef.current;
    alternanceRef.current += 1;
    if (alternance % 2 === 0 && poolRef.current.length > 0) {
      const exo = poolRef.current.shift();
      if (exo) return { enonce: exo.enonce, bonne_reponse: exo.bonne_reponse };
    }
    const gen = genererExercice('', 'Calcul rapide et équations', 15);
    return { enonce: gen.enonce, bonne_reponse: gen.bonne_reponse };
  };

  const avancerQuestion = () => {
    setQuestion(questionSuivante());
    setNumQuestion((n) => n + 1);
    setSaisie('');
  };

  const programmer = (callback: () => void, ms: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(callback, ms);
  };

  // ---------- Déroulé de la partie ----------

  const demarrer = async () => {
    // Précharge les exercices en cache (difficulté ≤ 2 pour la vitesse)
    const ids = await getAllCachedChapterIds();
    const pool: Exercice[] = [];
    for (const id of ids) {
      const liste = await getExercices(id);
      if (!liste) continue;
      for (const e of liste) {
        const d = parseInt(e.difficulte, 10);
        if (Number.isNaN(d) || d <= 2) pool.push(e);
      }
    }
    poolRef.current = melanger(pool);
    alternanceRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setSaisie('');
    setFeedback(null);
    setBloque(false);
    setSecondes(DUREE_PARTIE);
    setNumQuestion(1);
    setQuestion(questionSuivante());
    setPhase('jeu');
  };

  const valider = () => {
    if (phase !== 'jeu' || !question || bloque) return;
    if (estJuste(saisie, question.bonne_reponse)) {
      // Juste : score +1, bref feedback vert, question suivante IMMÉDIATE
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setFeedback({ ok: true, texte: '✓' });
      avancerQuestion();
      programmer(() => {
        setFeedback((f) => (f && f.ok ? null : f));
      }, 700);
    } else {
      // Faux : on affiche la bonne réponse 1,2 s puis on avance
      const bonne = question.bonne_reponse.split('|')[0].trim();
      setFeedback({ ok: false, texte: `✗ La bonne réponse était : ${bonne}` });
      setBloque(true);
      programmer(() => {
        setBloque(false);
        setFeedback(null);
        avancerQuestion();
      }, 1200);
    }
  };

  const terminer = () => {
    if (phase !== 'jeu') return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const scoreFinal = scoreRef.current;
    setScore(scoreFinal);
    setBloque(false);
    setFeedback(null);
    setPhase('fin');
    if (scoreFinal > recordRef.current) {
      recordRef.current = scoreFinal;
      setRecord(scoreFinal);
      AsyncStorage.setItem(CLE_RECORD, String(scoreFinal)).catch(() => {
        // ignore
      });
    }
  };

  // ---------- Rendu ----------

  const chronoRouge = secondes < 10;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ==================== INTRO ==================== */}
      {phase === 'intro' && (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contenuCentre}
        >
          <Text style={styles.logo}>⚡</Text>
          <Text style={styles.titreIntro}>QCM Éclair</Text>
          <Text style={styles.sousTitreIntro}>
            60 secondes.{'\n'}Maximum de bonnes réponses.{'\n'}Prêt ?
          </Text>
          <View style={styles.cardRecord}>
            <Text style={styles.recordLabel}>MEILLEUR SCORE</Text>
            <Text style={styles.recordValeur}>
              {record > 0 ? record : '—'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.boutonParti}
            onPress={() => {
              void demarrer();
            }}
          >
            <Text style={styles.boutonPartiTexte}>C'EST PARTI ▶</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.retourTexte}>‹ Retour</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ==================== JEU ==================== */}
      {phase === 'jeu' && question && (
        <View style={styles.zoneJeu}>
          {/* Gros chrono centré */}
          <View style={styles.blocChrono}>
            <Text style={[styles.chrono, chronoRouge && styles.chronoRouge]}>
              {secondes}
            </Text>
            <Text style={styles.chronoUnite}>secondes</Text>
            <View style={styles.rowScoreJeu}>
              <Text style={styles.scoreJeu}>Score : {score}</Text>
              <Text style={styles.recordJeu}>Record : {record}</Text>
            </View>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.cardQuestion}>
              <Text style={styles.tagQuestion}>Question n°{numQuestion}</Text>
              <Text style={styles.enonce}>{question.enonce}</Text>

              <TextInput
                key={numQuestion}
                style={[styles.input, bloque && styles.inputBloque]}
                placeholder="Ta réponse…"
                placeholderTextColor="#64748B"
                value={saisie}
                onChangeText={setSaisie}
                editable={!bloque}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.boutonValider, bloque && styles.boutonDesactive]}
                disabled={bloque}
                onPress={valider}
              >
                <Text style={styles.boutonValiderTexte}>Valider</Text>
              </TouchableOpacity>

              {feedback && (
                <View
                  style={[
                    styles.feedbackBox,
                    feedback.ok ? styles.feedbackJuste : styles.feedbackFaux,
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackTexte,
                      feedback.ok && styles.feedbackTexteJuste,
                    ]}
                  >
                    {feedback.texte}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      )}

      {/* ==================== FIN ==================== */}
      {phase === 'fin' && (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contenuCentre}
        >
          <Text style={styles.titreFin}>⏱ Temps écoulé !</Text>

          <View style={styles.cardScoreFinal}>
            <Text style={styles.scoreLabel}>TON SCORE</Text>
            <Text style={styles.scoreValeur}>{score}</Text>
            <Text style={styles.scoreReponses}>
              {score <= 0
                ? 'bonne réponse'
                : score === 1
                  ? 'bonne réponse'
                  : 'bonnes réponses'}
            </Text>
          </View>

          <Text style={styles.ligneRecord}>
            Record : <Text style={styles.recordAccentue}>{record}</Text>
            {score >= record && score > 0 && (
              <Text style={styles.nouveauRecord}> · Nouveau record ! 🔥</Text>
            )}
          </Text>

          <Text style={styles.messageFun}>{messageFinal(score)}</Text>

          <TouchableOpacity
            style={styles.boutonParti}
            onPress={() => {
              void demarrer();
            }}
          >
            <Text style={styles.boutonPartiTexte}>↻ Rejouer</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.retourTexte}>‹ Retour</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollView: { flex: 1 },
  contenuCentre: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  retourTexte: { color: '#FBBF24', fontSize: 14, marginTop: 18 },

  // Intro
  logo: { fontSize: 72, marginBottom: 8 },
  titreIntro: { color: '#F8FAFC', fontSize: 34, fontWeight: 'bold' },
  sousTitreIntro: { color: '#94A3B8', fontSize: 16, textAlign: 'center', lineHeight: 24, marginTop: 10 },
  cardRecord: { backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', marginTop: 30 },
  recordLabel: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 2 },
  recordValeur: { color: '#FBBF24', fontSize: 40, fontWeight: 'bold', marginTop: 6 },
  boutonParti: { backgroundColor: '#FBBF24', borderRadius: 10, paddingVertical: 16, paddingHorizontal: 40, marginTop: 30 },
  boutonPartiTexte: { color: '#0F172A', fontSize: 17, fontWeight: 'bold' },

  // Jeu
  zoneJeu: { flex: 1 },
  blocChrono: { alignItems: 'center', paddingTop: 20, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  chrono: { color: '#FBBF24', fontSize: 72, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  chronoRouge: { color: '#EF4444' },
  chronoUnite: { color: '#64748B', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginTop: -4 },
  rowScoreJeu: { flexDirection: 'row', marginTop: 10 },
  scoreJeu: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  recordJeu: { color: '#94A3B8', fontSize: 15, marginLeft: 20 },

  cardQuestion: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, marginTop: 14, borderLeftWidth: 3, borderLeftColor: '#FBBF24' },
  tagQuestion: { color: '#FBBF24', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 10 },
  enonce: { color: '#F8FAFC', fontSize: 18, lineHeight: 27, marginBottom: 18 },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, color: '#F8FAFC', fontSize: 17, marginBottom: 14 },
  inputBloque: { opacity: 0.5 },
  boutonValider: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  boutonDesactive: { opacity: 0.5 },
  boutonValiderTexte: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  feedbackBox: { marginTop: 14, padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  feedbackJuste: { backgroundColor: '#0F2A1A', borderColor: '#10B981' },
  feedbackFaux: { backgroundColor: '#2A1010', borderColor: '#EF4444' },
  feedbackTexte: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  feedbackTexteJuste: { fontSize: 26, color: '#10B981' },

  // Fin
  titreFin: { color: '#F8FAFC', fontSize: 26, fontWeight: 'bold' },
  cardScoreFinal: { backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 24, paddingHorizontal: 60, alignItems: 'center', marginTop: 20 },
  scoreLabel: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 2 },
  scoreValeur: { color: '#FBBF24', fontSize: 80, fontWeight: 'bold', marginTop: 6 },
  scoreReponses: { color: '#64748B', fontSize: 13, marginTop: 2 },
  ligneRecord: { color: '#94A3B8', fontSize: 16, marginTop: 18 },
  recordAccentue: { color: '#FBBF24', fontWeight: 'bold', fontSize: 18 },
  nouveauRecord: { color: '#10B981', fontWeight: 'bold' },
  messageFun: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 14, textAlign: 'center' },
});
