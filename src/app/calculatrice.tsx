import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { evaluer, formater } from '../services/calculatrice';

const TOUCHES: { t: string; large?: boolean; couleur?: string }[] = [
  { t: 'C', couleur: '#EF4444' }, { t: '(', couleur: '#334155' }, { t: ')', couleur: '#334155' }, { t: '÷', couleur: '#F59E0B' },
  { t: '7' }, { t: '8' }, { t: '9' }, { t: '×', couleur: '#F59E0B' },
  { t: '4' }, { t: '5' }, { t: '6' }, { t: '-', couleur: '#F59E0B' },
  { t: '1' }, { t: '2' }, { t: '3' }, { t: '+', couleur: '#F59E0B' },
  { t: '0' }, { t: '.' }, { t: '⌫', couleur: '#334155' }, { t: '=', couleur: '#10B981' },
  { t: '√(', couleur: '#3B82F6' }, { t: '^', couleur: '#3B82F6' }, { t: 'π', couleur: '#3B82F6' }, { t: 'sin(', couleur: '#3B82F6' },
  { t: 'cos(', couleur: '#3B82F6' }, { t: 'tan(', couleur: '#3B82F6' }, { t: 'ln(', couleur: '#3B82F6' }, { t: 'log(', couleur: '#3B82F6' },
];

export default function Calculatrice() {
  const router = useRouter();
  const [expression, setExpression] = useState('');
  const [resultat, setResultat] = useState('');
  const [erreur, setErreur] = useState(false);

  const appuyer = (t: string) => {
    setErreur(false);
    if (t === 'C') {
      setExpression('');
      setResultat('');
      return;
    }
    if (t === '⌫') {
      const e = expression.slice(0, -1);
      setExpression(e);
      return;
    }
    if (t === '=') {
      try {
        setResultat('= ' + formater(evaluer(expression)));
      } catch {
        setResultat('Expression invalide');
        setErreur(true);
      }
      return;
    }
    setExpression(expression + t);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>OUTIL</Text>
        <Text style={styles.title}>🖩 Calculatrice</Text>
      </View>

      <View style={styles.ecran}>
        <Text style={styles.expression} numberOfLines={2}>{expression || ' '}</Text>
        <Text style={[styles.resultat, erreur && styles.resultatErreur]} numberOfLines={1}>{resultat || ' '}</Text>
      </View>

      <View style={styles.pave}>
        <View style={styles.grille}>
          {TOUCHES.map((touche) => (
            <TouchableOpacity
              key={touche.t}
              style={[styles.touche, { backgroundColor: touche.couleur || '#1E293B' }]}
              onPress={() => appuyer(touche.t)}
            >
              <Text style={[styles.toucheText, (touche.couleur === '#F59E0B' || touche.couleur === '#EF4444' || touche.couleur === '#10B981') && { color: '#FFFFFF' }]}>
                {touche.t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  ecran: { margin: 15, backgroundColor: '#020617', borderRadius: 12, padding: 20, minHeight: 110, justifyContent: 'flex-end', borderWidth: 1, borderColor: '#1E293B' },
  expression: { color: '#94A3B8', fontSize: 22, textAlign: 'right', marginBottom: 8 },
  resultat: { color: '#10B981', fontSize: 30, fontWeight: 'bold', textAlign: 'right' },
  resultatErreur: { color: '#EF4444', fontSize: 18 },
  pave: { flex: 1, padding: 8 },
  grille: { flexDirection: 'row', flexWrap: 'wrap' },
  touche: { width: '23.5%', aspectRatio: 1, margin: '0.75%', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  toucheText: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold' },
});
