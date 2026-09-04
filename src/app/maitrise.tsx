import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, ScrollView } from 'react-native';
import { getStats, niveauMaitrise, tauxMaitrise, type LexStats } from '../services/statsSuivi';
import { getAllCoursCache } from '../services/cacheHorsLigne';

export default function Maitrise() {
  const router = useRouter();
  const [stats, setStats] = useState<LexStats | null>(null);
  const [titres, setTitres] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    (async () => {
      setStats(await getStats());
      const cours = await getAllCoursCache();
      const map: { [id: string]: string } = {};
      for (const c of cours) map[c.id] = c.titre;
      setTitres(map);
    })();
  }, []);

  if (!stats) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  const chapitres = Object.entries(stats.chapitres)
    .map(([id, c]) => ({ id, c }))
    .sort((a, b) => tauxMaitrise(a.c) - tauxMaitrise(b.c)); // les plus faibles en premier

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>PROGRESSION</Text>
        <Text style={styles.title}>📊 Ma maîtrise</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {chapitres.length === 0 ? (
          <Text style={styles.vide}>
            Fais d'abord quelques exercices : ton tableau de maîtrise se remplira automatiquement
            et t'indiquera exactement quoi réviser !
          </Text>
        ) : (
          <>
            <Text style={styles.conseil}>
              🔍 Classé du plus faible au plus fort — attaque le haut de la liste pour progresser vite !
            </Text>
            {chapitres.map(({ id, c }) => {
              const m = niveauMaitrise(c);
              const titre = titres[id] || id.replace(/_/g, ' ');
              return (
                <View key={id} style={styles.carte}>
                  <TouchableOpacity
                    style={styles.carteHaut}
                    onPress={() => {
                      // 57 — Diplôme de chapitre : récompense visuelle + partage
                      if (m.taux >= 70) {
                        Alert.alert(
                          '🎓 DIPLOME DE MAÎTRISE',
                          `Chapitre : ${titre}\nMaîtrise : ${m.taux}% (${c.reussis}/${c.total} réussis)\n\nFélicitations, ce chapitre est à toi ! Partage ta fierté 🏆`,
                          [
                            { text: 'Fermer', style: 'cancel' },
                            {
                              text: '📤 Partager',
                              onPress: () => Share.share({
                                message: `🎓 J'ai maîtrisé « ${titre} » à ${m.taux}% sur LEX ACADEMY ! 🏆 L'Excellence à portée de main.`,
                              }),
                            },
                          ]
                        );
                      }
                    }}
                  >
                    <Text style={styles.carteTitre} numberOfLines={1}>{m.taux >= 70 ? '🎓 ' : ''}{titre}</Text>
                    <Text style={[styles.carteTaux, { color: m.couleur }]}>{m.taux}%</Text>
                  </TouchableOpacity>
                  <View style={styles.barreFond}>
                    <View style={[styles.barre, { width: `${m.taux}%`, backgroundColor: m.couleur }]} />
                  </View>
                  <Text style={styles.carteDetail}>
                    {m.label} • {c.reussis}/{c.total} réussis
                    {c.parDifficulte[3] ? ` • ★★★ : ${Math.round((c.parDifficulte[3].reussis / c.parDifficulte[3].total) * 100)}%` : ''}
                    {m.taux >= 70 ? ' • appuie pour ton diplôme 🎓' : ''}
                  </Text>
                </View>
              );
            })}
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
  vide: { color: '#94A3B8', fontSize: 15, textAlign: 'center', marginTop: 50, lineHeight: 24 },
  conseil: { color: '#FBBF24', fontSize: 12, fontStyle: 'italic', marginBottom: 15 },
  carte: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  carteHaut: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },  carteTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', flex: 1, marginRight: 10, textTransform: 'capitalize' },
  carteTaux: { fontSize: 16, fontWeight: 'bold' },
  barreFond: { height: 8, backgroundColor: '#0F172A', borderRadius: 4, overflow: 'hidden' },
  barre: { height: 8, borderRadius: 4 },
  carteDetail: { color: '#64748B', fontSize: 12, marginTop: 8 },
});
