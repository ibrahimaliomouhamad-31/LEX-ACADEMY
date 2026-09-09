import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { urlChat, headersIA } from '../services/configIA';

// 56 — PHOTO D'EXERCICE : photographie un exercice du manuel papier,
// l'IA le lit et GUIDE sans donner la réponse (nécessite le wifi du LEX).

const MODELE_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct';

export default function PhotoExo() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [guidage, setGuidage] = useState<string[]>([]);

  const prendrePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setGuidage(['📸 Camera refusée. Autorise-la dans les réglages du téléphone.']);
      return;
    }
    const photo = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
    if (!photo.canceled && photo.assets[0].base64) {
      setImage(photo.assets[0].base64);
      analyser(photo.assets[0].base64);
    }
  };

  const choisirGalerie = async () => {
    const photo = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true, mediaTypes: ['images'] });
    if (!photo.canceled && photo.assets[0].base64) {
      setImage(photo.assets[0].base64);
      analyser(photo.assets[0].base64);
    }
  };

  const analyser = async (base64: string) => {
    setChargement(true);
    setGuidage([]);
    try {
      const reponse = await fetch(urlChat(), {
        method: 'POST',
        headers: headersIA(),
        body: JSON.stringify({
          model: MODELE_VISION,
          max_tokens: 800,
          messages: [
            {
              role: 'system',
              content: "Tu es LexAI, prof du Lycée d'Excellence du Niger. L'élève te montre un exercice photographié. Transcris l'énoncé proprement, puis donne UNIQUEMENT des indices progressifs (méthode, première étape), JAMAIS la réponse finale. Réponds en français, en 3 parties courtes : 📖 Énoncé, 💡 Indice 1, 💡💡 Indice 2.",
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Aide-moi à résoudre cet exercice sans me donner la réponse.' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
              ],
            },
          ],
        }),
      });
      const data = await reponse.json();
      const texte = data.choices?.[0]?.message?.content;
      if (texte && texte.trim() !== '') {
        setGuidage(texte.split(/\n(?=📖|💡)/).filter((s: string) => s.trim() !== ''));
      } else {
        setGuidage(['⚠️ Réponse vide de l\'IA — réessaie avec une photo plus nette.']);
      }
    } catch {
      setGuidage(['📴 Impossible (pas de connexion). La photo-exo marche au wifi du LEX.']);
    } finally {
      setChargement(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>TON MANUEL PAPIER DEVIENT INTERACTIF</Text>
        <Text style={styles.title}>📸 Photo d'exercice</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Photographie un exercice de ton manuel ou de ta feuille : l'IA le lit et te guide étape par étape — sans jamais donner la réponse. Nécessite internet (wifi du LEX).
        </Text>

        <View style={styles.rowBoutons}>
          <TouchableOpacity style={styles.boutonCamera} onPress={prendrePhoto}>
            <Text style={styles.boutonText}>📷 Prendre une photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.boutonGalerie} onPress={choisirGalerie}>
            <Text style={styles.boutonText}>🖼️ Galerie</Text>
          </TouchableOpacity>
        </View>

        {image && (
          <Image source={{ uri: `data:image/jpeg;base64,${image}` }} style={styles.apercu} resizeMode="contain" />
        )}

        {chargement ? <ActivityIndicator size="large" color="#FBBF24" style={{ marginVertical: 20 }} /> : null}

        {guidage.map((bloc, i) => (
          <View key={i} style={styles.bloc}>
            <Text style={styles.blocTexte}>{bloc.trim()}</Text>
          </View>
        ))}
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
  intro: { color: '#94A3B8', fontSize: 13, lineHeight: 19, marginBottom: 15 },
  rowBoutons: { flexDirection: 'row', marginBottom: 15 },
  boutonCamera: { flex: 2, backgroundColor: '#8B5CF6', padding: 15, borderRadius: 12, alignItems: 'center', marginRight: 8 },
  boutonGalerie: { flex: 1, backgroundColor: '#334155', padding: 15, borderRadius: 12, alignItems: 'center' },
  boutonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  apercu: { width: '100%', height: 220, borderRadius: 12, marginBottom: 15, backgroundColor: '#1E293B' },
  bloc: { backgroundColor: '#1B1424', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  blocTexte: { color: '#E9D5FF', fontSize: 14, lineHeight: 21 },
});
