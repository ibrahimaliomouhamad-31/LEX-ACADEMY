import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Speech from 'expo-speech';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getExoById, type Exercice } from '../services/cacheHorsLigne';
import { estJuste, normaliser, versNombre } from '../services/outilsReponse';
import { planifierRevision } from '../services/revisions';
import { plafondTexteAudio } from '../services/economieDonnees';
import { signalerExercice } from '../services/signalementService';
import { enregistrerTentative } from '../services/statsSuivi';
import { gagnerXp, validerStreakDuJour } from '../services/xpLocal';
import { pousserCompteur } from '../services/syncQueue';
import { classifierErreur } from '../utils/erreurs';
import Confettis from '../components/confettis';
import { db } from '../config/firebaseConfig';
import { avertirDev, logDev, rapporterErreur } from '../utils/logger';
import { parseObjetJSON, tableauDeChaines } from '../utils/correctifsAudit';

export { estJuste, normaliser, versNombre };

// 6 — Feedbacks encourageants adaptés au contexte du LEX (jamais humiliant)
const BRAVOS = [
  '✅ BRAVO ! Tu gagnes {XP} XP. Le BAC peut venir !',
  '✅ EXACT ! {XP} XP de plus. Tessaoua est fière de toi !',
  '✅ PARFAIT ! {XP} XP. Continue, champion du LEX !',
  '✅ CLAP CLAP ! {XP} XP encaissés. Niveau Excellence en vue !',
];
const ENCOURAGEMENTS = [
  "❌ Pas encore... mais chaque erreur t'approche de la réussite. Vérifie les signes !",
  "❌ Presque ! Relis l'énoncé une deuxième fois — l'astuce s'y cache souvent.",
  "❌ Raté. Normal : c'est comme ça qu'on apprend. Demande un indice !",
  "❌ Pas ça. Respire, prends ton temps, et attaque l'exercice étape par étape.",
];
const alea = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// 7 — XP selon la difficulté : ★=50, ★★=75, ★★★=100
function xpPourDifficulte(diff: unknown): number {
  const d = Number(diff) || 1;
  return d >= 3 ? 100 : d === 2 ? 75 : 50;
}

const SYMBOLES_MATH = ['√', 'π', '²', '³', '(', ')', '/', '^'];

