import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getAllCoursCache } from '../services/cacheHorsLigne';
import {
  LIBELLES_OBJECTIFS,
  ajouterObjectif,
  getAnnotations,
  ajouterAnnotation,
  getObjectifs,
  progressionObjectifs,
  supprimerAnnotation,
  supprimerObjectif,
  type TypeObjectif,
} from '../services/objectifs';

export default function ObjectifsEcran() {
  const router = useRouter();
  const [progs, setProgs] = useState<{ objectif: { type: TypeObjectif; cible: number }; actuel: number }[]>([]);
  const [nouveauType, setNouveauType] = useState<TypeObjectif>('exos_officiels');
  const [nouvelleCible, setNouvelleCible] = useState('50');

  // Notes
  const [cours, setCours] = useState<{ id: string; titre: string }[]>([]);
  const [chapitreChoisi, setChapitreChoisi] = useState('');
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<{ chapitreTitre: string; texte: string; dateISO: string; chapitreId: string }[]>([]);

  useEffect(() => {
    recharger();
    (async () => {
      setCours(await getAllCoursCache());
    })();
  }, []);

  const recharger = async () => {
    setProgs(await progressionObjectifs());
    setNotes(await getAnnotations());
  };

  const creer = async () => {
    const cible = parseInt(nouvelleCible, 10);
    if (cible > 0) {
      await ajouterObjectif(nouveauType, cible);
      setNouvelleCible('50');
      recharger();
    }
  };

  const enregistrerNote = async () => {
    if (note.trim() === '' || chapitreChoisi === '') return;
    const c = cours.find((x) => x.id === chapitreChoisi);
    await ajouterAnnotation(chapitreChoisi, c?.titre || chapitreChoisi, note.trim());
    setNote('');
    recharger();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>MOTIVATION PERSONNELLE</Text>
        <Text style={styles.title}>🎯 Objectifs & 📖 Notes</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Objectifs */}
        <Text style={styles.section}>🎯 Mes objectifs</Text>
        {progs.length === 0 ? (
          <Text style={styles.vide}>Fixe-toi un but : c'est prouvé, on progresse plus vite avec un objectif clair !</Text>
        ) : (
          progs.map((p) => {
            const libelle = LIBELLES_OBJECTIFS.find((l) => l.type === p.objectif.type);
            const pct = Math.min(100, Math.round((p.actuel / p.objectif.cible) * 100));
            const atteint = p.actuel >= p.objectif.cible;
            return (
              <View key={p.objectif.type} style={[styles.carteObjectif, atteint && styles.carteAtteinte]}>
                <View style={styles.objHaut}>
                  <Text style={styles.objTitre}>{libelle?.emoji} {libelle?.titre}</Text>
                  <TouchableOpacity onPress={async () => { await supprimerObjectif(p.objectif.type); recharger(); }}>
                    <Text style={styles.suppr}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.barreFond}>
                  <View style={[styles.barre, { width: `${pct}%`, backgroundColor: atteint ? '#10B981' : '#FBBF24' }]} />
                </View>
                <Text style={styles.objDetail}>{p.actuel} / {p.objectif.cible} {atteint ? '— ✅ ATTEINT, bravo !' : `(${pct}%)`}</Text>
              </View>
            );
          })
        )}

        <View style={styles.blocNouveau}>
          {LIBELLES_OBJECTIFS.map((l) => (
            <TouchableOpacity key={l.type} style={[styles.chip, nouveauType === l.type && styles.chipActive]} onPress={() => setNouveauType(l.type)}>
              <Text style={[styles.chipText, nouveauType === l.type && styles.chipTextActive]}>{l.emoji} {l.titre.split(' (')[0]}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.rowNouveau}>
            <TextInput style={styles.inputCourt} value={nouvelleCible} onChangeText={setNouvelleCible} keyboardType="numeric" placeholder="Cible" placeholderTextColor="#64748B" />
            <TouchableOpacity style={styles.bouton} onPress={creer}>
              <Text style={styles.boutonText}>+ Fixer ce but</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes de cours */}
        <Text style={styles.section}>📖 Mes notes de cours</Text>
        <View style={styles.blocNote}>
          {cours.length === 0 ? (
            <Text style={styles.vide}>Télécharge des cours pour pouvoir y attacher des notes.</Text>
          ) : (
            <View>
              {cours.slice(0, 30).map((c) => (
                <TouchableOpacity key={c.id} style={[styles.chip, chapitreChoisi === c.id && styles.chipActive]} onPress={() => setChapitreChoisi(c.id)}>
                  <Text style={[styles.chipText, chapitreChoisi === c.id && styles.chipTextActive]} numberOfLines={1}>{c.titre || c.id}</Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={styles.zoneNote}
                placeholder="Écris ta note, un résumé, une astuce, une formule à retenir..."
                placeholderTextColor="#64748B"
                value={note}
                onChangeText={setNote}
                multiline
              />
              <TouchableOpacity style={styles.bouton} onPress={enregistrerNote}>
                <Text style={styles.boutonText}>💾 Enregistrer la note</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {notes.map((n, i) => (
          <View key={i} style={styles.carteNote}>
            <View style={styles.objHaut}>
              <Text style={styles.noteTitre} numberOfLines={1}>{n.chapitreTitre}</Text>
              <TouchableOpacity onPress={async () => { await supprimerAnnotation(i); recharger(); }}>
                <Text style={styles.suppr}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.noteTexte}>{n.texte}</Text>
            <Text style={styles.noteDate}>{n.dateISO}</Text>
          </View>
        ))}
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
  section: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  vide: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
  carteObjectif: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10 },
  carteAtteinte: { borderWidth: 1.5, borderColor: '#10B981' },
  objHaut: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  objTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', flex: 1, marginRight: 10 },
  suppr: { color: '#64748B', fontSize: 16, paddingHorizontal: 6 },
  barreFond: { height: 8, backgroundColor: '#0F172A', borderRadius: 4, overflow: 'hidden' },
  barre: { height: 8, borderRadius: 4 },
  objDetail: { color: '#94A3B8', fontSize: 12, marginTop: 6 },
  blocNouveau: { backgroundColor: '#16233B', borderRadius: 12, padding: 15, marginBottom: 15, flexDirection: 'row', flexWrap: 'wrap' },
  blocNote: { marginBottom: 15 },
  chip: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginRight: 6, marginBottom: 6, maxWidth: '100%' },
  chipActive: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  chipText: { color: '#94A3B8', fontSize: 11 },
  chipTextActive: { color: '#0F172A', fontWeight: 'bold' },
  rowNouveau: { flexDirection: 'row', alignItems: 'center', marginTop: 6, width: '100%' },
  inputCourt: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 10, color: '#F8FAFC', width: 80, marginRight: 10, fontSize: 15 },
  bouton: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  boutonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  zoneNote: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 14, color: '#F8FAFC', minHeight: 80, marginTop: 8, marginBottom: 10, textAlignVertical: 'top' },
  carteNote: { backgroundColor: '#14241B', borderRadius: 12, padding: 15, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  noteTitre: { color: '#C4B5FD', fontSize: 12, fontWeight: 'bold', flex: 1, marginRight: 10 },
  noteTexte: { color: '#F8FAFC', fontSize: 13, lineHeight: 19 },
  noteDate: { color: '#475569', fontSize: 10, marginTop: 6 },
});
