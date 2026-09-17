import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebaseConfig';
import { getUserItem, setUserItem } from '../services/userStorage';
import { rapporterErreur } from '../utils/logger';

/** Clé locale de l'avatar (par utilisateur, via userStorage). */
const CLE_AVATAR = 'lex_avatar_emoji';

export const LISTE_AVATARS = [
  { emoji: '🦊', nom: 'Renard Malin' },
  { emoji: '🦉', nom: 'Hibou Sage' },
  { emoji: '🦁', nom: 'Lion du LEX' },
  { emoji: '🐺', nom: 'Loup Solitaire' },
  { emoji: '🐉', nom: 'Dragon' },
  { emoji: '🦅', nom: 'Aigle Royal' },
  { emoji: '🐼', nom: 'Panda zen' },
  { emoji: '🤖', nom: 'Robot IA' },
  { emoji: '👻', nom: 'Fantôme' },
  { emoji: '👑', nom: 'Roi/Reine' },
  { emoji: '🧠', nom: 'Cerveau' },
  { emoji: '⚡', nom: 'Éclair' },
];

export async function lireAvatarLocal(): Promise<string> {
  try {
    const local = await getUserItem(CLE_AVATAR);
    if (local) return local;
    const ancien = await AsyncStorage.getItem('lex_avatar');
    if (ancien) {
      await setUserItem(CLE_AVATAR, ancien);
      return ancien;
    }
  } catch (e) {
    rapporterErreur('avatars lireAvatarLocal:', e);
  }
  return '🎓';
}

export default function Avatars() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [actuel, setActuel] = useState('🎓');

  useEffect(() => {
    lireAvatarLocal().then(setActuel).catch(() => undefined);
  }, []);

  const choisirAvatar = async (emoji: string) => {
    setLoading(true);
    // 1) LOCAL D'ABORD : marche hors-ligne, visible partout immédiatement.
    try {
      await setUserItem(CLE_AVATAR, emoji);
    } catch (e) {
      rapporterErreur('avatars setUserItem:', e);
    }
    setActuel(emoji);
    // 2) DISTANT EN BEST-EFFORT : ne bloque jamais, ne fait jamais échouer.
    try {
      const id = await AsyncStorage.getItem('lex_user_id');
      if (id) {
        await updateDoc(doc(db, 'utilisateurs', id), { avatar: emoji });
      }
    } catch (e) {
      rapporterErreur('avatars sync distante (best-effort):', e);
    } finally {
      setLoading(false);
    }
    Alert.alert('Mis à jour !', 'Ton nouvel avatar est enregistré sur ce téléphone.');
    router.push('/profil');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/profil')}>
          <Text style={styles.backBtn}>‹ Retour au profil</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choisis ton avatar</Text>
        <Text style={styles.subtitle}>Ton avatar apparaîtra dans le classement et sur ton profil.</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {LISTE_AVATARS.map((avatar) => (
            <TouchableOpacity
              key={avatar.emoji}
              style={[styles.avatarCard, actuel === avatar.emoji && styles.avatarCardActif]}
              onPress={() => choisirAvatar(avatar.emoji)}
            >
              <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
              <Text style={styles.avatarName}>{avatar.nom}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 13, marginTop: 5 },
  scrollView: { paddingHorizontal: 20 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  avatarCard: { 
    backgroundColor: '#1E293B', 
    borderRadius: 15, 
    padding: 15, 
    width: '31%', 
    marginBottom: 15, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  avatarEmoji: { fontSize: 40, marginBottom: 10 },
  avatarName: { color: '#F8FAFC', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  avatarCardActif: {
    borderColor: '#FBBF24',
    borderWidth: 2,
  },
});