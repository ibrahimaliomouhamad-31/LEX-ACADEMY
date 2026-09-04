import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getAllCachedChapterIds,
  getExercices,
  type Exercice,
} from '../services/cacheHorsLigne';
import { genererExercice } from '../services/generateurLocal';
import { getStats } from '../services/statsSuivi';
import { estJuste } from '../services/outilsReponse';

// BAC BLANC CHRONOMÉTRÉ — 100% hors-ligne (cache + générateur local)
// 3 états dans un seul écran : CONFIG → ÉPREUVE → RÉSULTATS

const CLE_SCORES = 'lex_bac_blanc_scores';

const MATIERES = ['Toutes', 'Mathématiques', 'Physique-Chimie', 'SVT'];
const DUREES = [
  { label: '30 min', secondes: 30 * 60 },
  { label: '1 h', secondes: 60 * 60 },
  { label: '2 h', secondes: 2 * 60 * 60 },
];
const NOMBRES = [10, 20, 40];

type Phase = 'config' | 'epreuve' | 'resultats';

// Exercice interne de l'épreuve (mis en cache ou généré), avec son barème
interface ExoEpreuve {
  enonce: string;
  bonne_reponse: string;
  explication: string;
  points: number;
  genere: boolean;
}

interface ChapitreInfo {
  id: string;
  titre: string;
}

interface ScoreBac {
  note: number;
  matiere: string;
  dateISO: string;
}

// ---------- Helpers ----------

function normaliserMatiere(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matiereCorrespond(matiereExo: string, filtre: string): boolean {
  if (filtre === 'Toutes') return true;
  const m = normaliserMatiere(matiereExo);
  if (filtre === 'Mathématiques') return m.includes('math');
  if (filtre === 'Physique-Chimie') return m.includes('physique') || m.includes('chimie');
  if (filtre === 'SVT') return m.includes('svt') || m.includes('science');
  return m.includes(normaliserMatiere(filtre));
}

// Barème : difficulté 1 = 1 pt, 2 = 1,5 pt, 3 = 2 pts
function pointsPourDifficulte(difficulte: string): number {
  const d = parseInt(difficulte, 10);
  if (d === 3) return 2;
  if (d === 2) return 1.5;
  return 1;
}

function melanger<T>(arr: T[]): T[] {
  const copie = [...arr];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copie[i];
    copie[i] = copie[j];
    copie[j] = tmp;
  }
  return copie;
}

