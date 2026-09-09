import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Calculatrice() {
  const router = useRouter();
  const [affichage, setAffichage] = useState('0');
  const [operateur, setOperateur] = useState<string | null>(null);
  const [premierNombre, setPremierNombre] = useState<number | null>(null);
  const [attenteOperateur, setAttenteOperateur] = useState(false);

  const taperChiffre = (chiffre: string) => {
    if (attenteOperateur) { setAffichage(chiffre); setAttenteOperateur(false); }
    else { setAffichage(affichage === '0' ? chiffre : affichage + chiffre); }
  };

  const calculer = (a: number, b: number, op: string): number => {
    switch (op) { case '+': return a + b; case '-': return a - b; case 'x': return a * b; case '/': return b !== 0 ? a / b : 0; case '^': return Math.pow(a, b); default: return b; }
  };

  const taperOperateur = (op: string) => {
    const nombre = parseFloat(affichage);
    if (premierNombre !== null && operateur && !attenteOperateur) {
      const resultat = calculer(premierNombre, nombre, operateur);
      setAffichage(String(resultat)); setPremierNombre(resultat);
    } else { setPremierNombre(nombre); }
    setOperateur(op); setAttenteOperateur(true);
  };

  const egal = () => {
    if (premierNombre !== null && operateur) {
      const nombre = parseFloat(affichage);
      const resultat = calculer(premierNombre, nombre, operateur);
      setAffichage(String(resultat)); setPremierNombre(null); setOperateur(null); setAttenteOperateur(false);
    }
  };

  const effacer = () => { setAffichage('0'); setPremierNombre(null); setOperateur(null); setAttenteOperateur(false); };

  const fonctionScientifique = (fonction: string) => {
    const nombre = parseFloat(affichage);
    let resultat = 0;
    switch (fonction) {
      case 'sqrt': resultat = Math.sqrt(nombre); break;
      case 'sin': resultat = Math.sin(nombre * Math.PI / 180); break;
      case 'cos': resultat = Math.cos(nombre * Math.PI / 180); break;
      case 'tan': resultat = Math.tan(nombre * Math.PI / 180); break;
      case 'ln': resultat = Math.log(nombre); break;
      case 'log': resultat = Math.log10(nombre); break;
      case 'x2': resultat = nombre * nombre; break;
      case '1/x': resultat = nombre !== 0 ? 1 / nombre : 0; break;
      case 'pi': resultat = Math.PI; break;
      case 'e': resultat = Math.E; break;
      case '+/-': resultat = -nombre; break;
    }
    setAffichage(String(parseFloat(resultat.toFixed(10))));
  };

  const Bouton = ({ valeur, onPress, style, texteStyle }: any) => (
    <TouchableOpacity style={[styles.bouton, style]} onPress={onPress}>
      <Text style={[styles.boutonTexte, texteStyle]}>{valeur}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Calculatrice Scientifique</Text>
      </View>
      <View style={styles.affichage}>
        <Text style={styles.operateurTexte}>{premierNombre} {operateur}</Text>
        <Text style={styles.resultatTexte}>{affichage}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fonctionsScroll}>
        {['sin', 'cos', 'tan', 'ln', 'log', 'sqrt', 'x2', '1/x', 'pi', 'e', '+/-', '^'].map(f => (
          <Bouton key={f} valeur={f} onPress={() => fonctionScientifique(f)} style={styles.boutonFonction} texteStyle={styles.fonctionTexte} />
        ))}
      </ScrollView>
      <View style={styles.clavier}>
        <View style={styles.ligne}>
          <Bouton valeur="C" onPress={effacer} style={styles.boutonEffacer} texteStyle={styles.effacerTexte} />
          <Bouton valeur="(" onPress={() => taperChiffre('(')} style={styles.boutonOperateur} />
          <Bouton valeur=")" onPress={() => taperChiffre(')')} style={styles.boutonOperateur} />
          <Bouton valeur="/" onPress={() => taperOperateur('/')} style={styles.boutonOperateur} />
        </View>
        <View style={styles.ligne}>
          <Bouton valeur="7" onPress={() => taperChiffre('7')} />
          <Bouton valeur="8" onPress={() => taperChiffre('8')} />
          <Bouton valeur="9" onPress={() => taperChiffre('9')} />
          <Bouton valeur="x" onPress={() => taperOperateur('x')} style={styles.boutonOperateur} />
        </View>
        <View style={styles.ligne}>
          <Bouton valeur="4" onPress={() => taperChiffre('4')} />
          <Bouton valeur="5" onPress={() => taperChiffre('5')} />
          <Bouton valeur="6" onPress={() => taperChiffre('6')} />
          <Bouton valeur="-" onPress={() => taperOperateur('-')} style={styles.boutonOperateur} />
        </View>
        <View style={styles.ligne}>
          <Bouton valeur="1" onPress={() => taperChiffre('1')} />
          <Bouton valeur="2" onPress={() => taperChiffre('2')} />
          <Bouton valeur="3" onPress={() => taperChiffre('3')} />
          <Bouton valeur="+" onPress={() => taperOperateur('+')} style={styles.boutonOperateur} />
        </View>
        <View style={styles.ligne}>
          <Bouton valeur="0" onPress={() => taperChiffre('0')} style={styles.boutonZero} />
          <Bouton valeur="." onPress={() => taperChiffre('.')} />
          <Bouton valeur="=" onPress={egal} style={styles.boutonEgal} texteStyle={styles.egalTexte} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#1E293B', backgroundColor: '#0F172A' },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10, fontWeight: '600' },
  title: { color: '#F9FAFB', fontSize: 20, fontWeight: 'bold' },
  affichage: { backgroundColor: '#111827', padding: 20, margin: 15, borderRadius: 14, minHeight: 100, justifyContent: 'flex-end', alignItems: 'flex-end' },
  operateurTexte: { color: '#6B7280', fontSize: 14 },
  resultatTexte: { color: '#F9FAFB', fontSize: 36, fontWeight: 'bold' },
  fonctionsScroll: { paddingHorizontal: 15, paddingVertical: 10, maxHeight: 50 },
  boutonFonction: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  fonctionTexte: { color: '#93C5FD', fontSize: 12, fontWeight: '600' },
  clavier: { flex: 1, padding: 10 },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  bouton: { backgroundColor: '#374151', borderRadius: 12, flex: 1, marginHorizontal: 4, height: 55, alignItems: 'center', justifyContent: 'center' },
  boutonTexte: { color: '#F9FAFB', fontSize: 20, fontWeight: '600' },
  boutonOperateur: { backgroundColor: '#1E3A5F' },
  boutonEffacer: { backgroundColor: '#7F1D1D' },
  effacerTexte: { color: '#FCA5A5' },
  boutonZero: { flex: 2 },
  boutonEgal: { backgroundColor: '#10B981' },
  egalTexte: { color: '#FFFFFF' },
});
