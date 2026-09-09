import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { genererExercice } from '../services/generateurLocal';

/** Mode révision express : 10 minutes chrono pour ancrer l'essentiel avant une interro (amélioration 30). */
const DUREE = 10 * 60;

export default function RevisionExpress() {
  const router = useRouter();
  const [reste, setReste] = useState(DUREE);
  const [enCours, setEnCours] = useState(false);
  const [question, setQuestion] = useState<{ enonce: string; reponse: string } | null>(null);
  const [montreRep, setMontreRep] = useState(false);
  const [score, setScore] = useState({ vues: 0, reussies: 0 });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enCours) return;
    timer.current = setInterval(() => {
      setReste((r) => {
        if (r <= 1) {
          if (timer.current) clearInterval(timer.current);
          setEnCours(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [enCours]);

  const demarrer = useCallback(() => {
    setEnCours(true);
    setReste(DUREE);
    setScore({ vues: 0, reussies: 0 });
    nouvelleQuestion();
  }, []);

  const nouvelleQuestion = () => {
    const ex = genererExercice('chap-express', 'Révision express', 2);
    setQuestion({ enonce: ex.enonce, reponse: ex.bonne_reponse.split('|')[0] });
    setMontreRep(false);
    setScore((s) => ({ ...s, vues: s.vues + 1 }));
  };

  const mm = String(Math.floor(reste / 60)).padStart(2, '0');
  const ss = String(reste % 60).padStart(2, '0');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.retour}>← Retour</Text></TouchableOpacity>
        <Text style={styles.titre}>⚡ Révision express</Text>
      </View>
      <View style={styles.body}>
        {!enCours && reste === DUREE && (
          <View style={styles.center}>
            <Text style={styles.emoji}>⚡</Text>
            <Text style={styles.desc}>10 minutes chrono pour réviser l'essentiel avant une interro ou en attendant le cours. Idéal dans le car, à la pause !</Text>
            <TouchableOpacity style={styles.bouton} onPress={demarrer}><Text style={styles.boutonTxt}>Démarrer les 10 minutes</Text></TouchableOpacity>
          </View>
        )}
        {enCours && question && (
          <View>
            <Text style={styles.chrono}>{mm}:{ss}</Text>
            <View style={styles.card}>
              <Text style={styles.q}>{question.enonce}</Text>
              {montreRep && <Text style={styles.rep}>✅ {question.reponse}</Text>}
            </View>
            {!montreRep ? (
              <TouchableOpacity style={styles.bouton} onPress={() => setMontreRep(true)}><Text style={styles.boutonTxt}>Voir la réponse</Text></TouchableOpacity>
            ) : (
              <View style={styles.row}>
                <TouchableOpacity style={[styles.bouton, { flex: 1, backgroundColor: '#10B981' }]} onPress={() => { setScore((s) => ({ ...s, reussies: s.reussies + 1 })); nouvelleQuestion(); }}>
                  <Text style={styles.boutonTxt}>✅ J'avais juste</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.bouton, { flex: 1, backgroundColor: '#EF4444' }]} onPress={nouvelleQuestion}>
                  <Text style={styles.boutonTxt}>❌ J'avais faux</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        {!enCours && reste === 0 && (
          <View style={styles.center}>
            <Text style={styles.emoji}>⏰</Text>
            <Text style={styles.desc}>Session terminée ! {score.reussies}/{score.vues} réussies. Bravo, tu es prêt 💪</Text>
            <TouchableOpacity style={styles.bouton} onPress={demarrer}><Text style={styles.boutonTxt}>Refaire une session</Text></TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, paddingTop: 55 },
  retour: { color: '#FBBF24', fontSize: 15, marginBottom: 10 },
  titre: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  body: { flex: 1, padding: 16 },
  center: { alignItems: 'center', marginTop: 60, paddingHorizontal: 10 },
  emoji: { fontSize: 60, marginBottom: 16 },
  desc: { color: '#CBD5E1', textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 24 },
  chrono: { color: '#FBBF24', fontSize: 40, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, marginBottom: 16 },
  q: { color: '#FFF', fontSize: 17, lineHeight: 25 },
  rep: { color: '#34D399', fontSize: 16, marginTop: 14, fontWeight: '600' },
  bouton: { backgroundColor: '#F59E0B', borderRadius: 14, padding: 15, marginBottom: 10 },
  boutonTxt: { color: '#0F172A', fontWeight: '800', textAlign: 'center', fontSize: 15 },
  row: { flexDirection: 'row', gap: 10 },
});