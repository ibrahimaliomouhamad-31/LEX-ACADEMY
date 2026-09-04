import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  couleurTheme,
  getDortoirActive,
  getExamenActif,
  getHeureRappel,
  getLangue,
  getRappelActif,
  getTaillePolice,
  getTheme,
  setDortoirActive,
  setExamenActif,
  setHeureRappel,
  setLangue,
  setRappelActif,
  setTaillePolice,
  setTheme,
  type Langue,
  type TaillePolice,
  type Theme,
} from '../services/parametres';
import { appliquerRappel } from '../services/optionsApp';

export default function Parametres() {
  const router = useRouter();
  const [langue, setL] = useState<Langue>('fr');
  const [taille, setT] = useState<TaillePolice>('normal');
  const [dortoir, setDort] = useState(false);
  const [rappel, setRappel] = useState(false);
  const [heureRappel, setH] = useState(20);
  const [examen, setExamen] = useState(false);
  const [theme, setThemeState] = useState<Theme>('jaune');

  useEffect(() => {
    (async () => {
      setL(await getLangue());
      setT(await getTaillePolice());
      setDort(await getDortoirActive());
      setRappel(await getRappelActif());
      setH(await getHeureRappel());
      setExamen(await getExamenActif());
      setThemeState(await getTheme());
    })();
  }, []);

  const basculerRappel = async (v: boolean) => {
    setRappel(v);
    await setRappelActif(v);
    Alert.alert('Rappel quotidien', await appliquerRappel());
  };

  const changerHeure = async (h: number) => {
    const borne = Math.max(6, Math.min(23, h));
    setH(borne);
    await setHeureRappel(borne);
    if (rappel) Alert.alert('Rappel quotidien', await appliquerRappel());
  };

  const Ligne = ({ titre, sousTitre, actif, onToggle }: { titre: string; sousTitre?: string; actif: boolean; onToggle: (v: boolean) => void | Promise<void> }) => (
    <View style={styles.ligne}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={styles.ligneTitre}>{titre}</Text>
        {sousTitre ? <Text style={styles.ligneSous}>{sousTitre}</Text> : null}
      </View>
      <TouchableOpacity style={[styles.interrupteur, actif && styles.interrupteurActif]} onPress={() => onToggle(!actif)}>
        <View style={[styles.poignee, actif && styles.poigneeActive]} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>RÉGLAGES</Text>
        <Text style={styles.title}>⚙️ Paramètres</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Langue */}
        <Text style={styles.section}>🌍 Langue / Language</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.chip, langue === 'fr' && styles.chipActive]} onPress={async () => { setL('fr'); await setLangue('fr'); }}>
            <Text style={[styles.chipText, langue === 'fr' && styles.chipTextActive]}>🇫🇷 Français</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, langue === 'en' && styles.chipActive]} onPress={async () => { setL('en'); await setLangue('en'); }}>
            <Text style={[styles.chipText, langue === 'en' && styles.chipTextActive]}>🇬🇧 English</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.note}>The English interface applies to the main screens. / L'anglais s'applique aux écrans principaux.</Text>

        {/* Taille de police */}
        <Text style={styles.section}>🔤 Taille de police / Font size</Text>
        <View style={styles.row}>
          {(['petit', 'normal', 'grand'] as TaillePolice[]).map((tp, i) => (
            <TouchableOpacity key={tp} style={[styles.chip, taille === tp && styles.chipActive]} onPress={async () => { setT(tp); await setTaillePolice(tp); }}>
              <Text style={[styles.chipText, taille === tp && styles.chipTextActive, { fontSize: 13 + i * 5 }]}>A</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.note}>Redémarre l'application après le changement. / Restart the app after changing.</Text>

        {/* Thème */}
        <Text style={styles.section}>🎨 Thème (boutique 🛍️ pour plus de couleurs)</Text>
        <View style={styles.row}>
          {(['jaune', 'bleu', 'vert', 'violet', 'rose'] as Theme[]).map((th) => (
            <TouchableOpacity
              key={th}
              style={[styles.chipRond, { backgroundColor: couleurTheme(th) }, theme === th && styles.chipRondActif]}
              onPress={async () => { setThemeState(th); await setTheme(th); }}
            />
          ))}
        </View>
        <Text style={styles.note}>Bleu, vert et violet s'obtiennent aussi dans la Boutique avec tes crédits 💰</Text>

        {/* Options */}
        <Text style={styles.section}>🧪 Options</Text>
        <Ligne titre="🌙 Mode dortoir" sousTitre="Filtre ambre sur tout l'écran pour réviser sans éblouir (optionnel)" actif={dortoir} onToggle={async (v) => { setDort(v); await setDortoirActive(v); }} />
        <Ligne titre="🔒 Mode examen" sousTitre="Verrouille formulaire, calculatrice, flashcards et recherche : zéro triche possible pendant une épreuve" actif={examen} onToggle={async (v) => { setExamen(v); await setExamenActif(v); }} />

        {/* Rappel quotidien */}
        <Text style={styles.section}>⏰ Rappel quotidien</Text>
        <Ligne titre="Me rappeler de réviser" sousTitre="Une notification locale chaque jour (fonctionne hors-ligne)" actif={rappel} onToggle={basculerRappel} />
        {rappel && (
          <View style={styles.rowHeure}>
            <TouchableOpacity style={styles.btnHeure} onPress={() => changerHeure(heureRappel - 1)}>
              <Text style={styles.btnHeureText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.heure}>{String(heureRappel).padStart(2, '0')}h00</Text>
            <TouchableOpacity style={styles.btnHeure} onPress={() => changerHeure(heureRappel + 1)}>
              <Text style={styles.btnHeureText}>+</Text>
            </TouchableOpacity>
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
  section: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 10 },
  row: { flexDirection: 'row', marginBottom: 8 },
  chip: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, marginRight: 10, alignItems: 'center', justifyContent: 'center', minWidth: 110 },
  chipActive: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  chipRond: { width: 42, height: 42, borderRadius: 21, marginRight: 12, borderWidth: 2, borderColor: '#334155' },
  chipRondActif: { borderColor: '#F8FAFC', borderWidth: 3 },
  chipText: { color: '#94A3B8', fontSize: 14 },
  chipTextActive: { color: '#0F172A', fontWeight: 'bold' },
  note: { color: '#64748B', fontSize: 12, fontStyle: 'italic', marginBottom: 15, lineHeight: 18 },
  ligne: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10 },
  ligneTitre: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  ligneSous: { color: '#64748B', fontSize: 11, marginTop: 4, lineHeight: 16 },
  interrupteur: { width: 52, height: 30, borderRadius: 15, backgroundColor: '#334155', padding: 3, justifyContent: 'center' },
  interrupteurActif: { backgroundColor: '#10B981', alignItems: 'flex-end' },
  poignee: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#94A3B8' },
  poigneeActive: { backgroundColor: '#FFFFFF' },
  rowHeure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  btnHeure: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginHorizontal: 20 },
  btnHeureText: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold' },
  heure: { color: '#F8FAFC', fontSize: 24, fontWeight: 'bold' },
});
