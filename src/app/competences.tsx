import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { etatsCompetences, chapitresSuggeres, evaluerCompetence, type EtatCompetence } from '../services/competences';

export default function Competences() {
  const router = useRouter();
  const [filiere, setFiliere] = useState<'C' | 'D'>('C');
  const [etats, setEtats] = useState<EtatCompetence[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const charger = async (f: 'C' | 'D') => {
    setFiliere(f);
    setEtats(await etatsCompetences(f, {}));
  };
  useEffect(() => { charger('C'); }, []);

  const noter = async (id: string, note: 1 | 2 | 3 | 4 | 5) => {
    await evaluerCompetence(id, note);
    setOuvert(null);
    await charger(filiere);
  };

  const faibles = chapitresSuggeres(etats);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.retour}>← Retour</Text></TouchableOpacity>
        <Text style={styles.titre}>🎓 Auto-évaluation BAC</Text>
        <View style={styles.row}>
          {(['C', 'D'] as const).map((f) => (
            <TouchableOpacity key={f} style={[styles.filiere, filiere === f && styles.filiereActive]} onPress={() => charger(f)}>
              <Text style={[styles.filiereTxt, filiere === f && { color: '#0F172A' }]}>Tle {f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {faibles.length > 0 && (
          <View style={styles.alerte}>
            <Text style={styles.alerteTxt}>⚠️ Priorités détectées : {faibles.map((f) => f.competence.competence).join(' · ')}</Text>
          </View>
        )}
        {etats.map((e) => (
          <View key={e.competence.id} style={styles.card}>
            <TouchableOpacity onPress={() => setOuvert(ouvert === e.competence.id ? null : e.competence.id)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, color: '#FFF', fontSize: 14, fontWeight: '600' }}>{e.competence.competence}</Text>
                <Text style={[styles.verdict, e.verdict === 'acquis' && { color: '#34D399' }, e.verdict === 'en cours' && { color: '#FBBF24' }]}>{e.verdict}</Text>
              </View>
              <View style={styles.barreFond}>
                <View style={[styles.barre, { width: `${Math.max(3, e.niveau)}%`, backgroundColor: e.niveau >= 70 ? '#10B981' : e.niveau >= 40 ? '#F59E0B' : '#EF4444' }]} />
              </View>
            </TouchableOpacity>
            {ouvert === e.competence.id && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 8 }}>Toi seul sais ton vrai niveau. Sois honnête 😉</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {([1, 2, 3, 4, 5] as const).map((n) => (
                    <TouchableOpacity key={n} style={styles.note} onPress={() => noter(e.competence.id, n)}>
                      <Text style={{ color: '#FBBF24', fontWeight: '800' }}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, paddingTop: 55 },
  retour: { color: '#FBBF24', fontSize: 15, marginBottom: 10 },
  titre: { color: '#FFF', fontSize: 24, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  filiere: { backgroundColor: '#1E293B', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  filiereActive: { backgroundColor: '#FBBF24' },
  filiereTxt: { color: '#94A3B8', fontWeight: '700' },
  body: { flex: 1, padding: 16 },
  alerte: { backgroundColor: '#7F1D1D', borderRadius: 12, padding: 12, marginBottom: 12 },
  alerteTxt: { color: '#FCA5A5', fontSize: 13 },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 10 },
  verdict: { color: '#EF4444', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  barreFond: { backgroundColor: '#0F172A', borderRadius: 6, height: 8, marginTop: 8 },
  barre: { height: 8, borderRadius: 6 },
  note: { backgroundColor: '#0F172A', borderRadius: 8, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});