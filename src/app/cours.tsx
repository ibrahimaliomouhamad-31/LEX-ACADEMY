import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Speech from 'expo-speech';
import { db } from '../config/firebaseConfig';
import { getCours, saveCours } from '../services/cacheHorsLigne';

const formatText = (text: string) => {
  if (!text) return "";
  return text.replace(/\\n/g, '\n');
};

export default function Cours() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = (params.id as string) || "1ere_c_math_chap1";
  
  const [coursData, setCoursData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showMethod, setShowMethod] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

  useEffect(() => {
    const fetchCours = async () => {
      try {
        // CACHE D'ABORD : lecture hors-ligne instantanée
        const cache = await getCours(id);
        if (cache) setCoursData(cache);
        // FIREBASE ensuite : mise à jour + remplissage du cache
        try {
          const docRef = doc(db, "cours", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const donnees = docSnap.data();
            setCoursData(donnees);
            await saveCours({ id, ...(donnees as object) } as never);
          }
        } catch {
          // hors-ligne : le cache (s'il existe) suffit
        }
      } catch (error) {
        console.error("Erreur : ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCours();
  }, [id]);

  // 🎧 LECTURE AUDIO DU COURS (expo-speech, 100% hors-ligne) : l'élève peut
  // réviser en marchant, économiser sa batterie, ou compenser la fatigue
  // de lecture. Utile aussi pour les lecteurs débutants.
  const ecouterCours = () => {
    if (!coursData) return;
    Speech.stop();
    const texte = [
      coursData.titre ? `Chapitre : ${coursData.titre}.` : '',
      coursData.theorie || coursData.activite || '',
      coursData.methode_content || '',
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\\n/g, ' ');
    if (!texte.trim()) {
      return;
    }
    Speech.speak(texte.slice(0, 3500), { language: 'fr', rate: 0.95 });
  };

  const arreterAudio = () => {
    Speech.stop();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
        <Text style={styles.loadingText}>Chargement du cours...</Text>
      </View>
    );
  }

  // Si on n'a pas trouvé le cours dans Firebase
  if (!coursData) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/chapitres')}>
            <Text style={styles.backBtn}>‹ Retour aux chapitres</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyText}>Ce chapitre n'existe pas encore dans la base de données.</Text>
        </View>
      </View>
    );
  }

  // On vérifie si le cours est rédigé (s'il a au moins une théorie ou une activité)
  const isRédige = coursData.theorie || coursData.activite || coursData.methode_content;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/chapitres')}>
          <Text style={styles.backBtn}>‹ Retour aux chapitres</Text>
        </TouchableOpacity>
        <View style={styles.rowHeader}>
          <View style={{ flex: 1 }}>
            {/* 🔄 En-tête dynamique (avant : "MATHÉMATIQUES - 1ÈRE C" en dur,
                faux pour tous les chapitres d'autres matières/classes) */}
            <Text style={styles.subject}>
              {(coursData?.matiere || 'Cours').toUpperCase()}
              {coursData?.classe ? ` - ${String(coursData.classe).toUpperCase()}` : ''}
            </Text>
            <Text style={styles.chapterTitle}>{coursData?.titre}</Text>
          </View>
          <TouchableOpacity
            style={styles.audioBtn}
            onPress={ecouterCours}
            onLongPress={arreterAudio}
          >
            <Text style={styles.audioBtnText}>🎧</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Si le cours n'est pas rédigé, on affiche ce message */}
        {!isRédige && (
          <View style={styles.cardGold}>
            <Text style={styles.cardTitleGold}>⏳ Chapitre en préparation</Text>
            <Text style={styles.warningText}>L'équipe pédagogique de LEX ACADEMY rédige actuellement ce cours en détail. Revenez vérifier très bientôt pour le consulter !</Text>
          </View>
        )}

        {/* Carte Activité (S'affiche SEULEMENT si le champ existe sur Firebase) */}
        {coursData.activite && (
          <View style={styles.cardGreen}>
            <Text style={styles.cardTitleGreen}>🧩 Activité d'approche</Text>
            <Text style={styles.activityText}>{formatText(coursData.activite)}</Text>
          </View>
        )}

        {/* Carte Théorie */}
        {coursData.theorie && (
          <View style={styles.cardBlue}>
            <Text style={styles.cardTitle}>🧠 1. La Théorie</Text>
            <Text style={styles.courseText}>{formatText(coursData.theorie)}</Text>
          </View>
        )}

        {/* Carte Méthode */}
        {coursData.methode_content && (
          <View style={styles.cardBlue}>
            <Text style={styles.cardTitle}>⚙️ 2. La Méthode</Text>
            <Text style={styles.cardSubtitle}>{formatText(coursData.methode_titre)}</Text>
            <TouchableOpacity style={styles.expandBtn} onPress={() => setShowMethod(!showMethod)}>
              <Text style={styles.expandBtnText}>{showMethod ? "🔼 Masquer les étapes" : "🔽 Afficher les étapes"}</Text>
            </TouchableOpacity>
            {showMethod && (
              <View style={styles.hiddenContent}>
                <Text style={styles.demoText}>{formatText(coursData.methode_content)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Carte Piège */}
        {coursData.piege && (
          <View style={styles.cardRed}>
            <Text style={styles.cardTitleRed}>⚠️ 3. Le Piège du Prof</Text>
            <Text style={styles.warningText}>{formatText(coursData.piege)}</Text>
          </View>
        )}

        {/* Carte Démonstration */}
        {coursData.demo && (
          <View style={styles.cardBlue}>
            <Text style={styles.cardTitle}>🚀 4. Approfondissement (+150%)</Text>
            <TouchableOpacity style={styles.expandBtn} onPress={() => setShowDemo(!showDemo)}>
              <Text style={styles.expandBtnText}>{showDemo ? "🔼 Masquer la démonstration" : "🔽 Afficher la démonstration"}</Text>
            </TouchableOpacity>
            {showDemo && (
              <View style={styles.hiddenContent}>
                <Text style={styles.demoText}>{formatText(coursData.demo)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Carte Exercice Corrigé */}
        {coursData.exercice_corrige && (
          <View style={styles.cardGold}>
            <Text style={styles.cardTitleGold}>🎓 Exercice Type Corrigé</Text>
            <TouchableOpacity style={styles.expandBtnGold} onPress={() => setShowCorrection(!showCorrection)}>
              <Text style={styles.expandBtnText}>{showCorrection ? "🔼 Masquer la correction" : "🔽 Afficher la correction détaillée"}</Text>
            </TouchableOpacity>
            {showCorrection && (
              <View style={styles.hiddenContentGold}>
                <Text style={styles.correctionText}>{formatText(coursData.exercice_corrige)}</Text>
              </View>
            )}
          </View>
        )}

        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingText: { color: '#FBBF24', marginTop: 15, fontSize: 16, textAlign: 'center' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  audioBtn: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#8B5CF6', borderRadius: 20, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  audioBtnText: { fontSize: 20 },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  chapterTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginTop: 5 },
  scrollView: { paddingHorizontal: 20 },
  
  // Écran si vide
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyEmoji: { fontSize: 60, marginBottom: 20 },
  emptyText: { color: '#94A3B8', fontSize: 16, textAlign: 'center' },

  // Cartes Vertes (Activité)
  cardGreen: { backgroundColor: '#14241B', borderRadius: 12, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  cardTitleGreen: { color: '#10B981', fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  activityText: { color: '#A7F3D0', fontSize: 15, lineHeight: 24, fontStyle: 'italic' },
  
  // Cartes Bleues
  cardBlue: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  cardTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  cardSubtitle: { color: '#60A5FA', fontSize: 15, fontWeight: 'bold', marginBottom: 15 },
  courseText: { color: '#CBD5E1', fontSize: 15, lineHeight: 24 },
  
  // Boutons déroulants Bleus
  expandBtn: { marginTop: 10, backgroundColor: '#334155', padding: 12, borderRadius: 8, alignItems: 'center' },
  expandBtnText: { color: '#F8FAFC', fontSize: 13, fontWeight: 'bold' },
  hiddenContent: { marginTop: 15, backgroundColor: '#0F172A', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  demoText: { color: '#93C5FD', fontSize: 14, lineHeight: 24 },
  
  // Carte Rouge
  cardRed: { backgroundColor: '#3B1B1B', borderRadius: 12, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  cardTitleRed: { color: '#F8FAFC', fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  warningText: { color: '#FCA5A5', fontSize: 14, lineHeight: 22 },
  
  // Carte Dorée
  cardGold: { backgroundColor: '#2D2412', borderRadius: 12, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#FBBF24' },
  cardTitleGold: { color: '#FBBF24', fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  expandBtnGold: { marginTop: 10, backgroundColor: '#7F1D1D', padding: 12, borderRadius: 8, alignItems: 'center' },
  hiddenContentGold: { marginTop: 15, backgroundColor: '#0F172A', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#FBBF24' },
  correctionText: { color: '#F8FAFC', fontSize: 14, lineHeight: 24 },
});