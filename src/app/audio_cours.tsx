import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Speech from 'expo-speech';
import { getAllCoursCache } from '../services/cacheHorsLigne';
import { plafondTexteAudio } from '../services/economieDonnees';

// 51 — COURS EN AUDIO (optionnel par nature : on n'entre que si on le veut).
// Lit le cours à voix haute via la synthèse vocale — pour réviser en marchant,
// les yeux fermés, ou pour les élèves gênés par la lecture.

export default function AudioCours() {
  const router = useRouter();
  const [cours, setCours] = useState<{ id: string; titre: string; texte: string }[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enLecture, setEnLecture] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      const tous = await getAllCoursCache();
      if (annule) return;
      setCours(
        tous
          .filter((c) => (c.theorie || c.methode_content || '').trim().length > 100)
          .map((c) => ({ id: c.id, titre: c.titre || c.id, texte: `${c.theorie || ''} ${c.methode_content || ''}`.trim() }))
      );
      setChargement(false);
    })();
    return () => {
      annule = true;
      Speech.stop();
    };
  }, []);

  const lire = async (c: { id: string; texte: string }) => {
    Speech.stop(); // stoppe la lecture en cours (relance ou coupure)
    if (enLecture === c.id) {
      setEnLecture(null);
      return;
    }
    setEnLecture(c.id);
    // Plafond du mode économie de données : expo-speech coupe silencieusement
    // les textes trop longs sur Android ; on borne explicitement le texte.
    const plafond = await plafondTexteAudio();
    Speech.speak(c.texte.slice(0, plafond), {
      language: 'fr',
      rate: 0.95,
      onDone: () => setEnLecture(null),
      onStopped: () => setEnLecture(null),
      onError: () => setEnLecture(null),
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>RÉVISER LES OREILLES OUVERTES</Text>
        <Text style={styles.title}>🎧 Cours en audio</Text>
      </View>

      {chargement ? (
        <ActivityIndicator size="large" color="#FBBF24" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            Écoute tes cours téléchargés à voix haute — parfait pour réviser en marchant ou reposer tes yeux. 100% hors-ligne.
          </Text>
          {cours.length === 0 ? (
            <Text style={styles.vide}>
              Aucun cours audio-disponible. Télécharge des cours complets depuis 📘 Le Cours d'abord !
            </Text>
          ) : (
            cours.map((c) => (
              <TouchableOpacity key={c.id} style={[styles.carte, enLecture === c.id && styles.carteLecture]} onPress={() => lire(c)}>
                <Text style={styles.carteEmoji}>{enLecture === c.id ? '⏸️' : '▶️'}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.carteTitre} numberOfLines={2}>{c.titre}</Text>
                  <Text style={styles.carteDetail}>~{Math.max(1, Math.round(c.texte.split(' ').length / 150))} min d'écoute</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
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
  vide: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  carte: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  carteLecture: { borderWidth: 1.5, borderColor: '#8B5CF6' },
  carteEmoji: { fontSize: 24 },
  carteTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold' },
  carteDetail: { color: '#64748B', fontSize: 11, marginTop: 3 },
});
