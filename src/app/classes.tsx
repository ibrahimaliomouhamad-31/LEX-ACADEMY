import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rapporterErreur } from '../utils/logger';

export default function Classes() {
  const router = useRouter();
  const [dernier, setDernier] = useState<{ id: string; titre: string } | null>(null);

  useEffect(() => {
    // 📍 "Reprendre où j'en étais" : dernier chapitre ouvert (mémorisé par cours.tsx)
    AsyncStorage.getItem('lex_dernier_chapitre')
      .then((v) => {
        if (v) {
          try {
            setDernier(JSON.parse(v));
          } catch (erreurSilencieuse) {
      rapporterErreur('[audit] Erreur silencieuse', erreurSilencieuse);
    }
        }
      })
      .catch((e) => rapporterErreur('app/classes.tsx', e));
  }, []);

  const classes = [
    { nom: "Seconde C", couleur: "#3B82F6" },
    { nom: "Première C", couleur: "#10B981" },
    { nom: "Première D", couleur: "#8B5CF6" },
    { nom: "Terminale C", couleur: "#F59E0B" },
    { nom: "Terminale D", couleur: "#EF4444" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour au menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choisis ta classe</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {dernier && (
          <TouchableOpacity
            style={styles.carteReprendre}
            onPress={() => router.push({ pathname: '/cours', params: { id: dernier.id } } as never)}
          >
            <Text style={styles.reprendreTitre} numberOfLines={1}>▶️ Reprendre : {dernier.titre}</Text>
            <Text style={styles.reprendreHint}>Continuer ta lecture là où tu t'es arrêté ›</Text>
          </TouchableOpacity>
        )}
        {classes.map((cls, index) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.card, { borderLeftColor: cls.couleur }]} 
            onPress={() => router.push({ pathname: '/matieres', params: { classe: cls.nom } })}
          >
            <Text style={styles.emoji}>🎓</Text>
            <Text style={styles.className}>{cls.nom}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  scrollView: { paddingHorizontal: 20 },
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#1E293B', 
    borderRadius: 15, 
    padding: 20, 
    marginBottom: 15, 
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  emoji: { fontSize: 30, marginRight: 20 },
  carteReprendre: { backgroundColor: '#14241B', borderRadius: 14, padding: 16, marginBottom: 15, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  reprendreTitre: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  reprendreHint: { color: '#6EE7B7', fontSize: 12, marginTop: 4 },
  className: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold', flex: 1 },
  arrow: { color: '#64748B', fontSize: 26 }
});