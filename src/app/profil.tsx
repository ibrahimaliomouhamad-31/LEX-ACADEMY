import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebaseConfig';

export default function Profil() {
  const router = useRouter();
  const [userNom, setUserNom] = useState<string>('');
  const [userClasse, setUserClasse] = useState<string>('');
  const [userXp, setUserXp] = useState<number>(0);
  const [rangGlobal, setRangGlobal] = useState<number>(0);
  const [totalEleves, setTotalEleves] = useState<number>(0);
  const [top3, setTop3] = useState<any[]>([]);
  const [rivalHaut, setRivalHaut] = useState<any>(null);
  const [rivalBas, setRivalBas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [streak, setStreak] = useState<number>(0);
  const [avatar, setAvatar] = useState<string>('🎓'); 
  const [historiqueReel, setHistoriqueReel] = useState<any[]>([]);

  useEffect(() => {
    const fetchProfilComplet = async () => {
      try {
        const id = await AsyncStorage.getItem('lex_user_id');
        const nom = await AsyncStorage.getItem('lex_user_nom');
        if (nom) setUserNom(nom);

        if (id) {
          const userRef = doc(db, "utilisateurs", id);
          const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
            const d = userSnap.data() as { classe?: string; xp?: number; streak?: number; avatar?: string };
            // 🛡️ ANTI-NaN : les champs Firestore peuvent être absents ou d'un
            // mauvais type (vieux docs) → Number(...) || 0 au lieu d'afficher
            // « undefined » ou de casser les calculs de ligue.
            setUserClasse(typeof d.classe === 'string' ? d.classe : '');
            setUserXp(Number(d.xp) || 0);
            setStreak(Number(d.streak) || 0);
            setAvatar(typeof d.avatar === 'string' && d.avatar ? d.avatar : '🎓'); // <-- AJOUTE ÇA
          }
        }

        // 🛡️ CLASSEMENT LIMITÉ : avant, TOUTE la collection était téléchargée
        // (coût + lenteur + lectures facturées). 50 suffisent pour le rang/top3.
        const q = query(collection(db, "classement_public"), orderBy("xp", "desc"), limit(50));
        const querySnapshot = await getDocs(q);
        
        const elevesData: any[] = [];
        querySnapshot.forEach((doc) => elevesData.push({ uid: doc.id, ...doc.data() }));
        setTotalEleves(elevesData.length);
        setTop3(elevesData.slice(0, 3));

        // 🛡️ RANG PAR UID (jamais par nom) : deux élèves « Moussa » partageaient
        // le même rang, et usurper un nom volait le rang. L'uid est unique.
        const monIndex = id
          ? elevesData.findIndex((e) => e.uid === id || e.userId === id)
          : elevesData.findIndex((e) => e.nom === nom);
        if (monIndex !== -1) {
          setRangGlobal(monIndex + 1);
          if (monIndex > 0) setRivalHaut(elevesData[monIndex - 1]);
          if (monIndex < elevesData.length - 1) setRivalBas(elevesData[monIndex + 1]);
        }

        // 🛡️ HISTORIQUE RÉEL : avant, 3 lignes codées en dur (« Il y a 2h »)
        // mentaient à chaque élève. Désormais on affiche les vrais compteurs
        // locaux (exercices, XP semaine, série) — jamais de fausse activité.
        try {
          const { getStats } = await import('../services/statsSuivi');
          const { lireXpSemaineActuelle, lireXpTotal } = await import('../services/xpLocal');
          const vraies = await getStats();
          const xpSem = await lireXpSemaineActuelle().catch(() => 0);
          const xpTot = await lireXpTotal().catch(() => 0);
          setHistoriqueReel([
            { action: `${vraies.totalTentes} exercice(s) tenté(s) au total`, xp: `${vraies.totalReussis} réussi(s)`, temps: `${Object.keys(vraies.activiteJour || {}).length} jour(s) actif(s)` },
            { action: 'XP cette semaine', xp: `+${xpSem} XP`, temps: '7 derniers jours' },
            { action: 'XP total (local)', xp: `${xpTot} XP`, temps: 'tous appareils' },
          ]);
        } catch {
          // historique indisponible : on garde un état vide honnête
        }

      } catch (error) {
        console.error("Erreur profil : ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfilComplet();
  }, []);

  const seDeconnecter = async () => {
    await AsyncStorage.removeItem('lex_user_nom');
    await AsyncStorage.removeItem('lex_user_id');
    Alert.alert("Déconnecté", "Tu as été déconnecté avec succès.");
    router.push('/');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
        <Text style={styles.loadingText}>Calcul de ton rang mondial...</Text>
      </View>
    );
  }

  // --- SYSTEME DE LIGUES ---
  let ligue = "Bronze";
  let couleurLigue = "#B45309";
  let bgLigue = "#1C1414";
  let couleurBanniere = ["#7C2D12", "#9A3412"];
  
  if (userXp >= 500) { ligue = "Argent"; couleurLigue = "#94A3B8"; bgLigue = "#14141C"; couleurBanniere = ["#334155", "#475569"]; }
  if (userXp >= 1500) { ligue = "Or"; couleurLigue = "#FBBF24"; bgLigue = "#1C1714"; couleurBanniere = ["#92400E", "#B45309"]; }
  if (userXp >= 3000) { ligue = "Platine"; couleurLigue = "#22D3EE"; bgLigue = "#141A1C"; couleurBanniere = ["#155E75", "#0891B2"]; }
  if (userXp >= 5000) { ligue = "Diamant"; couleurLigue = "#A78BFA"; bgLigue = "#1A141C"; couleurBanniere = ["#5B21B6", "#7C3AED"]; }

  // --- CALCULS ---
  const niveau = Math.floor(userXp / 100) + 1;
  const xpActuelDansNiveau = userXp % 100;
  const progressionNiveau = (xpActuelDansNiveau / 100) * 100;
  const exercicesReussis = Math.floor(userXp / 50);
  
  const xpSemaine = Math.min(userXp % 200, 200);
  const progressionSemaine = (xpSemaine / 200) * 100;

  const xpMaths = Math.floor(userXp * 0.6);
  const xpPC = Math.floor(userXp * 0.3);
  const xpSVT = Math.floor(userXp * 0.1);
  const maxMatiere = Math.max(xpMaths, xpPC, xpSVT, 100);

  const badges = [
    { nom: "Acharné", emoji: "💪", condition: exercicesReussis >= 5, progress: `${Math.min(exercicesReussis, 5)}/5`, desc: "Réussir 5 exercices" },
    { nom: "Génie", emoji: "🧠", condition: niveau >= 10, progress: `Niv. ${Math.min(niveau, 10)}/10`, desc: "Atteindre le niveau 10" },
    { nom: "Légende", emoji: "👑", condition: niveau >= 20, progress: `Niv. ${Math.min(niveau, 20)}/20`, desc: "Atteindre le niveau 20" },
    { nom: "Inflammable", emoji: "🔥", condition: streak >= 7, progress: `${Math.min(streak, 7)}/7 j`, desc: "7 jours de série" }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={styles.backBtn}>‹ Retour au menu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
               {/* BANNIÈRE DE LIGUE */}
        <View style={styles.bannerOuter}>
          <View style={[styles.bannerLayer1, { backgroundColor: couleurBanniere[0] }]} />
          <View style={[styles.bannerLayer2, { backgroundColor: couleurBanniere[1] }]} />
          
          <View style={styles.bannerContent}>
            <View style={styles.profileHeader}>
              
              {/* AVATAR MODIFIÉ ICI */}
              <TouchableOpacity style={[styles.avatarCircle, { borderColor: couleurLigue }]} onPress={() => router.push('/avatars')}>
                <Text style={styles.avatar}>{avatar}</Text>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakText}>🔥 {streak}</Text>
                </View>
                <View style={styles.editAvatarBadge}>
                  <Text style={styles.editAvatarText}>✏️</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{userNom || "Élève"}</Text>
                <Text style={styles.userClass}>{userClasse || "Non définie"}</Text>
                <View style={[styles.rankBadge, { backgroundColor: '#0F172A80', borderColor: couleurLigue }]}>
                  <Text style={[styles.rankText, { color: couleurLigue }]}>💎 {ligue} · Ligue</Text>
                </View>
              </View>
              <View style={styles.rangGlobalBadge}>
                <Text style={styles.rangGlobalText}>#{rangGlobal}</Text>
              </View>
            </View>
            
            <View style={styles.levelContainer}>
              <View style={styles.levelRow}>
                <Text style={styles.levelText}>Niveau {niveau}</Text>
                <Text style={styles.levelXpText}>{xpActuelDansNiveau} / 100 XP</Text>
              </View>
              <View style={styles.xpBarContainer}>
                <View style={[styles.xpBarFill, { width: `${progressionNiveau}%`, backgroundColor: couleurLigue }]} />
              </View>
            </View>
          </View>
        </View>

        {/* OBJECTIF HEBDOMADAIRE */}
        <View style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <Text style={styles.weeklyTitle}>🎯 Objectif de la Semaine</Text>
            <Text style={styles.weeklyXp}>{xpSemaine} / 200 XP</Text>
          </View>
          <View style={styles.weeklyBarContainer}>
            <View style={[styles.weeklyBarFill, { width: `${progressionSemaine}%` }]} />
          </View>
          <Text style={styles.weeklyReward}>Récompense : +100 XP Bonus 🔥</Text>
        </View>

        {/* STATISTIQUES GLOBALES */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userXp}</Text>
            <Text style={styles.statLabel}>Points XP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{exercicesReussis}</Text>
            <Text style={styles.statLabel}>Exos Réussis</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{badges.filter(b => b.condition).length}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{streak}</Text>
            <Text style={styles.statLabel}>Jours de série</Text>
          </View>
        </View>

        {/* RIVAUX */}
        {rivalHaut && (
          <View style={styles.rivalCard}>
            <Text style={styles.rivalLabel}>À DOUBLER ⬆️</Text>
            <View style={styles.rivalInfo}>
              <Text style={styles.rivalName}>{rivalHaut.nom}</Text>
              <Text style={styles.rivalXp}>{rivalHaut.xp} XP</Text>
            </View>
            <Text style={styles.rivalDiff}>+{rivalHaut.xp - userXp} XP</Text>
          </View>
        )}
        {rivalBas && (
          <View style={styles.rivalCardBas}>
            <Text style={styles.rivalLabelBas}>À GARDER ⬇️</Text>
            <View style={styles.rivalInfo}>
              <Text style={styles.rivalName}>{rivalBas.nom}</Text>
              <Text style={styles.rivalXp}>{rivalBas.xp} XP</Text>
            </View>
            <Text style={styles.rivalDiffBas}>-{userXp - rivalBas.xp} XP</Text>
          </View>
        )}

        {/* RÉPARTITION PAR MATIÈRE */}
        <Text style={styles.sectionTitle}>📊 MAÎTRISE PAR MATIÈRE</Text>
        <View style={styles.subjectsCard}>
          <View style={styles.subjectRow}>
            <Text style={styles.subjectName}>📐 Maths</Text>
            <View style={styles.subjectBarContainer}>
              <View style={[styles.subjectBarFill, { width: `${(xpMaths/maxMatiere)*100}%`, backgroundColor: '#3B82F6' }]} />
            </View>
            <Text style={styles.subjectXp}>{xpMaths} XP</Text>
          </View>
          <View style={styles.subjectRow}>
            <Text style={styles.subjectName}>⚛️ PC</Text>
            <View style={styles.subjectBarContainer}>
              <View style={[styles.subjectBarFill, { width: `${(xpPC/maxMatiere)*100}%`, backgroundColor: '#8B5CF6' }]} />
            </View>
            <Text style={styles.subjectXp}>{xpPC} XP</Text>
          </View>
          <View style={styles.subjectRow}>
            <Text style={styles.subjectName}>🧬 SVT</Text>
            <View style={styles.subjectBarContainer}>
              <View style={[styles.subjectBarFill, { width: `${(xpSVT/maxMatiere)*100}%`, backgroundColor: '#10B981' }]} />
            </View>
            <Text style={styles.subjectXp}>{xpSVT} XP</Text>
          </View>
        </View>

        {/* PODIUM DU LEX */}
        <Text style={styles.sectionTitle}>🏆 PODIUM DU LEX</Text>
        <View style={styles.podiumContainer}>
          {top3.map((eleve, index) => (
            <View key={index} style={[
              styles.podiumCard, 
              index === 0 && styles.podiumFirst,
              index === 1 && styles.podiumSecond,
              index === 2 && styles.podiumThird
            ]}>
              <Text style={styles.podiumPosition}>
                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
              </Text>
              <Text style={styles.podiumName} numberOfLines={1}>{eleve.nom}</Text>
              <Text style={styles.podiumXp}>{eleve.xp} XP</Text>
            </View>
          ))}
        </View>

        {/* HISTORIQUE RÉCENT */}
        <Text style={styles.sectionTitle}>⏱️ ACTIVITÉ RÉCENTE</Text>
        <View style={styles.historyContainer}>
          {historiqueReel.length === 0 && (
            <Text style={{ color: '#64748B', fontSize: 13, fontStyle: 'italic' }}>Aucune activite pour l'instant.</Text>
          )}
          {historiqueReel.map((item, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyDot} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyAction}>{item.action}</Text>
                <Text style={styles.historyTime}>{item.temps}</Text>
              </View>
              <Text style={styles.historyXp}>{item.xp}</Text>
            </View>
          ))}
        </View>

        {/* DEFIS EN COURS */}
        <Text style={styles.sectionTitle}>🎯 DÉFIS À DÉBLOQUER</Text>
        <View style={styles.defisContainer}>
          {badges.map((badge, index) => (
            <View key={index} style={[styles.defiCard, badge.condition && styles.defiUnlocked]}>
              <View style={styles.defiHeader}>
                <Text style={styles.defiEmoji}>{badge.condition ? badge.emoji : "🔒"}</Text>
                <View style={styles.defiInfo}>
                  <Text style={[styles.defiName, badge.condition && { color: '#FBBF24' }]}>{badge.nom}</Text>
                  <Text style={styles.defiDesc}>{badge.desc}</Text>
                </View>
                <Text style={styles.defiProgress}>{badge.progress}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={seDeconnecter}>
          <Text style={styles.logoutBtnText}>Se déconnecter</Text>
        </TouchableOpacity>
        
        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20 },
  backBtn: { color: '#FBBF24', fontSize: 14 },
  scrollView: { paddingHorizontal: 20 },
  loadingText: { color: '#FBBF24', marginTop: 15 },
  
  // Bannière
  bannerOuter: { borderRadius: 20, marginBottom: 20, overflow: 'hidden', position: 'relative' },
  bannerLayer1: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.8 },
  bannerLayer2: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 },
  bannerContent: { padding: 25, position: 'relative' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 3 },
  avatar: { fontSize: 40 },
  streakBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 2, borderColor: '#0F172A' },
  streakText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  userName: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  userClass: { color: '#FFFFFF99', fontSize: 14, marginBottom: 8 },
  rankBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  rankText: { fontSize: 13, fontWeight: 'bold' },
  rangGlobalBadge: { backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#FFFFFF50' },
  rangGlobalText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  
  // Niveau
  levelContainer: { marginTop: 5 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  levelText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  levelXpText: { color: '#FFFFFF99', fontSize: 14 },
  xpBarContainer: { width: '100%', height: 14, backgroundColor: '#0F172A80', borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF30' },
  xpBarFill: { height: '100%', borderRadius: 7 },
  
  // Objectif Hebdomadaire
  weeklyCard: { backgroundColor: '#1E293B', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FBBF24' },
  weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weeklyTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  weeklyXp: { color: '#FBBF24', fontSize: 14, fontWeight: 'bold' },
  weeklyBarContainer: { width: '100%', height: 10, backgroundColor: '#0F172A', borderRadius: 5, overflow: 'hidden' },
  weeklyBarFill: { height: '100%', backgroundColor: '#FBBF24', borderRadius: 5 },
  weeklyReward: { color: '#94A3B8', fontSize: 12, marginTop: 8, textAlign: 'center' },
  
  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { backgroundColor: '#1E293B', borderRadius: 15, padding: 15, width: '48%', marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statNumber: { color: '#F8FAFC', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#94A3B8', fontSize: 13, marginTop: 5 },
  
  // Rivaux
  rivalCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  rivalCardBas: { backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 20, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#10B981' },
  rivalLabel: { color: '#EF4444', fontSize: 12, fontWeight: 'bold', width: 80 },
  rivalLabelBas: { color: '#10B981', fontSize: 12, fontWeight: 'bold', width: 80 },
  rivalInfo: { flex: 1 },
  rivalName: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  rivalXp: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  rivalDiff: { color: '#EF4444', fontSize: 14, fontWeight: 'bold' },
  rivalDiffBas: { color: '#10B981', fontSize: 14, fontWeight: 'bold' },
  
  // Matières
  sectionTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  subjectsCard: { backgroundColor: '#1E293B', borderRadius: 15, padding: 20, marginBottom: 20 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  subjectName: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', width: 70 },
  subjectBarContainer: { flex: 1, height: 10, backgroundColor: '#0F172A', borderRadius: 5, overflow: 'hidden', marginHorizontal: 10 },
  subjectBarFill: { height: '100%', borderRadius: 5 },
  subjectXp: { color: '#94A3B8', fontSize: 12, width: 60, textAlign: 'right' },
  
  // Podium
  podiumContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  podiumCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 15, width: '32%', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  podiumFirst: { borderColor: '#FBBF24', backgroundColor: '#2D2412' },
  podiumSecond: { borderColor: '#94A3B8' },
  podiumThird: { borderColor: '#B45309' },
  podiumPosition: { fontSize: 30, marginBottom: 5 },
  podiumName: { color: '#F8FAFC', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  podiumXp: { color: '#34D399', fontSize: 11, marginTop: 5 },
  
  // Historique
  historyContainer: { backgroundColor: '#1E293B', borderRadius: 15, padding: 20, marginBottom: 20 },
  historyItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', marginRight: 15 },
  historyInfo: { flex: 1 },
  historyAction: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold' },
  historyTime: { color: '#64748B', fontSize: 12, marginTop: 2 },
  historyXp: { color: '#34D399', fontSize: 14, fontWeight: 'bold' },
  
  // Défis
  defisContainer: { marginBottom: 20 },
  defiCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  defiUnlocked: { borderColor: '#FBBF24', backgroundColor: '#2D2412' },
  defiHeader: { flexDirection: 'row', alignItems: 'center' },
  defiEmoji: { fontSize: 30, marginRight: 15 },
  defiInfo: { flex: 1 },
  defiName: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  defiDesc: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  defiProgress: { color: '#34D399', fontSize: 14, fontWeight: 'bold' },
  
    // Déconnexion
  logoutBtn: { backgroundColor: '#7F1D1D', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  logoutBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  
  // Edition Avatar
  editAvatarBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#3B82F6', borderRadius: 10, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0F172A' },
  editAvatarText: { fontSize: 12 }
});