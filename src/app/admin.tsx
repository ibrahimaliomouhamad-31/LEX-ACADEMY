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
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// ADMINISTRATION — le créateur de l'app est le "proviseur" : le PREMIER nom
// enregistré dans la collection 'admins' devient admin à vie. Il peut ensuite
// ajouter d'autres élèves à l'administration (qui gardent leur rôle d'élève).
// Retrait d'un admin : directement depuis la console Firestore (collection 'admins').

interface Admin {
  id: string;
  nom: string;
  ajouteLe: string;
  userId?: string;
}

export default function Admin() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [estAdmin, setEstAdmin] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [horsLigne, setHorsLigne] = useState(false);
  const [nouvelAdmin, setNouvelAdmin] = useState('');

  // Dashboard
  const [statsClasses, setStatsClasses] = useState<{ classe: string; joueurs: number; defis: number; points: number }[]>([]);
  const [signalements, setSignalements] = useState<{ exoId: string; raison: string; dateISO: string }[]>([]);
  const [triches, setTriches] = useState<{ ref: string; nom: string; score: number; suspect: boolean }[]>([]);

  useEffect(() => {
    (async () => {
      const n = await AsyncStorage.getItem('lex_user_nom');
      const uid = await AsyncStorage.getItem('lex_user_id');
      if (n) setNom(n);
      await charger(n || '', uid || '');
    })();
  }, []);

  const charger = async (nomEleve: string, uidEleve: string = '') => {
    setChargement(true);
    try {
      const snap = await getDocs(collection(db, 'admins'));
      const liste: Admin[] = [];
      snap.forEach((d) => liste.push({ id: d.id, nom: (d.data() as { nom?: string }).nom || d.id, ajouteLe: (d.data() as { ajouteLe?: string }).ajouteLe || '' }));

      // 71 — ANTI-USURPATION : l'admin est identifié par son userId local,
      // pas par son nom (n'importe qui pouvait créer un compte avec ton nom).
      if (liste.length === 0 && nomEleve !== '' && uidEleve !== '') {
        // Bootstrap : le premier élève connecté à ouvrir l'écran devient proviseur
        await addDoc(collection(db, 'admins'), { nom: nomEleve, userId: uidEleve, ajouteLe: new Date().toISOString().slice(0, 10) });
        liste.push({ id: 'moi', nom: nomEleve, ajouteLe: '' });
      }
      // Migration : un admin hérité par nom est rélié à ton userId à ta 1re visite
      for (const adm of liste) {
        if (!adm.userId && nomEleve !== '' && uidEleve !== '' && adm.nom.toLowerCase() === nomEleve.toLowerCase()) {
          await addDoc(collection(db, 'admins'), { nom: adm.nom, userId: uidEleve, ajouteLe: new Date().toISOString().slice(0, 10) });
          adm.id = 'migre';
        }
      }

      liste.sort((a, b) => a.nom.localeCompare(b.nom));
      setAdmins(liste);
      setEstAdmin(uidEleve !== '' && liste.some((a) => a.userId === uidEleve));

      if (uidEleve !== '' && liste.some((a) => a.userId === uidEleve)) {
        await chargerDashboard();
      }
    } catch {
      setHorsLigne(true);
    } finally {
      setChargement(false);
    }
  };

  const chargerDashboard = async () => {
    try {
      const q = query(collection(db, 'defi_jour'), orderBy('date', 'desc'), limit(300));
      const snap = await getDocs(q);
      const agg: { [classe: string]: { joueurs: Set<string>; defis: number; points: number } } = {};
      snap.forEach((d) => {
        const donnees = d.data() as { classe?: string; score?: number; nom?: string };
        const c = donnees.classe || '?';
        if (!agg[c]) agg[c] = { joueurs: new Set(), defis: 0, points: 0 };
        agg[c].defis += 1;
        agg[c].points += donnees.score || 0;
        if (donnees.nom) agg[c].joueurs.add(donnees.nom);
      });
      setStatsClasses(
        Object.entries(agg)
          .map(([classe, s]) => ({ classe, joueurs: s.joueurs.size, defis: s.defis, points: s.points }))
          .sort((a, b) => b.points - a.points)
      );

      // 77 — Journal d'audit : scores suspects (triche)
      try {
        const snapAudit = await getDocs(query(collection(db, 'journal_audit'), limit(30)));
        const audit: { ref: string; nom: string; score: number; suspect: boolean }[] = [];
        snapAudit.forEach((d) => {
          const donnees = d.data() as { ref?: string; nom?: string; score?: number; suspect?: boolean };
          if (donnees.suspect) audit.push({ ref: donnees.ref || '', nom: donnees.nom || '?', score: donnees.score || 0, suspect: true });
        });
        setTriches(audit.slice(0, 10));
      } catch { /* ignore */ }
      const snapSign = await getDocs(query(collection(db, 'signalements'), limit(30)));
      const sig: { exoId: string; raison: string; dateISO: string }[] = [];
      snapSign.forEach((d) => {
        const donnees = d.data() as { exoId?: string; raison?: string; dateISO?: string };
        sig.push({ exoId: donnees.exoId || '?', raison: donnees.raison || '?', dateISO: (donnees.dateISO || '').slice(0, 10) });
      });
      setSignalements(sig.reverse());
    } catch {
      // dashboard indisponible
    }
  };

  const entrer = () => {
    if (nom.trim() === '') {
      Alert.alert('Nom requis', 'Entre ton nom d\'élève (celui de ton compte).');
      return;
    }
    charger(nom.trim());
  };

  const ajouterAdmin = async () => {
    if (nouvelAdmin.trim() === '') return;
    try {
      Alert.alert('Ajout impossible pour l\'instant', 'Pour promouvoir un élève sans risque d\'usurpation, demande-lui d\'ouvrir une fois 🏛️ Administration : il deviendra admin s\'il est sur TON téléphone, sinon ajoute-le depuis la console Firestore avec son userId.');
      setNouvelAdmin('');
      charger(nom);
    } catch {
      Alert.alert('Erreur', 'Connexion requise pour ajouter un admin.');
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backBtn}>‹ Retour</Text>
      </TouchableOpacity>
      <Text style={styles.subject}>DIRECTION DE L'APP</Text>
      <Text style={styles.title}>🏛️ Administration LEX</Text>
    </View>
  );

  if (chargement) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <ActivityIndicator size="large" color="#FBBF24" style={{ marginTop: 50 }} />
      </View>
    );
  }

  if (horsLigne) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <Text style={styles.vide}>📴 L'administration nécessite une connexion (wifi du LEX).</Text>
      </View>
    );
  }

  if (!estAdmin) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.blocConnexion}>
          <Text style={styles.intro}>
            Écran réservé à l'administration (proviseur + admins désignés).{'\n'}
            Le premier nom enregistré devient proviseur. Entre ton nom exact de compte élève.
          </Text>
          <TextInput style={styles.input} placeholder="Ton nom d'élève" placeholderTextColor="#64748B" value={nom} onChangeText={setNom} />
          <TouchableOpacity style={styles.bouton} onPress={entrer}>
            <Text style={styles.boutonText}>Entrer</Text>
          </TouchableOpacity>
          <Text style={styles.listeActuelle}>Admins actuels : {admins.map((a) => a.nom).join(', ') || 'aucun'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {header}
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Dashboard école */}
        <Text style={styles.section}>📊 Vue de l'école (30 derniers jours de défis)</Text>
        {statsClasses.length === 0 ? (
          <Text style={styles.vide}>Aucun défi joué encore. Les stats apparaîtront dès que les élèves joueront au 📰 Défi du jour.</Text>
        ) : (
          statsClasses.map((c, i) => (
            <View key={c.classe} style={styles.ligneClasse}>
              <Text style={styles.rangClasse}>{i + 1}.</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomClasse}>{c.classe}</Text>
                <Text style={styles.detailClasse}>{c.joueurs} élève(s) actifs · {c.defis} défis · {c.points} pts</Text>
              </View>
            </View>
          ))
        )}

        {/* Signalements */}
        <Text style={styles.section}>⚠️ Exercices signalés par les élèves ({signalements.length})</Text>
        {signalements.length === 0 ? (
          <Text style={styles.vide}>Aucun signalement : la base est propre ! 🎉</Text>
        ) : (
          signalements.map((s, i) => (
            <View key={i} style={styles.ligneSignalement}>
              <Text style={styles.signExo} numberOfLines={1}>{s.exoId}</Text>
              <Text style={styles.signRaison}>{s.raison === 'reponse_fausse' ? '❌ réponse fausse' : '✏️ énoncé mal formulé'} · {s.dateISO}</Text>
            </View>
          ))
        )}

        {/* Demandes d'aide (mots de passe oubliés) : visibles dans la console
            Firestore, collection "demandes_aide" — réinitialise le mot de passe
            de l'élève via la console (Auth > Users > Reset password). */}

        {/* Triche */}
        <Text style={styles.section}>🚨 Scores suspects ({triches.length})</Text>
        {triches.length === 0 ? (
          <Text style={styles.vide}>Aucun score suspect : jeu propre ! 🎉</Text>
        ) : (
          triches.map((t, i) => (
            <View key={i} style={styles.ligneSignalement}>
              <View style={{ flex: 1 }}>
                <Text style={styles.signExo}>⚠️ {t.nom} — score {t.score}</Text>
              </View>
              <TouchableOpacity onPress={async () => { try { await deleteDoc(doc(db, 'defi_jour', t.ref)); setTriches((liste) => liste.filter((x) => x.ref !== t.ref)); } catch { /* ignore */ } }}>
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>Annuler ✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Gestion des admins */}
        <Text style={styles.section}>👥 Administration ({admins.length})</Text>
        {admins.map((a) => (
          <View key={a.id} style={styles.ligneAdmin}>
            <Text style={styles.nomAdmin}>👤 {a.nom}{a.ajouteLe ? ` (ajouté le ${a.ajouteLe})` : ' — proviseur 👑'}</Text>
          </View>
        ))}
        <View style={styles.rowAjout}>
          <TextInput style={styles.inputAjout} placeholder="Nom d'un élève à promouvoir" placeholderTextColor="#64748B" value={nouvelAdmin} onChangeText={setNouvelAdmin} />
          <TouchableOpacity style={styles.boutonAjout} onPress={ajouterAdmin}>
            <Text style={styles.boutonAjoutText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.noteRetrait}>Pour retirer un admin : supprime son document dans Firestore (collection "admins"). Les admins restent des élèves à part entière dans l'app.</Text>
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
  vide: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
  blocConnexion: { padding: 10 },
  intro: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginBottom: 15 },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 14, color: '#F8FAFC', fontSize: 15, marginBottom: 12 },
  bouton: { backgroundColor: '#10B981', padding: 14, borderRadius: 10, alignItems: 'center' },
  boutonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  listeActuelle: { color: '#64748B', fontSize: 12, marginTop: 15, fontStyle: 'italic' },
  section: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  ligneClasse: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, padding: 14, marginBottom: 8 },
  rangClasse: { color: '#FBBF24', width: 30, fontWeight: 'bold' },
  nomClasse: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  detailClasse: { color: '#64748B', fontSize: 12, marginTop: 3 },
  ligneSignalement: { backgroundColor: '#2A1010', borderRadius: 10, padding: 12, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  signExo: { color: '#FCA5A5', fontSize: 12, fontFamily: 'monospace' },
  signRaison: { color: '#94A3B8', fontSize: 11, marginTop: 3 },
  ligneAdmin: { backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginBottom: 6 },
  nomAdmin: { color: '#F8FAFC', fontSize: 13 },
  rowAjout: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  inputAjout: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 12, color: '#F8FAFC', fontSize: 13, flex: 1, marginRight: 8 },
  boutonAjout: { backgroundColor: '#FBBF24', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  boutonAjoutText: { color: '#0F172A', fontWeight: 'bold', fontSize: 13 },
  noteRetrait: { color: '#475569', fontSize: 11, fontStyle: 'italic', marginTop: 10, lineHeight: 16 },
});
