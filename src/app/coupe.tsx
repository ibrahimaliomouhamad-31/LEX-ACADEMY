import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

function lundiDeLaSemaine(): string {
  const d = new Date();
  const jour = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - jour);
  return d.toISOString().slice(0, 10);
}

interface StatsClasse {
  classe: string;
  points: number;
  participants: number;
  moyenne: number;
}

export default function Coupe() {
  const router = useRouter();
  const [classes, setClasses] = useState<StatsClasse[]>([]);
  const [chargement, setChargement] = useState(true);
  const [horsLigne, setHorsLigne] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Tous les défis rendus depuis lundi (limité pour rester léger)
        const q = query(collection(db, 'defi_jour'), where('date', '>=', lundiDeLaSemaine()), limit(800));
        const snap = await getDocs(q);
        const agg: { [classe: string]: StatsClasse } = {};
        snap.forEach((doc) => {
          const d = doc.data() as { classe?: string; score?: number };
          const c = d.classe || '?';
          if (!agg[c]) agg[c] = { classe: c, points: 0, participants: 0, moyenne: 0 };
          agg[c].points += d.score || 0;
          agg[c].participants += 1;
        });
        const liste = Object.values(agg).map((c) => ({ ...c, moyenne: c.participants > 0 ? Math.round((c.points / c.participants) * 10) / 10 : 0 }));
        liste.sort((a, b) => b.moyenne - a.moyenne || b.participants - a.participants);
        setClasses(liste);
      } catch {
        setHorsLigne(true);
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const podium = ['🥇', '🥈', '🥉'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>LA CLASSE CHAMPIONNE DE LA SEMAINE</Text>
        <Text style={styles.title}>🏆 Coupe inter-classes</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.explication}>
          Chaque défi du jour réussi rapporte des points à TA classe. La classe avec la meilleure
          moyenne de la semaine remporte la coupe ! Faites participer un maximum de camarades. 💪
        </Text>

        {chargement ? (
          <ActivityIndicator size="large" color="#FBBF24" style={{ marginTop: 40 }} />
        ) : horsLigne ? (
          <Text style={styles.vide}>📴 Hors-ligne : connecte-toi au wifi du LEX pour voir la coupe !</Text>
        ) : classes.length === 0 ? (
          <Text style={styles.vide}>Aucun défi joué cette semaine encore. Sois le premier à faire gagner ta classe ! 📰 Défi du jour</Text>
        ) : (
          classes.map((c, i) => (
            <View key={c.classe} style={[styles.carte, i === 0 && styles.carteChampion]}>
              <Text style={styles.rang}>{podium[i] || `${i + 1}.`}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.classeNom}>{c.classe}</Text>
                <Text style={styles.classeDetail}>{c.participants} joueur(s) · {c.points} points au total</Text>
              </View>
              <Text style={styles.moyenne}>{c.moyenne}</Text>
            </View>
          ))
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
  explication: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  vide: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  carte: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 18, marginBottom: 10 },
  carteChampion: { borderWidth: 2, borderColor: '#FBBF24', backgroundColor: '#221a06' },
  rang: { fontSize: 26, marginRight: 15, width: 40 },
  classeNom: { color: '#F8FAFC', fontSize: 17, fontWeight: 'bold' },
  classeDetail: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  moyenne: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold' },
});
