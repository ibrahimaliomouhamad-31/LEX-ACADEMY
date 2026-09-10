import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FORMULES } from '../services/formulaire';
import { bloquerSiExamen } from '../services/parametres';

type Matiere = 'Mathématiques' | 'Physique-Chimie';

// 📐 Formules CEA (Seconde → Terminale, services/formulaire.ts), 100% hors-ligne.
// Par défaut : niveau Terminale (BAC C/D).
export default function Formulaire() {
  const router = useRouter();
  // 🛡️ VERROU EXAMEN DIRECT : bloque même en accès direct (deep link).
  useEffect(() => { bloquerSiExamen(router, 'Formulaire'); }, []);
  const [matiere, setMatiere] = useState<Matiere>('Mathématiques');
  const [terminaleSeulement, setTerminaleSeulement] = useState(true);
  const [categorieChoisie, setCategorieChoisie] = useState('');

  const categories = useMemo(() => {
    const visibles = FORMULES.filter(
      (f) => f.matiere === matiere && (!terminaleSeulement || f.niveau === 'Terminale'),
    );
    return Array.from(new Set(visibles.map((f) => f.categorie)));
  }, [matiere, terminaleSeulement]);

  const categorieActive = categories.includes(categorieChoisie) ? categorieChoisie : categories[0] || '';

  const formules = useMemo(
    () =>
      FORMULES.filter(
        (f) =>
          f.matiere === matiere &&
          f.categorie === categorieActive &&
          (!terminaleSeulement || f.niveau === 'Terminale'),
      ),
    [matiere, categorieActive, terminaleSeulement],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>BAC C/D · 100% HORS-LIGNE</Text>
        <Text style={styles.title}>📐 Fiches de Formules</Text>
      </View>

      <View style={styles.rowMatieres}>
        {(['Mathématiques', 'Physique-Chimie'] as Matiere[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.matiereBtn, matiere === m && styles.matiereBtnActif]}
            onPress={() => {
              setMatiere(m);
              setCategorieChoisie('');
            }}
          >
            <Text style={[styles.matiereText, matiere === m && styles.matiereTextActif]}>
              {m === 'Mathématiques' ? '📐 Maths' : '⚛️ Phys-Chimie'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.niveauToggle} onPress={() => setTerminaleSeulement(!terminaleSeulement)}>
        <Text style={styles.niveauText}>
          {terminaleSeulement
            ? '🎓 Terminale seulement — toucher pour voir tous les niveaux'
            : '📚 Tous niveaux — toucher pour filtrer Terminale'}
        </Text>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.onglets}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.onglet, categorieActive === cat && styles.ongletActif]}
            onPress={() => setCategorieChoisie(cat)}
          >
            <Text style={[styles.ongletText, categorieActive === cat && styles.ongletTextActif]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.categorieTitre}>
          {categorieActive} · {formules.length} formule(s)
        </Text>
        {formules.map((f) => (
          <View key={f.id} style={styles.carteFormule}>
            <Text style={styles.formuleTitre}>{f.titre}</Text>
            <View style={styles.formuleBox}>
              <Text style={styles.formuleText}>{f.formule}</Text>
            </View>
            <Text style={styles.formuleDescription}>{f.explication}</Text>
            <Text style={styles.niveauBadge}>{f.niveau}</Text>
          </View>
        ))}
        {formules.length === 0 && <Text style={styles.vide}>Aucune formule dans cette catégorie.</Text>}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10, backgroundColor: '#0F172A' },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10, fontWeight: '600' },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F9FAFB', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  rowMatieres: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 10, gap: 10 },
  matiereBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', alignItems: 'center' },
  matiereBtnActif: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  matiereText: { color: '#9CA3AF', fontWeight: 'bold', fontSize: 14 },
  matiereTextActif: { color: '#FFFFFF' },
  niveauToggle: { paddingHorizontal: 20, paddingVertical: 10 },
  niveauText: { color: '#FBBF24', fontSize: 12 },
  onglets: { paddingHorizontal: 20, paddingVertical: 10, maxHeight: 60 },
  onglet: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, alignItems: 'center' },
  ongletActif: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  ongletText: { color: '#D1D5DB', fontSize: 12, fontWeight: '500' },
  ongletTextActif: { color: '#0F172A', fontWeight: 'bold' },
  categorieTitre: { color: '#FBBF24', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  carteFormule: { backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#374151' },
  formuleTitre: { color: '#F9FAFB', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  formuleBox: { backgroundColor: '#0F172A', borderRadius: 10, padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  formuleText: { color: '#93C5FD', fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' },
  formuleDescription: { color: '#9CA3AF', fontSize: 13, marginBottom: 6, lineHeight: 19 },
  niveauBadge: { color: '#6EE7B7', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  vide: { color: '#94A3B8', textAlign: 'center', marginTop: 30 },
});