import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../config/firebaseConfig';
import {
  generateurDisponible,
  genererExercice,
  niveauLabel,
  type ExoGenere,
} from '../services/generateurLocal';
import { estJuste } from '../services/outilsReponse';
import { chargerNotionsChapitre, type MicroNotion } from '../services/microNotions';
import { getCours } from '../services/cacheHorsLigne';

const CLE_NIVEAUX = 'lex_infini_niveaux';
const CLE_STATS = 'lex_infini_stats';

export default function EntrainementInfini() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const chapitreId = (params.chapitre_id as string) || '';
  const titre = (params.titre as string) || 'Chapitre';
  const matiere = (params.matiere as string) || '';

  const [niveau, setNiveau] = useState(1);
  const [exo, setExo] = useState<ExoGenere | null>(null);
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [serie, setSerie] = useState(0); // série en cours (réponses justes consécutives)
  const [totalResolus, setTotalResolus] = useState(0);
  const [notions, setNotions] = useState<MicroNotion[]>([]);
  const [notionChoisie, setNotionChoisie] = useState<string>(''); // '' = toutes

  const disponible = generateurDisponible(matiere);

  // Charge le niveau sauvegardé + stats + micro-notions du chapitre
  useEffect(() => {
    (async () => {
      try {
        const niv = await AsyncStorage.getItem(`${CLE_NIVEAUX}_${chapitreId}`);
        if (niv) setNiveau(Math.max(1, Math.min(100, parseInt(niv, 10) || 1)));
        const stats = await AsyncStorage.getItem(CLE_STATS);
        if (stats) {
          const s = JSON.parse(stats);
          setTotalResolus(s[chapitreId] || 0);
        }
        // Micro-notions : cache du cours d'abord, Firebase ensuite
        let cours = await getCours(chapitreId);
        let contenuFB: any = null;
        if (!cours) {
          try {
            const snap = await getDoc(doc(db, 'cours', chapitreId));
            if (snap.exists()) {
              contenuFB = snap.data();
              // en profite pour mettre le cours en cache (lecture hors-ligne)
              cours = { id: chapitreId, titre: snap.data().titre || titre, ...snap.data() };
            }
          } catch {
            // hors-ligne et pas de cache : notions indisponibles
          }
        }
        const n = await chargerNotionsChapitre(chapitreId, cours as any, contenuFB);
        setNotions(n); // TOUTES les notions du chapitre (pas de limite)
      } catch {
        // ignore
      }
    })();
  }, [chapitreId]);

  // Génère un exercice dès qu'on a le niveau
  useEffect(() => {
    nouveau();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Régénère quand la notion ciblée change
  useEffect(() => {
    if (notions.length > 0) {
      setExo(genererExercice(chapitreId, notionChoisie || titre, niveau));
      setReponse('');
      setFeedback('');
      setIsCorrect(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notionChoisie]);

  const titreCiblage = notionChoisie || titre;

  const nouveau = () => {
    setExo(genererExercice(chapitreId, titreCiblage, niveau));
    setReponse('');
    setFeedback('');
    setIsCorrect(false);
  };

  const changerNiveau = async (n: number) => {
    const borne = Math.max(1, Math.min(100, n));
    setNiveau(borne);
    try {
      await AsyncStorage.setItem(`${CLE_NIVEAUX}_${chapitreId}`, String(borne));
    } catch {
      // ignore
    }
    // Régénère immédiatement au nouveau niveau
    setExo(genererExercice(chapitreId, titreCiblage, borne));
    setReponse('');
    setFeedback('');
    setIsCorrect(false);
  };

  const verifier = async () => {
    if (!exo) return;
    if (estJuste(reponse, exo.bonne_reponse)) {
      setIsCorrect(true);
      setFeedback('✅ EXACT ! Passe au suivant pour augmenter ta série.');
      setSerie((s) => s + 1);
      // Sauvegarde du compteur local
      try {
        const stats = await AsyncStorage.getItem(CLE_STATS);
        const s = stats ? JSON.parse(stats) : {};
        s[chapitreId] = (s[chapitreId] || 0) + 1;
        await AsyncStorage.setItem(CLE_STATS, JSON.stringify(s));
        setTotalResolus(s[chapitreId]);
      } catch {
        // ignore
      }
    } else {
      setIsCorrect(false);
      setFeedback('❌ Pas encore. Utilise les indices puis réessaie !');
      setSerie(0);
    }
  };

  if (!disponible) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={styles.subject}>ENTRAÎNEMENT INFINI</Text>
        </View>
        <Text style={styles.emptyText}>
          📚 Le générateur infini est disponible en Mathématiques et Physique-Chimie.{'\n'}
          Pour la SVT, utilise les exercices du chapitre (télécharge-les pour le hors-ligne !).
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>ENTRAÎNEMENT INFINI - {matiere.toUpperCase()}</Text>
        <Text style={styles.title} numberOfLines={2}>{titre}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Sélecteur de micro-notion */}
        {notions.length > 0 && (
          <View>
            <Text style={styles.notionTitre}>🎯 Micro-notions du chapitre</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowNotions}>
              <TouchableOpacity
                style={[styles.notionChip, notionChoisie === '' && styles.notionChipActive]}
                onPress={() => { setNotionChoisie(''); }}
              >
                <Text style={[styles.notionChipText, notionChoisie === '' && styles.notionChipTextActive]}>Toutes</Text>
              </TouchableOpacity>
              {notions.map((n) => (
                <TouchableOpacity
                  key={n.titre}
                  style={[styles.notionChip, notionChoisie === n.titre && styles.notionChipActive]}
                  onPress={() => { setNotionChoisie(n.titre); }}
                >
                  <Text style={[styles.notionChipText, notionChoisie === n.titre && styles.notionChipTextActive]} numberOfLines={1}>
                    {n.titre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Sélecteur de niveau */}
        <View style={styles.cardNiveau}>
          <Text style={styles.niveauTitre}>🎚️ Niveau {niveau} — {niveauLabel(niveau)}</Text>
          <View style={styles.rowNiveau}>
            <TouchableOpacity style={styles.nivBtn} onPress={() => changerNiveau(niveau - 1)}>
              <Text style={styles.nivBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.niveauValeur}>{niveau}</Text>
            <TouchableOpacity style={styles.nivBtn} onPress={() => changerNiveau(niveau + 1)}>
              <Text style={styles.nivBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.rowRaccourcis}>
            {[1, 10, 25, 50, 75, 100].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.rapideBtn, niveau === n && styles.rapideBtnActif]}
                onPress={() => changerNiveau(n)}
              >
                <Text style={[styles.rapideBtnText, niveau === n && styles.rapideBtnTextActif]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.niveauAide}>
            Des millions d'exercices différents, générés sur ton téléphone — même sans internet.
            Niveau 100 = difficulté olympiade 🧠
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.rowStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValeur}>{serie}</Text>
            <Text style={styles.statLabel}>Série 🔥</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValeur}>{totalResolus}</Text>
            <Text style={styles.statLabel}>Résolus (total)</Text>
          </View>
        </View>

        {/* Exercice */}
        {exo && (
          <View style={styles.cardExo}>
            <Text style={styles.cardTitle}>✍️ Exercice généré — Niveau {niveau}</Text>
            <Text style={styles.questionText}>{exo.enonce}</Text>

            <TextInput
              style={styles.input}
              placeholder="Ta réponse ici (ex: 3 ou 1/2)"
              placeholderTextColor="#64748B"
              value={reponse}
              onChangeText={setReponse}
            />

            <TouchableOpacity style={styles.checkBtn} onPress={verifier}>
              <Text style={styles.checkBtnText}>Vérifier ma réponse</Text>
            </TouchableOpacity>

            {feedback !== '' && (
              <View style={[styles.feedbackBox, isCorrect ? styles.feedbackSuccess : styles.feedbackError]}>
                <Text style={styles.feedbackText}>{feedback}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.suivantBtn} onPress={nouveau}>
              <Text style={styles.suivantBtnText}>⟳ Exercice suivant</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Indices */}
        {exo && (
          <View style={styles.cardAI}>
            <Text style={styles.cardTitleAI}>💡 Indice — Assistant</Text>
            <View style={styles.bubbleAI}><Text style={styles.bubbleText}>💡 {exo.indice1}</Text></View>
            <View style={styles.bubbleAI}><Text style={styles.bubbleText}>💡 {exo.indice2}</Text></View>
            <View style={[styles.bubbleAI, styles.bubbleReponse]}>
              <Text style={styles.bubbleText}>📖 Correction complète :{'\n'}{exo.explication}</Text>
            </View>
            <Text style={styles.noteXP}>
              ⚠️ Mode entraînement : les exercices générés ne donnent pas d'XP (sinon ce serait tricher 😉).
              Les XP se gagnent sur les exercices officiels de la liste.
            </Text>
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
  title: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginTop: 5 },
  scrollView: { paddingHorizontal: 20 },
  emptyText: { color: '#94A3B8', fontSize: 16, textAlign: 'center', marginTop: 50, lineHeight: 26 },

  notionTitre: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  rowNotions: { flexDirection: 'row', marginBottom: 15, flexGrow: 0 },
  notionChip: { backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 15, marginRight: 8, borderWidth: 1, borderColor: '#334155', maxWidth: 200 },
  notionChipActive: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  notionChipText: { color: '#94A3B8', fontSize: 12 },
  notionChipTextActive: { color: '#0F172A', fontWeight: 'bold' },

  cardNiveau: { backgroundColor: '#16233B', borderRadius: 12, padding: 20, marginBottom: 15, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  niveauTitre: { color: '#93C5FD', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  rowNiveau: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  nivBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  nivBtnText: { color: '#FFFFFF', fontSize: 30, fontWeight: 'bold', marginTop: -4 },
  niveauValeur: { color: '#F8FAFC', fontSize: 40, fontWeight: 'bold', marginHorizontal: 30 },
  rowRaccourcis: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  rapideBtn: { flex: 1, marginHorizontal: 3, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  rapideBtnActif: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  rapideBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: 'bold' },
  rapideBtnTextActif: { color: '#FFFFFF' },
  niveauAide: { color: '#64748B', fontSize: 12, fontStyle: 'italic', textAlign: 'center', lineHeight: 18 },

  rowStats: { flexDirection: 'row', marginBottom: 15 },
  statBox: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginHorizontal: 5, alignItems: 'center' },
  statValeur: { color: '#FBBF24', fontSize: 26, fontWeight: 'bold' },
  statLabel: { color: '#94A3B8', fontSize: 12, marginTop: 4 },

  cardExo: { backgroundColor: '#14241B', borderRadius: 12, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  cardTitle: { color: '#10B981', fontSize: 17, fontWeight: 'bold', marginBottom: 15 },
  questionText: { color: '#A7F3D0', fontSize: 16, lineHeight: 24, marginBottom: 20 },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, color: '#F8FAFC', fontSize: 16, marginBottom: 20 },
  checkBtn: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  checkBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  suivantBtn: { backgroundColor: '#0F172A', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#10B981' },
  suivantBtnText: { color: '#10B981', fontWeight: 'bold', fontSize: 16 },

  feedbackBox: { marginTop: 15, padding: 15, borderRadius: 8, borderWidth: 1 },
  feedbackSuccess: { backgroundColor: '#0F2A1A', borderColor: '#10B981' },
  feedbackError: { backgroundColor: '#2A1010', borderColor: '#EF4444' },
  feedbackText: { fontSize: 15, fontWeight: 'bold', lineHeight: 22, color: '#FFFFFF' },

  cardAI: { backgroundColor: '#1B1424', borderRadius: 12, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  cardTitleAI: { color: '#8B5CF6', fontSize: 17, fontWeight: 'bold', marginBottom: 10 },
  bubbleAI: { backgroundColor: '#2D1F40', borderRadius: 12, padding: 15, marginBottom: 10, borderBottomRightRadius: 2 },
  bubbleReponse: { borderLeftWidth: 2, borderLeftColor: '#8B5CF6' },
  bubbleText: { color: '#E9D5FF', fontSize: 14, lineHeight: 22 },
  noteXP: { color: '#64748B', fontSize: 12, fontStyle: 'italic', marginTop: 5, lineHeight: 18 },
});
