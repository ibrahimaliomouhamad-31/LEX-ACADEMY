import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebaseConfig';
import { getExercices, saveExercices } from '../services/cacheHorsLigne';
import { getStats } from '../services/statsSuivi';
import { prioriserExercices } from '../services/selectionAdaptive';
import type { Exercice } from '../services/cacheHorsLigne';
import { rapporterErreur } from '../utils/logger';
import { parseTableauJSON } from '../utils/correctifsAudit';

const FILTRES = [
  { label: 'Tous', valeur: 0 },
  { label: '★ Facile', valeur: 1 },
  { label: '★★ Moyen', valeur: 2 },
  { label: '★★★ Difficile', valeur: 3 },
];

export default function ListeExercices() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const classe = (params.classe as string) || '';
  const matiere = (params.matiere as string) || '';
  const chapitreId = (params.chapitre_id as string) || '';
  const chapitreTitre = (params.titre as string) || '';

  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolus, setResolus] = useState<string[]>([]);
  const [horsLigne, setHorsLigne] = useState(false); // affiché depuis le cache ?
  const [filtre, setFiltre] = useState(0);

  useEffect(() => {
    const fetchExos = async () => {
      try {
        // Exercices déjà résolus sur ce téléphone (pour afficher le badge ✅)
        try {
          const stockage = await AsyncStorage.getItem('lex_exos_resolus');
          setResolus(parseTableauJSON(stockage).filter((v): v is string => typeof v === 'string'));
        } catch {
          setResolus([]);
        }

        // 1) CACHE D'ABORD : instantané et 100% hors-ligne
        let depuisCache = false;
        if (chapitreId) {
          const cache = await getExercices(chapitreId);
          if (cache && cache.length > 0) {
            // 🎯 SÉLECTION ADAPTATIVE : les exercices où l'élève est dans sa
            // zone proximale (40–70 % de réussite) passent en premier —
            // le juste milieu entre ennui et découragement.
            const stats = await getStats().catch(() => null);
            const tries = stats
              ? prioriserExercices(cache, stats)
              : [...cache].sort((a, b) => (a.id > b.id ? 1 : -1));
            setExercices(tries);
            setLoading(false);
            depuisCache = true;
          }
        }

        // 2) FIREBASE ensuite : mise à jour + remplissage du cache
        try {
          let q = query(collection(db, 'exercices'), where('classe', '==', classe), where('matiere', '==', matiere));
          if (chapitreId) {
            q = query(q, where('chapitre_id', '==', chapitreId));
          }
          const querySnapshot = await getDocs(q);
          const exosData: Exercice[] = [];
          querySnapshot.forEach((docSnap) => {
            const d = docSnap.data() as Partial<Exercice>;
            // 🛡️ AUDIT : typage Exercice réel (plus de Record<string,unknown> qui casse prioriser/save).
            exosData.push({ classe: '', matiere: '', chapitre: '', chapitre_id: '', difficulte: '1', enonce: '', bonne_reponse: '', ...d, id: docSnap.id });
          });
          // 🎯 SÉLECTION ADAPTATIVE aussi pour les données fraîches.
          const stats = await getStats().catch(() => null);
          const tries = stats ? prioriserExercices(exosData, stats) : exosData;
          setExercices(tries);
          setHorsLigne(false);
          // Sauvegarde dans le cache pour la prochaine fois hors-ligne
          if (chapitreId && exosData.length > 0) {
            await saveExercices(chapitreId, exosData);
          }
        } catch (erreurFirebase) {
          // Pas de connexion : on garde le cache s'il existe
          if (depuisCache) {
            setHorsLigne(true);
          } else {
            setHorsLigne(true);
            setExercices([]);
          }
        }
      } catch (error) {
        rapporterErreur('Erreur : ', error);
      } finally {
        setLoading(false);
      }
    };
    fetchExos();
  }, [classe, matiere, chapitreId]);

  const etoiles = (diff: unknown) => {
    const n = Number(diff) || 1;
    return '★'.repeat(Math.min(n, 3)) + '☆'.repeat(Math.max(0, 3 - n));
  };

  const exercicesFiltres = filtre === 0
    ? exercices
    : exercices.filter((e) => (Number(e.difficulte) || 1) === filtre);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>
          PRATIQUE - {classe}
          {matiere ? ` - ${matiere.toUpperCase()}` : ''}
        </Text>
        <Text style={styles.title}>Choisis un exercice ({exercices.length})</Text>
        {horsLigne && exercices.length > 0 && (
          <Text style={styles.badgeHorsLigne}>📱 Mode hors-ligne — exercices du cache</Text>
        )}
        {horsLigne && exercices.length === 0 && (
          <Text style={styles.badgeHorsLigne}>📴 Pas de connexion et aucun cache pour ce chapitre.{'\n'}Reviens te connecter au wifi du LEX pour le télécharger !</Text>
        )}
      </View>

      {/* Filtre de difficulté */}
      <View style={styles.rowFiltres}>
        {FILTRES.map((f) => (
          <TouchableOpacity
            key={f.valeur}
            style={[styles.filtreBtn, filtre === f.valeur && styles.filtreBtnActif]}
            onPress={() => setFiltre(f.valeur)}
          >
            <Text style={[styles.filtreBtnText, filtre === f.valeur && styles.filtreBtnTextActif]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        data={exercicesFiltres}
        keyExtractor={(exo) => exo.id}
        ListHeaderComponent={
          chapitreId ? (
            <TouchableOpacity
              style={styles.cardGenerateur}
              onPress={() => router.push({
                pathname: '/entrainement_infini',
                params: { chapitre_id: chapitreId, titre: chapitreTitre, matiere: matiere, classe: classe }
              })}
            >
              <Text style={styles.cardGenerateurTitre}>🧠 Entraînement infini</Text>
              <Text style={styles.cardGenerateurDesc}>
                Des millions d'exercices générés sur ton téléphone, du niveau 1 au niveau 100 (olympiade). Marche sans internet !
              </Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {exercices.length === 0
              ? "Aucun exercice disponible pour le moment. Essaie l'entraînement infini !"
              : 'Aucun exercice à ce niveau de difficulté.'}
          </Text>
        }
        renderItem={({ item: exo, index }) => {
          const resolu = resolus.includes(exo.id);
          return (
            <TouchableOpacity
              style={[styles.exoCard, resolu && styles.exoCardResolu]}
              onPress={() => router.push({ pathname: '/exercices', params: { id: exo.id } })}
            >
              <View style={styles.exoNumber}>
                <Text style={styles.exoNumberText}>{resolu ? '✓' : index + 1}</Text>
              </View>
              <View style={styles.exoInfo}>
                <Text style={styles.exoTitle} numberOfLines={2}>{exo.enonce}</Text>
                {exo.chapitre ? <Text style={styles.exoChapitre}>{exo.chapitre}</Text> : null}
                {exo.difficulte ? <Text style={styles.exoDiff}>{etoiles(exo.difficulte)}</Text> : null}
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  badgeHorsLigne: { color: '#38BDF8', fontSize: 12, marginTop: 8, fontStyle: 'italic', lineHeight: 18 },

  rowFiltres: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12 },
  filtreBtn: { flex: 1, marginHorizontal: 3, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1E293B', alignItems: 'center' },
  filtreBtnActif: { backgroundColor: '#FBBF24' },
  filtreBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  filtreBtnTextActif: { color: '#0F172A' },

  cardGenerateur: { backgroundColor: '#16233B', borderRadius: 12, padding: 20, marginBottom: 15, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  cardGenerateurTitre: { color: '#93C5FD', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  cardGenerateurDesc: { color: '#64748B', fontSize: 12, lineHeight: 18 },

  scrollView: { paddingHorizontal: 20 },
  emptyText: { color: '#94A3B8', fontSize: 16, textAlign: 'center', marginTop: 50 },
  exoCard: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 20, marginBottom: 15, alignItems: 'center', borderLeftWidth: 3, borderLeftColor: '#10B981' },
  exoCardResolu: { borderLeftColor: '#FBBF24', opacity: 0.85 },
  exoNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#10B981' },
  exoNumberText: { color: '#10B981', fontSize: 18, fontWeight: 'bold' },
  exoInfo: { flex: 1, marginRight: 10 },
  exoTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  exoChapitre: { color: '#64748B', fontSize: 12, marginTop: 4 },
  exoDiff: { color: '#FBBF24', fontSize: 12, marginTop: 4 },
  arrow: { color: '#94A3B8', fontSize: 24, marginLeft: 10 }
});
