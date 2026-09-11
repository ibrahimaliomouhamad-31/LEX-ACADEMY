import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { creerObjectif, listeObjectifs, completerObjectif, type ObjectifPersonnel } from '../services/devoirsService';
import { estJuste } from '../services/outilsReponse';
import { genererExercice, niveauLabel, type ExoGenere } from '../services/generateurLocal';
import { jourLocal } from '../utils/correctifsAudit';

const CHAPITRES_DISPONIBLES = [
  { id: 'tle_c_math_chap1', titre: 'Algèbre', matiere: 'Mathématiques' },
  { id: 'tle_c_math_chap2', titre: 'Analyse', matiere: 'Mathématiques' },
  { id: 'tle_c_math_chap3', titre: 'Géométrie', matiere: 'Mathématiques' },
  { id: 'tle_c_phys_chap1', titre: 'Mécanique', matiere: 'Physique' },
  { id: 'tle_c_phys_chap2', titre: 'Électricité', matiere: 'Physique' },
  { id: 'tle_c_chimie_chap1', titre: 'Chimie organique', matiere: 'Chimie' },
];

export default function Devoirs() {
  const router = useRouter();
  const [objectifs, setObjectifs] = useState<ObjectifPersonnel[]>([]);
  const [chargement, setChargement] = useState(true);

  // Créer un objectif
  const [creationVisible, setCreationVisible] = useState(false);
  const [titre, setTitre] = useState('');
  const [chapitreId, setChapitreId] = useState(CHAPITRES_DISPONIBLES[0].id);
  const [nbExercices, setNbExercices] = useState(10);
  const [niveau, setNiveau] = useState(30);

  // Faire un objectif
  const [objectifActif, setObjectifActif] = useState<ObjectifPersonnel | null>(null);
  const [questions, setQuestions] = useState<ExoGenere[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [termine, setTermine] = useState(false);

  useEffect(() => {
    chargerObjectifs();
  }, []);

  const chargerObjectifs = async () => {
    try {
      const uid = await AsyncStorage.getItem('lex_user_id');
      if (uid) {
        const objs = await listeObjectifs(uid);
        setObjectifs(objs);
      }
    } catch {
      // hors-ligne
    } finally {
      setChargement(false);
    }
  };

  const creerNouvelObjectif = async () => {
    if (!titre.trim()) {
      Alert.alert('Titre manquant', 'Donne un titre à ton objectif.');
      return;
    }
    try {
      const uid = await AsyncStorage.getItem('lex_user_id') || 'invite';
      const nom = await AsyncStorage.getItem('lex_user_nom') || 'Anonyme';
      const classe = await AsyncStorage.getItem('lex_classe_actuelle') || 'Tle C';
      const chap = CHAPITRES_DISPONIBLES.find(c => c.id === chapitreId);
      
      await creerObjectif({
        eleveNom: nom,
        eleveId: uid,
        titre: titre.trim(),
        classe,
        matiere: chap?.matiere || 'Mathématiques',
        chapitreId,
        chapitreTitre: chap?.titre || 'Chapitre',
        nbExercices,
        niveauGenerateur: niveau,
        dateLimite: jourLocal(new Date(Date.now() + 7 * 86400000)),
      });
      
      setTitre('');
      setCreationVisible(false);
      Alert.alert('✅ Objectif créé !', `Tu as ${nbExercices} exercices à faire. Bonne chance !`);
      chargerObjectifs();
    } catch {
      Alert.alert('Erreur', 'Impossible de créer l\'objectif. Réessaie.');
    }
  };

  const demarrerObjectif = (obj: ObjectifPersonnel) => {
    const qs: ExoGenere[] = [];
    for (let i = 0; i < obj.nbExercices; i++) {
      qs.push(genererExercice(obj.chapitreId, obj.chapitreTitre, obj.niveauGenerateur));
    }
    setObjectifActif(obj);
    setQuestions(qs);
    setIndex(0);
    setScore(0);
    setReponse('');
    setFeedback('');
    setTermine(false);
  };

  const valider = () => {
    const exo = questions[index];
    if (!exo || reponse.trim() === '' || feedback !== '') return;
    const juste = estJuste(reponse, exo.bonne_reponse);
    if (juste) setScore((s) => s + 1);
    setFeedback(juste ? '✅ EXACT !' : `❌ Réponse : ${exo.bonne_reponse.split('|')[0]}\n📖 ${exo.explication}`);
  };

  const suivant = async () => {
    if (index + 1 >= questions.length) {
      setTermine(true);
      if (objectifActif) {
        await completerObjectif(objectifActif.id, score, questions.length);
      }
    } else {
      setIndex(index + 1);
      setReponse('');
      setFeedback('');
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => (objectifActif ? setObjectifActif(null) : router.back())}>
        <Text style={styles.backBtn}>‹ {objectifActif ? 'Mes Objectifs' : 'Retour'}</Text>
      </TouchableOpacity>
      <Text style={styles.subject}>MES OBJECTIFS PERSONNELS</Text>
      <Text style={styles.title}>🎯 Mes Objectifs</Text>
    </View>
  );

  // Créer un objectif
  if (creationVisible) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCreationVisible(false)}>
            <Text style={styles.backBtn}>‹ Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.subject}>CRÉER UN OBJECTIF</Text>
          <Text style={styles.title}>🎯 Nouvel Objectif</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={styles.carteCreation}>
            <Text style={styles.label}>Titre de l'objectif</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Réviser les équations du 2nd degré"
              placeholderTextColor="#64748B"
              value={titre}
              onChangeText={setTitre}
            />
            
            <Text style={styles.label}>Chapitre</Text>
            <View style={styles.rowChips}>
              {CHAPITRES_DISPONIBLES.map((chap) => (
                <TouchableOpacity
                  key={chap.id}
                  style={[styles.chip, chapitreId === chap.id && styles.chipActif]}
                  onPress={() => setChapitreId(chap.id)}
                >
                  <Text style={[styles.chipText, chapitreId === chap.id && styles.chipTextActif]}>
                    {chap.titre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Nombre d'exercices : {nbExercices}</Text>
            <View style={styles.rowChips}>
              {[5, 10, 15, 20].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, nbExercices === n && styles.chipActif]}
                  onPress={() => setNbExercices(n)}
                >
                  <Text style={[styles.chipText, nbExercices === n && styles.chipTextActif]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Niveau : {niveauLabel(niveau)}</Text>
            <View style={styles.rowChips}>
              {[10, 30, 50, 70, 90].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, niveau === n && styles.chipActif]}
                  onPress={() => setNiveau(n)}
                >
                  <Text style={[styles.chipText, niveau === n && styles.chipTextActif]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.boutonCreer} onPress={creerNouvelObjectif}>
              <Text style={styles.boutonCreerText}>🎯 Créer mon objectif</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Résultat
  if (objectifActif && termine) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
        {header}
        <View style={styles.centre}>
          <Text style={styles.grandeNote}>{score}/{questions.length}</Text>
          <Text style={styles.texteNote}>
            {score === questions.length
              ? 'PARFAIT ! Tu es un champion du LEX ! 🏆'
              : score >= questions.length * 0.7
              ? 'Excellent travail ! Continue comme ça ! 💪'
              : score >= questions.length * 0.5
              ? 'Pas mal ! Reveille le champion qui est en toi ! 🔥'
              : 'Courage ! Réessaie et tu vas y arriver ! 💯'}
          </Text>
          <TouchableOpacity style={styles.bouton} onPress={() => { setObjectifActif(null); chargerObjectifs(); }}>
            <Text style={styles.boutonText}>Retour à mes objectifs</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // En train de faire l'objectif
  if (objectifActif) {
    const exo = questions[index];
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
        {header}
        <View style={styles.barreInfo}>
          <Text style={styles.info}>Exercice {index + 1}/{questions.length}</Text>
          <Text style={styles.infoScore}>Score : {score}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={styles.carte}>
            <Text style={styles.question}>{exo?.enonce}</Text>
            <TextInput style={styles.input} placeholder="Ta réponse..." placeholderTextColor="#64748B" value={reponse} onChangeText={setReponse} editable={feedback === ''} />
            {feedback === '' ? (
              <TouchableOpacity style={styles.boutonVert} onPress={valider}>
                <Text style={styles.boutonVertText}>Valider</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={[styles.feedback, feedback.startsWith('✅') ? styles.fbOk : styles.fbKo]}>
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
                <TouchableOpacity style={styles.boutonVert} onPress={suivant}>
                  <Text style={styles.boutonVertText}>{index + 1 >= questions.length ? 'Terminer 🏁' : 'Suivant →'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Liste des objectifs
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      {header}
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <TouchableOpacity style={styles.boutonNouveau} onPress={() => setCreationVisible(true)}>
          <Text style={styles.boutonNouveauText}>+ Créer un objectif personnel</Text>
        </TouchableOpacity>

        {chargement ? (
          <ActivityIndicator color="#FBBF24" />
        ) : objectifs.length === 0 ? (
          <Text style={styles.vide}>
            Tu n'as pas encore d'objectif. Crée-en un pour commencer à réviser !
          </Text>
        ) : (
          objectifs.map((obj) => (
            <TouchableOpacity
              key={obj.id}
              style={[styles.carteObjectif, obj.complete && styles.carteObjectifComplete]}
              onPress={() => !obj.complete && demarrerObjectif(obj)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.objectifTitre} numberOfLines={1}>
                  {obj.complete ? '✅ ' : '🎯 '}{obj.titre}
                </Text>
                <Text style={styles.objectifDetail}>
                  {obj.chapitreTitre} · {obj.nbExercices} exercices · {niveauLabel(obj.niveauGenerateur)}
                  {obj.scoreFinal !== undefined && `\n📊 Score : ${obj.scoreFinal}%`}
                </Text>
              </View>
              {!obj.complete && <Text style={styles.fleche}>▶</Text>}
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
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10, backgroundColor: '#0F172A' },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10, fontWeight: '600' },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  barreInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#111827', marginHorizontal: 20, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1F2937' },
  info: { color: '#D1D5DB', fontSize: 12, fontWeight: 'bold' },
  infoScore: { color: '#10B981', fontSize: 12, fontWeight: 'bold' },
  carte: { backgroundColor: '#111827', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#10B981' },
  question: { color: '#E5E7EB', fontSize: 16, lineHeight: 26, marginBottom: 20, fontWeight: '600' },
  input: { backgroundColor: '#1F2937', borderWidth: 2, borderColor: '#374151', borderRadius: 12, padding: 16, color: '#F9FAFB', fontSize: 16, marginBottom: 15 },
  boutonVert: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center' },
  boutonVertText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  feedback: { padding: 16, borderRadius: 12, borderWidth: 2, marginBottom: 12 },
  fbOk: { backgroundColor: '#064E3B', borderColor: '#10B981' },
  fbKo: { backgroundColor: '#7F1D1D', borderColor: '#EF4444' },
  feedbackText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  grandeNote: { color: '#FBBF24', fontSize: 64, fontWeight: 'bold' },
  texteNote: { color: '#D1D5DB', fontSize: 15, textAlign: 'center', marginTop: 10, marginBottom: 25, lineHeight: 22 },
  bouton: { backgroundColor: '#374151', paddingHorizontal: 25, paddingVertical: 13, borderRadius: 12 },
  boutonText: { color: '#F9FAFB', fontWeight: 'bold' },
  vide: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  boutonNouveau: { backgroundColor: '#FBBF24', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 20 },
  boutonNouveauText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  carteObjectif: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F59E0B' },
  carteObjectifComplete: { borderColor: '#10B981', opacity: 0.8 },
  objectifTitre: { color: '#F9FAFB', fontSize: 15, fontWeight: 'bold' },
  objectifDetail: { color: '#9CA3AF', fontSize: 11, marginTop: 4, lineHeight: 17 },
  fleche: { color: '#FBBF24', fontSize: 20, marginLeft: 10 },
  carteCreation: { backgroundColor: '#111827', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#374151' },
  label: { color: '#D1D5DB', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  chip: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipActif: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  chipText: { color: '#D1D5DB', fontSize: 13, fontWeight: '500' },
  chipTextActif: { color: '#0F172A', fontWeight: 'bold' },
  boutonCreer: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  boutonCreerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
