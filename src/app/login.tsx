import { connecter } from '../services/authFirebase';
import { sha256 } from 'js-sha256';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebaseConfig';

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

    try {
      // 76 — Authentification Firebase Auth (vraie identité)
      const uid = await connecter(nom.trim(), sha256(password.trim()));
      if (uid) {
        const docSnap = await getDoc(doc(db, "utilisateurs", uid));
        await AsyncStorage.setItem('lex_user_nom', docSnap.exists() ? (docSnap.data().nom || nom.trim()) : nom.trim());
        await AsyncStorage.setItem('lex_user_id', uid);
        Alert.alert("Bienvenue !", `Connecté en tant que ${nom.trim()}.`);
        router.push('/');
        return;
      }
      // Repli ancienne méthode (comptes pas encore migrés vers Auth)
      const q = query(collection(db, "utilisateurs"), where("nom", "==", nom.trim()), where("mot_de_passe", "==", sha256(password.trim())));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // L'élève existe et le mot de passe est bon !
        const userDoc = querySnapshot.docs[0];
        // On sauvegarde son nom et son ID dans la mémoire du téléphone
        await AsyncStorage.setItem('lex_user_nom', userDoc.data().nom);
        await AsyncStorage.setItem('lex_user_id', userDoc.id);
        
        Alert.alert("Bienvenue !", `Connecté en tant que ${userDoc.data().nom}.`);
        router.push('/');
      } else {
        Alert.alert("Erreur", "Nom ou mot de passe incorrect.");
      }
    } catch (error) {
      console.error("Erreur login : ", error);
      Alert.alert("Erreur", "Problème de connexion à internet.");
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