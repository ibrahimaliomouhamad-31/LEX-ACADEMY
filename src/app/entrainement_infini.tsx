import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../config/firebaseConfig';
import {
  genererExercicePourNotion,
  niveauLabel,
  type ExoGenere,
} from '../services/generateurLocal';
import { estJuste } from '../services/outilsReponse';
import { chargerNotionsChapitre, type MicroNotion } from '../services/microNotions';
import { getCours } from '../services/cacheHorsLigne';
import { gagnerXp, validerStreakDuJour } from '../services/xpLocal';
import { bloquerSiExamen } from '../services/parametres';
import { rapporterErreur } from '../utils/logger';

const CLE_MAITRISE = 'lex_maitrise_notions';

export default function EntrainementInfini() {
  const router = useRouter();
  // 🛡️ VERROU EXAMEN DIRECT : bloque même en accès direct (deep link).
  useEffect(() => { bloquerSiExamen(router, 'Exercices infinis'); }, []);
  const params = useLocalSearchParams();
  const chapitreId = (params.chapitre_id as string) || '';
  const titre = (params.titre as string) || 'Chapitre';
  const matiere = (params.matiere as string) || '';

  const [notions, setNotions] = useState<MicroNotion[]>([]);
  const [notionActuelle, setNotionActuelle] = useState<MicroNotion | null>(null);
  const [exo, setExo] = useState<ExoGenere | null>(null);
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [niveau, setNiveau] = useState(30);
  const [serie, setSerie] = useState(0);
  const [totalResolus, setTotalResolus] = useState(0);
  const [chargement, setChargement] = useState(true);

  // Charge les micro-notions et la maîtrise depuis le stockage local
  useEffect(() => {
    (async () => {
      try {
        let cours = await getCours(chapitreId);
        let contenuFB: Record<string, unknown> | null = null;
        if (!cours) {
          try {
            const snap = await getDoc(doc(db, 'cours', chapitreId));
            if (snap.exists()) {
              contenuFB = snap.data();
              cours = { id: chapitreId, titre: snap.data().titre || titre, ...snap.data() };
            }
          } catch (erreurSilencieuse) {
      rapporterErreur('[audit] Erreur silencieuse', erreurSilencieuse);
    }
        }
        const n = await chargerNotionsChapitre(chapitreId, cours as unknown as Record<string, unknown>, contenuFB as unknown as Record<string, unknown> | null);
        
        // Charge la maîtrise depuis le stockage local
        const maitriseStr = await AsyncStorage.getItem(`${CLE_MAITRISE}_${chapitreId}`);
        if (maitriseStr) {
          const maitriseMap = JSON.parse(maitriseStr);
          n.forEach(notion => {
            if (maitriseMap[notion.id]) {
              notion.maitrise = maitriseMap[notion.id];
            }
          });
        }
        
        setNotions(n);
      } catch (erreurSilencieuse) {
      rapporterErreur('[audit] Erreur silencieuse', erreurSilencieuse);
    } finally {
        setChargement(false);
      }
    })();
  }, [chapitreId]);

  // Génère un exercice pour la notion actuelle
  const genererExo = (notion: MicroNotion, niv: number) => {
    const graine = Date.now() + Math.random() * 1000;
    return genererExercicePourNotion(notion, niv, graine);
  };

  // Sélectionne une notion et génère un exercice
  const choisirNotion = (notion: MicroNotion) => {
    setNotionActuelle(notion);
    setExo(genererExo(notion, niveau));
    setReponse('');
    setFeedback('');
    setIsCorrect(false);
  };

  // Nouvel exercice pour la même notion
  const nouvelleQuestion = () => {
    if (notionActuelle) {
      setExo(genererExo(notionActuelle, niveau));
      setReponse('');
      setFeedback('');
      setIsCorrect(false);
    }
  };

  // Valide la réponse
  const valider = async () => {
    if (!exo || reponse.trim() === '' || feedback !== '') return;
    const juste = estJuste(reponse, exo.bonne_reponse);
    setIsCorrect(juste);
    
    if (juste) {
      setSerie(s => s + 1);
      setTotalResolus(t => t + 1);
      await gagnerXp(50 + niveau);
      await validerStreakDuJour();
      
      if (notionActuelle) {
        const nouvelleMaitrise = Math.min(100, notionActuelle.maitrise + 2);
        mettreAJourMaitrise(notionActuelle.id, nouvelleMaitrise);
      }
    } else {
      setSerie(0);
    }
    
    setFeedback(juste ? '✅ EXACT !' : `❌ Réponse : ${exo.bonne_reponse.split('|')[0]}\n📖 ${exo.explication}`);
  };

  // Met à jour la maîtrise d'une notion
  const mettreAJourMaitrise = async (notionId: string, maitrise: number) => {
    const notion = notions.find(n => n.id === notionId);
    if (notion) {
      notion.maitrise = maitrise;
      setNotions([...notions]);
      
      const maitriseStr = await AsyncStorage.getItem(`${CLE_MAITRISE}_${chapitreId}`);
      const maitriseMap = maitriseStr ? JSON.parse(maitriseStr) : {};
      maitriseMap[notionId] = maitrise;
      await AsyncStorage.setItem(`${CLE_MAITRISE}_${chapitreId}`, JSON.stringify(maitriseMap));
    }
  };

  // Couleur selon la maîtrise
  const couleurMaitrise = (maitrise: number): string => {
    if (maitrise >= 80) return '#10B981';
    if (maitrise >= 50) return '#FBBF24';
    if (maitrise >= 20) return '#F59E0B';
    return '#6B7280';
  };

  const texteMaitrise = (maitrise: number): string => {
    if (maitrise >= 80) return 'Maîtrisé';
    if (maitrise >= 50) return 'En cours';
    if (maitrise >= 20) return 'Début';
    return 'À faire';
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => notionActuelle ? setNotionActuelle(null) : router.back()}>
        <Text style={styles.backBtn}>‹ {notionActuelle ? 'Notions' : 'Retour'}</Text>
      </TouchableOpacity>
      <Text style={styles.subject}>EXERCICES INFINIS</Text>
      <Text style={styles.title}>♾️ {titre}</Text>
    </View>
  );

  if (notionActuelle && exo) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
        {header}
        <View style={styles.barreNotion}>
          <View style={styles.infoNotion}>
            <Text style={styles.nomNotion}>{notionActuelle.titre}</Text>
            <View style={[styles.badgeMaitrise, { backgroundColor: couleurMaitrise(notionActuelle.maitrise) }]}>
              <Text style={styles.texteBadge}>{texteMaitrise(notionActuelle.maitrise)}</Text>
            </View>
          </View>
          <View style={styles.barreProgression}>
            <View style={[styles.remplissage, { width: `${notionActuelle.maitrise}%`, backgroundColor: couleurMaitrise(notionActuelle.maitrise) }]} />
          </View>
        </View>
        <View style={styles.rowStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValeur}>{serie}</Text>
            <Text style={styles.statLabel}>Série 🔥</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValeur}>{totalResolus}</Text>
            <Text style={styles.statLabel}>Total ✅</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValeur}>{niveau}</Text>
            <Text style={styles.statLabel}>Niveau ⚡</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={styles.cardExo}>
            <Text style={styles.questionText}>{exo.enonce}</Text>
            <TextInput style={styles.input} placeholder="Ta réponse..." placeholderTextColor="#64748B" value={reponse} onChangeText={setReponse} editable={feedback === ''} />
            {feedback === '' ? (
              <TouchableOpacity style={styles.checkBtn} onPress={valider}>
                <Text style={styles.checkBtnText}>Valider</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={[styles.feedbackBox, isCorrect ? styles.feedbackSuccess : styles.feedbackError]}>
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
                <TouchableOpacity style={styles.suivantBtn} onPress={nouvelleQuestion}>
                  <Text style={styles.suivantBtnText}>Exercice suivant →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      {header}
      <View style={styles.barreInfo}>
        <Text style={styles.infoTexte}>{notions.length} micro-notions • Choisis une notion</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {chargement ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : notions.length === 0 ? (
          <Text style={styles.vide}>Aucune micro-notion trouvée.</Text>
        ) : (
          notions.map((notion) => (
            <TouchableOpacity key={notion.id} style={styles.carteNotion} onPress={() => choisirNotion(notion)}>
              <View style={styles.notionHeader}>
                <Text style={styles.notionTitre}>{notion.titre}</Text>
                <View style={[styles.badgeMaitrise, { backgroundColor: couleurMaitrise(notion.maitrise) }]}>
                  <Text style={styles.texteBadge}>{notion.maitrise}%</Text>
                </View>
              </View>
              <Text style={styles.notionExtrait} numberOfLines={2}>{notion.extrait}</Text>
              <View style={styles.barreProgressionMini}>
                <View style={[styles.remplissageMini, { width: `${notion.maitrise}%`, backgroundColor: couleurMaitrise(notion.maitrise) }]} />
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
  container: { flex: 1, backgroundColor: '#0B1120' },
  loadingText: { color: '#FBBF24', marginTop: 15, fontSize: 16, textAlign: 'center' },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10, backgroundColor: '#0F172A' },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10, fontWeight: '600' },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F9FAFB', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  barreInfo: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#111827', borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  infoTexte: { color: '#9CA3AF', fontSize: 13, textAlign: 'center' },
  barreNotion: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#111827', borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  infoNotion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nomNotion: { color: '#F9FAFB', fontSize: 16, fontWeight: 'bold', flex: 1 },
  badgeMaitrise: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  texteBadge: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  barreProgression: { height: 6, backgroundColor: '#374151', borderRadius: 3, overflow: 'hidden' },
  remplissage: { height: '100%', borderRadius: 3 },
  rowStats: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15 },
  statBox: { flex: 1, backgroundColor: '#111827', borderRadius: 14, padding: 14, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: '#1F2937' },
  statValeur: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#9CA3AF', fontSize: 11, marginTop: 4 },
  cardExo: { backgroundColor: '#111827', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#10B981' },
  questionText: { color: '#E5E7EB', fontSize: 16, lineHeight: 26, marginBottom: 20, fontWeight: '500' },
  input: { backgroundColor: '#1F2937', borderWidth: 2, borderColor: '#374151', borderRadius: 12, padding: 16, color: '#F9FAFB', fontSize: 16, marginBottom: 20 },
  checkBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  checkBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  suivantBtn: { backgroundColor: '#1F2937', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 2, borderColor: '#10B981' },
  suivantBtnText: { color: '#10B981', fontWeight: 'bold', fontSize: 16 },
  feedbackBox: { padding: 16, borderRadius: 12, borderWidth: 2, marginBottom: 15 },
  feedbackSuccess: { backgroundColor: '#064E3B', borderColor: '#10B981' },
  feedbackError: { backgroundColor: '#7F1D1D', borderColor: '#EF4444' },
  feedbackText: { fontSize: 15, fontWeight: 'bold', lineHeight: 22, color: '#FFFFFF' },
  carteNotion: { backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#374151' },
  notionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  notionTitre: { color: '#F9FAFB', fontSize: 15, fontWeight: 'bold', flex: 1 },
  notionExtrait: { color: '#9CA3AF', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  barreProgressionMini: { height: 4, backgroundColor: '#374151', borderRadius: 2, overflow: 'hidden' },
  remplissageMini: { height: '100%', borderRadius: 2 },
  vide: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 22 },
});
