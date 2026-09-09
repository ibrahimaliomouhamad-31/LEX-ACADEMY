import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Matieres() {
  const router = useRouter();
  const { classe } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>{classe || "CLASSE"}</Text>
        <Text style={styles.title}>Choisis ta matière</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        <TouchableOpacity 
          style={styles.cardMath} 
          onPress={() => router.push({ pathname: '/chapitres', params: { matiere: 'Mathématiques', classe: classe as string } })}
        >
          <Text style={styles.emoji}>📐</Text>
          <View style={styles.info}>
            <Text style={styles.cardTitle}>Mathématiques</Text>
            <Text style={styles.cardSubtitle}>Algèbre, Géométrie, Analyse...</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cardPC} 
          onPress={() => router.push({ pathname: '/chapitres', params: { matiere: 'Physique-Chimie', classe: classe as string } })}
        >
          <Text style={styles.emoji}>⚛️</Text>
          <View style={styles.info}>
            <Text style={styles.cardTitle}>Physique-Chimie</Text>
            <Text style={styles.cardSubtitle}>Mécanique, Électricité, Chimie...</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cardSVT} 
          onPress={() => router.push({ pathname: '/chapitres', params: { matiere: 'SVT', classe: classe as string } })}
        >
          <Text style={styles.emoji}>🧬</Text>
          <View style={styles.info}>
            <Text style={styles.cardTitle}>Sciences de la Vie</Text>
            <Text style={styles.cardSubtitle}>Génétique, Immunologie, Géologie...</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <View style={{height: 30}} />
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
  scrollView: { paddingHorizontal: 20 },
  
  cardMath: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 15, padding: 20, marginBottom: 15, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  cardPC: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 15, padding: 20, marginBottom: 15, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#8B5CF6' },
  cardSVT: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 15, padding: 20, marginBottom: 15, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#10B981' },
  
  emoji: { fontSize: 35, marginRight: 20 },
  info: { flex: 1 },
  cardTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold' },
  cardSubtitle: { color: '#94A3B8', fontSize: 13, marginTop: 3 },
  arrow: { color: '#64748B', fontSize: 26 }
});