import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAllCoursCache, getExercices, saveExercices, saveCours, type Exercice } from '../services/cacheHorsLigne';

function versBase64(texte: string): string {
  const ascii = encodeURIComponent(texte).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
  if (typeof btoa === 'function') return btoa(ascii);
  // @ts-ignore fallback Hermes
  return Buffer.from(ascii, 'binary').toString('base64');
}

function depuisBase64(b64: string): string {
  let ascii: string;
  if (typeof atob === 'function') {
    ascii = atob(b64.trim());
  } else {
    // @ts-ignore fallback Hermes
    ascii = Buffer.from(b64.trim(), 'base64').toString('binary');
  }
  return decodeURIComponent(ascii.split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

const PREFIXE = 'LEX1:';

export default function Partage() {
  const router = useRouter();
  const [coursTelecharges, setCours] = useState<{ id: string; titre: string }[]>([]);
  const [codeGenere, setCodeGenere] = useState<string | null>(null);
  const [codeEntree, setCodeEntree] = useState('');
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    (async () => {
      setCours(await getAllCoursCache());
    })();
  }, []);

  const genererCodeChapitre = async (chapitreId: string) => {
    setChargement(true);
    try {
      const exos = (await getExercices(chapitreId)) || [];
      const cours = (await getAllCoursCache()).find((c) => c.id === chapitreId) || null;
      const paquet = { chapitreId, exos, cours };
      const code = PREFIXE + versBase64(JSON.stringify(paquet));
      setCodeGenere(code);
      Alert.alert(
        'Code prêt !',
        `${exos.length} exercices${cours ? ' + le cours' : ''} empaquetés.\nEnvoie le code par WhatsApp à ton camarade, ou montre-le lui directement.`,
        [{ text: '📤 Partager', onPress: () => Share.share({ message: `Voici un chapitre LEX ACADEMY :\n\n${code}` }) }, { text: 'Fermer' }]
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le code pour ce chapitre.');
    } finally {
      setChargement(false);
    }
  };

  const importerCode = () => {
    const texte = codeEntree.trim();
    if (!texte.startsWith(PREFIXE)) {
      Alert.alert('Code invalide', 'Le code doit commencer par LEX1:. Vérifie qu\'il est complet.');
      return;
    }
    try {
      const paquet = JSON.parse(depuisBase64(texte.slice(PREFIXE.length))) as {
        chapitreId: string;
        exos: Exercice[];
        cours: { id: string; titre: string; theorie?: string; methode_content?: string } | null;
      };
      (async () => {
        if (paquet.exos && paquet.exos.length > 0) {
          await saveExercices(paquet.chapitreId, paquet.exos);
        }
        if (paquet.cours) {
          await saveCours({ ...paquet.cours, id: paquet.chapitreId });
        }
        Alert.alert(
          '✅ Importé !',
          `Chapitre ${paquet.chapitreId} reçu : ${paquet.exos?.length || 0} exercices${paquet.cours ? ' + cours complet' : ''}. Disponible hors-ligne !`
        );
        setCodeEntree('');
        setCours(await getAllCoursCache());
      })();
    } catch {
      Alert.alert('Code illisible', 'Ce code semble incomplet ou corrompu.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>ENTRAIDE</Text>
        <Text style={styles.title}>📡 Partager un chapitre</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Un camarade a téléchargé un chapitre au wifi ? Il peut te l'envoyer par WhatsApp (ou te montrer le code) :
          exercices + cours complets, prêts pour le hors-ligne. 💪
        </Text>

        {/* Export */}
        <Text style={styles.section}>📤 Envoyer un de mes chapitres</Text>
        {coursTelecharges.length === 0 ? (
          <Text style={styles.vide}>Tu n'as encore téléchargé aucun cours. Va dans 📘 Le Cours d'abord !</Text>
        ) : (
          coursTelecharges.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.carteChapitre}
              onPress={() => genererCodeChapitre(c.id)}
              disabled={chargement}
            >
              <Text style={styles.chapitreTitre} numberOfLines={1}>{c.titre || c.id}</Text>
              <Text style={styles.chapitreAction}>Générer le code ›</Text>
            </TouchableOpacity>
          ))
        )}
        {codeGenere !== null && (
          <TouchableOpacity
            style={styles.boutonPartager}
            onPress={() => Share.share({ message: `Voici un chapitre LEX ACADEMY :\n\n${codeGenere}` })}
          >
            <Text style={styles.boutonPartagerText}>📤 Partager le dernier code</Text>
          </TouchableOpacity>
        )}

        {/* Import */}
        <Text style={styles.section}>📥 Recevoir un chapitre</Text>
        <TextInput
          style={styles.zoneCode}
          placeholder="Colle le code LEX1:... reçu ici"
          placeholderTextColor="#64748B"
          value={codeEntree}
          onChangeText={setCodeEntree}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.boutonImporter} onPress={importerCode}>
          <Text style={styles.boutonImporterText}>📥 Importer ce chapitre</Text>
        </TouchableOpacity>
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
  intro: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  section: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  vide: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic' },
  carteChapitre: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  chapitreTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold' },
  chapitreAction: { color: '#6EE7B7', fontSize: 12, marginTop: 6, fontWeight: 'bold' },
  boutonPartager: { backgroundColor: '#10B981', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 25 },
  boutonPartagerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  zoneCode: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 15, color: '#F8FAFC', fontFamily: 'monospace', fontSize: 10, minHeight: 90, marginBottom: 12, textAlignVertical: 'top' },
  boutonImporter: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center' },
  boutonImporterText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
