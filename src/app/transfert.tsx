import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { selectionnerClesProgression } from '../services/sauvegardeCompte';
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

// Encodage base64 unicode-safe (ternaire : web/native ont btoa/atob dans React Native ? non toujours)
// 🛡️ AUDIT : Buffer typé (plus de @ts-ignore).
declare const Buffer: { from(s: string, enc: string): { toString(enc: string): string } } | undefined;
function versBase64(texte: string): string {
  // encodeURIComponent → octets ASCII, puis btoa. Fallback Buffer si btoa absent.
  const ascii = encodeURIComponent(texte).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
  if (typeof btoa === 'function') return btoa(ascii);
  if (typeof Buffer !== 'undefined') return Buffer.from(ascii, 'binary').toString('base64');
  return ascii;
}

function depuisBase64(b64: string): string {
  let ascii: string;
  if (typeof atob === 'function') {
    ascii = atob(b64.trim());
  } else if (typeof Buffer !== 'undefined') {
    ascii = Buffer.from(b64.trim(), 'base64').toString('binary');
  } else {
    ascii = b64.trim();
  }
  // décode les octets ASCII en UTF-8
  return decodeURIComponent(ascii.split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

export default function Transfert() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [codeEntree, setCodeEntree] = useState('');
  const [genereEnCours, setGenereEnCours] = useState(false);

  const genererCode = async () => {
    setGenereEnCours(true);
    try {
      // 🛡️ EXPORT FILTRÉ (cycle J) : la sélection centralisée inclut TOUTE
      // la progression (anti-farm, scores, SRS, objectifs…) mais JAMAIS les
      // secrets (hash du mot de passe, session) ni les caches de cours.
      const toutes = await AsyncStorage.getAllKeys();
      const cles = selectionnerClesProgression(toutes);
      const paires = await AsyncStorage.multiGet(cles);
      const donnees: { [cle: string]: string | null } = {};
      for (const [cle, valeur] of paires) donnees[cle] = valeur;
      const codeGenere = versBase64(JSON.stringify(donnees));
      setCode(codeGenere);
      // ⚠️ WhatsApp coupe les messages très longs : si le cache est gros,
      // l'élève doit d'abord vider ses téléchargements (Paramètres).
      if (codeGenere.length > 1500000) {
        Alert.alert(
          'Code très volumineux',
          "Tes données (journal, badges, notes…) deviennent lourdes : le code risque d'être coupé par WhatsApp. Pense à régénérer le code après une synchronisation."
        );
      }
    } catch (erreur) {
      Alert.alert('Erreur', 'Impossible de générer le code de sauvegarde.');
    } finally {
      setGenereEnCours(false);
    }
  };

  const partager = async () => {
    if (!code) return;
    try {
      await Share.share({ message: `Mon code de sauvegarde LEX ACADEMY (garde-le précieusement) :\n\n${code}` });
    } catch {
      // partage annulé
    }
  };

  const restaurer = () => {
    const texte = codeEntree.trim();
    if (texte.length < 10) {
      Alert.alert('Code invalide', 'Colle le code de sauvegarde complet dans la zone de texte.');
      return;
    }
    Alert.alert(
      'Restaurer les données ?',
      'Tes données actuelles sur ce téléphone seront REMPLACÉES par celles du code. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: async () => {
            try {
              const donnees = JSON.parse(depuisBase64(texte)) as { [cle: string]: string | null };
              const paires = Object.entries(donnees).filter(([, v]) => v !== null) as [string, string][];
              if (paires.length === 0) throw new Error('vide');
              // 🧹 REMPLACEMENT complet (promis par l'alerte) : on supprime
              // d'abord les clés lex_ locales, sinon des données résiduelles
              // (exos résolus, stats) polluent la restauration et créent des
              // incohérences XP / anti-farm.
              const locales = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('lex_'));
              if (locales.length > 0) await AsyncStorage.multiRemove(locales);
              await AsyncStorage.multiSet(paires);
              Alert.alert('✅ Restauré !', `${paires.length} éléments récupérés. Redémarre l'application pour tout voir.`);
              setCodeEntree('');
            } catch {
              Alert.alert('Code illisible', 'Ce code semble incorrect ou corrompu. Vérifie qu\'il est complet.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>SAUVEGARDE</Text>
        <Text style={styles.title}>📦 Transférer mes données</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Téléphone perdu ou changé ? Génère un code qui contient tout : ton profil, tes XP locaux, tes exercices
          résolus, tes stats, ton journal d'erreurs. Envoie-le toi par WhatsApp et restaure-le sur le nouveau téléphone.
        </Text>

        {/* Export */}
        <TouchableOpacity style={styles.boutonGenerer} onPress={genererCode} disabled={genereEnCours}>
          <Text style={styles.boutonGenererText}>{genereEnCours ? 'Génération...' : '🔐 Générer mon code de sauvegarde'}</Text>
        </TouchableOpacity>

        {code && (
          <View style={styles.blocCode}>
            <Text style={styles.blocCodeTitre}>Ton code (garde-le secret) :</Text>
            <Text selectable style={styles.codeTexte}>{code}</Text>
            <TouchableOpacity style={styles.boutonPartager} onPress={partager}>
              <Text style={styles.boutonPartagerText}>📤 Partager (WhatsApp, message...)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Import */}
        <Text style={styles.sectionTitre}>J'ai un code à restaurer</Text>
        <TextInput
          style={styles.zoneCode}
          placeholder="Colle ton code ici..."
          placeholderTextColor="#64748B"
          value={codeEntree}
          onChangeText={setCodeEntree}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.boutonRestaurer} onPress={restaurer}>
          <Text style={styles.boutonRestaurerText}>♻️ Restaurer mes données</Text>
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

  boutonGenerer: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  boutonGenererText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },

  blocCode: { backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: '#334155' },
  blocCodeTitre: { color: '#94A3B8', fontSize: 12, marginBottom: 8, fontWeight: 'bold' },
  codeTexte: { color: '#93C5FD', fontFamily: 'monospace', fontSize: 10, lineHeight: 14 },
  boutonPartager: { backgroundColor: '#10B981', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  boutonPartagerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },

  sectionTitre: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
  zoneCode: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 15, color: '#F8FAFC', fontFamily: 'monospace', fontSize: 10, minHeight: 90, marginBottom: 12, textAlignVertical: 'top' },
  boutonRestaurer: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 12, alignItems: 'center' },
  boutonRestaurerText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
});
