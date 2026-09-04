import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { resoudrePasAPas, type EtapeSolveur } from '../services/solveur';

export default function Solveur() {
  const router = useRouter();
  const [equation, setEquation] = useState('');
  const [etapes, setEtapes] = useState<EtapeSolveur[] | null>(null);
  const [reponse, setReponse] = useState('');
  const [erreur, setErreur] = useState('');

  const resoudre = () => {
    const r = resoudrePasAPas(equation);
    if ('erreur' in r) {
      setErreur(r.erreur);
      setEtapes(null);
      setReponse('');
    } else {
      setErreur('');
      setEtapes(r.etapes);
      setReponse(r.reponse);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>COMPRENDRE LA MÉTHODE, PAS JUSTE LE RÉSULTAT</Text>
        <Text style={styles.title}>🧮 Solveur pas-à-pas</Text>
      </View>

      <View style={styles.px}>
        <TextInput
          style={styles.input}
          placeholder="Ex : 2x+3=7  ou  x^2-5x+6=0"
          placeholderTextColor="#64748B"
          value={equation}
          onChangeText={setEquation}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.bouton} onPress={resoudre}>
          <Text style={styles.boutonText}>Résoudre étape par étape</Text>
        </TouchableOpacity>
        {erreur !== '' && <Text style={styles.erreur}>{erreur}</Text>}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {etapes && (
          <>
            <Text style={styles.reponseFinale}>✅ Réponse : {reponse}</Text>
            {etapes.map((e, i) => (
              <View key={i} style={[styles.etape, i === etapes.length - 1 && styles.etapeFinale]}>
                <Text style={styles.etapeTexte}>{e.texte}</Text>
              </View>
            ))}
          </>
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
  px: { paddingHorizontal: 20 },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 15, color: '#F8FAFC', fontSize: 16, marginBottom: 10 },
  bouton: { backgroundColor: '#10B981', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  boutonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  erreur: { color: '#EF4444', fontSize: 13, marginBottom: 10, lineHeight: 19 },
  reponseFinale: { color: '#FBBF24', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  etape: { backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  etapeFinale: { borderLeftColor: '#10B981' },
  etapeTexte: { color: '#F8FAFC', fontSize: 14, lineHeight: 21 },
});
