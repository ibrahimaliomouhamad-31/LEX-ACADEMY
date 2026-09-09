import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebaseConfig';
import { liguePourXp } from '../services/motivation';
import { lireXpTotal } from '../services/xpLocal';

export default function Classement() {
  const router = useRouter();
  const [eleves, setEleves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monXp, setMonXp] = useState(0);
  const [pseudo, setPseudo] = useState('');

  useEffect(() => {
    // 📍 Repli local : XP + pseudo de l'élève courant (visibles hors-ligne)
    lireXpTotal().then(setMonXp).catch(() => {});
    AsyncStorage.getItem('@lex/pseudo').then((p) => setPseudo(p || 'Toi')).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchClassement = async () => {
      try {
        // 🔄 PERF + 🔒 SÉCURITÉ : lecture depuis `classement_public`
        // (agrégée par Cloud Function : nom, classe, xp, avatar UNIQUEMENT —
        // jamais email/hash/code de transfert). Repli sur `utilisateurs`
        // seulement si la Function n'est pas encore déployée.
        try {
          const q = query(collection(db, "classement_public"), orderBy("xp", "desc"), limit(50));
          const querySnapshot = await getDocs(q);
          const elevesData: any[] = [];
          querySnapshot.forEach((doc) => {
            elevesData.push(doc.data());
          });
          if (elevesData.length > 0) {
            setEleves(elevesData);
            return;
          }
        } catch {
          // collection pas encore alimentée → repli ci-dessous
        }

        // Repli temporaire : lecture directe de la nouvelle collection.
        const q = query(collection(db, "utilisateurs"), orderBy("xp", "desc"), limit(50));
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour au menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏆 CLASSEMENT DU LEX</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 📍 Repli 100% hors-ligne : ta carte locale (XP + ligue) quand le
            classement du LEX n'est pas joignable (cas principal au Niger). */}
        {eleves.length === 0 && (
          <View style={[styles.rankCard, { borderLeftColor: '#10B981' }]}>
            <Text style={styles.rankNumber}>—</Text>
            <View style={styles.info}>
              <Text style={styles.rankAvatar}>🎓</Text>
              <Text style={styles.name}>{pseudo}</Text>
              <Text style={styles.class}>Classement du LEX indisponible hors-ligne 📶</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.xp}>{monXp} XP</Text>
              <Text style={styles.ligue}>{liguePourXp(monXp).emoji} {liguePourXp(monXp).nom}</Text>
            </View>
          </View>
        )}
        {eleves.map((eleve, index) => (
          <View key={index} style={styles.rankCard}>
            <Text style={styles.rankNumber}>{index + 1}</Text>
            <View style={styles.info}>
              <Text style={styles.rankAvatar}>{eleve.avatar || '🎓'}</Text>
              <Text style={styles.name}>{eleve.nom}</Text>
              <Text style={styles.class}>{eleve.classe}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {/* 🏅 Ligue affichée (Bronze → Légende) */}
              <Text style={styles.ligue}>{liguePourXp(Number(eleve.xp) || 0).emoji} {liguePourXp(Number(eleve.xp) || 0).nom}</Text>
              <Text style={styles.xp}>{eleve.xp} XP</Text>
              {eleve.xp_semaine ? (
                <Text style={styles.xpSemaine}>📅 {eleve.xp_semaine} cette semaine</Text>
              ) : null}
            </View>
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
  xp: { color: '#34D399', fontSize: 16, fontWeight: 'bold' },
  ligue: { color: '#8B5CF6', fontSize: 11, fontWeight: 'bold' },
  xpSemaine: { color: '#64748B', fontSize: 10, marginTop: 2 },
});