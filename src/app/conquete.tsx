import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAllCoursCache, getAllCachedChapterIds } from '../services/cacheHorsLigne';
import { getStats, niveauMaitrise, tauxMaitrise } from '../services/statsSuivi';

export default function Conquete() {
  const router = useRouter();
  const [territoires, setTerritoires] = useState<{ id: string; titre: string; taux: number; label: string; couleur: string; boss: boolean }[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    (async () => {
      const stats = await getStats();
      const ids = await getAllCachedChapterIds();
      const cours = await getAllCoursCache();
      const titres: { [id: string]: string } = {};
      for (const c of cours) titres[c.id] = c.titre;

      // Chaque chapitre téléchargé = un territoire ; le plus faible = "attaqué" en priorité
      const liste = ids.map((id) => {
        const m = niveauMaitrise(stats.chapitres[id]);
        return { id, titre: titres[id] || id.replace(/_/g, ' '), taux: tauxMaitrise(stats.chapitres[id]), label: m.label, couleur: m.couleur, boss: false };
      });
      // Le "boss" = le chapitre le mieux maîtrisé (à défendre), s'il existe
      if (liste.length > 0) {
        const meilleur = [...liste].sort((a, b) => b.taux - a.taux)[0];
        meilleur.boss = true;
      }
      liste.sort((a, b) => a.taux - b.taux);
      setTerritoires(liste);
      setChargement(false);
    })();
  }, []);

  const conquis = territoires.filter((t) => t.taux >= 70).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>MODE HISTOIRE</Text>
        <Text style={styles.title}>🗺️ La Conquête du LEX</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.bandeau}>
          <Text style={styles.bandeauTitre}>{conquis}/{territoires.length} territoires conquis</Text>
          <View style={styles.barreFond}>
            <View style={[styles.barre, { width: territoires.length > 0 ? `${Math.round((conquis / territoires.length) * 100)}%` : '0%' }]} />
          </View>
          <Text style={styles.bandeauTexte}>
            Chaque chapitre maîtrisé à 70%+ devient un territoire conquis 🏰. Le territoire à couronne 👑 est ta
            meilleure forteresse : défends-la en la gardant au top !
          </Text>
        </View>

        {chargement ? (
          <Text style={styles.vide}>Chargement de la carte...</Text>
        ) : territoires.length === 0 ? (
          <Text style={styles.vide}>
            Aucun territoire exploré ! Télécharge des chapitres 📥 pour commencer ta conquête du LEX.
          </Text>
        ) : (
          territoires.map((t, i) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.territoire, { borderLeftColor: t.couleur }]}
              onPress={() => router.push({
                pathname: '/entrainement_infini',
                params: { chapitre_id: t.id, titre: t.titre, matiere: 'Mathématiques' }
              })}
            >
              <View style={styles.terrHaut}>
                <Text style={styles.terrEmoji}>
                  {t.taux >= 70 ? '🏰' : t.taux >= 40 ? '⚔️' : '🌫️'}{t.boss ? '👑' : ''}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.terrTitre} numberOfLines={1}>
                    {i === 0 && t.taux < 70 ? '🎯 ' : ''}{t.titre}
                  </Text>
                  <Text style={styles.terrDetail}>{t.label} · {t.taux}%</Text>
                </View>
                <Text style={[styles.terrTaux, { color: t.couleur }]}>{t.taux}%</Text>
              </View>
              <View style={styles.barreFondTerr}>
                <View style={[styles.barreTerr, { width: `${t.taux}%`, backgroundColor: t.couleur }]} />
              </View>
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
  bandeau: { backgroundColor: '#1E293B', borderRadius: 12, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#FBBF24' },
  bandeauTitre: { color: '#FBBF24', fontSize: 17, fontWeight: 'bold', marginBottom: 10 },
  barreFond: { height: 10, backgroundColor: '#0F172A', borderRadius: 5, overflow: 'hidden' },
  barre: { height: 10, backgroundColor: '#FBBF24', borderRadius: 5 },
  bandeauTexte: { color: '#94A3B8', fontSize: 12, lineHeight: 18, marginTop: 10 },
  vide: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  territoire: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 3 },
  terrHaut: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  terrEmoji: { fontSize: 26, marginRight: 12 },
  terrTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', flex: 1, textTransform: 'capitalize' },
  terrDetail: { color: '#64748B', fontSize: 11, marginTop: 3 },
  terrTaux: { fontSize: 16, fontWeight: 'bold' },
  barreFondTerr: { height: 6, backgroundColor: '#0F172A', borderRadius: 3, overflow: 'hidden' },
  barreTerr: { height: 6, borderRadius: 3 },
});
