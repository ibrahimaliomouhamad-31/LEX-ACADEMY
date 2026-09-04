import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebaseConfig';
import { compterRevisionsDuJour } from '../services/revisions';
import { restaurerProgressionSiVide, pousserProgression } from '../services/syncCloud';
import { viderFileSignalements } from '../services/signalementService';
import { viderFileGlobale } from '../services/objectifs';
import { verifierMAJ } from '../services/majOTA';

// 65 — ANTI-ADDICTION BIENVEILLANT : après 2h cumulées dans la journée,
// l'app suggère une pause (le cerveau retient mieux avec des repos).
const CLE_TEMPS_JOUR = 'lex_temps_';

function jourCourant(): string {
  return new Date().toISOString().split('T')[0];
}

async function verifierPause(): Promise<void> {
  try {
    const brut = await AsyncStorage.getItem(`${CLE_TEMPS_JOUR}${jourCourant()}`);
    const minutes = brut ? parseInt(brut, 10) || 0 : 0;
    if (minutes >= 120) {
      Alert.alert(
        '☕ Petite pause ?',
        `Tu as déjà révisé ${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')} aujourd'hui — c'est énorme ! Ton cerveau consolide mieux avec des repos. Bouge un peu, bois de l'eau, et reviens ce soir pour tes révisions du jour 🧠`,
        [{ text: 'Je continue quand même', style: 'default' }, { text: 'D\'accord, pause !' }]
      );
    }
  } catch {
    // ignore
  }
}
import { getLangue } from '../services/parametres';
import { couleurTheme, getTheme } from '../services/parametres';
import { t } from '../services/traductions';

// Jours restants avant la prochaine composition (calendrier scolaire type Niger)
function joursAvantProchaineCompo(): number {
  const COMPOS = [
    { mois: 11, jour: 15 }, // compositions 1er trimestre
    { mois: 3, jour: 10 }, // compositions 2e trimestre
    { mois: 6, jour: 1 }, // BAC
  ];
  const maintenant = new Date();
  let minimum = 999;
  for (const c of COMPOS) {
    for (const annee of [maintenant.getFullYear(), maintenant.getFullYear() + 1]) {
      const date = new Date(annee, c.mois - 1, c.jour);
      const diff = Math.ceil((date.getTime() - maintenant.getTime()) / 86400000);
      if (diff >= 0 && diff < minimum) minimum = diff;
    }
  }
  return minimum;
}

// Fonction pour obtenir la date du jour au format "YYYY-MM-DD"
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Fonction pour obtenir la date d'hier
const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

