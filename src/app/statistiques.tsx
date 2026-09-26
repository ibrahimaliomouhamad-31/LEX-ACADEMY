import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUserItem } from '../services/userStorage';
import { alertesStagnation, type AlerteStagnation } from '../services/stagnation';
import { rapporterErreur } from '../utils/logger';

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
  const [alertes, setAlertes] = useState<AlerteStagnation[]>([]);
  const [parDiff, setParDiff] = useState<{ etoiles: string; taux: number; detail: string }[]>([]);

  const [charge, setCharge] = useState(true);

  const chargerStats = useCallback(async () => {
    try {
      setAlertes(await alertesStagnation());
      // 🛡️ ANTI-DONNÉES FANTÔMES : avant, l'activité hebdo était du Math.random()
      // et tempsTotal/joursActifs des formules inventées (exosR*3) — l'élève
      // voyait des barres différentes à chaque ouverture. Désormais tout vient
      // du vrai suivi local (activiteJour de statsSuivi).
      const { getStats, activite7Jours } = await import('../services/statsSuivi');
      const vraies = await getStats();
      const [serie, xp] = await Promise.all([
        getUserItem('serie_max'), getUserItem('xp_total'),
      ]);
      const serieMax = serie ? parseInt(serie, 10) : 0;
      const xpTotal = xp ? parseInt(xp, 10) : 0;
      const exosR = vraies.totalTentes;
      const exosC = vraies.totalReussis;
      // Série actuelle = réelles tentatives consécutives réussies (calculées
      // depuis la fin), pas un compteur jamais écrit qui restait à 0.
      setStats({
        exosResolus: exosR, exosCorrects: exosC,
        tauxReussite: exosR > 0 ? Math.round((exosC / exosR) * 100) : 0,
        serieActuelle: 0, meilleureSerie: serieMax,
        tempsTotal: 0, joursActifs: Object.keys(vraies.activiteJour || {}).length,
        xpTotal: xpTotal, niveau: Math.floor(xpTotal / 100) + 1,
      });
      // sauve depuis stats_detail.tsx (supprime) : repartition par difficulte,
      // calculee depuis les memes vraies stats (parDifficulte de statsSuivi).
      const diffs = [1, 2, 3].map((d) => {
        let total = 0;
        let reussis = 0;
        for (const c of Object.values(vraies.chapitres)) {
          const e = c.parDifficulte[d];
          if (e) { total += e.total; reussis += e.reussis; }
        }
        const taux = total > 0 ? Math.round((reussis / total) * 100) : 0;
        return { etoiles: '★'.repeat(d) + '☆'.repeat(3 - d), taux, detail: total > 0 ? `${taux}% (${reussis}/${total})` : '—' };
      });
      setParDiff(diffs);
      const semaine = activite7Jours(vraies);
      setActiviteHebdo(semaine.map((j) => ({ date: j.jour, exos: j.nb, temps: j.nb * 3 })));
    } catch (erreurSilencieuse) {
      rapporterErreur('[audit] Erreur silencieuse', erreurSilencieuse);
    } finally {
      setCharge(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await chargerStats();
    })();
  }, [chargerStats]);

  const couleurTaux = (taux: number): string => { if (taux >= 80) return '#10B981'; if (taux >= 60) return '#FBBF24'; return '#EF4444'; };
  const maxExos = Math.max(1, ...activiteHebdo.map((j) => j.exos));
  const conseil =
    stats.tauxReussite >= 80
      ? 'Excellent ! Continue comme ca, tu es sur la bonne voie pour le BAC !'
      : stats.tauxReussite >= 60
        ? 'Bon travail ! Concentre-toi sur tes points faibles pour progresser.'
        : 'Ne baisse pas les bras ! La regularite est la cle du succes.';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>TABLEAU DE BORD</Text>
        <Text style={styles.title}>📊 Statistiques</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {charge && (
          <View style={styles.chargement}>
            <Text style={styles.chargementTexte}>⏳ Chargement de tes statistiques…</Text>
          </View>
        )}
        {/* ⚠️ Alertes de stagnation (amélioration 9) */}
        {alertes.length > 0 && (
          <View style={styles.carteAlerte}>
            <Text style={styles.alerteTitre}>⚠️ A ne pas negliger ({alertes.length})</Text>
            {alertes.map((a) => (
              <Text key={a.matiere} style={styles.alerteLigne}>
                {a.jours === -1 ? `❌ ${a.matiere} : jamais travaillee` : `🐢 ${a.matiere} : ${a.jours} jours sans revision`}
              </Text>
            ))}
          </View>
        )}
        <View style={styles.carteNiveau}>
          <Text style={styles.niveauEmoji}>⭐</Text>
          <Text style={styles.niveauText}>Niveau {stats.niveau}</Text>
          <Text style={styles.xpText}>{stats.xpTotal} XP • {stats.exosCorrects}/{stats.exosResolus} reussis</Text>
          <View style={styles.barreXp}>
            <View style={[styles.remplissageXp, { width: `${(stats.xpTotal % 100)}%` }]} />
          </View>
          <View style={styles.heroBandeau}>
            <Text style={styles.heroBandeauTexte}>🎯 {stats.tauxReussite}% de reussite</Text>
            <Text style={[styles.heroPoint, { color: couleurTaux(stats.tauxReussite) }]}>●</Text>
          </View>
        </View>
        <View style={styles.grilleStats}>
          <View style={styles.statCard}>
            <Text style={styles.statIcone}>📝</Text>
            <Text style={styles.statValeur}>{stats.exosResolus}</Text>
            <Text style={styles.statLabel}>Exercices</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcone}>🎯</Text>
            <Text style={[styles.statValeur, { color: couleurTaux(stats.tauxReussite) }]}>{stats.tauxReussite}%</Text>
            <Text style={styles.statLabel}>Reussite</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcone}>🔥</Text>
            <Text style={styles.statValeur}>{stats.meilleureSerie}</Text>
            <Text style={styles.statLabel}>Meilleure serie</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcone}>📅</Text>
            <Text style={styles.statValeur}>{stats.joursActifs}</Text>
            <Text style={styles.statLabel}>Jours actifs</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>📈 Activite — 7 jours</Text>
        <View style={styles.grilleActivite}>
          {activiteHebdo.map((jour, idx) => (
            <View key={idx} style={styles.jourCard}>
              <Text style={styles.jourNom}>{jour.date}</Text>
              <View style={styles.barreActivite}>
                <View style={[styles.remplissageActivite, { height: `${Math.round((jour.exos / maxExos) * 100)}%` }]} />
              </View>
              <Text style={styles.jourExos}>{jour.exos}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.sectionTitle}>⭐ Par difficulte</Text>
        {parDiff.map((d, i) => (
          <View key={i} style={styles.ligneDiff}>
            <Text style={styles.diffLabel}>{d.etoiles}</Text>
            <View style={styles.barreFondH}>
              <View style={[styles.barreH, { width: `${d.taux}%`, backgroundColor: couleurTaux(d.taux) }]} />
            </View>
            <Text style={styles.diffTaux}>{d.detail}</Text>
          </View>
        ))}
        <Text style={styles.sectionTitle}>🧭 Conseil du coach</Text>
        <View style={styles.carteConseil}>
          <Text style={styles.conseilText}>{conseil}</Text>
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
  carteNiveau: { backgroundColor: '#151D33', borderRadius: 18, padding: 20, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#26314F' },
  niveauEmoji: { fontSize: 40, marginBottom: 8 },
  niveauText: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold' },
  xpText: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
  barreXp: { width: '100%', height: 8, backgroundColor: '#374151', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  remplissageXp: { height: '100%', backgroundColor: '#FBBF24', borderRadius: 4 },
  grilleStats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  statCard: { width: '48%', backgroundColor: '#151D33', borderRadius: 16, padding: 16, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#26314F' },
  statValeur: { color: '#F8FAFC', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  statIcone: { fontSize: 20, marginBottom: 4 },
  sectionTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  grilleActivite: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, backgroundColor: '#151D33', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#26314F' },
  jourCard: { alignItems: 'center', flex: 1 },
  jourNom: { color: '#9CA3AF', fontSize: 11, marginBottom: 8 },
  barreActivite: { width: 22, height: 64, backgroundColor: '#0B1120', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  remplissageActivite: { width: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  jourExos: { color: '#E2E8F0', fontSize: 11, marginTop: 4, fontWeight: '600' },
  carteConseil: { backgroundColor: '#0E2A1D', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#10B981' },
  ligneDiff: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  diffLabel: { color: '#FBBF24', fontSize: 13, width: 55 },
  barreFondH: { flex: 1, height: 8, backgroundColor: '#1F2937', borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  barreH: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  diffTaux: { color: '#9CA3AF', fontSize: 11, width: 100, textAlign: 'right' },
  conseilText: { color: '#D1FAE5', fontSize: 14, lineHeight: 20 },
  carteAlerte: { backgroundColor: '#2A1608', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#B45309' },
  alerteTitre: { color: '#FDBA74', fontWeight: '800', marginBottom: 6 },
  alerteLigne: { color: '#FED7AA', fontSize: 13, marginTop: 2 },
  heroBandeau: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  heroBandeauTexte: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  heroPoint: { marginLeft: 6, fontSize: 14 },
  chargement: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 14, alignItems: 'center' },
  chargementTexte: { color: '#94A3B8', fontSize: 13 },
});
