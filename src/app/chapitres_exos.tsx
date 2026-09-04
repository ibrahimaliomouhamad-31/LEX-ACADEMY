import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebaseConfig';
import { getAllCachedChapterIds, getCacheSize, saveCours, saveExercices } from '../services/cacheHorsLigne';
import { generateurDisponible } from '../services/generateurLocal';

export default function ChapitresExos() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const matiere = (params.matiere as string) || 'Mathématiques';
  const classe = (params.classe as string) || '1ère C';

  const [chapitres, setChapitres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [telecharges, setTelecharges] = useState<Set<string>>(new Set());
  const [enCours, setEnCours] = useState<string | null>(null); // id du chapitre en téléchargement
  const [tailleCache, setTailleCache] = useState(0);
  const [progression, setProgression] = useState('');

  const rafraichirCache = async () => {
    try {
      const ids = await getAllCachedChapterIds();
      setTelecharges(new Set(ids));
      setTailleCache(await getCacheSize());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const fetchChapitres = async () => {
      try {
        const q = query(collection(db, 'cours'), where('matiere', '==', matiere), where('classe', '==', classe));
        const querySnapshot = await getDocs(q);
        const chapitresData: any[] = [];
        querySnapshot.forEach((doc) => {
          chapitresData.push({ id: doc.id, ...doc.data() });
        });
        chapitresData.sort((a, b) => (a.id > b.id ? 1 : -1));
        setChapitres(chapitresData);
      } catch (error) {
        console.error('Erreur : ', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChapitres();
    rafraichirCache();
  }, [matiere, classe]);

  const telechargerChapitre = async (chapitreId: string) => {
    try {
      setEnCours(chapitreId);
      const q = query(collection(db, 'exercices'), where('chapitre_id', '==', chapitreId));
      const querySnapshot = await getDocs(q);
      const exos: any[] = [];
      querySnapshot.forEach((doc) => {
        exos.push({ id: doc.id, ...doc.data() });
      });
      await saveExercices(chapitreId, exos);
      // Embarque aussi le COURS complet du chapitre (lecture hors-ligne)
      try {
        const snapCours = await getDoc(doc(db, 'cours', chapitreId));
        if (snapCours.exists()) {
          await saveCours({ id: chapitreId, ...(snapCours.data() as object) } as never);
        }
      } catch { /* cours indisponible hors-ligne */ }
      await rafraichirCache();
    } catch (error) {
      console.error('Erreur téléchargement : ', error);
    } finally {
      setEnCours(null);
    }
  };

  const toutTelecharger = async () => {
    for (let i = 0; i < chapitres.length; i++) {
      const ch = chapitres[i];
      if (telecharges.has(ch.id)) continue;
      setProgression(`Téléchargement ${i + 1}/${chapitres.length}...`);
      await telechargerChapitre(ch.id);
    }
    setProgression('');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  const goInfini = (chapitre: any) => router.push({
    pathname: '/entrainement_infini',
    params: { chapitre_id: chapitre.id, titre: chapitre.titre || '', matiere, classe }
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/matieres_exos', params: { classe: classe } })}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>{classe} - {matiere}</Text>
        <Text style={styles.title}>Exercices - Choisis un chapitre</Text>
      </View>

      {/* Barre hors-ligne */}
      <View style={styles.barreHorsLigne}>
        <Text style={styles.horsLigneTexte}>
          📱 {telecharges.size} chapitre(s) hors-ligne — {(tailleCache / 1024).toFixed(0)} Ko
        </Text>
        <TouchableOpacity style={styles.btnToutTelecharger} onPress={toutTelecharger} disabled={enCours !== null || progression !== ''}>
          <Text style={styles.btnToutTelechargerText}>
            {progression !== '' ? progression : '📥 Tout télécharger'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {chapitres.length === 0 ? (
          <Text style={styles.emptyText}>Aucun chapitre disponible.</Text>
        ) : (
          chapitres.map((chapitre, index) => {
            const estTelecharge = telecharges.has(chapitre.id);
            return (
              <View key={chapitre.id} style={styles.chapterCard}>
                <TouchableOpacity
                  style={styles.chapterMain}
                  onPress={() => router.push({
                    pathname: '/liste_exercices',
                    params: { classe: classe, matiere: matiere, chapitre_id: chapitre.id, titre: chapitre.titre || '' }
                  })}
                >
                  <View style={styles.chapterNumber}>
                    <Text style={styles.chapterNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.chapterInfo}>
                    <Text style={styles.chapterTitle}>{chapitre.titre}</Text>
                    <Text style={styles.chapterHint}>
                      {estTelecharge ? '📱 Hors-ligne prêt • ' : ''}📝 Exercices du chapitre
                    </Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>

                <View style={styles.rowBoutons}>
                  <TouchableOpacity
                    style={[styles.telechargerBtn, estTelecharge && styles.telechargerBtnOk]}
                    onPress={() => telechargerChapitre(chapitre.id)}
                    disabled={enCours !== null}
                  >
                    <Text style={[styles.telechargerBtnText, estTelecharge && styles.telechargerBtnTextOk]}>
                      {enCours === chapitre.id ? '⏳ Téléchargement...' : estTelecharge ? '✅ Hors-ligne' : '📥 Télécharger'}
                    </Text>
                  </TouchableOpacity>

                  {generateurDisponible(matiere) && (
                    <TouchableOpacity style={styles.aiBtn} onPress={() => goInfini(chapitre)}>
                      <Text style={styles.aiBtnText}>🧠 Infini</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.lexAiBtn}
                    onPress={() => router.push({
                      pathname: '/infini',
                      params: { id: chapitre.id, titre: chapitre.titre, classe: classe, matiere: matiere }
                    })}
                  >
                    <Text style={styles.lexAiBtnText}>🤖 LEX.AI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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

  barreHorsLigne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  horsLigneTexte: { color: '#38BDF8', fontSize: 12, flex: 1 },
  btnToutTelecharger: { backgroundColor: '#0C4A6E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  btnToutTelechargerText: { color: '#7DD3FC', fontSize: 12, fontWeight: 'bold' },

  scrollView: { paddingHorizontal: 20 },
  emptyText: { color: '#94A3B8', fontSize: 16, textAlign: 'center', marginTop: 50 },
  chapterCard: { backgroundColor: '#1E293B', borderRadius: 12, marginBottom: 15, borderLeftWidth: 3, borderLeftColor: '#3B82F6', overflow: 'hidden' },
  chapterMain: { flexDirection: 'row', padding: 20, alignItems: 'center' },
  chapterInfo: { flex: 1, marginRight: 10 },
  chapterNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#3B82F6' },
  chapterNumberText: { color: '#3B82F6', fontSize: 18, fontWeight: 'bold' },
  chapterTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  chapterHint: { color: '#64748B', fontSize: 12, marginTop: 4 },
  arrow: { color: '#94A3B8', fontSize: 24, marginLeft: 10 },

  rowBoutons: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#334155' },
  telechargerBtn: { flex: 2, backgroundColor: '#0C2A3E', paddingVertical: 10, alignItems: 'center' },
  telechargerBtnOk: { backgroundColor: '#14352B' },
  telechargerBtnText: { color: '#7DD3FC', fontSize: 12, fontWeight: 'bold' },
  telechargerBtnTextOk: { color: '#6EE7B7' },
  aiBtn: { flex: 1, backgroundColor: '#2D1F40', paddingVertical: 10, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#334155' },
  aiBtnText: { color: '#C4B5FD', fontSize: 12, fontWeight: 'bold' },
  lexAiBtn: { flex: 1, backgroundColor: '#1B1424', paddingVertical: 10, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#334155' },
  lexAiBtnText: { color: '#8B5CF6', fontSize: 12, fontWeight: 'bold' },
});
