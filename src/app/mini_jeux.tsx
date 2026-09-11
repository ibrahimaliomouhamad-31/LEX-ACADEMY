import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert as Alert_, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FORMULES } from '../services/formulaire';
import { estJuste } from '../services/outilsReponse';
import { genererExercice, type ExoGenere } from '../services/generateurLocal';
import { melangeFisherYates } from '../utils/correctifsAudit';

// 45 + 48 — MINI-JEUX : course de calcul à 2 joueurs sur un téléphone
// (avec abandon possible) + memory des formules.

type Phase = 'menu' | 'course_config' | 'course' | 'course_fin' | 'memory' | 'memory_fin';

export default function MiniJeux() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('menu');

  // --- Course à 2 joueurs ---
  const [j1, setJ1] = useState('Joueur 1');
  const [j2, setJ2] = useState('Joueur 2');
  const [questions, setQuestions] = useState<ExoGenere[]>([]);
  const [tour, setTour] = useState(0); // 0 = J1, 1 = J2
  const [qIndex, setQIndex] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [reponse, setReponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [chrono, setChrono] = useState(0);
  const chronoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (chronoRef.current) clearInterval(chronoRef.current); }, []);

  const demarrerCourse = () => {
    const qs: ExoGenere[] = [];
    for (let i = 0; i < 10; i++) qs.push(genererExercice('jeu_calcul', 'Calcul rapide et équations', 12));
    setQuestions(qs);
    setTour(0);
    setQIndex(0);
    setScores([0, 0]);
    setReponse('');
    setFeedback('');
    setChrono(0);
    setPhase('course');
    if (chronoRef.current) clearInterval(chronoRef.current);
    chronoRef.current = setInterval(() => setChrono((c) => c + 1), 1000);
  };

  const valider = () => {
    const exo = questions[qIndex];
    if (!exo || reponse.trim() === '' || feedback !== '') return;
    const juste = estJuste(reponse, exo.bonne_reponse);
    const nouveaux = [...scores];
    if (juste) nouveaux[tour] += 1;
    setScores(nouveaux);
    setFeedback(juste ? '✅ EXACT !' : `❌ C'était : ${exo.bonne_reponse.split('|')[0]}`);
  };

  const passerAuJoueur = () => {
    if (tour === 0) {
      setTour(1);
      setQIndex(0);
      setReponse('');
      setFeedback('');
      setPhase('course'); // reste en course : joueur 2 joue les mêmes questions
    } else {
      if (chronoRef.current) clearInterval(chronoRef.current);
      setPhase('course_fin');
    }
  };

  const abandonner = () => {
    if (chronoRef.current) clearInterval(chronoRef.current);
    // Celui qui abandonne perd : l'autre est déclaré vainqueur
    const gagnant = tour === 0 ? j2 : j1;
    Alert_.alert('Abandon', `${tour === 0 ? j1 : j2} abandonne. ${gagnant} remporte la manche !`, [
      { text: 'OK', onPress: () => setPhase('menu') },
    ]);
  };

  // --- Memory des formules ---
  const [paires, setPaires] = useState<{ id: string; texte: string; paire: string; trouve: boolean }[]>([]);
  const [selection, setSelection] = useState<number[]>([]);
  const [coups, setCoups] = useState(0);

  const demarrerMemory = () => {
    const tirees = melangeFisherYates([...FORMULES]).slice(0, 6);
    const cartes = melangeFisherYates(
      tirees.flatMap((f) => [
        { id: `${f.id}_n`, texte: f.titre, paire: f.id, trouve: false },
        { id: `${f.id}_f`, texte: f.formule, paire: f.id, trouve: false },
      ])
    );
    setPaires(cartes);
    setSelection([]);
    setCoups(0);
    setPhase('memory');
  };

  const choisirCarte = (i: number) => {
    if (paires[i].trouve || selection.includes(i) || selection.length >= 2) return;
    const nouvelle = [...selection, i];
    setSelection(nouvelle);
    if (nouvelle.length === 2) {
      setCoups((c) => c + 1);
      const [a, b] = nouvelle;
      if (paires[a].paire === paires[b].paire) {
        setTimeout(() => {
          setPaires((p) => p.map((carte, idx) => (idx === a || idx === b ? { ...carte, trouve: true } : carte)));
          setSelection([]);
        }, 500);
      } else {
        setTimeout(() => setSelection([]), 900);
      }
    }
  };

  useEffect(() => {
    if (phase === 'memory' && paires.length > 0 && paires.every((p) => p.trouve)) {
      setPhase('memory_fin');
    }
  }, [paires, phase]);

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backBtn}>‹ Retour</Text>
      </TouchableOpacity>
      <Text style={styles.subject}>RÉVISER EN S'AMUSANT</Text>
      <Text style={styles.title}>🎮 Mini-jeux</Text>
    </View>
  );

  if (phase === 'menu') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <TouchableOpacity style={[styles.carteJeu, { borderLeftColor: '#EC4899' }]} onPress={() => setPhase('course_config')}>
            <Text style={styles.jeuTitre}>🏁 Course de calcul — 2 joueurs</Text>
            <Text style={styles.jeuDesc}>Mêmes questions, tour à tour sur un téléphone. Celui qui abandonne perd ! Parfait pour le dortoir.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.carteJeu, { borderLeftColor: '#3B82F6' }]} onPress={demarrerMemory}>
            <Text style={styles.jeuTitre}>🃏 Memory des formules</Text>
            <Text style={styles.jeuDesc}>Retrouve les paires formule ↔ nom. Entraîne ta mémoire des 118 formules !</Text>
          </TouchableOpacity>
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    );
  }

  if (phase === 'course_config') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.config}>
          <Text style={styles.configTitre}>🏁 10 questions rapides chacun</Text>
          <TextInput style={styles.input} placeholder="Nom du joueur 1" placeholderTextColor="#64748B" value={j1} onChangeText={setJ1} />
          <TextInput style={styles.input} placeholder="Nom du joueur 2" placeholderTextColor="#64748B" value={j2} onChangeText={setJ2} />
          <TouchableOpacity style={styles.bouton} onPress={demarrerCourse}>
            <Text style={styles.boutonText}>C'EST PARTI ▶</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'course') {
    const exo = questions[qIndex];
    const nomJoueur = tour === 0 ? j1 : j2;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.barreInfo}>
          <Text style={[styles.infoJoueur, tour === 0 && { color: '#EC4899' }]}>👥 {j1} : {scores[0]}</Text>
          <Text style={styles.chrono}>⏱️ {chrono}s</Text>
          <Text style={[styles.infoJoueur, tour === 1 && { color: '#3B82F6' }]}>👥 {j2} : {scores[1]}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.tourJoueur}>C'est le tour de {nomJoueur} !</Text>
          <View style={styles.carte}>
            <Text style={styles.question}>{exo?.enonce}</Text>
            <TextInput style={styles.input} placeholder="Réponse..." placeholderTextColor="#64748B" value={reponse} onChangeText={setReponse} editable={feedback === ''} />
            {feedback === '' ? (
              <TouchableOpacity style={styles.bouton} onPress={valider}>
                <Text style={styles.boutonText}>Valider</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <Text style={styles.feedback}>{feedback}</Text>
                <TouchableOpacity style={styles.bouton} onPress={() => (qIndex + 1 >= questions.length ? passerAuJoueur() : (setQIndex(qIndex + 1), setReponse(''), setFeedback('')))}>
                  <Text style={styles.boutonText}>{qIndex + 1 >= questions.length ? 'Terminer mon tour →' : 'Question suivante →'}</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.abandon} onPress={abandonner}>
              <Text style={styles.abandonText}>🏳️ Abandonner (l'autre gagne)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (phase === 'course_fin') {
    const gagnant = scores[0] > scores[1] ? j1 : scores[1] > scores[0] ? j2 : null;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.fin}>
          <Text style={styles.finEmoji}>{gagnant ? '🏆' : '🤝'}</Text>
          <Text style={styles.finTitre}>{gagnant ? `${gagnant} GAGNE !` : 'MATCH NUL !'}</Text>
          <Text style={styles.finScores}>{j1} : {scores[0]}    ·    {j2} : {scores[1]}{'\n'}en {chrono} secondes</Text>
          <TouchableOpacity style={styles.bouton} onPress={() => setPhase('course_config')}>
            <Text style={styles.boutonText}>↻ Revanche</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.boutonRetour} onPress={() => setPhase('menu')}>
            <Text style={styles.boutonRetourText}>‹ Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'memory') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.barreInfo}>
          <Text style={styles.infoJoueur}>🃏 {paires.filter((p) => p.trouve).length / 2}/{paires.length / 2} paires</Text>
          <Text style={styles.chrono}>🎯 {coups} coups</Text>
        </View>
        <View style={styles.grilleMemory}>
          {paires.map((carte, i) => {
            const visible = carte.trouve || selection.includes(i);
            return (
              <TouchableOpacity
                key={carte.id}
                style={[styles.carteMemory, visible && styles.carteMemoryVisible]}
                onPress={() => choisirCarte(i)}
              >
                <Text style={[styles.memoryTexte, carte.texte.startsWith('=') || /[0-9]/.test(carte.texte[0]) ? { fontSize: 10 } : null]} numberOfLines={4}>
                  {visible ? carte.texte : '?'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // memory_fin
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {header}
      <View style={styles.fin}>
        <Text style={styles.finEmoji}>🧠</Text>
        <Text style={styles.finTitre}>Toutes les paires trouvées !</Text>
        <Text style={styles.finScores}>en {coups} coups {coups <= 8 ? '— excellent ! 🔥' : '— tu peux faire mieux !'}</Text>
        <TouchableOpacity style={styles.bouton} onPress={demarrerMemory}>
          <Text style={styles.boutonText}>↻ Rejouer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.boutonRetour} onPress={() => setPhase('menu')}>
          <Text style={styles.boutonRetourText}>‹ Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// petit alias évité : Alert_ importé en tête de fichier

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  carteJeu: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, marginBottom: 12, borderLeftWidth: 3 },
  jeuTitre: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  jeuDesc: { color: '#94A3B8', fontSize: 12, lineHeight: 18, marginTop: 6 },
  config: { padding: 20 },
  configTitre: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 14, color: '#F8FAFC', fontSize: 15, marginBottom: 12 },
  bouton: { backgroundColor: '#10B981', padding: 15, borderRadius: 10, alignItems: 'center' },
  boutonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  barreInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#1E293B', marginHorizontal: 20, borderRadius: 10, marginBottom: 10 },
  infoJoueur: { color: '#94A3B8', fontSize: 13, fontWeight: 'bold' },
  chrono: { color: '#FBBF24', fontSize: 13, fontWeight: 'bold' },
  tourJoueur: { color: '#FBBF24', fontSize: 15, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  carte: { backgroundColor: '#1E293B', borderRadius: 12, padding: 20, borderLeftWidth: 3, borderLeftColor: '#EC4899' },
  question: { color: '#F8FAFC', fontSize: 16, lineHeight: 24, marginBottom: 20, fontWeight: 'bold' },
  feedback: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  abandon: { marginTop: 15, alignItems: 'center' },
  abandonText: { color: '#64748B', fontSize: 12, fontStyle: 'italic' },
  fin: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  finEmoji: { fontSize: 60, marginBottom: 15 },
  finTitre: { color: '#F8FAFC', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  finScores: { color: '#94A3B8', fontSize: 16, textAlign: 'center', lineHeight: 26, marginBottom: 25 },
  boutonRetour: { marginTop: 10, padding: 10 },
  boutonRetourText: { color: '#FBBF24', fontSize: 14 },
  grilleMemory: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, justifyContent: 'center' },
  carteMemory: { width: '30%', aspectRatio: 0.9, margin: 4, borderRadius: 10, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center', padding: 6 },
  carteMemoryVisible: { backgroundColor: '#16233B', borderColor: '#10B981' },
  memoryTexte: { color: '#F8FAFC', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
});
