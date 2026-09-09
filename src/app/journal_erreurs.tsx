import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getUserItem } from '../services/userStorage';

const CLE_JOURNAL = 'lex_journal_erreurs';

export interface EntreeJournal {
  id: string;
  dateISO: string;
  enonce: string;
  reponseEleve: string;
  bonneReponse: string;
  typeErreur: 'signe' | 'calcul' | 'notion' | 'inattention' | 'unite' | 'equation';
  conceptARevoir: string;
  chapitre?: string;
  resolu: boolean;
}

const TYPES_ERREUR: { id: EntreeJournal['typeErreur']; label: string; emoji: string; couleur: string }[] = [
  { id: 'signe', label: 'Erreur de signe', emoji: '➖', couleur: '#EF4444' },
  { id: 'calcul', label: 'Erreur de calcul', emoji: '🔢', couleur: '#F59E0B' },
  { id: 'notion', label: 'Notion non maîtrisée', emoji: '📚', couleur: '#8B5CF6' },
  { id: 'inattention', label: 'Inattention', emoji: '👀', couleur: '#3B82F6' },
  { id: 'unite', label: 'Unité / Dimension', emoji: '📏', couleur: '#10B981' },
  { id: 'equation', label: 'Équation mal posée', emoji: '✏️', couleur: '#EC4899' },
];

export default function JournalErreurs() {
  const router = useRouter();
  const [entrees, setEntrees] = useState<EntreeJournal[]>([]);
  const [filtre, setFiltre] = useState<EntreeJournal['typeErreur'] | 'toutes'>('toutes');

  useEffect(() => {
    chargerJournal();
  }, []);

  const chargerJournal = async () => {
    try {
      const data = await getUserItem(CLE_JOURNAL);
      if (data) {
        setEntrees(JSON.parse(data));
      }
    } catch {}
  };

  const marquerResolu = async (id: string) => {
    const misesAJour = entrees.map(e => e.id === id ? { ...e, resolu: !e.resolu } : e);
    setEntrees(misesAJour);
    await sauvegarder(misesAJour);
  };

  const supprimerEntree = async (id: string) => {
    const misesAJour = entrees.filter(e => e.id !== id);
    setEntrees(misesAJour);
    await sauvegarder(misesAJour);
  };

  const sauvegarder = async (data: EntreeJournal[]) => {
    try {
      const { setUserItem } = await import('../services/userStorage');
      await setUserItem(CLE_JOURNAL, JSON.stringify(data));
    } catch {}
  };

  const statistiques = () => {
    const total = entrees.length;
    const resolus = entrees.filter(e => e.resolu).length;
    return { total, resolus };
  };

  const stats = statistiques();
  const entreesFiltrees = filtre === 'toutes' ? entrees : entrees.filter(e => e.typeErreur === filtre);
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>MES ERREURS</Text>
        <Text style={styles.title}>📓 Journal d'erreurs</Text>
      </View>
      <View style={styles.barreStats}>
        <View style={styles.statBox}>
          <Text style={styles.statValeur}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValeur, { color: '#10B981' }]}>{stats.resolus}</Text>
          <Text style={styles.statLabel}>Résolus ✅</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValeur, { color: '#FBBF24' }]}>
            {stats.total > 0 ? Math.round((stats.resolus / stats.total) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>Progression</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtres}>
        <TouchableOpacity style={[styles.chip, filtre === 'toutes' && styles.chipActif]} onPress={() => setFiltre('toutes')}>
          <Text style={[styles.chipText, filtre === 'toutes' && styles.chipTextActif]}>Toutes</Text>
        </TouchableOpacity>
        {TYPES_ERREUR.map((type) => (
          <TouchableOpacity key={type.id} style={[styles.chip, filtre === type.id && styles.chipActif]} onPress={() => setFiltre(type.id)}>
            <Text style={[styles.chipText, filtre === type.id && styles.chipTextActif]}>{type.emoji} {type.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {entreesFiltrees.length === 0 ? (
          <Text style={styles.vide}>Aucune erreur enregistrée pour le moment.</Text>
        ) : (
          entreesFiltrees.map((entree) => {
            const typeInfo = TYPES_ERREUR.find(t => t.id === entree.typeErreur);
            return (
              <View key={entree.id} style={[styles.carteErreur, entree.resolu && styles.carteResolu]}>
                <View style={styles.erreurHeader}>
                  <View style={[styles.tagType, { backgroundColor: typeInfo?.couleur || '#6B7280' }]}>
                    <Text style={styles.tagText}>{typeInfo?.emoji} {typeInfo?.label}</Text>
                  </View>
                  <Text style={styles.dateErreur}>{new Date(entree.dateISO).toLocaleDateString('fr-FR')}</Text>
                </View>
                <Text style={styles.enonceErreur} numberOfLines={2}>{entree.enonce}</Text>
                <View style={styles.ligneReponses}>
                  <Text style={styles.labelReponse}>Ta réponse :</Text>
                  <Text style={styles.reponseEleve}>{entree.reponseEleve || '(vide)'}</Text>
                </View>
                <View style={styles.ligneReponses}>
                  <Text style={styles.labelReponse}>Bonne réponse :</Text>
                  <Text style={styles.bonneReponse}>{entree.bonneReponse}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.boutonAction, entree.resolu ? styles.boutonResolu : styles.boutonNonResolu]} onPress={() => marquerResolu(entree.id)}>
                    <Text style={styles.boutonActionText}>{entree.resolu ? '✅ Résolu' : '🔄 Marquer résolu'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.boutonSupprimer} onPress={() => supprimerEntree(entree.id)}>
                    <Text style={styles.boutonSupprimerText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
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
  barreStats: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15 },
  statBox: { flex: 1, backgroundColor: '#111827', borderRadius: 14, padding: 14, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: '#1F2937' },
  statValeur: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#9CA3AF', fontSize: 11, marginTop: 4 },
  filtres: { paddingHorizontal: 20, paddingVertical: 10, maxHeight: 50 },
  chip: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  chipActif: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  chipText: { color: '#D1D5DB', fontSize: 12, fontWeight: '500' },
  chipTextActif: { color: '#0F172A', fontWeight: 'bold' },
  vide: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  carteErreur: { backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#374151' },
  carteResolu: { borderColor: '#10B981', opacity: 0.8 },
  erreurHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tagType: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  dateErreur: { color: '#6B7280', fontSize: 11 },
  enonceErreur: { color: '#E5E7EB', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  ligneReponses: { flexDirection: 'row', marginBottom: 4 },
  labelReponse: { color: '#9CA3AF', fontSize: 12, width: 100 },
  reponseEleve: { color: '#FCA5A5', fontSize: 12, flex: 1 },
  bonneReponse: { color: '#10B981', fontSize: 12, fontWeight: 'bold', flex: 1 },
  actions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  boutonAction: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  boutonResolu: { backgroundColor: '#064E3B' },
  boutonNonResolu: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  boutonActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  boutonSupprimer: { padding: 10, borderRadius: 10, backgroundColor: '#1F2937' },
  boutonSupprimerText: { fontSize: 16 },
});