function formaterChrono(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formaterDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formaterNote(n: number): string {
  let s = n.toFixed(2).replace('.', ',');
  while (s.endsWith('0')) s = s.slice(0, -1);
  if (s.endsWith(',')) s = s.slice(0, -1);
  return s;
}

function formaterPoints(p: number): string {
  return String(p).replace('.', ',');
}

function couleurNote(note: number): string {
  if (note >= 14) return '#10B981';
  if (note >= 10) return '#FBBF24';
  return '#EF4444';
}

function tronquer(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// ---------- Écran ----------

export default function BacBlanc() {
  const router = useRouter();

  // Config
  const [phase, setPhase] = useState<Phase>('config');
  const [matiere, setMatiere] = useState('Toutes');
  const [duree, setDuree] = useState(60 * 60);
  const [nbExos, setNbExos] = useState(20);
  const [chargement, setChargement] = useState(false);
  const [historique, setHistorique] = useState<ScoreBac[]>([]);

  // Épreuve
  const [exos, setExos] = useState<ExoEpreuve[]>([]);
  const [index, setIndex] = useState(0);
  const [reponses, setReponses] = useState<string[]>([]);
  const [valides, setValides] = useState<boolean[]>([]);
  const [justes, setJustes] = useState<boolean[]>([]);
  const [secondesRestantes, setSecondesRestantes] = useState(0);

  // Résultats
  const [note, setNote] = useState(0);

  // Charge l'historique des meilleures notes au montage
  useEffect(() => {
    (async () => {
      try {
        const brut = await AsyncStorage.getItem(CLE_SCORES);
        if (brut) setHistorique(JSON.parse(brut) as ScoreBac[]);
      } catch {
        // ignore
      }
    })();
  }, []);

  // Chrono décomptant pendant l'épreuve
  useEffect(() => {
    if (phase !== 'epreuve') return;
    const id = setInterval(() => {
      setSecondesRestantes((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Fin du temps → résultats
  useEffect(() => {
    if (phase === 'epreuve' && secondesRestantes <= 0) {
      terminer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondesRestantes, phase]);

  // ---------- Construction de l'épreuve ----------

  const construireEpreuve = async (): Promise<ExoEpreuve[]> => {
    // 1) Parcourt tous les chapitres en cache et filtre par matière
    const ids = await getAllCachedChapterIds();
    const chapitres: ChapitreInfo[] = [];
    const exosCache: ExoEpreuve[] = [];
    for (const id of ids) {
      const liste = await getExercices(id);
      if (!liste) continue;
      const correspondants = liste.filter((e) => matiereCorrespond(e.matiere, matiere));
      if (correspondants.length === 0) continue;
      chapitres.push({ id, titre: correspondants[0].chapitre || id });
      for (const e of correspondants) {
        exosCache.push({
          enonce: e.enonce,
          bonne_reponse: e.bonne_reponse,
          explication: e.explication ?? '',
          points: pointsPourDifficulte(e.difficulte),
          genere: false,
        });
      }
    }

    // 2) Mélange et prend les N premiers
    const resultat = melanger(exosCache).slice(0, nbExos);

    // 3) Complète avec des exercices générés localement si besoin
    // 60 — BARÈME INTELLIGENT : niveau généré adapté aux stats de l'élève.
    // Faible (<50%) → 5-40, moyen (50-75%) → 35-70, costaud (>75%) → 60-100.
    let statsEleve: { totalTentes: number; totalReussis: number } | null = null;
    try {
      statsEleve = await getStats();
    } catch {
      statsEleve = null;
    }
    const tauxGlobal =
      statsEleve && statsEleve.totalTentes >= 5
        ? statsEleve.totalReussis / statsEleve.totalTentes
        : 0.6;
    const [niveauMin, niveauMax] =
      tauxGlobal < 0.5 ? [5, 40] : tauxGlobal <= 0.75 ? [35, 70] : [60, 100];
    while (resultat.length < nbExos) {
      const chap =
        chapitres.length > 0
          ? chapitres[Math.floor(Math.random() * chapitres.length)]
          : null;
      const niveau = niveauMin + Math.floor(Math.random() * (niveauMax - niveauMin + 1));
      const gen = genererExercice(
        chap ? chap.id : '',
        chap ? chap.titre : 'Calcul rapide et équations',
        niveau,
      );
      resultat.push({
        enonce: gen.enonce,
        bonne_reponse: gen.bonne_reponse,
        explication: gen.explication,
        points: 1.5, // barème d'un exercice généré
        genere: true,
      });
    }
    return resultat;
  };

  const demarrerEpreuve = async () => {
    setChargement(true);
    try {
      const liste = await construireEpreuve();
      setExos(liste);
      setReponses(new Array(liste.length).fill(''));
      setValides(new Array(liste.length).fill(false));
      setJustes(new Array(liste.length).fill(false));
      setIndex(0);
      setNote(0);
      setSecondesRestantes(duree);
      setPhase('epreuve');
    } catch {
      setChargement(false);
      return;
    }
    setChargement(false);
  };

  // ---------- Réponses ----------

  const majReponse = (texte: string) => {
    setReponses((prev) => {
      const copie = [...prev];
      copie[index] = texte;
      return copie;
    });
  };

  const valider = () => {
    const exo = exos[index];
    if (!exo || valides[index]) return;
    const ok = estJuste(reponses[index] ?? '', exo.bonne_reponse);
    setJustes((prev) => {
      const copie = [...prev];
      copie[index] = ok;
      return copie;
    });
    setValides((prev) => {
      const copie = [...prev];
      copie[index] = true;
      return copie;
    });
  };

  const suivant = () => {
    if (index >= exos.length - 1) {
      terminer();
      return;
    }
    setIndex(index + 1);
  };

  // ---------- Fin d'épreuve ----------

  const terminer = () => {
    if (phase !== 'epreuve') return;
    const total = exos.reduce((s, e) => s + e.points, 0);
    const obtenu = exos.reduce(
      (s, e, i) => s + (estJuste(reponses[i] ?? '', e.bonne_reponse) ? e.points : 0),
      0,
    );
    const noteFinale = total > 0 ? Number(((obtenu / total) * 20).toFixed(2)) : 0;
    setNote(noteFinale);
    setPhase('resultats');
    sauvegarderScore(noteFinale);
  };

  const sauvegarderScore = async (noteFinale: number) => {
    try {
      const brut = await AsyncStorage.getItem(CLE_SCORES);
      const liste: ScoreBac[] = brut ? (JSON.parse(brut) as ScoreBac[]) : [];
      liste.push({ note: noteFinale, matiere, dateISO: new Date().toISOString() });
      liste.sort((a, b) => b.note - a.note);
      const top5 = liste.slice(0, 5);
      await AsyncStorage.setItem(CLE_SCORES, JSON.stringify(top5));
      setHistorique(top5);
    } catch {
      // ignore
    }
  };

  const nouvelleEpreuve = () => {
    setPhase('config');
  };

  // ---------- Rendu ----------

  const exoCourant = exos[index];
  const nbValidees = valides.filter(Boolean).length;
  const nbJustes = justes.filter(Boolean).length;
  const chronoRouge = secondesRestantes < 5 * 60;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ==================== ÉTAT 1 : CONFIG ==================== */}
      {phase === 'config' && (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backBtn}>‹ Retour</Text>
            </TouchableOpacity>
            <Text style={styles.grandTitre}>📝 BAC Blanc</Text>
            <Text style={styles.sousTitre}>
              Entraîne-toi dans les conditions du vrai exam
            </Text>
          </View>

          {/* Matière */}
          <Text style={styles.labelConfig}>📚 Matière</Text>
          <View style={styles.rowChips}>
            {MATIERES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, matiere === m && styles.chipActif]}
                onPress={() => setMatiere(m)}
              >
                <Text style={[styles.chipText, matiere === m && styles.chipTextActif]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Durée */}
          <Text style={styles.labelConfig}>⏱️ Durée</Text>
          <View style={styles.rowChips}>
            {DUREES.map((d) => (
              <TouchableOpacity
                key={d.label}
                style={[styles.chip, duree === d.secondes && styles.chipActif]}
                onPress={() => setDuree(d.secondes)}
              >
                <Text
                  style={[styles.chipText, duree === d.secondes && styles.chipTextActif]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Nombre d'exercices */}
          <Text style={styles.labelConfig}>📋 Nombre d'exercices</Text>
          <View style={styles.rowChips}>
            {NOMBRES.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.chip, nbExos === n && styles.chipActif]}
                onPress={() => setNbExos(n)}
              >
                <Text style={[styles.chipText, nbExos === n && styles.chipTextActif]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.bareme}>
            Barème : difficulté 1 = 1 pt · 2 = 1,5 pt · 3 = 2 pts · exercice généré = 1,5 pt.
            La note finale est ramenée proportionnellement sur 20.
          </Text>

          <TouchableOpacity
            style={[styles.boutonPrincipal, chargement && styles.boutonDesactive]}
            disabled={chargement}
            onPress={() => {
              void demarrerEpreuve();
            }}
          >
            <Text style={styles.boutonPrincipalTexte}>
              {chargement ? 'Préparation…' : 'Commencer l\'épreuve ▶'}
            </Text>
          </TouchableOpacity>

          {/* Historique des 5 meilleures notes */}
          <View style={styles.cardHistorique}>
            <Text style={styles.cardHistoriqueTitre}>🏆 Meilleures notes</Text>
            {historique.length === 0 ? (
              <Text style={styles.historiqueVide}>
                Aucune épreuve pour l'instant. À toi de jouer !
              </Text>
            ) : (
              historique.map((h, i) => (
                <View key={`${h.dateISO}-${i}`} style={styles.rowHistorique}>
                  <Text style={styles.rangHistorique}>
                    {['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}
                  </Text>
                  <Text style={[styles.noteHistorique, { color: couleurNote(h.note) }]}>
                    {formaterNote(h.note)}/20
                  </Text>
                  <Text style={styles.infoHistorique} numberOfLines={1}>
                    {h.matiere} · {formaterDate(h.dateISO)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* ==================== ÉTAT 2 : ÉPREUVE ==================== */}
      {phase === 'epreuve' && exoCourant && (
        <View style={styles.zoneEpreuve}>
          {/* Chrono + compteur */}
          <View style={styles.blocChrono}>
            <Text style={[styles.chrono, chronoRouge && styles.chronoRouge]}>
              {formaterChrono(secondesRestantes)}
            </Text>
            <Text style={styles.compteur}>
              Question {index + 1}/{exos.length} · répondues : {nbValidees}
            </Text>
          </View>

          {/* Onglets numérotés pour naviguer entre les questions */}
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.rowOnglets}>
                {exos.map((_, i) => {
                  const estCourant = i === index;
                  const etat = valides[i] ? (justes[i] ? 'juste' : 'faux') : 'vide';
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.onglet,
                        estCourant && styles.ongletCourant,
                        etat === 'juste' && !estCourant && styles.ongletJuste,
                        etat === 'faux' && !estCourant && styles.ongletFaux,
                      ]}
                      onPress={() => setIndex(i)}
                    >
                      <Text
                        style={[
                          styles.ongletTexte,
                          estCourant && styles.ongletTexteCourant,
                          etat === 'juste' && !estCourant && styles.ongletTexteJuste,
                          etat === 'faux' && !estCourant && styles.ongletTexteFaux,
                        ]}
                      >
                        {i + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Question courante */}
            <View style={styles.cardQuestion}>
              <View style={styles.rowTagQuestion}>
                <Text style={styles.tagQuestion}>Question {index + 1}</Text>
                {exoCourant.genere && <Text style={styles.tagGenere}>⚙️ généré</Text>}
                <Text style={styles.tagPoints}>{formaterPoints(exoCourant.points)} pt</Text>
              </View>
              <Text style={styles.enonce}>{exoCourant.enonce}</Text>

              <TextInput
                style={styles.input}
                placeholder="Ta réponse ici (ex: 3 ou 1/2)"
                placeholderTextColor="#64748B"
                value={reponses[index] ?? ''}
                onChangeText={majReponse}
                editable={!valides[index]}
              />

              {!valides[index] ? (
                <TouchableOpacity style={styles.boutonValider} onPress={valider}>
                  <Text style={styles.boutonValiderTexte}>Valider</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View
                    style={[
                      styles.feedbackBox,
                      justes[index] ? styles.feedbackJuste : styles.feedbackFaux,
                    ]}
                  >
                    <Text style={styles.feedbackTexte}>
                      {justes[index]
                        ? '✓ Bonne réponse !'
                        : '✗ Mauvaise réponse — corrigé à la fin.'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.boutonSuivant}
                    onPress={suivant}
                  >
                    <Text style={styles.boutonSuivantTexte}>
                      {index >= exos.length - 1 ? 'Terminer & corriger 🏁' : 'Suivant →'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity style={styles.boutonTerminer} onPress={terminer}>
              <Text style={styles.boutonTerminerTexte}>Terminer &amp; corriger</Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      )}

      {/* ==================== ÉTAT 3 : RÉSULTATS ==================== */}
      {phase === 'resultats' && (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backBtn}>‹ Retour</Text>
            </TouchableOpacity>
            <Text style={styles.grandTitre}>🏁 Résultats</Text>
          </View>

          {/* Note en très grand */}
          <View style={styles.cardNote}>
            <Text style={styles.noteLabel}>TA NOTE</Text>
            <Text style={[styles.noteValeur, { color: couleurNote(note) }]}>
              {formaterNote(note)}
            </Text>
            <Text style={styles.noteSur}>/ 20</Text>
            <Text style={styles.noteDetail}>
              {nbJustes}/{exos.length} bonnes réponses
            </Text>
          </View>

          {/* Détail question par question */}
          <Text style={styles.labelConfig}>📝 Correction détaillée</Text>
          {exos.map((e, i) => {
            const ok = estJuste(reponses[i] ?? '', e.bonne_reponse);
            return (
              <View
                key={i}
                style={[styles.cardDetail, ok ? styles.cardDetailJuste : styles.cardDetailFaux]}
              >
                <View style={styles.rowDetailTete}>
                  <Text style={[styles.verdict, { color: ok ? '#10B981' : '#EF4444' }]}>
                    {ok ? '✓' : '✗'}
                  </Text>
                  <Text style={styles.enonceDetail} numberOfLines={2}>
                    {tronquer(e.enonce, 70)}
                  </Text>
                </View>
                <Text style={styles.ligneReponse}>
                  Ta réponse :{' '}
                  <Text style={styles.valeurReponse}>{reponses[i]?.trim() || '—'}</Text>
                </Text>
                {!ok && (
                  <Text style={styles.ligneReponse}>
                    Bonne réponse :{' '}
                    <Text style={styles.valeurBonneReponse}>
                      {e.bonne_reponse.split('|')[0].trim()}
                    </Text>
                  </Text>
                )}
                <Text style={styles.lignePoints}>
                  {formaterPoints(e.points)} pt{e.genere ? ' · exercice généré' : ''}
                </Text>
                {!ok && e.explication !== '' && (
                  <Text style={styles.explication}>💡 {e.explication}</Text>
                )}
              </View>
            );
          })}

          <View style={styles.rowBoutonsFinaux}>
            <TouchableOpacity style={styles.boutonPrincipal} onPress={nouvelleEpreuve}>
              <Text style={styles.boutonPrincipalTexte}>↻ Nouvelle épreuve</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.retourTexte}>‹ Retour</Text>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollView: { flex: 1, paddingHorizontal: 20 },

  header: { paddingVertical: 20 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  grandTitre: { color: '#F8FAFC', fontSize: 26, fontWeight: 'bold' },
  sousTitre: { color: '#94A3B8', fontSize: 14, marginTop: 6, lineHeight: 20 },

  // Config
  labelConfig: { color: '#94A3B8', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5, marginTop: 18, marginBottom: 8 },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, marginRight: 8, marginBottom: 8 },
  chipActif: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  chipTextActif: { color: '#FFFFFF' },
  bareme: { color: '#64748B', fontSize: 12, fontStyle: 'italic', marginTop: 14, lineHeight: 18 },
  boutonPrincipal: { backgroundColor: '#FBBF24', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 22 },
  boutonDesactive: { opacity: 0.6 },
  boutonPrincipalTexte: { color: '#0F172A', fontSize: 16, fontWeight: 'bold' },
  retourTexte: { color: '#FBBF24', fontSize: 14, textAlign: 'center', marginTop: 14 },

  // Historique
  cardHistorique: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginTop: 26 },
  cardHistoriqueTitre: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  historiqueVide: { color: '#64748B', fontSize: 13, fontStyle: 'italic' },
  rowHistorique: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  rangHistorique: { fontSize: 16, marginRight: 10, width: 30 },
  noteHistorique: { fontSize: 16, fontWeight: 'bold', marginRight: 10, minWidth: 80 },
  infoHistorique: { color: '#94A3B8', fontSize: 13, flex: 1, textAlign: 'right' },

  // Épreuve
  zoneEpreuve: { flex: 1 },
  blocChrono: { alignItems: 'center', paddingTop: 16, paddingBottom: 10 },
  chrono: { color: '#FBBF24', fontSize: 44, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  chronoRouge: { color: '#EF4444' },
  compteur: { color: '#94A3B8', fontSize: 13, marginTop: 2 },
  rowOnglets: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 20 },
  onglet: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  ongletCourant: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  ongletJuste: { backgroundColor: '#0F2A1A', borderColor: '#10B981' },
  ongletFaux: { backgroundColor: '#2A1010', borderColor: '#EF4444' },
  ongletTexte: { color: '#94A3B8', fontSize: 14, fontWeight: 'bold' },
  ongletTexteCourant: { color: '#FFFFFF' },
  ongletTexteJuste: { color: '#10B981' },
  ongletTexteFaux: { color: '#EF4444' },

  cardQuestion: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, marginTop: 10, borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  rowTagQuestion: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tagQuestion: { color: '#93C5FD', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  tagGenere: { color: '#94A3B8', fontSize: 11, fontStyle: 'italic', marginLeft: 10 },
  tagPoints: { color: '#FBBF24', fontSize: 11, fontWeight: 'bold', marginLeft: 'auto' },
  enonce: { color: '#F8FAFC', fontSize: 17, lineHeight: 26, marginBottom: 20 },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, color: '#F8FAFC', fontSize: 16, marginBottom: 16 },
  boutonValider: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  boutonValiderTexte: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  boutonSuivant: { backgroundColor: '#0F172A', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#10B981' },
  boutonSuivantTexte: { color: '#10B981', fontWeight: 'bold', fontSize: 16 },
  feedbackBox: { marginTop: 14, padding: 14, borderRadius: 8, borderWidth: 1 },
  feedbackJuste: { backgroundColor: '#0F2A1A', borderColor: '#10B981' },
  feedbackFaux: { backgroundColor: '#2A1010', borderColor: '#EF4444' },
  feedbackTexte: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  boutonTerminer: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#EF4444', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 14 },
  boutonTerminerTexte: { color: '#EF4444', fontWeight: 'bold', fontSize: 14 },

  // Résultats
  cardNote: { backgroundColor: '#1E293B', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 6 },
  noteLabel: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
  noteValeur: { fontSize: 72, fontWeight: 'bold', marginTop: 8 },
  noteSur: { color: '#64748B', fontSize: 18, fontWeight: 'bold' },
  noteDetail: { color: '#94A3B8', fontSize: 14, marginTop: 10 },
  cardDetail: { backgroundColor: '#1E293B', borderRadius: 10, padding: 14, marginBottom: 10 },
  cardDetailJuste: { borderLeftWidth: 3, borderLeftColor: '#10B981' },
  cardDetailFaux: { borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  rowDetailTete: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  verdict: { fontSize: 20, fontWeight: 'bold', marginRight: 10 },
  enonceDetail: { color: '#F8FAFC', fontSize: 14, flex: 1, lineHeight: 20 },
  ligneReponse: { color: '#94A3B8', fontSize: 13, marginBottom: 4 },
  valeurReponse: { color: '#F8FAFC', fontWeight: '600' },
  valeurBonneReponse: { color: '#10B981', fontWeight: 'bold' },
  lignePoints: { color: '#64748B', fontSize: 11, fontStyle: 'italic' },
  explication: { color: '#93C5FD', fontSize: 13, lineHeight: 19, marginTop: 8, backgroundColor: '#0F172A', borderRadius: 8, padding: 10 },
  rowBoutonsFinaux: { marginTop: 16 },
});
