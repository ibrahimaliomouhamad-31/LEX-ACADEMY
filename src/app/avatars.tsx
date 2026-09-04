import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebaseConfig';

export default function Avatars() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const listeAvatars = [
    { emoji: "🦊", nom: "Renard Malin" },
    { emoji: "🦉", nom: "Hibou Sage" },
    { emoji: "🦁", nom: "Lion du LEX" },
    { emoji: "🐺", nom: "Loup Solitaire" },
    { emoji: "🐉", nom: "Dragon" },
    { emoji: "🦅", nom: "Aigle Royal" },
    { emoji: "🐼", nom: "Panda zen" },
    { emoji: "🤖", nom: "Robot IA" },
    { emoji: "👻", nom: "Fantôme" },
    { emoji: "👑", nom: "Roi/Reine" },
    { emoji: "🧠", nom: "Cerveau" },
    { emoji: "⚡", nom: "Éclair" },
  ];

  const choisirAvatar = async (emoji: string) => {
    setLoading(true);
    try {
      const id = await AsyncStorage.getItem('lex_user_id');
      if (id) {
        // On enregistre l'avatar choisi dans Firebase
        await updateDoc(doc(db, "utilisateurs", id), {
          avatar: emoji
        });
        Alert.alert("Mis à jour !", "Ton nouvel avatar a été enregistré.");
        router.push('/profil');
      }
    } catch (error) {
      console.error("Erreur avatar : ", error);
      Alert.alert("Erreur", "Impossible de mettre à jour l'avatar.");
    } finally {
      setLoading(false);
    }
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
          {listeAvatars.map((avatar, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.avatarCard} 
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
  avatarName: { color: '#F8FAFC', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }
});