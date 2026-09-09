import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { chercherGlossaire } from '../services/programmeOfficiel';

export default function Glossaire() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const resultats = useMemo(() => (q.trim() ? chercherGlossaire(q) : []), [q]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.retour}>← Retour</Text></TouchableOpacity>
        <Text style={styles.titre}>📖 Glossaire scientifique</Text>
      </View>
      <View style={styles.body}>
        <TextInput style={styles.input} placeholder="Chercher un terme (ex: limite, mole, mitose...)" placeholderTextColor="#94A3B8" value={q} onChangeText={setQ} />
        {!q.trim() && <Text style={styles.hint}>Tape un terme de cours pour voir sa définition officielle 🎓</Text>}
        <ScrollView showsVerticalScrollIndicator={false}>
          {resultats.map((t, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.terme}>{t.terme}</Text>
              <Text style={styles.matiere}>{t.matiere}</Text>
              <Text style={styles.def}>{t.definition}</Text>
            </View>
          ))}
          {q.trim() && resultats.length === 0 && <Text style={styles.hint}>Aucun terme trouvé. Essaie un autre mot 🔍</Text>}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, paddingTop: 55 },
  retour: { color: '#FBBF24', fontSize: 15, marginBottom: 10 },
  titre: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  body: { flex: 1, paddingHorizontal: 16 },
  input: { backgroundColor: '#1E293B', color: '#FFF', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 14 },
  hint: { color: '#94A3B8', textAlign: 'center', marginTop: 30, fontSize: 14 },
  card: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 12 },
  terme: { color: '#FBBF24', fontSize: 16, fontWeight: '700' },
  matiere: { color: '#64748B', fontSize: 12, marginVertical: 4 },
  def: { color: '#E2E8F0', fontSize: 14, lineHeight: 20 },
});