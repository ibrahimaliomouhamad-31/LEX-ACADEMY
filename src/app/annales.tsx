import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { saveCours } from '../services/cacheHorsLigne';

// FORMAT D'UN SUJET dans Firestore (collection 'annales') :
// {
//   id: 'bac_2023_math_cd',
//   annee: '2023',
//   matiere: 'Mathématiques',
//   serie: 'C/D',
//   contenu: '...texte complet du sujet...',
//   corrige: '...corrigé détaillé (optionnel)...'
// }
// Ajoute les vrais sujets du Niger (CEA) directement dans la console Firestore,
// ou envoie-les à un prof pour qu'il les ajoute : ils apparaissent ici aussitôt,
// et l'élève peut les télécharger pour les lire hors-ligne.

interface Annale {
  id: string;
  annee: string;
  matiere: string;
  serie: string;
  contenu: string;
  corrige?: string;
}

export default function Annales() {
  const router = useRouter();
  const [annales, setAnnales] = useState<Annale[]>([]);
  const [chargement, setChargement] = useState(true);
  const [horsLigne, setHorsLigne] = useState(false);
  const [filtreMatiere, setFiltreMatiere] = useState('Toutes');
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'annales'), orderBy('annee', 'desc'));
        const snap = await getDocs(q);
        const liste: Annale[] = [];
        snap.forEach((d) => liste.push({ id: d.id, ...(d.data() as Omit<Annale, 'id'>) }));
        setAnnales(liste);
      } catch {
        setHorsLigne(true);
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const matieres = ['Toutes', ...Array.from(new Set(annales.map((a) => a.matiere)))];
  const affichees = filtreMatiere === 'Toutes' ? annales : annales.filter((a) => a.matiere === filtreMatiere);

  const telecharger = async (a: Annale) => {
    // Sauvegarde le sujet comme "cours" pour lecture hors-ligne + flashcards
    await saveCours({
      id: `annale_${a.id}`,
      titre: `BAC ${a.annee} — ${a.matiere} (${a.serie})`,
      theorie: a.contenu,
      matiere: a.matiere,
      classe: `Série ${a.serie}`,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>SUJETS RÉELS DU BAC</Text>
        <Text style={styles.title}>📚 Annales BAC</Text>
      </View>

      {chargement ? (
        <ActivityIndicator size="large" color="#FBBF24" style={{ marginTop: 50 }} />
      ) : horsLigne ? (
        <Text style={styles.vide}>
          📴 Hors-ligne : connecte-toi au wifi du LEX pour charger les annales, puis télécharge-les pour les lire partout.
        </Text>
      ) : annales.length === 0 ? (
        <View style={styles.vide}>
          <Text style={styles.videTitre}>Aucune annale encore ajoutée</Text>
          <Text style={styles.videTexte}>
            Les sujets s'ajoutent dans Firestore (collection "annales") au format :{'\n'}
            annee · matiere · serie · contenu · corrige{'\n\n'}
            Ajoute les sujets BAC du Niger et ils apparaîtront ici instantanément pour tous les élèves !
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {matieres.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, filtreMatiere === m && styles.chipActive]}
                onPress={() => setFiltreMatiere(m)}
              >
                <Text style={[styles.chipText, filtreMatiere === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {affichees.map((a) => (
            <View key={a.id} style={styles.carte}>
              <TouchableOpacity
                style={styles.carteHaut}
                onPress={() => setOuvert(ouvert === a.id ? null : a.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.carteTitre}>BAC {a.annee} — {a.matiere}</Text>
                  <Text style={styles.carteDetail}>Série {a.serie} · {a.contenu.length} caractères{a.corrige ? ' · avec corrigé ✅' : ''}</Text>
                </View>
                <Text style={styles.fleche}>{ouvert === a.id ? '▾' : '▸'}</Text>
              </TouchableOpacity>

              {ouvert === a.id && (
                <View style={styles.contenu}>
                  <Text style={styles.texte}>{a.contenu}</Text>
                  {a.corrige ? (
                    <Text style={styles.corrige}>📖 CORRIGÉ :{'\n'}{a.corrige}</Text>
                  ) : null}
                  <TouchableOpacity style={styles.bouton} onPress={() => telecharger(a)}>
                    <Text style={styles.boutonText}>📥 Télécharger pour hors-ligne</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
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
  vide: { padding: 30 },
  videTitre: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  videTexte: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 21 },
  chip: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  chipActive: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  chipText: { color: '#94A3B8', fontSize: 12 },
  chipTextActive: { color: '#0F172A', fontWeight: 'bold' },
  carte: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  carteHaut: { flexDirection: 'row', alignItems: 'center' },
  carteTitre: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  carteDetail: { color: '#64748B', fontSize: 11, marginTop: 4 },
  fleche: { color: '#94A3B8', fontSize: 18, marginLeft: 8 },
  contenu: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 15 },
  texte: { color: '#CBD5E1', fontSize: 13, lineHeight: 20 },
  corrige: { color: '#6EE7B7', fontSize: 13, lineHeight: 20, marginTop: 15 },
  bouton: { backgroundColor: '#EF4444', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  boutonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});
