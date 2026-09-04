import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAllCoursCache } from '../services/cacheHorsLigne';
import { getStats, tauxMaitrise, type LexStats } from '../services/statsSuivi';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MATIERES_JOUR = ['Mathématiques', 'Physique-Chimie', 'Mathématiques', 'SVT', 'Physique-Chimie', 'Mathématiques', 'Toutes'];

interface Seance {
  jour: string;
  matiere: string;
  chapitreId: string;
  titre: string;
  taux: number;
}

export default function Planning() {
  const router = useRouter();
  const [seances, setSeances] = useState<Seance[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    (async () => {
      const stats: LexStats = await getStats();
      const cours = await getAllCoursCache();
      const titres: { [id: string]: string } = {};
      const matieres: { [id: string]: string } = {};
      for (const c of cours) {
        titres[c.id] = c.titre || c.id;
        matieres[c.id] = c.matiere || '';
      }

      // Chapitres travaillés, du plus faible au plus fort
      const chapitres = Object.keys(stats.chapitres)
        .map((id) => ({ id, taux: tauxMaitrise(stats.chapitres[id]) }))
        .sort((a, b) => a.taux - b.taux);

      // Attribue un chapitre faible par jour (matière compatible si possible)
      const pris = new Set<string>();
      const planning: Seance[] = [];
      for (let j = 0; j < JOURS.length; j++) {
        const matiereVoulue = MATIERES_JOUR[j];
        let choix = chapitres.find((c) => !pris.has(c.id) && (matiereVoulue === 'Toutes' || matieres[c.id] === matiereVoulue))
          || chapitres.find((c) => !pris.has(c.id));
        if (!choix) {
          // Tous pris : on recommence un tour
          pris.clear();
          choix = chapitres[0];
        }
        if (choix) {
          pris.add(choix.id);
          planning.push({ jour: JOURS[j], matiere: matieres[choix.id] || matiereVoulue, chapitreId: choix.id, titre: titres[choix.id] || choix.id.replace(/_/g, ' '), taux: choix.taux });
        }
      }
      setSeances(planning);
      setChargement(false);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>ORGANISATION</Text>
        <Text style={styles.title}>📅 Planning de révision</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Ton programme de la semaine, construit automatiquement à partir de tes points faibles :
          30 minutes par jour suffisent. Recalcule chaque semaine depuis tes nouvelles stats !
        </Text>

        {chargement ? (
          <Text style={styles.vide}>Calcul de ton planning...</Text>
        ) : seances.length === 0 ? (
          <Text style={styles.vide}>Fais d'abord quelques exercices : ton planning personnalisé apparaîtra ici !</Text>
        ) : (
          seances.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.carte}
              onPress={() => router.push({
                pathname: '/entrainement_infini',
                params: { chapitre_id: s.chapitreId, titre: s.titre, matiere: s.matiere }
              })}
            >
              <View style={styles.colonneJour}>
                <Text style={styles.jourNom}>{s.jour.slice(0, 3).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.seanceTitre} numberOfLines={2}>{s.titre}</Text>
                <Text style={styles.seanceDetail}>{s.matiere} · maîtrise {s.taux}% · ~30 min</Text>
              </View>
              <Text style={styles.fleche}>›</Text>
            </TouchableOpacity>
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
  intro: { color: '#94A3B8', fontSize: 13, lineHeight: 19, marginBottom: 18 },
  vide: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  carte: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#0EA5E9' },
  colonneJour: { backgroundColor: '#0F172A', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginRight: 14, borderWidth: 1, borderColor: '#0EA5E9' },
  jourNom: { color: '#38BDF8', fontSize: 13, fontWeight: 'bold' },
  seanceTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', textTransform: 'capitalize' },
  seanceDetail: { color: '#64748B', fontSize: 11, marginTop: 4 },
  fleche: { color: '#94A3B8', fontSize: 22, marginLeft: 10 },
});
