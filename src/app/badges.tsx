import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebaseConfig';
import { chargerContexte, evaluerBadges, liguePourXp, quetesDeLaSemaine, type ContexteBadges, type Quete } from '../services/motivation';

export default function Badges() {
  const router = useRouter();

  const [ctx, setCtx] = useState<ContexteBadges | null>(null);
  const [quetes, setQuetes] = useState<Quete[]>([]);
  const [xp, setXp] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setQuetes(quetesDeLaSemaine());
      setCtx(await chargerContexte());
      // XP depuis Firestore si connecté (sinon masqué)
      try {
        const id = await AsyncStorage.getItem('lex_user_id');
        if (id) {
          const snap = await getDoc(doc(db, 'utilisateurs', id));
          if (snap.exists()) setXp(snap.data().xp || 0);
        }
      } catch {
        // hors-ligne : pas de XP affiché
      }
    })();
  }, []);

  if (!ctx) return <View style={styles.container} />;

  const badges = evaluerBadges(ctx);
  const debloques = badges.filter((b) => b.debloque).length;
  const ligue = xp !== null ? liguePourXp(xp) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>MOTIVATION</Text>
        <Text style={styles.title}>🏅 Badges & Quêtes</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
        {/* Ligue */}
        {ligue && (
          <View style={styles.carteLigue}>
            <Text style={styles.ligueEmoji}>{ligue.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ligueNom}>Ligue {ligue.nom}</Text>
              <Text style={styles.ligueDetail}>
                {ligue.prochainPalier !== null
                  ? `${xp} XP — prochain palier : ${ligue.prochainPalier} XP`
                  : `${xp} XP — sommet absolu atteint !`}
              </Text>
            </View>
          </View>
        )}

        {/* Quêtes de la semaine */}
        <Text style={styles.sectionTitre}>🎯 Quêtes de la semaine</Text>
        {quetes.map((q) => {
          const progres = Math.min(q.mesurer(ctx), q.objectif);
          const finie = progres >= q.objectif;
          return (
            <View key={q.id} style={styles.carteQuete}>
              <Text style={styles.queteEmoji}>{finie ? '✅' : q.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.queteTitre}>{q.titre}</Text>
                <View style={styles.barreFond}>
                  <View style={[styles.barre, { width: `${Math.round((progres / q.objectif) * 100)}%` }]} />
                </View>
                <Text style={styles.queteProgres}>{progres} / {q.objectif}</Text>
              </View>
            </View>
          );
        })}

        {/* Badges */}
        <Text style={styles.sectionTitre}>🎖️ Badges ({debloques}/{badges.length} débloqués)</Text>
        <FlatList
          data={badges}
          numColumns={2}
          scrollEnabled={false}
          keyExtractor={(item) => item.badge.id}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
          renderItem={({ item }) => (
            <View style={[styles.carteBadge, item.debloque ? styles.badgeOk : styles.badgeKo]}>
              <Text style={styles.badgeEmoji}>{item.badge.emoji}</Text>
              <Text style={styles.badgeTitre}>{item.badge.titre}</Text>
              <Text style={styles.badgeDesc}>{item.badge.description}</Text>
              <Text style={styles.badgeProgres}>{item.progres}/{item.badge.objectif}</Text>
            </View>
          )}
        />
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

  carteLigue: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FBBF24' },
  ligueEmoji: { fontSize: 40, marginRight: 15 },
  ligueNom: { color: '#FBBF24', fontSize: 18, fontWeight: 'bold' },
  ligueDetail: { color: '#94A3B8', fontSize: 13, marginTop: 4 },

  sectionTitre: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  carteQuete: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 10 },
  queteEmoji: { fontSize: 24, marginRight: 15 },
  queteTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  barreFond: { height: 6, backgroundColor: '#0F172A', borderRadius: 3, overflow: 'hidden' },
  barre: { height: 6, backgroundColor: '#FBBF24', borderRadius: 3 },
  queteProgres: { color: '#64748B', fontSize: 11, marginTop: 4 },

  carteBadge: { width: '48.5%', backgroundColor: '#1E293B', borderRadius: 12, padding: 15, alignItems: 'center' },
  badgeOk: { borderWidth: 1.5, borderColor: '#10B981' },
  badgeKo: { opacity: 0.45 },
  badgeEmoji: { fontSize: 34, marginBottom: 8 },
  badgeTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  badgeDesc: { color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 15 },
  badgeProgres: { color: '#FBBF24', fontSize: 12, fontWeight: 'bold', marginTop: 6 },
});
