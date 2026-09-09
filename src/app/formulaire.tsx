import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Formule { titre: string; formule: string; description: string; exemple?: string; }
interface CategorieFormules { id: string; nom: string; emoji: string; formules: Formule[]; }

const FORMULES_BAC_C: CategorieFormules[] = [
  {
    id: 'alg', nom: 'Algèbre', emoji: '🔢',
    formules: [
      { titre: 'Discriminant', formule: 'Δ = b² - 4ac', description: 'Pour ax² + bx + c = 0', exemple: 'x² - 5x + 6 = 0 → Δ = 1' },
      { titre: 'Somme des racines', formule: 'x₁ + x₂ = -b/a', description: 'Relation coefficients-racines' },
      { titre: 'Produit des racines', formule: 'x₁ × x₂ = c/a', description: 'Relation coefficients-racines' },
      { titre: 'Forme canonique', formule: 'a(x - α)² + β', description: 'α = -b/2a, β = f(α)' },
      { titre: 'Identités remarquables', formule: '(a±b)² = a² ± 2ab + b²', description: 'Développement' },
    ],
  },
  {
    id: 'ana', nom: 'Analyse', emoji: '📈',
    formules: [
      { titre: 'Dérivée (puissance)', formule: "(xⁿ)' = nxⁿ⁻¹", description: 'Règle de puissance' },
      { titre: 'Dérivée (produit)', formule: "(uv)' = u'v + uv'", description: 'Règle du produit' },
      { titre: 'Dérivée (quotient)', formule: "(u/v)' = (u'v - uv')/v²", description: 'Règle du quotient' },
      { titre: 'Dérivée (ln)', formule: "(ln x)' = 1/x", description: 'Logarithme népérien' },
      { titre: 'Dérivée (exp)', formule: "(eˣ)' = eˣ", description: 'Exponentielle' },
      { titre: 'Suite arithmétique', formule: 'uₙ = u₀ + nr', description: 'raison r' },
      { titre: 'Suite géométrique', formule: 'uₙ = u₀ × qⁿ', description: 'raison q' },
    ],
  },
  {
    id: 'geo', nom: 'Géométrie', emoji: '📐',
    formules: [
      { titre: 'Pythagore', formule: 'AB² + AC² = BC²', description: 'Triangle rectangle' },
      { titre: 'Thalès', formule: 'AM/AB = AE/AC = ME/BC', description: 'Triangles semblables' },
      { titre: 'Trigonométrie', formule: 'sin²x + cos²x = 1', description: 'Identité fondamentale' },
      { titre: 'Tangente', formule: 'tan x = sin x / cos x', description: 'Définition' },
      { titre: 'Aire triangle', formule: 'A = ½ × base × hauteur', description: 'Formule de base' },
      { titre: 'Aire cercle', formule: 'A = πr²', description: 'Rayon r' },
      { titre: 'Volume sphère', formule: 'V = (4/3)πr³', description: 'Rayon r' },
    ],
  },
  {
    id: 'prob', nom: 'Probabilités', emoji: '🎲',
    formules: [
      { titre: 'Probabilité', formule: 'P(A) = cas favorables / cas totaux', description: 'Définition' },
      { titre: 'Arrangement', formule: 'A(n,p) = n!/(n-p)!', description: 'p éléments parmi n' },
      { titre: 'Combinaison', formule: 'C(n,p) = n!/(p!(n-p)!)', description: 'p éléments parmi n' },
      { titre: 'Binôme de Newton', formule: '(a+b)ⁿ = Σ C(n,k) aⁿ⁻ᵏbᵏ', description: 'Développement' },
    ],
  },
  {
    id: 'comp', nom: 'Nombres complexes', emoji: '🔮',
    formules: [
      { titre: 'Module', formule: '|z| = √(a² + b²)', description: 'z = a + bi' },
      { titre: 'Conjugué', formule: 'z̄ = a - bi', description: 'z = a + bi' },
      { titre: 'Forme exponentielle', formule: 'z = re^(iθ)', description: 'r = |z|, θ = arg(z)' },
      { titre: "Formule d'Euler", formule: 'e^(iθ) = cos θ + i sin θ', description: 'Identité fondamentale' },
    ],
  },
];

export default function Formulaire() {
  const router = useRouter();
  const [categorieActive, setCategorieActive] = useState(FORMULES_BAC_C[0].id);
  const categorie = FORMULES_BAC_C.find(c => c.id === categorieActive) || FORMULES_BAC_C[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>BAC C/D</Text>
        <Text style={styles.title}>📐 Fiches de Formules</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.onglets}>
        {FORMULES_BAC_C.map((cat) => (
          <TouchableOpacity key={cat.id} style={[styles.onglet, categorieActive === cat.id && styles.ongletActif]} onPress={() => setCategorieActive(cat.id)}>
            <Text style={styles.ongletEmoji}>{cat.emoji}</Text>
            <Text style={[styles.ongletText, categorieActive === cat.id && styles.ongletTextActif]}>{cat.nom}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.categorieTitre}>{categorie.emoji} {categorie.nom}</Text>
        {categorie.formules.map((formule, index) => (
          <View key={index} style={styles.carteFormule}>
            <Text style={styles.formuleTitre}>{formule.titre}</Text>
            <View style={styles.formuleBox}>
              <Text style={styles.formuleText}>{formule.formule}</Text>
            </View>
            <Text style={styles.formuleDescription}>{formule.description}</Text>
            {formule.exemple && (
              <View style={styles.exempleBox}>
                <Text style={styles.exempleLabel}>Exemple :</Text>
                <Text style={styles.exempleText}>{formule.exemple}</Text>
              </View>
            )}
          </View>
        ))}
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
  onglets: { paddingHorizontal: 20, paddingVertical: 10, maxHeight: 70 },
  onglet: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10, alignItems: 'center', minWidth: 80 },
  ongletActif: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  ongletEmoji: { fontSize: 20, marginBottom: 4 },
  ongletText: { color: '#D1D5DB', fontSize: 12, fontWeight: '500' },
  ongletTextActif: { color: '#0F172A', fontWeight: 'bold' },
  categorieTitre: { color: '#FBBF24', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  carteFormule: { backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#374151' },
  formuleTitre: { color: '#F9FAFB', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  formuleBox: { backgroundColor: '#0F172A', borderRadius: 10, padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  formuleText: { color: '#93C5FD', fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' },
  formuleDescription: { color: '#9CA3AF', fontSize: 13, marginBottom: 4 },
  exempleBox: { backgroundColor: '#1F2937', borderRadius: 8, padding: 10, marginTop: 8 },
  exempleLabel: { color: '#FBBF24', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  exempleText: { color: '#D1D5DB', fontSize: 12, fontFamily: 'monospace' },
});
