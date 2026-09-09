import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATALOGUE_COUPONS, getCouponsObtenus, echangerCoupon } from '../services/recompenses';

export default function Recompenses() {
  const router = useRouter();
  const [jetons, setJetons] = useState(0);
  const [obtenus, setObtenus] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const j = await AsyncStorage.getItem('@lex/jetons');
      setJetons(j ? parseInt(j, 10) : 0);
      setObtenus(await getCouponsObtenus());
    })();
  }, []);

  const echanger = async (id: string, cout: number) => {
    const ok = await echangerCoupon(id, jetons);
    if (!ok) {
      Alert.alert('Impossible', jetons < cout ? `Il te faut ${cout} jetons (tu en as ${jetons}) 🪙` : 'Déjà obtenu !');
      return;
    }
    await AsyncStorage.setItem('@lex/jetons', String(jetons - cout));
    setJetons(jetons - cout);
    setObtenus(await getCouponsObtenus());
    Alert.alert('🎉 Coupon débloqué !', 'Profite de ta récompense, tu l\'as gagnée !');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.retour}>← Retour</Text></TouchableOpacity>
        <Text style={styles.titre}>🎁 Mes récompenses</Text>
        <Text style={styles.jetons}>🪙 {jetons} jetons</Text>
      </View>
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>Échange tes jetons gagnés en révisant contre des pauses bien-être. Ton cerveau a besoin de repos pour mémoriser 💙</Text>
        {CATALOGUE_COUPONS.map((c) => {
          const obtenu = obtenus.includes(c.id);
          const possible = jetons >= c.coutJetons;
          return (
            <View key={c.id} style={styles.card}>
              <Text style={styles.emoji}>{c.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.titreCard}>{c.titre}</Text>
                <Text style={styles.desc}>{c.description}</Text>
                <Text style={[styles.cout, obtenu && { color: '#34D399' }]}>{obtenu ? '✅ Obtenu' : `🪙 ${c.coutJetons} jetons`}</Text>
              </View>
              {!obtenu && (
                <TouchableOpacity style={[styles.btn, !possible && { opacity: 0.4 }]} onPress={() => echanger(c.id, c.coutJetons)} disabled={!possible}>
                  <Text style={styles.btnTxt}>Échanger</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, paddingTop: 55 },
  retour: { color: '#FBBF24', fontSize: 15, marginBottom: 10 },
  titre: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  jetons: { color: '#FBBF24', fontSize: 18, fontWeight: '800', marginTop: 6 },
  body: { flex: 1, padding: 16 },
  hint: { color: '#94A3B8', textAlign: 'center', marginBottom: 16, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  emoji: { fontSize: 30, marginRight: 14 },
  titreCard: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  desc: { color: '#94A3B8', fontSize: 13, marginVertical: 4 },
  cout: { color: '#FBBF24', fontSize: 13, fontWeight: '700' },
  btn: { backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnTxt: { color: '#0F172A', fontWeight: '800', fontSize: 13 },
});