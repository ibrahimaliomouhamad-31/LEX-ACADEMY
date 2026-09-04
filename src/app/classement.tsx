import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebaseConfig'; // <-- La ligne magique qui va chercher le fichier central !

export default function Classement() {
  const router = useRouter();
  const [eleves, setEleves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassement = async () => {
      try {
        // On demande à Firebase de trier les élèves par XP (du plus grand au plus petit)
        const q = query(collection(db, "utilisateurs"), orderBy("xp", "desc"));
        const querySnapshot = await getDocs(q);
        
        const elevesData: any[] = [];
        querySnapshot.forEach((doc) => {
          elevesData.push(doc.data());
        });
        
        setEleves(elevesData);
      } catch (error) {
        console.error("Erreur classement : ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassement();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
        <Text style={styles.loadingText}>Calcul du classement du LEX...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={styles.backBtn}>‹ Retour au menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏆 CLASSEMENT DU LEX</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {eleves.map((eleve, index) => (
          <View key={index} style={styles.rankCard}>
            <Text style={styles.rankNumber}>{index + 1}</Text>
            <View style={styles.info}>
              <Text style={styles.rankAvatar}>{eleve.avatar || '🎓'}</Text>
              <Text style={styles.name}>{eleve.nom}</Text>
              <Text style={styles.class}>{eleve.classe}</Text>
            </View>
            <Text style={styles.xp}>{eleve.xp} XP</Text>
          </View>
        ))}
        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingText: { color: '#FBBF24', marginTop: 15, fontSize: 16, textAlign: 'center' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  scrollView: { paddingHorizontal: 20 },
  rankCard: { 
    flexDirection: 'row', 
    backgroundColor: '#1E293B', 
    borderRadius: 12, 
    padding: 20, 
    marginBottom: 15, 
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#FBBF24'
  },
  rankNumber: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold', marginRight: 20, width: 30 },
  info: { flex: 1 },
  rankAvatar: { fontSize: 30, marginBottom: 5 },
  name: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold' },
  class: { color: '#94A3B8', fontSize: 14 },
  xp: { color: '#34D399', fontSize: 16, fontWeight: 'bold' }
});