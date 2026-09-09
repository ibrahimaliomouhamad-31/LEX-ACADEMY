import { connecter } from '../services/authFirebase';
import { hacherMotDePasse } from '../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebaseConfig';
import { estEnLigne } from '../utils/reseau';

// 🔄 OFFLINE-FIRST : les identifiants (nom + hash du mot de passe) sont
// conservés localement après CHAQUE connexion réussie en ligne. Sans
// internet, l'élève peut quand même se connecter à son compte sur CE
// téléphone : XP, révisions, badges et progression restent 100% actifs.
const CLE_COMPTES_LOCAUX = 'lex_comptes_locaux';

interface CompteLocal {
  hash: string;
  uid: string;
}

async function lireComptesLocaux(): Promise<Record<string, CompteLocal>> {
  try {
    const brut = await AsyncStorage.getItem(CLE_COMPTES_LOCAUX);
    return brut ? (JSON.parse(brut) as Record<string, CompteLocal>) : {};
  } catch {
    return {};
  }
}

async function sauvegarderCompteLocal(nom: string, hash: string, uid: string): Promise<void> {
  try {
    const comptes = await lireComptesLocaux();
    comptes[nom.trim().toLowerCase()] = { hash, uid };
    await AsyncStorage.setItem(CLE_COMPTES_LOCAUX, JSON.stringify(comptes));
  } catch {
    // ignore : jamais bloquant
  }
}

function BoutonOublie({ nom }: { nom: string }) {
  return (
    <TouchableOpacity onPress={async () => {
      try {
        await addDoc(collection(db, 'demandes_aide'), { nom: nom.trim(), dateISO: new Date().toISOString() });
      } catch { /* hors-ligne : la demande partira en parlant à l'admin */ }
      Alert.alert(
        'Mot de passe oublié ?',
        "Pas de panique : ton compte n'est pas perdu.\n\n👉 Va voir l'administrateur de l'app (le créateur) en personne au lycée : il peut te réinitialiser ton mot de passe. Ta demande vient de lui être transmise.",
        [{ text: 'Compris' }]
      );
    }} style={{ alignItems: 'center', padding: 12 }}>
      <Text style={{ color: '#FBBF24', fontSize: 13 }}>Mot de passe oublié ?</Text>
    </TouchableOpacity>
  );
}

export default function Login() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const seConnecter = async () => {
    if (nom.trim() === '' || password.trim() === '') {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);

    const nomNettoye = nom.trim();
    const cleLocale = nomNettoye.toLowerCase();

    // 🔐 Salage déterministe par compte : même formule qu'à l'inscription.
    // Deux élèves avec le même mot de passe → hachés différents.
    const hashSaisi = hacherMotDePasse(nomNettoye, password);

    try {
      // 🔄 CONNEXION HORS-LIGNE : si le réseau est coupé mais que l'élève
      // s'est déjà connecté au moins une fois sur ce téléphone, on ouvre
      // sa session localement. Avant : "Problème de connexion à internet"
      // et l'app était inutilisable 4 jours, même avec un compte valide.
      const enLigne = await estEnLigne().catch(() => true);
      if (!enLigne) {
        const comptes = await lireComptesLocaux();
        const compte = comptes[cleLocale];
        if (compte && compte.hash === hashSaisi) {
          await AsyncStorage.setItem('lex_user_nom', nomNettoye);
          await AsyncStorage.setItem('lex_user_id', compte.uid);
          Alert.alert(
            "Bienvenue !",
            `Connecté hors-ligne en tant que ${nomNettoye}.\nTa progression se synchronisera au retour du wifi.`
          );
          router.push('/');
          return;
        }
        Alert.alert(
          "Mode hors-ligne",
          "Pas de connexion et aucun compte enregistré sur ce téléphone.\n\n👉 Tu peux quand même réviser sans compte, ou connecte-toi une première fois avec le wifi du LEX."
        );
        return;
      }

      // 76 — Authentification Firebase Auth (vraie identité)
      const uid = await connecter(nomNettoye, hashSaisi);
      if (uid) {
        const docSnap = await getDoc(doc(db, "utilisateurs", uid));
        await AsyncStorage.setItem('lex_user_nom', docSnap.exists() ? (docSnap.data().nom || nomNettoye) : nomNettoye);
        await AsyncStorage.setItem('lex_user_id', uid);
        // Mémoire des identifiants pour les prochaines connexions hors-ligne
        await sauvegarderCompteLocal(nomNettoye, hashSaisi, uid);
        Alert.alert("Bienvenue !", `Connecté en tant que ${nomNettoye}.`);
        router.push('/');
        return;
      }
      // Faute d'identifiant Firebase Auth : mot de passe ou nom incorrect.
      Alert.alert("Erreur", "Nom ou mot de passe incorrect.");
    } catch (error) {
      console.error("Erreur login : ", error);
      // 🔄 Dernier recours : compte local ? (le réseau a pu lâcher en route)
      const comptes = await lireComptesLocaux();
      const compte = comptes[cleLocale];
      if (compte && compte.hash === hashSaisi) {
        await AsyncStorage.setItem('lex_user_nom', nomNettoye);
        await AsyncStorage.setItem('lex_user_id', compte.uid);
        Alert.alert(
          "Bienvenue !",
          `Connecté hors-ligne en tant que ${nomNettoye}.\nTa progression se synchronisera au retour du wifi.`
        );
        router.push('/');
        return;
      }
      Alert.alert(
        "Connexion impossible",
        "Vérifie ta connexion internet. Astuce : si tu t'es déjà connecté avec le wifi du LEX, tu peux te reconnecter même sans internet."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={styles.backBtn}>‹ Retour au menu</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.title}>🔐 Connexion Élève</Text>
        <Text style={styles.subtitle}>Connecte-toi pour gagner des XP et apparaître dans le classement du LEX.</Text>

        <TextInput 
          style={styles.input} 
          placeholder="Ton nom (ex: Moussa)" 
          placeholderTextColor="#64748B"
          value={nom}
          onChangeText={setNom}
        />
        
        <TextInput 
          style={styles.input} 
          placeholder="Mot de passe" 
          placeholderTextColor="#64748B"
          secureTextEntry={true}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.btn} onPress={seConnecter} disabled={loading}>
          {loading ? <ActivityIndicator color="#0F172A" /> : <Text style={styles.btnText}>Se connecter</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => router.push('/register')}>
          <Text style={{ color: '#FBBF24', fontSize: 14 }}>Pas de compte ? <Text style={{ fontWeight: 'bold' }}>Inscris-toi ici</Text></Text>
        </TouchableOpacity>
      <BoutonOublie nom={nom} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20 },
  backBtn: { color: '#FBBF24', fontSize: 14 },
  formContainer: { flex: 1, justifyContent: 'center', padding: 30 },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 15, color: '#F8FAFC', fontSize: 16, marginBottom: 15 },
  btn: { backgroundColor: '#FBBF24', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#0F172A', fontSize: 16, fontWeight: 'bold' }
});