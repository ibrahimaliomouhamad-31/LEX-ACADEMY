import { creerCompte } from '../services/authFirebase';
import { hacherMotDePasse } from '../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { avertirDev, logDev, rapporterErreur } from '../utils/logger';

export default function Register() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [classe, setClasse] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  const sInscrire = async () => {
    setErreur('');

    if (nom.trim() === '' || classe.trim() === '' || password.trim() === '') {
      setErreur("Veuillez remplir tous les champs.");
      return;
    }
    if (password !== confirmPassword) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      // 🔐 Compte Firebase Auth (vraie identité). Le nom d'utilisateur est
      // UNIQUE par construction (email synthétique nom@lex.academy) : un
      // doublon est donc détecté nativement par Firebase Auth
      // (auth/email-already-in-use). Plus besoin de lire publiquement la
      // collection `utilisateurs` (verrouillée pour la sécurité).
      // 🔐 Salage déterministe par compte (même formule qu'à la connexion).
      const mdpHashe = hacherMotDePasse(nom.trim(), password);
      const uid = await creerCompte(nom.trim(), mdpHashe);

      // Profil : UNIQUEMENT les champs publics.
      // 🔒 Le mot de passe ne vit QUE dans Firebase Auth, jamais dans
      // Firestore (les règles de sécurité l'interdisent formellement).
      await setDoc(doc(db, "utilisateurs", uid), {
        nom: nom.trim(),
        classe: classe.trim(),
        xp: 0
      });

      // 3. Connexion automatique (mémoire locale + session)
      await AsyncStorage.setItem('lex_user_nom', nom.trim());
      await AsyncStorage.setItem('lex_user_id', uid);

      Alert.alert("Bienvenue au LEX !", "Ton compte a été créé avec succès. Tu as 0 XP. Va faire des exercices pour grimper dans le classement !");
      router.push('/');

    } catch (error: unknown) {
      rapporterErreur("Erreur inscription : ", error);
      const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
      if (code === 'auth/email-already-in-use') {
        setErreur("Ce nom d'utilisateur est déjà pris. Choisis-en un autre.");
      } else if (code && code.startsWith('auth/')) {
        setErreur("Compte impossible à créer : vérifie ton mot de passe (8 caractères minimum) puis réessaie.");
      } else {
        setErreur("Une erreur est survenue. Vérifie ta connexion internet.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📝 Créer mon compte</Text>
        <Text style={styles.subtitle}>Rejoins l'aventure LEX ACADEMY et entre dans le classement du Lycée d'Excellence.</Text>

        <Text style={styles.label}>Nom et Prénom</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Ex: Ibrahim Issoufou" 
          placeholderTextColor="#64748B"
          value={nom}
          onChangeText={setNom}
        />

        <Text style={styles.label}>Ta classe</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Ex: 1ère C" 
          placeholderTextColor="#64748B"
          value={classe}
          onChangeText={setClasse}
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Choisis un mot de passe secret" 
          placeholderTextColor="#64748B"
          secureTextEntry={true}
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Confirmer le mot de passe</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Retape ton mot de passe" 
          placeholderTextColor="#64748B"
          secureTextEntry={true}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {erreur !== '' && (
          <View style={styles.erreurBox}>
            <Text style={styles.erreurText}>⚠️ {erreur}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.btn} onPress={sInscrire} disabled={loading}>
          {loading ? <ActivityIndicator color="#0F172A" /> : <Text style={styles.btnText}>S'inscrire</Text>}
        </TouchableOpacity>
        
        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20 },
  backBtn: { color: '#FBBF24', fontSize: 14 },
  formContainer: { flex: 1, padding: 30 },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  label: { color: '#CBD5E1', fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginLeft: 5 },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 15, color: '#F8FAFC', fontSize: 16, marginBottom: 20 },
  erreurBox: { backgroundColor: '#2A1010', padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#EF4444' },
  erreurText: { color: '#FCA5A5', fontSize: 14 },
  btn: { backgroundColor: '#10B981', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});