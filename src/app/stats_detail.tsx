import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { activite7Jours, getStats, type LexStats } from '../services/statsSuivi';
import { parseObjetJSON, tableauDeChaines } from '../utils/correctifsAudit';

export default function StatsDetail() {
  const router = useRouter();
  const [stats, setStats] = useState<LexStats | null>(null);
  const [resolus, setResolus] = useState(0);

  useEffect(() => {
    (async () => {
      setStats(await getStats());
      try {
        const brut = await AsyncStorage.getItem('lex_exos_resolus');
        if (brut) setResolus(tableauDeChaines(brut).length);
      } catch {
        // ignore
      }
    })();
  }, []);

  if (!stats) return <View style={styles.container} />;

  const tauxGlobal = stats.totalTentes > 0 ? Math.round((stats.totalReussis / stats.totalTentes) * 100) : 0;
  const activite = activite7Jours(stats);
  const maxJour = Math.max(...activite.map((a) => a.nb), 1);
  const nbChapitres = Object.keys(stats.chapitres).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>PROGRESSION</Text>
        <Text style={styles.title}>📈 Mes statistiques</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Cartes chiffres clés */}
        <View style={styles.rowStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValeur}>{stats.totalTentes}</Text>
            <Text style={styles.statLabel}>Tentatives</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValeur}>{tauxGlobal}%</Text>
            <Text style={styles.statLabel}>Réussite</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValeur}>{resolus}</Text>
            <Text style={styles.statLabel}>Exos résolus</Text>
          </View>
        </View>

        {/* Activité 7 jours */}
        <Text style={styles.sectionTitre}>📅 Activité des 7 derniers jours</Text>
        <View style={styles.graphique}>
          {activite.map((a, i) => (
            <View key={i} style={styles.colonne}>
              <View style={styles.barreFond}>
                <View style={[styles.barre, { height: `${Math.max((a.nb / maxJour) * 100, a.nb > 0 ? 8 : 0)}%` }]} />
              </View>
              <Text style={styles.jourLabel}>{a.jour}</Text>
              <Text style={styles.jourNb}>{a.nb}</Text>
            </View>
          ))}
        </View>

        {/* Répartition par difficulté */}
        <Text style={styles.sectionTitre}>🎯 Par difficulté</Text>
        {[1, 2, 3].map((d) => {
          let total = 0;
          let reussis = 0;
          for (const c of Object.values(stats.chapitres)) {
            const e = c.parDifficulte[d];
            if (e) {
              total += e.total;
              reussis += e.reussis;
            }
          }
          const taux = total > 0 ? Math.round((reussis / total) * 100) : 0;
          return (
            <View key={d} style={styles.ligneDiff}>
              <Text style={styles.diffLabel}>{'★'.repeat(d)}{'☆'.repeat(3 - d)}</Text>
              <View style={styles.barreFondH}>
                <View style={[styles.barreH, { width: `${taux}%` }]} />
              </View>
              <Text style={styles.diffTaux}>{total > 0 ? `${taux}% (${reussis}/${total})` : '—'}</Text>
            </View>
          );
        })}

        <Text style={styles.note}>
          {nbChapitres} chapitre(s) travaillé(s). Toutes ces données restent sur ton téléphone et alimentent
          tes révisions espacées 🧠 et ton tableau de maîtrise 📊.
        </Text>
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

  rowStats: { flexDirection: 'row', marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginHorizontal: 4, alignItems: 'center' },
  statValeur: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#94A3B8', fontSize: 11, marginTop: 4 },

  sectionTitre: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },

  graphique: { flexDirection: 'row', height: 150, backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 20, alignItems: 'flex-end' },
  colonne: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barreFond: { flex: 1, width: '70%', justifyContent: 'flex-end', backgroundColor: '#0F172A', borderRadius: 4, overflow: 'hidden' },
  barre: { backgroundColor: '#FBBF24', borderRadius: 4 },
  jourLabel: { color: '#94A3B8', fontSize: 10, marginTop: 6 },
  jourNb: { color: '#F8FAFC', fontSize: 11, fontWeight: 'bold' },

  ligneDiff: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  diffLabel: { color: '#FBBF24', fontSize: 13, width: 55 },
  barreFondH: { flex: 1, height: 8, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  barreH: { height: 8, backgroundColor: '#10B981', borderRadius: 4 },
  diffTaux: { color: '#94A3B8', fontSize: 11, width: 100, textAlign: 'right' },

  note: { color: '#64748B', fontSize: 12, fontStyle: 'italic', lineHeight: 18, marginTop: 15 },
});
