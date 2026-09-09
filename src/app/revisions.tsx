import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { estJuste } from '../services/outilsReponse';
import { getRevisionsDuJour, planifierRevision, retirerRevision, marquerRevisionFaite, revisionsFaitesAujourdhui } from '../services/revisions';
import { enregistrerTentative } from '../services/statsSuivi';
import type { Exercice } from '../services/cacheHorsLigne';

const PLAFOND_JOUR = 20;

export default function Revisions() {
  const router = useRouter();
  const [revisions, setRevisions] = useState<Exercice[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [fait, setFait] = useState(0);
  const [faitAujourdhui, setFaitAujourdhui] = useState(0);

  useEffect(() => {
    (async () => {
      const revs = await getRevisionsDuJour();
      setRevisions(revs);
      setFaitAujourdhui(await revisionsFaitesAujourdhui());
      setLoading(false);
    })();
  }, []);

  const exo = revisions[index];

  const valider = async () => {
    if (!exo || reponse.trim() === '') return;
    const juste = estJuste(reponse, exo.bonne_reponse);
    setIsCorrect(juste);
    setFeedback(juste ? '✅ PARFAIT ! Cette notion est consolidée.' : `❌ La bonne réponse était : ${exo.bonne_reponse.split('|')[0]}`);
    try {
      await enregistrerTentative(exo, juste);
      await planifierRevision(exo, juste);
      if (juste) {
        await marquerRevisionFaite(); // 🧠 plafond quotidien
        setFaitAujourdhui((n) => n + 1);
      }
    } catch {
      // ignore
    }
  };

  const suivant = () => {
    setFait((f) => f + 1);
    setReponse('');
    setFeedback('');
    setIsCorrect(false);
    if (index + 1 >= revisions.length) {
      setIndex(index + 1); // déclenche l'écran de fin
    } else {
      setIndex(index + 1);
    }
  };

  const ignorer = async () => {
    if (exo) {
      try {
        await retirerRevision(exo.id);
      } catch {
        // ignore
      }
    }
    suivant();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  const termine = index >= revisions.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>MÉMOIRE À LONG TERME</Text>
        <Text style={styles.title}>🧠 Révisions du jour</Text>
          <Text style={styles.compteur}>Progression : {faitAujourdhui}/{PLAFOND_JOUR} aujourd'hui</Text>
      </View>

      {revisions.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.videEmoji}>🎉</Text>
          <Text style={styles.videTitre}>Rien à réviser aujourd'hui !</Text>
          <Text style={styles.videTexte}>
            Chaque exercice raté revient automatiquement 1 jour, 3 jours, 7 jours puis 35 jours plus tard. Continue à t'entraîner : les notions fragiles reviendront ici.
          </Text>
          <TouchableOpacity style={styles.btnAller} onPress={() => router.push('/classes_exos')}>
            <Text style={styles.btnAllerText}>✍️ Aller aux exercices</Text>
          </TouchableOpacity>
        </View>
      ) : termine ? (
        <View style={styles.centered}>
          <Text style={styles.videEmoji}>💪</Text>
          <Text style={styles.videTitre}>{fait} révision(s) terminée(s) !</Text>
          <Text style={styles.videTexte}>Ta mémoire te dit merci. Reviens demain pour la suite.</Text>
          <TouchableOpacity style={styles.btnAller} onPress={() => router.back()}>
            <Text style={styles.btnAllerText}>‹ Retour</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.compteur}>Révision {index + 1} / {revisions.length}</Text>

          <View style={styles.card}>
            <Text style={styles.question}>{exo.enonce}</Text>
            <TextInput
              style={styles.input}
              placeholder="Ta réponse ici..."
              placeholderTextColor="#64748B"
              value={reponse}
              onChangeText={setReponse}
              editable={feedback === ''}
            />
            {feedback === '' ? (
              <TouchableOpacity style={styles.validerBtn} onPress={valider}>
                <Text style={styles.validerBtnText}>Vérifier</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={[styles.feedback, isCorrect ? styles.fbOk : styles.fbKo]}>
                  <Text style={styles.feedbackText}>{feedback}</Text>
                  {!isCorrect && exo.explication ? (
                    <Text style={styles.explication}>📖 {exo.explication}</Text>
                  ) : null}
                </View>
                <TouchableOpacity style={styles.suivantBtn} onPress={suivant}>
                  <Text style={styles.suivantBtnText}>Révision suivante →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ignorerBtn} onPress={ignorer}>
                  <Text style={styles.ignorerBtnText}>Je maîtrise, ne plus me le poser</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  videEmoji: { fontSize: 60, marginBottom: 15 },
  videTitre: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  videTexte: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  btnAller: { backgroundColor: '#10B981', paddingHorizontal: 25, paddingVertical: 14, borderRadius: 10 },
  btnAllerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  scrollView: { paddingHorizontal: 20 },
  compteur: { color: '#94A3B8', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  question: { color: '#F8FAFC', fontSize: 16, lineHeight: 24, marginBottom: 20, fontWeight: 'bold' },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, color: '#F8FAFC', fontSize: 16, marginBottom: 15 },
  validerBtn: { backgroundColor: '#8B5CF6', padding: 15, borderRadius: 8, alignItems: 'center' },
  validerBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  feedback: { padding: 15, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  fbOk: { backgroundColor: '#0F2A1A', borderColor: '#10B981' },
  fbKo: { backgroundColor: '#2A1010', borderColor: '#EF4444' },
  feedbackText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', lineHeight: 22 },
  explication: { color: '#FCA5A5', fontSize: 13, marginTop: 8, lineHeight: 19 },
  suivantBtn: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  suivantBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  ignorerBtn: { marginTop: 10, alignItems: 'center', padding: 10 },
  ignorerBtnText: { color: '#64748B', fontSize: 12, fontStyle: 'italic' },
});
