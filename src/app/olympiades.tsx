import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { OLYMPIADES, type ProblemeOlympiade } from '../services/olympiades';
import { estJuste } from '../services/outilsReponse';

const CLE_RESOLUS = 'lex_olympiades_resolus';

export default function Olympiades() {
  const router = useRouter();
  const [filtre, setFiltre] = useState<number>(0); // 0 = tous, sinon difficulté
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [resolus, setResolus] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const brut = await AsyncStorage.getItem(CLE_RESOLUS);
        if (brut) setResolus(JSON.parse(brut));
      } catch {
        // ignore
      }
    })();
  }, []);

  const marquerResolu = async (id: string) => {
    if (!resolus.includes(id)) {
      const nouveaux = [...resolus, id];
      setResolus(nouveaux);
      await AsyncStorage.setItem(CLE_RESOLUS, JSON.stringify(nouveaux));
    }
  };

  const valider = (p: ProblemeOlympiade) => {
    if (p.reponse === '') {
      // Problème de démonstration : auto-évaluation
      setFeedback('📖 Compare ta démonstration avec la solution officielle ci-dessous !');
      marquerResolu(p.id);
      return;
    }
    if (estJuste(reponse, p.reponse)) {
      setFeedback('✅ EXACT ! Champion du LEX ! 🏆');
      marquerResolu(p.id);
    } else {
      setFeedback('❌ Pas encore. Suis les indices !');
    }
  };

  const problemes = filtre === 0 ? OLYMPIADES : OLYMPIADES.filter((p) => p.difficulte === filtre);
  const etoilesDiff = (d: number) => '🏅'.repeat(d);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>POUR LES GÉNIES</Text>
        <Text style={styles.title}>🏅 Olympiades & Concours</Text>
      </View>

      <View style={styles.rowFiltres}>
        {[0, 1, 2, 3].map((d) => (
          <TouchableOpacity key={d} style={[styles.filtre, filtre === d && styles.filtreActif]} onPress={() => setFiltre(d)}>
            <Text style={[styles.filtreText, filtre === d && styles.filtreTextActif]}>
              {d === 0 ? 'Tous' : etoilesDiff(d)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.compteur}>{resolus.length}/{OLYMPIADES.length} problèmes vaincus ⚔️</Text>
        {problemes.map((p) => (
          <View key={p.id} style={styles.carte}>
            <TouchableOpacity
              style={styles.carteHaut}
              onPress={() => { setOuvert(ouvert === p.id ? null : p.id); setReponse(''); setFeedback(''); }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.titre} numberOfLines={2}>
                  {resolus.includes(p.id) ? '✅ ' : ''}{p.theme} — {etoilesDiff(p.difficulte)}
                </Text>
                <Text style={styles.enonce} numberOfLines={ouvert === p.id ? 99 : 2}>{p.enonce}</Text>
              </View>
              <Text style={styles.fleche}>{ouvert === p.id ? '▾' : '▸'}</Text>
            </TouchableOpacity>

            {ouvert === p.id && (
              <View>
                {p.reponse !== '' && (
                  <View>
                    <TextInput
                      style={styles.input}
                      placeholder="Ta réponse (ex: 84 ou 99/100)..."
                      placeholderTextColor="#64748B"
                      value={reponse}
                      onChangeText={setReponse}
                    />
                    <TouchableOpacity style={styles.bouton} onPress={() => valider(p)}>
                      <Text style={styles.boutonText}>Vérifier</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {feedback !== '' && <Text style={styles.feedback}>{feedback}</Text>}

                <Text style={styles.section}>💡 Indice 1 : <Text style={styles.contenu}>{p.indice1}</Text></Text>
                <Text style={styles.section}>💡💡 Indice 2 : <Text style={styles.contenu}>{p.indice2}</Text></Text>
                <Text style={styles.section}>📖 Solution :{'\n'}<Text style={styles.contenu}>{p.solution}</Text></Text>
              </View>
            )}
          </View>
        ))}
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
  rowFiltres: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12 },
  filtre: { flex: 1, marginHorizontal: 3, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1E293B', alignItems: 'center' },
  filtreActif: { backgroundColor: '#FBBF24' },
  filtreText: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  filtreTextActif: { color: '#0F172A' },
  compteur: { color: '#FBBF24', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  carte: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  carteHaut: { flexDirection: 'row', alignItems: 'center' },
  titre: { color: '#FBBF24', fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  enonce: { color: '#F8FAFC', fontSize: 14, lineHeight: 20 },
  fleche: { color: '#94A3B8', fontSize: 18, marginLeft: 8 },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: '#F8FAFC', fontSize: 15, marginTop: 12, marginBottom: 10 },
  bouton: { backgroundColor: '#F59E0B', padding: 12, borderRadius: 8, alignItems: 'center' },
  boutonText: { color: '#0F172A', fontWeight: 'bold' },
  feedback: { color: '#F8FAFC', fontSize: 14, marginTop: 10, fontWeight: 'bold' },
  section: { color: '#FBBF24', fontSize: 13, fontWeight: 'bold', marginTop: 14 },
  contenu: { color: '#CBD5E1', fontWeight: 'normal' },
});