export default function Index() {
  const router = useRouter();
  const [userNom, setUserNom] = useState<string | null>(null);
  const [userXp, setUserXp] = useState<number>(0);
  const [userStreak, setUserStreak] = useState<number>(0);
  const [nbRevisions, setNbRevisions] = useState<number>(0);
  const [langue, setLangueState] = useState<'fr' | 'en'>('fr');
  const [accent, setAccent] = useState<string>('#FBBF24');
  const [defiFait, setDefiFait] = useState<boolean | null>(null);
  const [premiereFois, setPremiereFois] = useState(false);

  const verifierConnexion = async () => {
    try {
      const id = await AsyncStorage.getItem('lex_user_id');
      const nom = await AsyncStorage.getItem('lex_user_nom');
      
      if (nom && id) {
        setUserNom(nom);
        const userRef = doc(db, "utilisateurs", id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserXp(data.xp);
          
          // --- LOGIQUE DU STREAK ---
          const today = getTodayDate();
          const yesterday = getYesterdayDate();
          const derniereConnexion = data.derniere_connexion;
          let nouveauStreak = data.streak || 0;

          if (derniereConnexion === today) {
            // Déjà connecté aujourd'hui, on ne touche à rien
            nouveauStreak = data.streak || 0;
          } else if (derniereConnexion === yesterday) {
            // Connecté hier : la série continue !
            nouveauStreak = (data.streak || 0) + 1;
            await updateDoc(userRef, { streak: nouveauStreak, derniere_connexion: today });
          } else {
            // Connecté il y a plus d'un jour : la série est cassée
            nouveauStreak = 1;
            await updateDoc(userRef, { streak: 1, derniere_connexion: today });
          }
          
          setUserStreak(nouveauStreak);
        }
      }
    } catch (error) {
      console.error("Erreur lecture profil : ", error);
    }
  };

  useEffect(() => {
    verifierConnexion();
    compterRevisionsDuJour().then(setNbRevisions).catch(() => setNbRevisions(0));
    // Anti-addiction : accumule le temps d'ouverture du jour, alerte à 2h
    (async () => {
      try {
        const cle = `${CLE_TEMPS_JOUR}${jourCourant()}`;
        const minutes = parseInt((await AsyncStorage.getItem(cle)) || '0', 10) || 0;
        await AsyncStorage.setItem(cle, String(minutes + 1));
        await verifierPause();
        // 11 — Rappel mensuel : sauvegarder son code de transfert
        if (new Date().getDate() === 1 && minutes >= 1) {
          Alert.alert('📦 Pense à ta sauvegarde !', 'Début du mois : génère ton code de transfert (🎯 Plus → 📦 Transfert) pour ne jamais perdre tes XP si ton téléphone casse.');
        }
      } catch {
        // ignore
      }
    })();
    (async () => {
      setLangueState(await getLangue());
      const th = await getTheme().catch(() => 'jaune' as const);
      setAccent(couleurTheme(th));
      try {
        const vu = await AsyncStorage.getItem('lex_guide_vu');
        if (!vu) setPremiereFois(true);
      } catch { /* ignore */ }
      // Le défi du jour a-t-il déjà été fait ?
      try {
        const classe = await AsyncStorage.getItem('lex_classe_actuelle');
        if (classe) {
          const fait = await AsyncStorage.getItem(`lex_defi_fait_${classe}`);
          setDefiFait(fait === new Date().toISOString().slice(0, 10));
        }
      } catch {
        // ignore
      }
      // Sync cloud : restaure la progression sur un nouveau téléphone,
      // puis sauvegarde régulièrement au passage du wifi.
      const restaure = await restaurerProgressionSiVide().catch(() => false);
      if (!restaure) await pousserProgression().catch(() => undefined);
      // Envoie les signalements et autres éléments mis en file hors-ligne
      await viderFileSignalements().catch(() => undefined);
      await viderFileGlobale().catch(() => undefined);
      // 67 — Vérifie une mise à jour OTA au lancement (no-op en dev)
      await verifierMAJ();
    })();
  }, []);

  const seDeconnecter = async () => {
    await AsyncStorage.removeItem('lex_user_nom');
    await AsyncStorage.removeItem('lex_user_id');
    setUserNom(null);
    setUserXp(0);
    setUserStreak(0);
    Alert.alert("Déconnecté", "Tu as été déconnecté avec succès.");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {userNom ? (
        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <Text style={styles.hello}>{t('bonjour', langue)}</Text>
            <Text style={styles.userName}>{userNom} 👋</Text>
          </View>
          <View style={styles.badgesContainer}>
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>⚡ {userXp} XP</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {userStreak}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => router.push('/profil')}>
            <Text style={styles.logoutText}>Profil</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.profileCard}>
          <Text style={styles.userName}>{t('pas_connecte', langue)}</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
            <Text style={styles.loginBtnText}>{t('connexion', langue)}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.emoji}>🎓</Text>
      <Text style={styles.title}>LEX ACADEMY</Text>
      <Text style={styles.subtitle}>L'Excellence à portée de main</Text>

      {premiereFois && (
        <TouchableOpacity style={styles.bandeauBienvenue} onPress={() => router.push('/guide')}>
          <Text style={styles.bienvenueTitre}>👋 Bienvenue au LEX !</Text>
          <Text style={styles.bienvenueTexte}>Première fois ? Prends 2 minutes : le guide complet t'explique tout (hors-ligne, révisions, jeux...). Touche ici !</Text>
        </TouchableOpacity>
      )}

      {/* 53 — Carte du jour façon widget : l'essentiel en un coup d'œil */}
      <View style={[styles.carteJour, { borderColor: accent }]}>
        <TouchableOpacity style={styles.jourColonne} onPress={() => router.push('/profil')}>
          <Text style={styles.jourChiffre}>🔥 {userStreak}</Text>
          <Text style={styles.jourLabel}>série</Text>
        </TouchableOpacity>
        <View style={styles.jourSeparateur} />
        <TouchableOpacity style={styles.jourColonne} onPress={() => router.push('/revisions')}>
          <Text style={styles.jourChiffre}>🧠 {nbRevisions}</Text>
          <Text style={styles.jourLabel}>révisions</Text>
        </TouchableOpacity>
        <View style={styles.jourSeparateur} />
        <TouchableOpacity style={styles.jourColonne} onPress={() => router.push('/defi_jour')}>
          <Text style={styles.jourChiffre}>{defiFait === true ? '✅' : defiFait === false ? '⏳' : '📰'}</Text>
          <Text style={styles.jourLabel}>défi</Text>
        </TouchableOpacity>
      </View>

      {/* 54 — Mode intensif pré-compositions */}
      {(() => {
        const jours = joursAvantProchaineCompo();
        if (jours <= 21) {
          return (
            <TouchableOpacity style={styles.bandeauIntensif} onPress={() => router.push('/pieges')}>
              <Text style={styles.intensifTexte}>
                ⚡ MODE INTENSIF — {jours === 0 ? 'compositions AUJOURD\'HUI !' : `${jours} jour(s) avant les compositions`} : attaque tes pièges maintenant !
              </Text>
            </TouchableOpacity>
          );
        }
        return null;
      })()}

      <Text style={styles.sectionTitle}>{t('espace_revision', langue)}</Text>

      <TouchableOpacity style={styles.courseBtn} onPress={() => router.push('/classes')}>
        <Text style={styles.courseBtnText}>{t('le_cours', langue)}</Text>
      </TouchableOpacity>

       <TouchableOpacity style={styles.exBtn} onPress={() => router.push('/classes_exos')}>
        <Text style={styles.exBtnText}>{t('exercices', langue)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.revBtn} onPress={() => router.push('/revisions')}>
        <Text style={styles.revBtnText}>{t('revisions_jour', langue)}{nbRevisions > 0 ? ` (${nbRevisions})` : ''}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.defiBtn} onPress={() => router.push('/defi_jour')}>
        <Text style={styles.defiBtnText}>📰 Défi du jour / Daily challenge</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.rankBtn} onPress={() => router.push('/classement')}>
        <Text style={styles.rankBtnText}>{t('classement', langue)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.iaBtn} onPress={() => router.push('/lexai')}>
        <Text style={styles.iaBtnText}>{t('lexai', langue)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.plusBtn} onPress={() => router.push('/plus')}>
        <Text style={styles.plusBtnText}>{t('plus', langue)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.guideBtn} onPress={() => router.push('/guide')}>
        <Text style={styles.guideBtnText}>❓ Guide complet de l'app</Text>
      </TouchableOpacity>
      
      <Text style={styles.footer}>Fait par un élève du LEX, pour les élèves du LEX.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', padding: 20, paddingTop: 50 },
  profileCard: { 
    width: '100%', 
    backgroundColor: '#1E293B', 
    borderRadius: 15, 
    padding: 20, 
    marginBottom: 30, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155'
  },
  profileInfo: { flex: 1 },
  hello: { color: '#94A3B8', fontSize: 14 },
  userName: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold' },
  badgesContainer: { flexDirection: 'column', alignItems: 'flex-end', marginRight: 10 },
  xpBadge: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FBBF24', marginBottom: 5 },
  xpText: { color: '#FBBF24', fontSize: 14, fontWeight: 'bold' },
  streakBadge: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#EF4444' },
  streakText: { color: '#EF4444', fontSize: 14, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  logoutText: { color: '#F8FAFC', fontSize: 12, fontWeight: 'bold' },
  loginBtn: { backgroundColor: '#FBBF24', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 },
  loginBtnText: { color: '#0F172A', fontSize: 14, fontWeight: 'bold' },
  emoji: { fontSize: 50, marginBottom: 5 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FBBF24', letterSpacing: 2 },
  subtitle: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', marginBottom: 30 },
  sectionTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: 'bold', marginBottom: 15, letterSpacing: 1, backgroundColor: '#1E293B', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },
  courseBtn: { backgroundColor: '#3B82F6', paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 15 },
  courseBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  exBtn: { backgroundColor: '#10B981', paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 15 },
  exBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  rankBtn: { backgroundColor: '#F59E0B', paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 15 },
  rankBtnText: { color: '#0F172A', fontSize: 16, fontWeight: 'bold' },
  iaBtn: { backgroundColor: '#8B5CF6', paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 15 },
  iaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  revBtn: { backgroundColor: '#EC4899', paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 15 },
  revBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  defiBtn: { backgroundColor: '#7C3AED', paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 15 },
  defiBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  plusBtn: { backgroundColor: '#0EA5E9', paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 15 },
  plusBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  footer: { color: '#475569', fontSize: 12, marginTop: 20, textAlign: 'center' },
  carteJour: { flexDirection: 'row', width: '100%', backgroundColor: '#1E293B', borderRadius: 15, borderWidth: 1.5, paddingVertical: 14, marginBottom: 12, alignItems: 'center' },
  jourColonne: { flex: 1, alignItems: 'center' },
  jourSeparateur: { width: 1, height: 34, backgroundColor: '#334155' },
  jourChiffre: { color: '#F8FAFC', fontSize: 17, fontWeight: 'bold' },
  jourLabel: { color: '#64748B', fontSize: 11, marginTop: 3 },
  bandeauBienvenue: { backgroundColor: '#16233B', borderRadius: 12, padding: 15, width: '100%', marginBottom: 12, borderWidth: 1.5, borderColor: '#0EA5E9' },
  bienvenueTitre: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  bienvenueTexte: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  guideBtn: { backgroundColor: '#334155', paddingVertical: 13, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 15 },
  guideBtnText: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold' },
  bandeauIntensif: { backgroundColor: '#7F1D1D', borderRadius: 12, padding: 12, width: '100%', marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#FBBF24' },
  intensifTexte: { color: '#FCA5A5', fontSize: 12, fontWeight: 'bold', lineHeight: 17 },
});