function ClavierMath({ inserer }: { inserer: (s: string) => void }) {
  return (
    <View style={styles.rowSymboles}>
      {SYMBOLES_MATH.map((s) => (
        <TouchableOpacity key={s} style={styles.boutonSymbole} onPress={() => inserer(s)}>
          <Text style={styles.texteSymbole}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function Exercices() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const exoId = (params.id as string) || '1ere_c_math_ex1';

  const [exoData, setExoData] = useState<Exercice | null>(null);
  const [loading, setLoading] = useState(true);

  const [reponse, setReponse] = useState('');
  const [indiceActuel, setIndiceActuel] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [dejaResolu, setDejaResolu] = useState(false);
  // 🧠 Pédagogie : le 1er indice n'est révélé qu'après UNE tentative —
  // le "productive struggle" vaut mieux que lire l'indice tout de suite.
  const [tentativeFaite, setTentativeFaite] = useState(false);
  const [confettis, setConfettis] = useState(false);
  
  useEffect(() => {
    const fetchExo = async () => {
      try {
        setLoading(true);
        setReponse('');
        setIndiceActuel(0);
        setFeedback('');
        setIsCorrect(false);
        setTentativeFaite(false);
        setConfettis(false);

        // 1) CACHE D'ABORD : instantané, marche sans internet
        let dataCache: Exercice | null = null;
        try {
          dataCache = await getExoById(exoId);
        } catch {
          dataCache = null;
        }
        if (dataCache) {
          setExoData(dataCache);
        }

        // 2) FIREBASE ensuite : version à jour + synchronisation XP
        try {
          const docRef = doc(db, 'exercices', exoId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const brut = docSnap.data() as Partial<Exercice>;
            setExoData({ classe: '', matiere: '', chapitre: '', chapitre_id: '', difficulte: '1', enonce: '', bonne_reponse: '', ...brut, id: exoId });
          } else if (!dataCache) {
            setExoData(null);
            setFeedback('Exercice introuvable.');
          }
        } catch (erreurReseau) {
          if (dataCache) {
            // Tout va bien : on affiche déjà la version du cache
          } else {
            setExoData(null);
            setFeedback('Impossible de charger cet exercice (pas de connexion). Astuce : télécharge le chapitre depuis la liste quand tu as le wifi du LEX.');
          }
        }

        // A-t-on déjà résolu cet exercice (anti-farm persistant) ?
        try {
          const stockage = await AsyncStorage.getItem('lex_exos_resolus');
          const resolus: string[] = tableauDeChaines(stockage);
          setDejaResolu(resolus.includes(exoId));
        } catch {
          setDejaResolu(false);
        }
      } catch (error) {
        rapporterErreur('Erreur : ', error);
      } finally {
        setLoading(false);
      }
    };
    fetchExo();
  }, [exoId]);

  const marquerResolu = async () => {
    try {
      const stockage = await AsyncStorage.getItem('lex_exos_resolus');
      const resolus: string[] = tableauDeChaines(stockage);
      if (!resolus.includes(exoId)) {
        resolus.push(exoId);
        await AsyncStorage.setItem('lex_exos_resolus', JSON.stringify(resolus));
      }
      // 📊 Trace l'activité par matière pour les alertes de stagnation (amélioration 9)
      const { enregistrerActivite } = await import('../services/stagnation');
      await enregistrerActivite((exoData?.matiere as string) || 'Mathématiques');
    } catch (error) {
      rapporterErreur('Erreur sauvegarde exo résolu : ', error);
    }
  };

  const verifier = async () => {
    if (!exoData) return;

    const juste = estJuste(reponse, exoData.bonne_reponse);

    // Suivi d'apprentissage + répétition espacée (marche hors-ligne)
    try {
      await enregistrerTentative({ id: exoId, chapitre_id: exoData.chapitre_id, difficulte: exoData.difficulte }, juste);
      if (exoData.id) await planifierRevision(exoData, juste);
    } catch {
      // le suivi ne doit jamais bloquer l'exercice
    }

    if (juste) {
      setIsCorrect(true);

      // Déjà résolu avant (sur ce téléphone) : pas de XP à regagner
      if (dejaResolu) {
        setFeedback('✅ BRAVO ! Tu avais déjà validé cet exercice (et déjà gagné tes XP). Enchaîne sur un autre !');
        return;
      }

      const xpGagnes = xpPourDifficulte(exoData.difficulte);

      // 🔄 LOCAL-FIRST : l'exercice est marqué résolu ET les XP crédités
      // LOCALEMENT AVANT tout accès réseau. Avant, l'XP ne passait QUE par
      // Firestore : hors-ligne (cas principal des élèves du LEX), la
      // récompense était perdue et l'exercice jamais marqué → l'élève
      // pouvait retenter à l'infini sans jamais recevoir ses XP.
      setFeedback(alea(BRAVOS).replace('{XP}', String(xpGagnes)));
      setDejaResolu(true);
      await marquerResolu();

      // 🎉 Célébration à chaque première réussite (motivation instantanée).
      setConfettis(true);
      setTimeout(() => setConfettis(false), 2200);

      try {
        // XP instantanés en local (AsyncStorage) → visibles partout, tout
        // de suite, même après 4 jours sans wifi.
        await gagnerXp(xpGagnes);
        await validerStreakDuJour();

        // Poussée cloud best-effort : en ligne → immédiate via increment()
        // (atomique) ; hors-ligne → la file offline-first l'enverra au
        // retour du wifi. Aucun crash possible dans les deux cas.
        const userId = await AsyncStorage.getItem('lex_user_id');
        if (userId) {
          await pousserCompteur('utilisateurs', userId, { xp: xpGagnes });
        }
      } catch (erreurXp) {
        // Les XP sont déjà crédités localement : l'élève ne perd JAMAIS sa
        // récompense, la sync rattrapera plus tard.
        rapporterErreur('XP cloud reporté (sera synchronisé plus tard) : ', erreurXp);
      }
    } else {
      // 🧠 FEEDBACK CIBLÉ : on qualifie l'erreur (signe oublié, unité
      // manquante, presque...) au lieu d'un encouragement générique.
      const diagnostic = classifierErreur(reponse, exoData.bonne_reponse);
      setFeedback(diagnostic.message);
      setIsCorrect(false);
      setTentativeFaite(true);
    }
  };


  const lireEnonce = async () => {
    if (exoData?.enonce) {
      // expo-speech v57 : isSpeaking() renvoie une promesse — on stoppe avant de relire
      Speech.stop();
      // Plafond du mode économie de données (cohérent avec cours.tsx)
      const plafond = await plafondTexteAudio();
      Speech.speak(String(exoData.enonce).slice(0, plafond), { language: 'fr', rate: 0.95 });
    }
  };

  const demanderIndice = () => {
    // 🧠 PÉDAGOGIE : pas d'indice avant au moins une tentative.
    // Lutter contre la dépendance aux indices : le cerveau consolide en
    // cherchant, pas en lisant la solution.
    if (!tentativeFaite && indiceActuel === 0) {
      setFeedback("💪 Essaie D'ABORD une réponse, même fausse ! Ton indice arrive juste après — c'est comme ça que ton cerveau retient le mieux.");
      setIsCorrect(false);
      return;
    }
    if (indiceActuel < 3) {
      setIndiceActuel(indiceActuel + 1);
    } else {
      setFeedback('💡 Je t\'ai donné tous les indices ! Réfléchis bien à la dernière étape.');
      setIsCorrect(false);
    }
  };

  const signaler = () => {
    Alert.alert(
      '⚠️ Signaler un problème sur cet exercice ?',
      'Ta déclaration aide à corriger la base pour tous les élèves du LEX.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réponse fausse',
          onPress: async () => {
            const envoye = await signalerExercice(exoId, 'reponse_fausse');
            setFeedback(envoye ? '🙏 Signalement envoyé, merci !' : '🙏 Signalement enregistré : envoyé au prochain wifi.');
            setIsCorrect(false);
          },
        },
        {
          text: 'Énoncé mal formulé',
          onPress: async () => {
            const envoye = await signalerExercice(exoId, 'enonce_mal_formule');
            setFeedback(envoye ? '🙏 Signalement envoyé, merci !' : '🙏 Signalement enregistré : envoyé au prochain wifi.');
            setIsCorrect(false);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
        <Text style={styles.loadingText}>Chargement de l'exercice...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {confettis && <Confettis />}
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>
          {exoData?.classe ? `PRATIQUE - ${exoData.classe}` : 'PRATIQUE'}
          {exoData?.matiere ? ` - ${exoData.matiere}` : ''}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.cardExo}>
          <View style={styles.rowTitre}>
            <Text style={styles.cardTitle}>✍️ Exercice{exoData?.chapitre ? ` - ${exoData.chapitre}` : ''}</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.ttsBtn} onPress={lireEnonce}>
                <Text style={styles.ttsBtnText}>🔊</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ttsBtn, { marginLeft: 6 }]} onPress={signaler}>
                <Text style={styles.ttsBtnText}>⚠️</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.questionText}>{exoData?.enonce}</Text>

          <ClavierMath inserer={(s) => setReponse(reponse + s)} />
          <TextInput
            style={styles.input}
            placeholder="Ta réponse ici (ex: 3 ou un mot)"
            placeholderTextColor="#64748B"
            value={reponse}
            onChangeText={setReponse}
          />

          <TouchableOpacity style={styles.checkBtn} onPress={verifier}>
            <Text style={styles.checkBtnText}>Vérifier ma réponse</Text>
          </TouchableOpacity>

          {feedback !== '' && (
            <View style={[styles.feedbackBox, isCorrect ? styles.feedbackSuccess : styles.feedbackError]}>
              <Text style={styles.feedbackText}>{feedback}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardAI}>
          <Text style={styles.cardTitleAI}>💡 Indice — Assistant Pédagogique</Text>
          <Text style={styles.aiIntro}>Bloqué ? Je ne te donnerai pas la réponse, mais je vais te guider étape par étape comme un vrai prof du LEX.</Text>

          {indiceActuel >= 1 && (
            <View style={styles.bubbleAI}><Text style={styles.bubbleText}>{exoData?.indice1}</Text></View>
          )}
          {indiceActuel >= 2 && (
            <View style={styles.bubbleAI}><Text style={styles.bubbleText}>{exoData?.indice2}</Text></View>
          )}
          {indiceActuel >= 3 && (
            <View style={styles.bubbleAI}><Text style={styles.bubbleText}>{exoData?.explication}</Text></View>
          )}

          <TouchableOpacity style={styles.aiBtn} onPress={demanderIndice}>
            <Text style={styles.aiBtnText}>
              {indiceActuel === 0 ? (tentativeFaite ? '💡 Demander un indice' : '💪 Essaie d\'abord, puis demande un indice') : indiceActuel < 3 ? "Demander l'indice suivant" : 'Voir tous les indices'}
            </Text>
          </TouchableOpacity>
        </View>

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
  scrollView: { paddingHorizontal: 20 },

  // Carte exercice moderne avec gradient subtil
  cardExo: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  rowTitre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  ttsBtn: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  ttsBtnText: { fontSize: 18 },
  microBtn: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#7C3AED', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 15 },
  microBtnActif: { backgroundColor: '#2D1F40', borderColor: '#8B5CF6' },
  microBtnText: { color: '#C4B5FD', fontWeight: 'bold', fontSize: 14 },
  rowSymboles: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  boutonSymbole: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 10, width: '12%', paddingVertical: 10, alignItems: 'center' },
  texteSymbole: { color: '#D1D5DB', fontSize: 17, fontWeight: 'bold' },
  cardTitle: { color: '#10B981', fontSize: 18, fontWeight: 'bold', flex: 1 },
  questionText: { color: '#E5E7EB', fontSize: 16, lineHeight: 26, marginBottom: 20, fontWeight: '500' },
  input: {
    backgroundColor: '#1F2937',
    borderWidth: 2,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
    color: '#F9FAFB',
    fontSize: 16,
    marginBottom: 20,
  },
  checkBtn: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },

  feedbackBox: { marginTop: 15, padding: 16, borderRadius: 12, borderWidth: 2 },
  feedbackSuccess: { backgroundColor: '#064E3B', borderColor: '#10B981' },
  feedbackError: { backgroundColor: '#7F1D1D', borderColor: '#EF4444' },
  feedbackText: { fontSize: 15, fontWeight: 'bold', lineHeight: 22, color: '#FFFFFF' },

  // Carte AI avec design moderne
  cardAI: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#7C3AED',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitleAI: { color: '#A78BFA', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  aiIntro: { color: '#9CA3AF', fontSize: 14, fontStyle: 'italic', marginBottom: 15 },
  bubbleAI: { backgroundColor: '#1F2937', borderRadius: 14, padding: 16, marginBottom: 10, borderBottomRightRadius: 4 },
  bubbleText: { color: '#E5E7EB', fontSize: 14, lineHeight: 22 },
  aiBtn: {
    backgroundColor: '#7C3AED',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 5,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  aiBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
