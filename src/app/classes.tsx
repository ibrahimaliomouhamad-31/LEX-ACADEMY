import { useRouter } from 'expo-router';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Classes() {
  const router = useRouter();

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
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={styles.backBtn}>‹ Retour au menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choisis ta classe</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
  className: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold', flex: 1 },
  arrow: { color: '#64748B', fontSize: 26 }
});