import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TypeFonction = 'ax+b' | 'ax²+bx' | 'sin' | 'cos';

export default function Figures() {
  const router = useRouter();
  const [mode, setMode] = useState<'fonction' | 'pythagore'>('fonction');

  // --- Traceur de fonctions ---
  const [typeF, setTypeF] = useState<TypeFonction>('ax²+bx');
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);

  const points = useMemo(() => {
    // Grille de 33 colonnes × 25 lignes ; x ∈ [-6.6, 6.6], y ∈ [-5, 5]
    const colonnes = 33;
    const lignes = 25;
    const xmin = -6.6;
    const xmax = 6.6;
    const ymin = -5;
    const ymax = 5;
    const f = (x: number): number => {
      if (typeF === 'ax+b') return a * x + b;
      if (typeF === 'ax²+bx') return a * x * x + b * x;
      if (typeF === 'sin') return a * Math.sin(x) + b;
      return a * Math.cos(x) + b;
    };
    const grille: boolean[][] = Array.from({ length: lignes }, () => Array(colonnes).fill(false));
    for (let c = 0; c < colonnes; c++) {
      const x = xmin + ((xmax - xmin) * c) / (colonnes - 1);
      const y = f(x);
      if (y < ymin || y > ymax) continue;
      // ligne 0 = haut (y = ymax)
      const l = Math.round(((ymax - y) / (ymax - ymin)) * (lignes - 1));
      grille[l][c] = true;
    }
    return grille;
  }, [typeF, a, b]);

  const etiquette = typeF === 'ax+b'
    ? `f(x) = ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)}`
    : typeF === 'ax²+bx'
      ? `f(x) = ${a}x² ${b >= 0 ? '+' : '−'} ${Math.abs(b)}x`
      : `f(x) = ${a}·${typeF === 'sin' ? 'sin(x)' : 'cos(x)'} ${b >= 0 ? '+' : '−'} ${Math.abs(b)}`;

  // --- Pythagore (triple 3-4-5 redimensionnable) ---
  const [k, setK] = useState(1);

  const BoutonReglage = ({ label, valeur, onMoins, onPlus }: { label: string; valeur: string; onMoins: () => void; onPlus: () => void }) => (
    <View style={styles.reglage}>
      <Text style={styles.reglageLabel}>{label}</Text>
      <View style={styles.reglageRow}>
        <TouchableOpacity style={styles.petitBtn} onPress={onMoins}><Text style={styles.petitBtnText}>−</Text></TouchableOpacity>
        <Text style={styles.reglageValeur}>{valeur}</Text>
        <TouchableOpacity style={styles.petitBtn} onPress={onPlus}><Text style={styles.petitBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>VISUALISER POUR MIEUX COMPRENDRE</Text>
        <Text style={styles.title}>🖼️ Figures de géométrie</Text>
      </View>

      <View style={styles.rowModes}>
        <TouchableOpacity style={[styles.modeBtn, mode === 'fonction' && styles.modeBtnActif]} onPress={() => setMode('fonction')}>
          <Text style={[styles.modeBtnText, mode === 'fonction' && styles.modeBtnTextActif]}>📈 Fonctions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeBtn, mode === 'pythagore' && styles.modeBtnActif]} onPress={() => setMode('pythagore')}>
          <Text style={[styles.modeBtnText, mode === 'pythagore' && styles.modeBtnTextActif]}>📐 Pythagore</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {mode === 'fonction' ? (
          <View>
            <Text style={styles.etiquette}>{etiquette}</Text>
            <View style={styles.grille}>
              {points.map((ligne, li) => (
                <View key={li} style={styles.grilleLigne}>
                  {ligne.map((plein, ci) => (
                    <View key={ci} style={[styles.pixel, plein && styles.pixelPlein, ci === 16 && styles.pixelAxeY, li === 12 && styles.pixelAxeX]} />
                  ))}
                </View>
              ))}
            </View>
            <Text style={styles.aide}>Courbe en jaune, axes en bleu. Ajuste a et b pour voir la transformation en direct !</Text>

            <View style={styles.rowTypes}>
              {(['ax+b', 'ax²+bx', 'sin', 'cos'] as TypeFonction[]).map((t) => (
                <TouchableOpacity key={t} style={[styles.chip, typeF === t && styles.chipActive]} onPress={() => setTypeF(t)}>
                  <Text style={[styles.chipText, typeF === t && styles.chipTextActive]}>{t === 'ax+b' ? 'Droite' : t === 'ax²+bx' ? 'Parabole' : t === 'sin' ? 'Sinus' : 'Cosinus'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <BoutonReglage label="a (coefficient)" valeur={String(a)} onMoins={() => setA((v) => Math.max(-5, v - 0.5))} onPlus={() => setA((v) => Math.min(5, v + 0.5))} />
            <BoutonReglage label="b (décalage)" valeur={String(b)} onMoins={() => setB((v) => Math.max(-5, v - 0.5))} onPlus={() => setB((v) => Math.min(5, v + 0.5))} />
          </View>
        ) : (
          <View>
            <View style={styles.triangleZone}>
              {/* Triangle rectangle dessiné avec des blocs (escalier) */}
              <View style={styles.triangle}>
                <View style={[styles.coteVertical, { height: 60 * k }]} />
                <View style={[styles.coteHorizontal, { width: 80 * k }]} />
                <View style={[styles.hypotenuse, { transform: [{ rotate: `${Math.atan2(60 * k, 80 * k) * (180 / Math.PI)}deg` }], width: 100 * k }]} />
              </View>
            </View>
            <Text style={styles.pythagoreTexte}>
              Triangle rectangle de côtés {3 * k} et {4 * k} :{'\n'}
              hypoténuse = √(({3 * k})² + ({4 * k})²) = √{9 * k * k + 16 * k * k} = {5 * k}
            </Text>
            <BoutonReglage label="Multiplicateur k" valeur={String(k)} onMoins={() => setK((v) => Math.max(1, v - 1))} onPlus={() => setK((v) => Math.min(4, v + 1))} />
            <Text style={styles.aide}>Le triangle 3-4-5 reste rectangle quelle que soit sa taille : c'est un triplet pythagoricien !</Text>
          </View>
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
  rowModes: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  modeBtn: { flex: 1, marginHorizontal: 3, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center' },
  modeBtnActif: { backgroundColor: '#FBBF24' },
  modeBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: 'bold' },
  modeBtnTextActif: { color: '#0F172A' },
  etiquette: { color: '#FBBF24', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, fontFamily: 'monospace' },
  grille: { backgroundColor: '#020617', borderRadius: 10, padding: 6, borderWidth: 1, borderColor: '#1E293B', marginBottom: 10 },
  grilleLigne: { flexDirection: 'row', justifyContent: 'center' },
  pixel: { width: 9, height: 9, margin: 0.5, borderRadius: 1 },
  pixelPlein: { backgroundColor: '#FBBF24' },
  pixelAxeX: { backgroundColor: '#1E3A5F' },
  pixelAxeY: { backgroundColor: '#1E3A5F' },
  aide: { color: '#64748B', fontSize: 12, fontStyle: 'italic', lineHeight: 18, textAlign: 'center', marginBottom: 15 },
  rowTypes: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { color: '#94A3B8', fontSize: 12 },
  chipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  reglage: { marginBottom: 15 },
  reglageLabel: { color: '#94A3B8', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  reglageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  petitBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center', marginHorizontal: 20 },
  petitBtnText: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold' },
  reglageValeur: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', minWidth: 60, textAlign: 'center' },
  triangleZone: { alignItems: 'center', marginVertical: 30 },
  triangle: { width: 200, height: 200, position: 'relative' },
  coteVertical: { position: 'absolute', left: 40, bottom: 40, width: 5, backgroundColor: '#10B981' },
  coteHorizontal: { position: 'absolute', left: 40, bottom: 40, height: 5, backgroundColor: '#10B981' },
  hypotenuse: { position: 'absolute', left: 40, bottom: 40, height: 5, backgroundColor: '#FBBF24', transformOrigin: 'left bottom' },
  pythagoreTexte: { color: '#F8FAFC', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 15 },
});
