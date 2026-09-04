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
import { getAllCoursCache } from '../services/cacheHorsLigne';
import { enregistrerScoreDeck, getDeck, type Flashcard } from '../services/flashcardsService';
import { useLocalSearchParams } from 'expo-router';

export default function Flashcards() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const chapitreId = (params.chapitre_id as string) || '';
  const titreChapitre = (params.titre as string) || '';

  const [coursTelecharges, setCoursTelecharges] = useState<{ id: string; titre: string; matiere?: string; classe?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // État du deck
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [retournee, setRetournee] = useState(false);
  const [sues, setSues] = useState(0);
  const [revues, setRevues] = useState(0);
  const [termine, setTermine] = useState(false);

  useEffect(() => {
    (async () => {
      if (chapitreId) {
        const d = await getDeck(chapitreId);
        setDeck(d);
      } else {
        setCoursTelecharges(await getAllCoursCache());
      }
      setLoading(false);
    })();
  }, [chapitreId]);

  // Mode 1 : liste des cours téléchargés
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backBtn}>‹ Retour</Text>
      </TouchableOpacity>
      <Text style={styles.subject}>RÉVISION ACTIVE</Text>
      <Text style={styles.title}>🃏 Flashcards</Text>
    </View>
  );

  if (!chapitreId) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {coursTelecharges.length === 0 ? (
            <Text style={styles.vide}>
              Aucun cours téléchargé pour le moment.{'\n'}
              Va dans 📘 Le Cours et télécharge tes chapitres : leurs définitions et formules deviendront des flashcards !
            </Text>
          ) : (
            coursTelecharges.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.carteCours}
                onPress={() => router.push({
                  pathname: '/flashcards',
                  params: { chapitre_id: c.id, titre: c.titre }
                })}
              >
                <Text style={styles.coursTitre}>{c.titre}</Text>
                {c.matiere || c.classe ? (
                  <Text style={styles.coursMeta}>{c.matiere || ''} {c.classe ? `• ${c.classe}` : ''}</Text>
                ) : null}
                <Text style={styles.coursGo}>Réviser ce chapitre ›</Text>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    );
  }

  // Mode 2 : deck vide
  if (deck.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <Text style={styles.vide}>
          Ce cours ne permet pas de générer des flashcards (trop peu de définitions ou formules détectées).
        </Text>
      </View>
    );
  }

  // Mode 3 : fin du deck
  if (termine) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.centered}>
          <Text style={styles.finEmoji}>🎓</Text>
          <Text style={styles.finTitre}>Deck terminé !</Text>
          <Text style={styles.finStats}>😎 Je savais : {sues}{'\n'}😅 À revoir : {revues}</Text>
          <TouchableOpacity
            style={styles.btnRejouer}
            onPress={() => {
              setIndex(0);
              setSues(0);
              setRevues(0);
              setRetournee(false);
              setTermine(false);
            }}
          >
            <Text style={styles.btnRejouerText}>↻ Rejouer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnRetour} onPress={() => router.back()}>
            <Text style={styles.btnRetourText}>‹ Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Mode 4 : révision du deck
  const carte = deck[index];
  const progression = Math.round(((sues + revues) / deck.length) * 100);

  const repondre = (su: boolean) => {
    const nouveauSues = sues + (su ? 1 : 0);
    const nouveauRevues = revues + (su ? 0 : 1);
    setSues(nouveauSues);
    setRevues(nouveauRevues);
    setRetournee(false);
    if (index + 1 >= deck.length) {
      setTermine(true);
      enregistrerScoreDeck(chapitreId, nouveauSues, nouveauRevues);
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {header}
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.chapitre} numberOfLines={1}>{titreChapitre || chapitreId}</Text>
        <View style={styles.barreFond}>
          <View style={[styles.barreProgression, { width: `${progression}%` }]} />
        </View>
        <Text style={styles.compteur}>{index + 1} / {deck.length}</Text>

        <TouchableOpacity
          style={styles.carte}
          activeOpacity={0.85}
          onPress={() => setRetournee(!retournee)}
        >
          <Text style={styles.carteLabel}>{retournee ? 'RÉPONSE' : 'QUESTION'}</Text>
          <Text style={retournee ? styles.carteVerso : styles.carteRecto}>
            {retournee ? carte.verso : carte.recto}
          </Text>
          <Text style={styles.carteAstuce}>{retournee ? 'Bien joué ? Note-le ci-dessous' : 'Touche la carte pour retourner'}</Text>
        </TouchableOpacity>

        <View style={styles.rowBoutons}>
          <TouchableOpacity style={styles.btnRevoir} onPress={() => repondre(false)}>
            <Text style={styles.btnRevoirText}>😅 À revoir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSu} onPress={() => repondre(true)}>
            <Text style={styles.btnSuText}>😎 Je savais</Text>
          </TouchableOpacity>
        </View>
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
  scrollView: { flex: 1 },
  vide: { color: '#94A3B8', fontSize: 15, textAlign: 'center', marginTop: 50, lineHeight: 24, paddingHorizontal: 20 },

  carteCours: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  coursTitre: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  coursMeta: { color: '#64748B', fontSize: 12, marginTop: 4 },
  coursGo: { color: '#C4B5FD', fontSize: 12, marginTop: 8, fontWeight: 'bold' },

  chapitre: { color: '#94A3B8', fontSize: 13, marginBottom: 8 },
  barreFond: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
  barreProgression: { height: 6, backgroundColor: '#8B5CF6', borderRadius: 3 },
  compteur: { color: '#64748B', fontSize: 12, marginTop: 6, marginBottom: 15, textAlign: 'right' },

  carte: { backgroundColor: '#2D1F40', borderRadius: 16, borderWidth: 2, borderColor: '#8B5CF6', minHeight: 220, padding: 25, justifyContent: 'center', alignItems: 'center' },
  carteLabel: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 15 },
  carteRecto: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', textAlign: 'center', lineHeight: 30 },
  carteVerso: { color: '#FBBF24', fontSize: 18, textAlign: 'center', lineHeight: 28 },
  carteAstuce: { color: '#64748B', fontSize: 11, fontStyle: 'italic', marginTop: 20 },

  rowBoutons: { flexDirection: 'row', marginTop: 15 },
  btnRevoir: { flex: 1, backgroundColor: '#7F1D1D', padding: 18, borderRadius: 12, marginRight: 8, alignItems: 'center' },
  btnRevoirText: { color: '#FCA5A5', fontWeight: 'bold', fontSize: 16 },
  btnSu: { flex: 1, backgroundColor: '#064E3B', padding: 18, borderRadius: 12, marginLeft: 8, alignItems: 'center' },
  btnSuText: { color: '#6EE7B7', fontWeight: 'bold', fontSize: 16 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  finEmoji: { fontSize: 60, marginBottom: 15 },
  finTitre: { color: '#F8FAFC', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  finStats: { color: '#94A3B8', fontSize: 16, textAlign: 'center', lineHeight: 26, marginBottom: 25 },
  btnRejouer: { backgroundColor: '#8B5CF6', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 10, marginBottom: 10 },
  btnRejouerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  btnRetour: { padding: 10 },
  btnRetourText: { color: '#FBBF24', fontSize: 14 },
});
