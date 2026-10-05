import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { partager } from '../utils/partager';
import { parler, stopperParole } from '../services/parole';
import { db } from '../config/firebaseConfig';
import { getCours, saveCours, type CoursCache } from '../services/cacheHorsLigne';
import { decouperCoursEnBlocs, type BlocCours } from '../services/miseEnFormeCours';
import ReponseIA from '../components/ReponseIA';
import { genererSectionsCours, sectionsEnTexte } from '../services/enrichirCours';
import { plafondTexteAudio } from '../services/economieDonnees';
import { construireFiche, ficheEnTexte } from '../services/fichesSynthese';
import { dechiffrerAsync } from '../services/chiffrement';
import { rapporterErreur } from '../utils/logger';

const formatText = (text: string) => {
  if (!text) return "";
  return text.replace(/\\n/g, '\n');
};

export default function Cours() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = (params.id as string) || "1ere_c_math_chap1";
  
  const [coursData, setCoursData] = useState<CoursCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [cahierClair, setCahierClair] = useState('');
  // Sections pédagogiques générées localement (longueur × ~3)
  const [sectionsOuvertes, setSectionsOuvertes] = useState<Record<number, boolean>>({});
  // Blocs fiche d'excellence repliés par défaut (méthode, démo, corrigé)
  const [blocsOuverts, setBlocsOuverts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchCours = async () => {
      try {
        // CACHE D'ABORD : lecture hors-ligne instantanée
        const cache = await getCours(id);
        if (cache) {
          setCoursData(cache);
          if (cache.cahier) setCahierClair(await dechiffrerAsync(cache.cahier));
          // 📍 "Reprendre où j'en étais" : on mémorise le dernier chapitre ouvert
          await AsyncStorage.setItem(
            'lex_dernier_chapitre',
            JSON.stringify({ id, titre: cache.titre || id }),
          );
        }
        // FIREBASE ensuite : mise à jour + remplissage du cache
        try {
          const docRef = doc(db, "cours", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const donnees = docSnap.data() as CoursCache;
            setCoursData(donnees);
            await saveCours({ ...donnees, id });
          }
        } catch {
          // hors-ligne : le cache (s'il existe) suffit
        }
      } catch (error) {
        rapporterErreur("Erreur : ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCours();
  }, [id]);

  // 🎧 LECTURE AUDIO DU COURS (couche `parole` sécurisée web + natif,
  // 100% hors-ligne) : l'élève peut réviser en marchant, économiser sa
  // batterie, ou compenser la fatigue de lecture.
  const ecouterCours = async () => {
    if (!coursData) return;
    await stopperParole();
    const plafond = await plafondTexteAudio();
    const texte = [
      coursData.titre ? `Chapitre : ${coursData.titre}.` : '',
      coursData.theorie || coursData.activite || '',
      coursData.methode_content || '',
      sectionsEnTexte(sectionsCours),
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\\n/g, ' ');
    if (!texte.trim()) {
      return;
    }
    // Texte plafonné (cohérent avec cours.tsx) puis lecture via la couche
    // `parole` sécurisée (web + natif) — remplace l'appel direct
    // Speech.speak qui crashait sur web (module undefined).
    // 🎙️ Plus de `language: 'fr'` : `parole.ts` impose `fr-FR` ET choisit la
    // voix française elle-même (un tag seul = accent anglais possible).
    parler(texte.slice(0, plafond), { rate: 0.95 });
  };

  const arreterAudio = () => {
    stopperParole();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
        <Text style={styles.loadingText}>Chargement du cours...</Text>
      </View>
    );
  }

  // Si on n'a pas trouvé le cours dans Firebase
  if (!coursData) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/chapitres')}>
            <Text style={styles.backBtn}>‹ Retour aux chapitres</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyText}>Ce chapitre n&apos;existe pas encore dans la base de données.</Text>
        </View>
      </View>
    );
  }

  // On vérifie si le cours est rédigé (s'il a au moins une théorie ou une activité)
  const isRédige = coursData.theorie || coursData.activite || coursData.methode_content;

  // FICHE D'EXCELLENCE : les 6 blocs pédagogiques ordonnés
  // (situation → savoirs → méthode → pièges → démo → corrigé),
  // rendus en markdown riche via ReponseIA (titres, tableaux, encadrés).
  const blocsCours: BlocCours[] = coursData ? decouperCoursEnBlocs(coursData) : [];
  const blocEstOuvert = (cle: string) =>
    cle === 'situation' || cle === 'savoirs' || cle === 'pieges' ? true : !!blocsOuverts[cle];
  const basculerBloc = (cle: string) => setBlocsOuverts((p) => ({ ...p, [cle]: !p[cle] }));

  // Sections pédagogiques complémentaires générées LOCALEMENT (×3) pour rendre
  // le cours plus complet et plus efficace, même hors-ligne.
  const sectionsCours = coursData
    ? genererSectionsCours(coursData.titre || '', coursData.matiere, String(coursData.theorie || ''))
    : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/chapitres')}>
          <Text style={styles.backBtn}>‹ Retour aux chapitres</Text>
        </TouchableOpacity>
        <View style={styles.rowHeader}>
          <View style={{ flex: 1 }}>
            {/* 🔄 En-tête dynamique (avant : "MATHÉMATIQUES - 1ÈRE C" en dur,
                faux pour tous les chapitres d'autres matières/classes) */}
            <Text style={styles.subject}>
              {(coursData?.matiere || 'Cours').toUpperCase()}
              {coursData?.classe ? ` - ${String(coursData.classe).toUpperCase()}` : ' - Cours'}
            </Text>
            <Text style={styles.chapterTitle}>{coursData?.titre}</Text>
          </View>
          <TouchableOpacity
            style={styles.audioBtn}
            onPress={ecouterCours}
            onLongPress={arreterAudio}
          >
            <Text style={styles.audioBtnText}>🎧</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.audioBtn, { marginLeft: 8 }]}
            onPress={() => router.push({ pathname: '/mon_cahier', params: { id } })}
          >
            <Text style={styles.audioBtnText}>🧺</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Si le cours n'est pas rédigé, on affiche ce message */}
        {!isRédige && (
          <View style={styles.cardGold}>
            <Text style={styles.cardTitleGold}>⏳ Chapitre en préparation</Text>
            <Text style={styles.warningText}>L&apos;équipe pédagogique de LEX ACADEMY rédige actuellement ce cours en détail. Revenez vérifier très bientôt pour le consulter !</Text>
          </View>
        )}

        {/* FICHE D'EXCELLENCE : situation + savoirs (markdown riche) */}
        {blocsCours.filter((b) => b.cle === 'situation' || b.cle === 'savoirs').map((bloc) => (
          <View key={bloc.cle} style={bloc.cle === 'situation' ? styles.cardGreen : styles.cardBlue}>
            <Text style={bloc.cle === 'situation' ? styles.cardTitleGreen : styles.cardTitle}>{bloc.titre}</Text>
            <ReponseIA texte={bloc.markdown} />
          </View>
        ))}

        {/* FICHE D'EXCELLENCE : methode (repliable, markdown riche) */}
        {blocsCours.filter((b) => b.cle === 'methode').map((bloc) => (
          <View key={bloc.cle} style={styles.cardBlue}>
            <Text style={styles.cardTitle}>{bloc.titre}</Text>
            {!blocEstOuvert(bloc.cle) ? (
              <TouchableOpacity style={styles.expandBtn} onPress={() => basculerBloc(bloc.cle)}>
                <Text style={styles.expandBtnText}>Afficher la methode pas-a-pas</Text>
              </TouchableOpacity>
            ) : (
              <>
                <ReponseIA texte={bloc.markdown} />
                <TouchableOpacity style={styles.expandBtn} onPress={() => basculerBloc(bloc.cle)}>
                  <Text style={styles.expandBtnText}>Masquer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ))}

        {/* FICHE D'EXCELLENCE : pieges (markdown riche) */}
        {blocsCours.filter((b) => b.cle === 'pieges').map((bloc) => (
          <View key={bloc.cle} style={styles.cardRed}>
            <Text style={styles.cardTitleRed}>{bloc.titre}</Text>
            <ReponseIA texte={bloc.markdown} />
          </View>
        ))}

        {/* FICHE D'EXCELLENCE : demonstration (repliable) */}
        {blocsCours.filter((b) => b.cle === 'demonstration').map((bloc) => (
          <View key={bloc.cle} style={styles.cardBlue}>
            <Text style={styles.cardTitle}>{bloc.titre}</Text>
            {!blocEstOuvert(bloc.cle) ? (
              <TouchableOpacity style={styles.expandBtn} onPress={() => basculerBloc(bloc.cle)}>
                <Text style={styles.expandBtnText}>Afficher la demonstration</Text>
              </TouchableOpacity>
            ) : (
              <>
                <ReponseIA texte={bloc.markdown} />
                <TouchableOpacity style={styles.expandBtn} onPress={() => basculerBloc(bloc.cle)}>
                  <Text style={styles.expandBtnText}>Masquer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ))}

        {/* FICHE D'EXCELLENCE : exercice corrige (repliable, markdown riche) */}
        {blocsCours.filter((b) => b.cle === 'exercice').map((bloc) => (
          <View key={bloc.cle} style={styles.cardGold}>
            <Text style={styles.cardTitleGold}>{bloc.titre}</Text>
            {!blocEstOuvert(bloc.cle) ? (
              <TouchableOpacity style={styles.expandBtnGold} onPress={() => basculerBloc(bloc.cle)}>
                <Text style={styles.expandBtnTextGold}>Afficher le corrige</Text>
              </TouchableOpacity>
            ) : (
              <>
                <ReponseIA texte={bloc.markdown} />
                <TouchableOpacity style={styles.expandBtnGold} onPress={() => basculerBloc(bloc.cle)}>
                  <Text style={styles.expandBtnTextGold}>Masquer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ))}

        {/* 🧺 Contenu extrait du cahier de l'élève (local). Ajouté quand l'élève l'a
            collé via l'écran "Mon cahier" (🧺). Toujours local, non synchronisé. */}
        {coursData?.cahier && (
          <View style={styles.cardCahier}>
            <Text style={styles.cardTitleCahier}>🧺 Mon cahier</Text>
            <Text style={styles.cahierText}>{formatText(cahierClair)}</Text>
          </View>
        )}

        {/* 📌 Bouton « Générer ma fiche » (amélioration 4) : résumé révisable, partageable */}
        <TouchableOpacity
          style={styles.boutonFiche}
          onPress={async () => {
            try {
              const fiche = construireFiche(
                (coursData?.titre as string) || id,
                (coursData?.matiere as string) || '',
                (coursData?.theorie as string) || sectionsEnTexte(genererSectionsCours((coursData?.titre as string) || id, coursData?.matiere, '')),
              );
              await partager(ficheEnTexte(fiche));
            } catch {
              // partage annulé par l'élève : rien à faire
            }
          }}
        >
          <Text style={styles.boutonFicheTxt}>📌 Générer ma fiche de synthèse</Text>
        </TouchableOpacity>

        {/* 📘 Compléments pédagogiques locaux (×3 du cours) : toujours présents,
            même si Firebase ne fournit qu'un court texte. Générés hors-ligne. */}
        {sectionsCours.length > 0 && (
          <View style={styles.cardPurple}>
            <Text style={styles.cardTitlePurple}>📚 5. Pour aller plus loin</Text>
            <Text style={styles.purpleHint}>Compléments générés localement pour bien comprendre et réviser ce chapitre.</Text>
            {sectionsCours.map((section, idx) => (
              <View key={idx} style={styles.enrichCard}>
                <Text style={styles.enrichCardTitle}>{section.emoji} {section.titre}</Text>
                <TouchableOpacity style={styles.enrichToggle} onPress={() => {
                  const copie = { ...sectionsOuvertes };
                  copie[idx] = !copie[idx];
                  setSectionsOuvertes(copie);
                }}>
                  <Text style={styles.enrichToggleText}>{sectionsOuvertes[idx] ? '🔼 Masquer' : `🔽 Afficher (${section.lignes.length})`}</Text>
                </TouchableOpacity>
                {sectionsOuvertes[idx] && section.lignes.map((ligne, li) => (
                  <Text key={li} style={styles.enrichText}>{formatText(ligne)}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingText: { color: '#FBBF24', marginTop: 15, fontSize: 16, textAlign: 'center' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  audioBtn: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#8B5CF6', borderRadius: 20, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  audioBtnText: { fontSize: 20 },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  chapterTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginTop: 5 },
  scrollView: { paddingHorizontal: 20 },
  
  // Écran si vide
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyEmoji: { fontSize: 60, marginBottom: 20 },
  emptyText: { color: '#94A3B8', fontSize: 16, textAlign: 'center' },

  // Cartes Vertes (Activité)
  cardGreen: { backgroundColor: '#14241B', borderRadius: 12, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  cardTitleGreen: { color: '#10B981', fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  activityText: { color: '#A7F3D0', fontSize: 15, lineHeight: 24, fontStyle: 'italic' },
  
  // Cartes Bleues
  cardBlue: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  cardTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  cardSubtitle: { color: '#60A5FA', fontSize: 15, fontWeight: 'bold', marginBottom: 15 },
  courseText: { color: '#CBD5E1', fontSize: 15, lineHeight: 24 },
  
  // Boutons déroulants Bleus
  expandBtn: { marginTop: 10, backgroundColor: '#334155', padding: 12, borderRadius: 8, alignItems: 'center' },
  expandBtnText: { color: '#F8FAFC', fontSize: 13, fontWeight: 'bold' },
  hiddenContent: { marginTop: 15, backgroundColor: '#0F172A', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  demoText: { color: '#93C5FD', fontSize: 14, lineHeight: 24 },
  
  // Carte Rouge
  cardRed: { backgroundColor: '#3B1B1B', borderRadius: 12, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  cardTitleRed: { color: '#F8FAFC', fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  warningText: { color: '#FCA5A5', fontSize: 14, lineHeight: 22 },
  
  // Carte Dorée
  cardGold: { backgroundColor: '#2D2412', borderRadius: 12, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#FBBF24' },
  cardTitleGold: { color: '#FBBF24', fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  expandBtnGold: { marginTop: 10, backgroundColor: '#7F1D1D', padding: 12, borderRadius: 8, alignItems: 'center' },
  expandBtnTextGold: { color: '#FDE68A', fontSize: 13, fontWeight: 'bold' },
  hiddenContentGold: { marginTop: 15, backgroundColor: '#0F172A', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#FBBF24' },
  correctionText: { color: '#F8FAFC', fontSize: 14, lineHeight: 24 },

  // Carte Violette (Compléments locaux ×3)
  cardPurple: { backgroundColor: '#1B1630', borderRadius: 14, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' },
  cardTitlePurple: { color: '#8B5CF6', fontSize: 17, fontWeight: 'bold', marginBottom: 8 },

  // Carte Cahier (🧺, local)
  cardCahier: { backgroundColor: '#0E2A1D', borderRadius: 14, padding: 20, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  cardTitleCahier: { color: '#10B981', fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  cahierText: { color: '#D1FAE5', fontSize: 14, lineHeight: 22 },
  boutonFiche: { backgroundColor: '#FBBF24', borderRadius: 12, padding: 14, marginTop: 14, marginBottom: 8 },
  boutonFicheTxt: { color: '#0F172A', fontWeight: '800', textAlign: 'center', fontSize: 14 },
  purpleHint: { color: '#A78BFA', fontSize: 12, marginBottom: 16 },
  enrichCard: { backgroundColor: '#241D3A', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#4C39A6' },
  enrichCardTitle: { color: '#D6CCFF', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  enrichToggle: { marginTop: 2, backgroundColor: '#4C39A6', padding: 10, borderRadius: 8, alignItems: 'center' },
  enrichToggleText: { color: '#D8CCFF', fontSize: 12, fontWeight: 'bold' },
  enrichText: { color: '#E5DEF6', fontSize: 14, lineHeight: 22, marginBottom: 6 },
});