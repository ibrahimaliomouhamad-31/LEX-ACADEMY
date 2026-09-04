import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebaseConfig';
import { getAllCoursCache, saveCours } from '../services/cacheHorsLigne';

export default function Chapitres() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const matiere = (params.matiere as string) || "Mathématiques";
  const classe = (params.classe as string) || "Première C";
  
  const [chapitres, setChapitres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapitres = async () => {
      if (!matiere || !classe) return;
      try {
        // CACHE D'ABORD : sommaire lisible hors-ligne
        const caches = await getAllCoursCache();
        const horsLigne = caches.filter((c) => c.matiere === matiere && c.classe === classe);
        if (horsLigne.length > 0) {
          setChapitres(horsLigne.map((c) => ({ ...c, id: c.id })) as never);
          setLoading(false);
        }
        // FIREBASE ensuite : mise à jour + sauvegarde complète des cours
        try {
          const q = query(collection(db, "cours"), where("matiere", "==", matiere), where("classe", "==", classe));
          const querySnapshot = await getDocs(q);
          const chapitresData: any[] = [];
          for (const d of querySnapshot.docs) {
            chapitresData.push({ id: d.id, ...d.data() });
            await saveCours({ id: d.id, ...(d.data() as object) } as never); // chaque cours consulté devient hors-ligne
          }
          if (chapitresData.length > 0) setChapitres(chapitresData);
        } catch {
          // hors-ligne : le cache suffit
        }
      } catch (error) {
        console.error("Erreur : ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChapitres();
  }, [matiere, classe]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
        <Text style={styles.loadingText}>Chargement du sommaire...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/matieres', params: { classe: classe } })}>
          <Text style={styles.backBtn}>‹ Retour aux matières</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>{classe} - {matiere}</Text>
        <Text style={styles.title}>Choisis un chapitre</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {chapitres.length === 0 ? (
          <Text style={styles.emptyText}>Aucun chapitre disponible pour cette matière/classe pour le moment.</Text>
        ) : (
          chapitres.map((chapitre, index) => (
            <TouchableOpacity 
              key={chapitre.id} 
              style={styles.chapterCard} 
              onPress={() => router.push({ pathname: '/cours', params: { id: chapitre.id } })}
            >
              <View style={styles.chapterNumber}>
                <Text style={styles.chapterNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.chapterTitle}>{chapitre.titre}</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}
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
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  scrollView: { paddingHorizontal: 20 },
  emptyText: { color: '#94A3B8', fontSize: 16, textAlign: 'center', marginTop: 50 },
  
  chapterCard: { 
    flexDirection: 'row', 
    backgroundColor: '#1E293B', 
    borderRadius: 12, 
    padding: 20, 
    marginBottom: 15, 
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6'
  },
  chapterNumber: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#0F172A', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#3B82F6'
  },
  chapterNumberText: { color: '#3B82F6', fontSize: 18, fontWeight: 'bold' },
  chapterTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', flex: 1 },
  arrow: { color: '#94A3B8', fontSize: 24, marginLeft: 10 }
});