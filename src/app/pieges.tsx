import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAllCoursCache } from '../services/cacheHorsLigne';
import { getStats, niveauMaitrise, type LexStats } from '../services/statsSuivi';

// 44 — PACKS "PIÈGES DU BAC" : détecte automatiquement les chapitres et les
// niveaux de difficulté où TU échoues le plus, et propose un entraînement ciblé.

const PIEGES_CLASSIQUES = [
  { titre: 'Changer de signe', texte: 'Quand un terme passe de l\'autre côté du =, son signe CHANGE : x + 5 = 12 ⟹ x = 12 − 5 = 7 (pas 17 !).' },
  { titre: 'Le discriminant', texte: 'Δ = b² − 4ac : le b est AU CARRÉ et le 4a multiplie le c. Erreur classique : oublier le signe de c.' },
  { titre: 'Fractions', texte: 'Diviser par une fraction = multiplier par son inverse : 1 ÷ (2/3) = 3/2, pas 2/3.' },
  { titre: 'Unités (PC)', texte: 'Toujours convertir AVANT le calcul : km/h → m/s (÷3,6), g → kg, mL → L. Le resultat est faux sinon.' },
  { titre: 'Dérivée d\'une constante', texte: '(5)\' = 0. Et (x³)\' = 3x² — l\'exposant descend ET diminue de 1.' },
  { titre: ' Solutions étrangères', texte: 'Après une élévation au carré (√(ax+b) = cx+d), TOUJOURS vérifier les solutions dans le domaine de définition.' },
];

export default function Pieges() {
  const router = useRouter();
  const [stats, setStats] = useState<LexStats | null>(null);
  const [titres, setTitres] = useState<{ [id: string]: string }>({});
  const [matieres, setMatieres] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    (async () => {
      setStats(await getStats());
      const cours = await getAllCoursCache();
      const map: { [id: string]: string } = {};
      const mat: { [id: string]: string } = {};
      for (const c of cours) {
        map[c.id] = c.titre;
        mat[c.id] = c.matiere || 'Mathématiques';
      }
      setTitres(map);
      setMatieres(mat);
    })();
  }, []);

  if (!stats) return <View style={styles.container} />;

  // Chapitres avec ≥ 4 tentatives et taux < 55% → mes pièges personnels
  const mesPieges = Object.entries(stats.chapitres)
    .map(([id, c]) => ({ id, c }))
    .filter(({ c }) => c.total >= 4 && c.reussis / c.total < 0.55)
    .sort((a, b) => a.c.reussis / a.c.total - b.c.reussis / b.c.total)
    .slice(0, 6);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>TES POINTS NOIRS DÉTECTÉS AUTOMATIQUEMENT</Text>
        <Text style={styles.title}>🧠 Pièges du BAC</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>🎯 Mes chapitres piégés (sur mes vraies stats)</Text>
        {mesPieges.length === 0 ? (
          <Text style={styles.vide}>
            Aucun piège détecté pour le moment — soit tu maîtrises tout, soit tu n'as pas assez tenté d'exercices. Continue ! 💪
          </Text>
        ) : (
          mesPieges.map(({ id, c }) => {
            const m = niveauMaitrise(c);
            const titre = titres[id] || id.replace(/_/g, ' ');
            return (
              <TouchableOpacity
                key={id}
                style={styles.cartePiege}
                onPress={() => router.push({ pathname: '/entrainement_infini', params: { chapitre_id: id, titre, matiere: matieres[id] || 'Mathématiques' } })}
              >
                <Text style={styles.piegeTitre} numberOfLines={2}>{titre}</Text>
                <Text style={styles.piegeDetail}>{m.label} · {c.reussis}/{c.total} réussis — attaque ce chapitre maintenant !</Text>
                <Text style={styles.piegeGo}>⚔️ Entraînement ciblé ›</Text>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={styles.section}>⚠️ Les pièges classiques du BAC</Text>
        {PIEGES_CLASSIQUES.map((p, i) => (
          <View key={i} style={styles.carteClassique}>
            <Text style={styles.classiqueTitre}>🪤 {p.titre}</Text>
            <Text style={styles.classiqueTexte}>{p.texte}</Text>
          </View>
        ))}
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
  section: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  vide: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  cartePiege: { backgroundColor: '#2A1010', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  piegeTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', textTransform: 'capitalize' },
  piegeDetail: { color: '#FCA5A5', fontSize: 12, marginTop: 5 },
  piegeGo: { color: '#FBBF24', fontSize: 12, fontWeight: 'bold', marginTop: 8 },
  carteClassique: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  classiqueTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  classiqueTexte: { color: '#94A3B8', fontSize: 13, lineHeight: 19 },
});
