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
import { getAllCoursCache } from '../services/cacheHorsLigne';
import {
  creerDevoir,
  listeDevoirs,
  resultatsDevoir,
  verifierCodeProf,
  type Devoir,
  type ReponseDevoir,
} from '../services/devoirsService';

const CLASSES = ['2nde C', '1ère C', '1ère D', 'Tle C', 'Tle D'];

export default function Professeur() {
  const router = useRouter();
  const [connecte, setConnecte] = useState(false);
  const [code, setCode] = useState('');
  const [chargement, setChargement] = useState(false);

  // Création
  const [titre, setTitre] = useState('');
  const [classe, setClasse] = useState(CLASSES[0]);
  const [nbExos, setNbExos] = useState(10);
  const [niveau, setNiveau] = useState(30);
  const [dateLimite, setDateLimite] = useState('');

  // Suivi
  const [mesDevoirs, setMesDevoirs] = useState<Devoir[]>([]);
  const [resultats, setResultats] = useState<{ devoir: Devoir; reponses: ReponseDevoir[] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await AsyncStorage.getItem('lex_prof_code');
        if (c === 'ok') {
          setConnecte(true);
          await chargerDevoirs();
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const chargerDevoirs = async () => {
    setChargement(true);
    try {
      // Récupère les devoirs de toutes les classes du prof (limité)
      const tous: Devoir[] = [];
      for (const c of CLASSES) {
        tous.push(...(await listeDevoirs(c)));
      }
      setMesDevoirs(tous.slice(0, 30));
    } catch {
      Alert.alert('Hors-ligne', "L'espace prof nécessite une connexion internet.");
    } finally {
      setChargement(false);
    }
  };

  const seConnecter = async () => {
    if (await verifierCodeProf(code)) {
      setConnecte(true);
      await AsyncStorage.setItem('lex_prof_code', 'ok');
      chargerDevoirs();
    } else {
      Alert.alert('Code refusé', 'Code professeur incorrect.');
    }
  };

  const publier = async () => {
    if (!titre.trim()) {
      Alert.alert('Titre manquant', 'Donne un titre à ton devoir.');
      return;
    }
    setChargement(true);
    try {
      const cours = await getAllCoursCache();
      // Devoir basé sur le générateur : la classe reçoit un chapitre au choix du prof
      // v1 : devoir "chapitre entier" — l'élève choisit n'importe quel chapitre de la matière
      const nomProf = (await AsyncStorage.getItem('lex_user_nom')) || 'Professeur';
      await creerDevoir({
        titre: titre.trim(),
        classe,
        matiere: 'Toutes',
        chapitreId: 'libre',
        chapitreTitre: 'Chapitre au choix de l\'élève',
        nbExercices: nbExos,
        niveauGenerateur: niveau,
        dateLimite: dateLimite || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        profNom: nomProf,
      });
      setTitre('');
      Alert.alert('✅ Devoir publié !', `Les élèves de ${classe} le voient dans 🎯 Plus → 📝 Devoirs.`);
      chargerDevoirs();
    } catch {
      Alert.alert('Erreur', 'Impossible de publier (connexion ?).');
    } finally {
      setChargement(false);
    }
  };

  const voirResultats = async (d: Devoir) => {
    setChargement(true);
    try {
      const reponses = await resultatsDevoir(d.id);
      setResultats({ devoir: d, reponses });
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les résultats.');
    } finally {
      setChargement(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backBtn}>‹ Retour</Text>
      </TouchableOpacity>
      <Text style={styles.subject}>RÉSERVÉ AUX ENSEIGNANTS</Text>
      <Text style={styles.title}>👨‍🏫 Espace Professeurs</Text>
    </View>
  );

  if (!connecte) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.connexion}>
          <Text style={styles.connexionTexte}>Entre le code professeur pour créer des devoirs et suivre les classes.</Text>
          <TextInput style={styles.input} placeholder="Code professeur" placeholderTextColor="#64748B" value={code} onChangeText={setCode} secureTextEntry />
          <TouchableOpacity style={styles.bouton} onPress={seConnecter}>
            <Text style={styles.boutonText}>Entrer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (resultats) {
    const { devoir, reponses } = resultats;
    const moyenne = reponses.length > 0 ? (reponses.reduce((s, r) => s + r.score / Math.max(r.total, 1), 0) / reponses.length) * 100 : 0;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.titreDevoir}>{devoir.titre} — {devoir.classe}</Text>
          <Text style={styles.statistiques}>
            👥 {reponses.length} rendu(s) · moyenne {Math.round(moyenne)}% · limite {devoir.dateLimite}
          </Text>
          {reponses.length === 0 ? (
            <Text style={styles.vide}>Aucun élève n'a encore rendu ce devoir.</Text>
          ) : (
            reponses.map((r, i) => (
              <View key={i} style={styles.ligne}>
                <Text style={styles.rang}>{i + 1}.</Text>
                <Text style={styles.nom} numberOfLines={1}>{r.eleveNom || 'Anonyme'}</Text>
                <Text style={styles.score}>{r.score}/{r.total} ({Math.round((r.score / Math.max(r.total, 1)) * 100)}%)</Text>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.boutonRetour} onPress={() => setResultats(null)}>
            <Text style={styles.boutonRetourText}>‹ Mes devoirs</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {header}
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {chargement ? <ActivityIndicator color="#FBBF24" style={{ marginBottom: 15 }} /> : null}

        {/* Créer */}
        <Text style={styles.section}>➕ Créer un devoir</Text>
        <TextInput style={styles.input} placeholder="Titre (ex: DS Dérivation)" placeholderTextColor="#64748B" value={titre} onChangeText={setTitre} />
        <View style={styles.rowChips}>
          {CLASSES.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, classe === c && styles.chipActive]} onPress={() => setClasse(c)}>
              <Text style={[styles.chipText, classe === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.rowReglages}>
          <View style={styles.reglage}>
            <Text style={styles.reglageLabel}>Exercices</Text>
            <View style={styles.rowPetit}>
              {[5, 10, 20].map((n) => (
                <TouchableOpacity key={n} style={[styles.petitBtn, nbExos === n && styles.petitBtnActif]} onPress={() => setNbExos(n)}>
                  <Text style={styles.petitBtnText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.reglage}>
            <Text style={styles.reglageLabel}>Niveau (1-100)</Text>
            <View style={styles.rowPetit}>
              {[20, 40, 60, 80].map((n) => (
                <TouchableOpacity key={n} style={[styles.petitBtn, niveau === n && styles.petitBtnActif]} onPress={() => setNiveau(n)}>
                  <Text style={styles.petitBtnText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        <TextInput style={styles.input} placeholder="Date limite (AAAA-MM-JJ, optionnel)" placeholderTextColor="#64748B" value={dateLimite} onChangeText={setDateLimite} />
        <TouchableOpacity style={styles.bouton} onPress={publier}>
          <Text style={styles.boutonText}>📣 Publier le devoir</Text>
        </TouchableOpacity>

        {/* Mes devoirs */}
        <Text style={styles.section}>📋 Mes devoirs récents</Text>
        {mesDevoirs.length === 0 ? (
          <Text style={styles.vide}>Aucun devoir pour le moment.</Text>
        ) : (
          mesDevoirs.map((d) => (
            <TouchableOpacity key={d.id} style={styles.carteDevoir} onPress={() => voirResultats(d)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.devoirTitre} numberOfLines={1}>{d.titre}</Text>
                <Text style={styles.devoirDetail}>{d.classe} · {d.nbExercices} exos · niv. {d.niveauGenerateur} · avant le {d.dateLimite}</Text>
              </View>
              <Text style={styles.fleche}>📊</Text>
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
  connexion: { padding: 30 },
  connexionTexte: { color: '#94A3B8', fontSize: 14, lineHeight: 21, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 14, color: '#F8FAFC', fontSize: 15, marginBottom: 12 },
  bouton: { backgroundColor: '#10B981', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 25 },
  boutonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  section: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  chipText: { color: '#94A3B8', fontSize: 13 },
  chipTextActive: { color: '#0F172A', fontWeight: 'bold' },
  rowReglages: { flexDirection: 'row', marginBottom: 12 },
  reglage: { flex: 1, marginRight: 10 },
  reglageLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 6 },
  rowPetit: { flexDirection: 'row' },
  petitBtn: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 6 },
  petitBtnActif: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  petitBtnText: { color: '#F8FAFC', fontSize: 13 },
  vide: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic' },
  carteDevoir: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  devoirTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold' },
  devoirDetail: { color: '#64748B', fontSize: 11, marginTop: 4 },
  fleche: { fontSize: 22 },
  titreDevoir: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  statistiques: { color: '#FBBF24', fontSize: 13, marginBottom: 15 },
  ligne: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, padding: 14, marginBottom: 8 },
  rang: { color: '#94A3B8', width: 28, fontSize: 13 },
  nom: { color: '#F8FAFC', fontSize: 14, flex: 1, fontWeight: 'bold' },
  score: { color: '#FBBF24', fontSize: 12 },
  boutonRetour: { marginTop: 15, alignItems: 'center', padding: 10 },
  boutonRetourText: { color: '#FBBF24', fontSize: 14 },
});
