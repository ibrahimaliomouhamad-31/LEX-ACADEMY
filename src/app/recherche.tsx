import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { rechercher, type ResultatRecherche } from '../services/rechercheGlobale';
import { FORMULES } from '../services/formulaire';

export default function Recherche() {
  const router = useRouter();
  const [texte, setTexte] = useState('');
  const [resultats, setResultats] = useState<ResultatRecherche | null>(null);
  const [chercher, setChercher] = useState(false);

  useEffect(() => {
    const minuterie = setTimeout(async () => {
      if (texte.trim().length < 2) {
        setResultats(null);
        return;
      }
      setChercher(true);
      setResultats(await rechercher(texte));
      setChercher(false);
    }, 400);
    return () => clearTimeout(minuterie);
  }, [texte]);

  const total = resultats
    ? resultats.exercices.length + resultats.formules.length + resultats.cours.length + resultats.olympiades.length
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>TOUT LE CONTENU EN UNE RECHERCHE</Text>
        <Text style={styles.title}>🔍 Recherche globale</Text>
      </View>

      <View style={styles.px20}>
        <TextInput
          style={styles.input}
          placeholder="Tape un mot-clé (ex: dérivée, PGCD, photosynthèse...)"
          placeholderTextColor="#64748B"
          value={texte}
          onChangeText={setTexte}
          autoFocus
        />
        {chercher ? <ActivityIndicator color="#FBBF24" style={{ marginBottom: 10 }} /> : null}
        {resultats && texte.trim().length >= 2 ? (
          <Text style={styles.compteur}>{total} résultat(s) — exercices 📝, formules 📐, cours 📘, olympiades 🏅</Text>
        ) : (
          <Text style={styles.compteur}>Cherche dans tes exercices téléchargés, les {FORMULES.length} formules, tes cours et les olympiades.</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {resultats && resultats.exercices.length > 0 && (
          <>
            <Text style={styles.section}>📝 Exercices ({resultats.exercices.length})</Text>
            {resultats.exercices.map((e) => (
              <TouchableOpacity key={e.id} style={styles.carteExo} onPress={() => router.push({ pathname: '/exercices', params: { id: e.id } })}>
                <Text style={styles.carteTitre} numberOfLines={2}>{e.enonce}</Text>
                {e.chapitre ? <Text style={styles.carteDetail}>{e.chapitre}</Text> : null}
              </TouchableOpacity>
            ))}
          </>
        )}

        {resultats && resultats.formules.length > 0 && (
          <>
            <Text style={styles.section}>📐 Formules ({resultats.formules.length})</Text>
            {resultats.formules.map((f) => (
              <TouchableOpacity key={f.id} style={styles.carteFormule} onPress={() => router.push('/formulaire')}>
                <Text style={styles.carteTitre}>{f.titre}</Text>
                <Text style={styles.formuleTexte}>{f.formule}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {resultats && resultats.cours.length > 0 && (
          <>
            <Text style={styles.section}>📘 Cours téléchargés ({resultats.cours.length})</Text>
            {resultats.cours.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.carteCours}
                onPress={() => router.push({ pathname: '/flashcards', params: { chapitre_id: c.id, titre: c.titre } })}
              >
                <Text style={styles.carteTitre}>{c.titre}</Text>
                {c.matiere ? <Text style={styles.carteDetail}>{c.matiere}</Text> : null}
              </TouchableOpacity>
            ))}
          </>
        )}

        {resultats && resultats.olympiades.length > 0 && (
          <>
            <Text style={styles.section}>🏅 Olympiades ({resultats.olympiades.length})</Text>
            {resultats.olympiades.map((p) => (
              <TouchableOpacity key={p.id} style={styles.carteOlympiade} onPress={() => router.push('/olympiades')}>
                <Text style={styles.carteTitre} numberOfLines={2}>{p.enonce}</Text>
                <Text style={styles.carteDetail}>{p.theme}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {resultats && total === 0 && texte.trim().length >= 2 && (
          <Text style={styles.vide}>
            Rien trouvé. Astuce : télécharge plus de chapitres 📥 pour enrichir la recherche, ou essaie un autre mot-clé.
          </Text>
        )}
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
  px20: { paddingHorizontal: 20 },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 15, color: '#F8FAFC', fontSize: 15 },
  compteur: { color: '#64748B', fontSize: 11, fontStyle: 'italic', marginBottom: 10, lineHeight: 16 },
  section: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold', marginBottom: 10, marginTop: 8 },
  carteExo: { backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  carteFormule: { backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  carteCours: { backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  carteOlympiade: { backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  carteTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', lineHeight: 20 },
  carteDetail: { color: '#64748B', fontSize: 11, marginTop: 4 },
  formuleTexte: { color: '#FBBF24', fontSize: 15, marginTop: 6 },
  vide: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 30, lineHeight: 22 },
});
