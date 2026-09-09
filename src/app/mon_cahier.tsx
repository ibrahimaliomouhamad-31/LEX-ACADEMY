import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getCours, saveCours } from '../services/cacheHorsLigne';
import { extraireMicroNotions } from '../services/microNotions';

/**
 * 🧺 MON CAHIER — L'élève colle le contenu de son cahier LEX (texte) et l'app
 *  le découpe en micro-notions, puis l'ajoute localement au chapitre choisi.
 *
 * 100 % local (jamais envoyé) : le cahier enrichit le cours mais reste sur
 * l'appareil, parfait pour un usage hors-ligne et pour la vie privée.
 */
export default function MonCahier() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const chapitreId = (params.id as string) || '';

  const [contenu, setContenu] = useState('');
  const [titreChapitre, setTitreChapitre] = useState('Chapitre');
  const [nbNotions, setNbNotions] = useState(0);
  const [sauvegarde, setSauvegarde] = useState(false);

  useEffect(() => {
    (async () => {
      if (!chapitreId) return;
      const c = await getCours(chapitreId);
      if (c) {
        setTitreChapitre(c.titre || 'Chapitre');
        if (c.cahier) setContenu(c.cahier);
        setNbNotions(extraireMicroNotions(c.cahier || '').length);
      }
    })();
  }, [chapitreId]);

  const previsualiser = () => {
    const n = extraireMicroNotions(contenu);
    setNbNotions(n.length);
    return n;
  };

  const sauvegarder = async () => {
    const n = previsualiser();
    const c = await getCours(chapitreId);
    const cours = c || {
      id: chapitreId,
      titre: titreChapitre,
      classe: '',
      matiere: '',
    };
    cours.cahier = contenu;
    // Le cahier sert de contenu de secours si le cours Firebase est absent.
    if (!cours.theorie && !cours.methode_content) cours.theorie = contenu;
    await saveCours(cours);
    setSauvegarde(true);
    Alert.alert('✅ Mon cahier', `Enregistré ! ${n.length} micro-notion(s) détectée(s) dans ce chapitre.`);
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>MON CAHIER LEX</Text>
        <Text style={styles.title}>{titreChapitre}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cardInfo}>
          <Text style={styles.infoEmoji}>🧺</Text>
          <Text style={styles.infoText}>
            {chapitreId
              ? `Colle ici le contenu de ton cahier du chapitre « ${titreChapitre} ». L'app le découpe en micro-notions et le conserve localement, même sans réseau.`
              : 'Ouvre ce cahier depuis un cours précis (bouton 🧺 en haut du cours) pour l\'associer au bon chapitre. Tu peux déjà coller ton texte ci-dessous : il sera enregistré localement.'}
          </Text>
        </View>

        <TextInput
          style={styles.input}
          multiline
          value={contenu}
          onChangeText={setContenu}
          placeholder={"Colle le contenu de ton cahier ici...\n\nExemple :\nI. DÉFINITION : ...\nII. Propriété : ...\nIII. Exemples : ..."}
          placeholderTextColor="#475569"
        />

        <View style={styles.rowStats}>
          <Text style={styles.statTexte}>
            {nbNotions > 0 ? `🧠 ${nbNotions} micro-notion(s) détectée(s)` : `🧠 ${nbNotions} notion(s) détectée(s)`}
          </Text>
        </View>

        <TouchableOpacity style={styles.btnPrevisu} onPress={() => { const n = previsualiser(); Alert.alert('Prévisualisation', `✓ ${n.length} micro-notion(s) détectée(s).\n\n${n.slice(0, 4).map((x) => `• ${x.titre}`).join('\n') || (contenu.trim() ? 'Aucun titre reconnu. Ajoute des lignes "I. ..." / "1. ..." / "Définition : ..."' : 'Colle d\'abord du contenu.')}`); }}>
          <Text style={styles.btnPrevisuText}>👁️ Prévisualiser les notions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSave} onPress={sauvegarder}>
          <Text style={styles.btnSaveText}>💾 Enregistrer dans ce chapitre</Text>
        </TouchableOpacity>
        {sauvegarde && <Text style={styles.saved}>Enregistré ! ✅</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  subject: { color: '#8B5CF6', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  scroll: { padding: 20 },
  cardInfo: { backgroundColor: '#1B1630', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  infoEmoji: { fontSize: 28, marginBottom: 6 },
  infoText: { color: '#D6CCFF', fontSize: 13, lineHeight: 20 },
  input: { minHeight: 180, backgroundColor: '#111827', color: '#E5E7EB', fontSize: 14, borderRadius: 12, padding: 14, marginBottom: 16 },
  rowStats: { marginBottom: 16 },
  statTexte: { color: '#FBBF24', fontSize: 13, fontWeight: 'bold' },
  btnPrevisu: { backgroundColor: '#334155', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  btnPrevisuText: { color: '#F8FAFC', fontWeight: 'bold', fontSize: 14 },
  btnSave: { backgroundColor: '#8B5CF6', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnSaveText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  saved: { color: '#10B981', textAlign: 'center', marginTop: 12, fontWeight: 'bold' },
});