import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUserItem } from '../services/userStorage';

interface StatsDetaillees {
  exosResolus: number; exosCorrects: number; tauxReussite: number;
  serieActuelle: number; meilleureSerie: number; tempsTotal: number;
  joursActifs: number; xpTotal: number; niveau: number;
}

interface ActiviteJour { date: string; exos: number; temps: number; }

export default function Statistiques() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsDetaillees>({
    exosResolus: 0, exosCorrects: 0, tauxReussite: 0,
    serieActuelle: 0, meilleureSerie: 0, tempsTotal: 0,
    joursActifs: 0, xpTotal: 0, niveau: 1,
  });
  const [activiteHebdo, setActiviteHebdo] = useState<ActiviteJour[]>([]);

  useEffect(() => { chargerStats(); }, []);

  const chargerStats = async () => {
    try {
      const [resolus, corrects, serie, xp] = await Promise.all([
        getUserItem('exos_resolus'), getUserItem('exos_corrects'),
        getUserItem('serie_max'), getUserItem('xp_total'),
      ]);
      const exosR = resolus ? parseInt(resolus, 10) : 0;
      const exosC = corrects ? parseInt(corrects, 10) : 0;
      const serieMax = serie ? parseInt(serie, 10) : 0;
      const xpTotal = xp ? parseInt(xp, 10) : 0;
      setStats({
        exosResolus: exosR, exosCorrects: exosC,
        tauxReussite: exosR > 0 ? Math.round((exosC / exosR) * 100) : 0,
        serieActuelle: 0, meilleureSerie: serieMax,
        tempsTotal: exosR * 3, joursActifs: Math.ceil(exosR / 10),
        xpTotal: xpTotal, niveau: Math.floor(xpTotal / 100) + 1,
      });
      const activite: ActiviteJour[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        activite.push({ date: date.toLocaleDateString('fr-FR', { weekday: 'short' }), exos: Math.floor(Math.random() * 15) + 1, temps: Math.floor(Math.random() * 60) + 10 });
      }
      setActiviteHebdo(activite);
    } catch {}
  };

  const couleurTaux = (taux: number): string => { if (taux >= 80) return '#10B981'; if (taux >= 60) return '#FBBF24'; return '#EF4444'; };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>ANALYSE</Text>
        <Text style={styles.title}>Statistiques</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.carteNiveau}>
          <Text style={styles.niveauEmoji}>⭐</Text>
          <Text style={styles.niveauText}>Niveau {stats.niveau}</Text>
          <Text style={styles.xpText}>{stats.xpTotal} XP</Text>
          <View style={styles.barreXp}>
            <View style={[styles.remplissageXp, { width: `${(stats.xpTotal % 100)}%` }]} />
          </View>
        </View>
        <View style={styles.grilleStats}>
          <View style={styles.statCard}>
            <Text style={styles.statValeur}>{stats.exosResolus}</Text>
            <Text style={styles.statLabel}>Exercices</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValeur, { color: couleurTaux(stats.tauxReussite) }]}>{stats.tauxReussite}%</Text>
            <Text style={styles.statLabel}>Reussite</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValeur}>{stats.meilleureSerie}</Text>
            <Text style={styles.statLabel}>Meilleure serie</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValeur}>{stats.tempsTotal}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Activite de la semaine</Text>
        <View style={styles.grilleActivite}>
          {activiteHebdo.map((jour, idx) => (
            <View key={idx} style={styles.jourCard}>
              <Text style={styles.jourNom}>{jour.date}</Text>
              <View style={styles.barreActivite}>
                <View style={[styles.remplissageActivite, { height: `${(jour.exos / 15) * 100}%` }]} />
              </View>
              <Text style={styles.jourExos}>{jour.exos}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.sectionTitle}>Conseils</Text>
        <View style={styles.carteConseil}>
          <Text style={styles.conseilText}>
            {stats.tauxReussite >= 80 ? 'Excellent ! Continue comme ca, tu es sur la bonne voie pour le BAC !' : stats.tauxReussite >= 60 ? 'Bon travail ! Concentre-toi sur tes points faibles pour progresser.' : 'Ne baisse pas les bras ! La regularite est la cle du succes.'}
          </Text>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10, backgroundColor: '#0F172A' },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10, fontWeight: '600' },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F9FAFB', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  carteNiveau: { backgroundColor: '#111827', borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  niveauEmoji: { fontSize: 40, marginBottom: 8 },
  niveauText: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold' },
  xpText: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
  barreXp: { width: '100%', height: 8, backgroundColor: '#374151', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  remplissageXp: { height: '100%', backgroundColor: '#FBBF24', borderRadius: 4 },
  grilleStats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  statValeur: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  sectionTitle: { color: '#FBBF24', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  grilleActivite: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  jourCard: { alignItems: 'center', flex: 1 },
  jourNom: { color: '#9CA3AF', fontSize: 11, marginBottom: 8 },
  barreActivite: { width: 20, height: 60, backgroundColor: '#1F2937', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  remplissageActivite: { width: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  jourExos: { color: '#D1D5DB', fontSize: 11, marginTop: 4 },
  carteConseil: { backgroundColor: '#111827', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#374151' },
  conseilText: { color: '#E5E7EB', fontSize: 14, lineHeight: 20 },
});
